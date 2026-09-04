/**
 * 学习导读：这是牌桌“流程总控”，也是学习完整德州事件流的核心文件。
 * 它不直接计算牌局结果，也尽量不直接找节点，而是把每条服务端事件依次变成：
 * `校验/更新 DzpkTableStateModel -> 排入表现队列 -> 调 DzpkTablePresentation 操作原 Prefab`。
 *
 * 事件主线：RoomInfo 快照 -> FaCards 发底牌 -> StageBet 盲注/前注 -> CallUserAct 轮到谁 ->
 * ActBet 玩家动作 -> PublicCards 翻牌/转牌/河牌 -> Result 结算 -> 下一次 FaCards。
 * 玩家点按钮只发送“意图”；收到服务端成功广播后才正式扣桌上筹码、加底池和播放动作。
 *
 * 本文件直接使用的 Cocos 3.8 API 很少：
 * - `Component`：挂在原 DZPKMain 根节点上的脚本，提供 `onLoad/onDestroy/scheduleOnce`。
 * - `Event`：Prefab Button/Slider 回调参数；业务通常只需要 target，不信任它携带的钱数。
 * - `isValid(component, true)`：异步动画等待后确认牌桌组件仍存在。
 * - `_decorator.ccclass`：让官方导入的 Prefab 按原组件 UUID 找到这个维护版类。
 *
 * 阅读建议：先看 SOURCE_EVENT 和公开按钮方法，再按 handleRoomSnapshot/FaCards/ActBet/PublicCards/
 * Result 顺序阅读。最后再看文件末尾的 presentationQueue，它解释了为什么动画不会互相穿插。
 */
import { Component, Event, isValid, _decorator } from 'cc';
import { EventSubscription } from '../../Standalone/DzpkEventBus';
import { requireDzpkRuntimeServices } from '../../Standalone/DzpkRuntimeServices';
import { SourceEnvelope } from '../../Standalone/SourceProtocolAdapter';
import {
  DzpkParticipantState,
  DzpkTableStateModel,
  SourceActionNotice,
  SourceParticipantSnapshot,
  SourceRoomSnapshot,
  SOURCE_TABLE_SEAT_COUNT,
  sourceIdentityEquals,
} from './DzpkTableStateModel';
import { DzpkTablePresentation } from './DzpkTablePresentation';
import type { DzpkSettlementPresentation } from './DzpkTablePresentationTypes';
import {
  ActionPayload,
  DealPayload,
  SettlementCardProjection,
  SettlementPayload,
  SourceIdentity,
  SourceRecord,
  SOURCE_ACTION,
  SOURCE_STAGE,
  asSourceRecord,
  canonicalNonNegativeWalletAmount,
  createSettlementPresentation,
  findParticipantByLocalSeat,
  identityListContains,
  nonNegativeChipAmount,
  normalizeRoomSnapshot,
  normalizeSourceIdentity,
  participantParticipatesInSnapshot,
  positiveChipAmountOrZero,
  readIdentityMapValue,
  readParticipantSourceAction,
  requireArrayIndex,
  safeCardArray,
  settlementFingerprint,
  sourceActionBadgeCode,
  sourceVoiceFolder,
  sumVisibleStreetWagers,
} from './DzpkTableControllerSupport';

const { ccclass } = _decorator;

const SOURCE_EVENT = {
  // 名字必须与 KG Cocos/PHP 协议一致；可读常量只替代散落字符串，不改变线上协议。
  ROOM_SNAPSHOT: 'Msg_DZPK_RoomInfo',
  PLAYER_ENTERED: 'Msg_DZPK_PlayerAct',
  PRIVATE_CARDS_DEALT: 'Msg_DZPK_FaCards',
  FORCED_WAGERS_POSTED: 'Msg_DZPK_StageBet',
  ACTION_TURN_STARTED: 'Msg_DZPK_CallUserAct',
  PARTICIPANT_ACTION_APPLIED: 'Msg_DZPK_ActBet',
  COMMUNITY_CARDS_REVEALED: 'Msg_DZPK_PublicCards',
  HAND_SETTLED: 'Msg_DZPK_Result',
  PARTICIPANT_BALANCE_CHANGED: 'Msg_DZPK_ChangGold',
  PARTICIPANT_LEFT: 'Msg_DZPK_Out',
} as const;

const ACTION_CONTROL = { HIDDEN: '', BETTING: 'bet', AUTOMATIC: 'auto' } as const;
const AUTOMATIC_ACTION = { CHECK_OR_FOLD_ONCE: 0, AUTOMATIC_CHECK_OR_FOLD: 1, CALL_ANY_AMOUNT: 2 } as const;

const SOURCE_DEAL_CARD_COUNT = 2;
const SOURCE_CARD_DEAL_INTERVAL_SECONDS = 0.1;
const SOURCE_EVENT_TRANSITION_DELAY_SECONDS = 0.5;
const SOURCE_WAGER_COLLECTION_DELAY_SECONDS = 0.7;
const SOURCE_SETTLEMENT_OPENING_DELAY_SECONDS = 1.5;
const SOURCE_SETTLEMENT_POT_DELAY_SECONDS = 1;
const SOURCE_SETTLEMENT_CLEANUP_DELAY_SECONDS = 4;
const AUTOMATIC_ACTION_DELAY_SECONDS = 1;

/**
 * 按 source 事件顺序编排牌桌状态与表现。画面仍是原 321 节点 Prefab；真钱、发牌和结算由服务端权威。
 */
@ccclass('DzpkTableGameController')
export class DzpkTableGameController extends Component {
  // StateModel 是当前显示状态；Presentation 是原节点操作器。两者分开可避免 UI 代码变成第二套规则引擎。
  private readonly tableStateModel = new DzpkTableStateModel();
  private tablePresentation: DzpkTablePresentation | null = null;
  private sourceEventSubscriptions: EventSubscription[] = [];
  // 每个 source 事件的动画串行接在 Promise 后；epoch 用来让重连快照/退出立即废弃旧队列。
  private presentationQueue: Promise<unknown> = Promise.resolve();
  private presentationEpoch = 1;
  private automaticActionToken = 0;
  private isViewerActionSubmissionPending = false;
  private isRoomReturnPending = false;
  private lastSettlementFingerprint = '';

  // ────────────────── 1. 组件生命周期与 source 事件订阅 ──────────────────

  /** 牌桌 Prefab 创建时先取得同节点 Presentation，再订阅全部 source 事件。 */
  public onLoad(): void {
    this.initializeSemanticController();
    this.subscribeToSourceTableEvents();
  }

  /** 销毁时推进 token/epoch，使所有尚未结束的延迟回调自动失效，并退订网络事件。 */
  public onDestroy(): void {
    this.presentationEpoch += 1;
    this.automaticActionToken += 1;
    this.unsubscribeFromSourceTableEvents();
  }

  /** Controller 与 Presentation 必须共同挂在 DZPKMain 根节点，缺失代表 Prefab 组件绑定不完整。 */
  private initializeSemanticController(): void {
    const presentationComponent = this.node.getComponent(DzpkTablePresentation);
    if (!presentationComponent) throw new Error('DzpkTablePresentation must be attached to DZPKMain');
    this.tablePresentation = presentationComponent;
    presentationComponent.initializeTablePresentation();
  }

  /** 后续方法用这个断言取 Presentation，避免大量可选链把恢复错误静默吞掉。 */
  private requirePresentation(): DzpkTablePresentation {
    if (!this.tablePresentation) throw new Error('DZPK table presentation is not initialized');
    return this.tablePresentation;
  }

  /**
   * 建立“事件名 -> 语义处理器”总表。这里只注册一次；网络层解码后 EventBus 会按原名字发布。
   */
  private subscribeToSourceTableEvents(): void {
    this.subscribeToSuccessfulSourceEvent(SOURCE_EVENT.ROOM_SNAPSHOT, (payload) =>
      this.handleRoomSnapshotReceived(payload as SourceRoomSnapshot));
    this.subscribeToSuccessfulSourceEvent(SOURCE_EVENT.PLAYER_ENTERED, (payload) =>
      this.handleParticipantEntered(payload as SourceParticipantSnapshot));
    this.subscribeToSuccessfulSourceEvent(SOURCE_EVENT.PRIVATE_CARDS_DEALT, (payload) =>
      this.handlePrivateCardsDealt(payload as DealPayload));
    this.subscribeToSuccessfulSourceEvent(SOURCE_EVENT.FORCED_WAGERS_POSTED, (payload) =>
      this.handleForcedWagersPosted(payload));
    this.subscribeToSuccessfulSourceEvent(SOURCE_EVENT.ACTION_TURN_STARTED, (payload) =>
      this.handleActionTurnStarted(payload as SourceActionNotice));
    this.subscribeToSuccessfulSourceEvent(SOURCE_EVENT.PARTICIPANT_ACTION_APPLIED, (payload) =>
      this.handleParticipantActionApplied(payload as ActionPayload));
    this.subscribeToSuccessfulSourceEvent(SOURCE_EVENT.COMMUNITY_CARDS_REVEALED, (payload) =>
      this.handleCommunityCardsRevealed(payload));
    this.subscribeToSuccessfulSourceEvent(SOURCE_EVENT.HAND_SETTLED, (payload) =>
      this.handleHandSettled(payload as SettlementPayload));
    this.subscribeToSuccessfulSourceEvent(SOURCE_EVENT.PARTICIPANT_BALANCE_CHANGED, (payload) =>
      this.handleParticipantBalanceChanged(payload));
    this.subscribeToSuccessfulSourceEvent(SOURCE_EVENT.PARTICIPANT_LEFT, (payload) =>
      this.handleParticipantLeft(payload));

    const { eventBus } = requireDzpkRuntimeServices();
    this.sourceEventSubscriptions.push(eventBus.subscribeSourceEvent(
      'local_SocketState',
      (networkState) => this.handleNetworkStateChanged(networkState),
      this,
    ));
    this.sourceEventSubscriptions.push(eventBus.subscribeSourceEvent(
      'local_Event',
      (eventName) => { if (eventName === 'up_Gold') this.handleLegacyGoldRefreshRequested(); },
      this,
    ));
  }

  /**
   * 共用成功门：所有 Msg_DZPK envelope 必须 status=1 才交给语义处理器，失败统一恢复按钮并提示。
   */
  private subscribeToSuccessfulSourceEvent(
    eventName: string,
    semanticHandler: (payload: SourceRecord) => unknown,
  ): void {
    const { eventBus } = requireDzpkRuntimeServices();
    this.sourceEventSubscriptions.push(eventBus.subscribeSourceEvent(
      eventName,
      (envelopeValue) => {
        const sourceEnvelope = envelopeValue as SourceEnvelope<unknown>;
        if (!sourceEnvelope || sourceEnvelope.status !== 1) {
          this.handleSourceEventFailure(eventName, sourceEnvelope);
          return;
        }
        semanticHandler(asSourceRecord(sourceEnvelope.data));
      },
      this,
    ));
  }

  /** 牌桌销毁时精确退订全部 subscription，防止返回 Room 后旧桌继续收到广播。 */
  private unsubscribeFromSourceTableEvents(): void {
    const { eventBus } = requireDzpkRuntimeServices();
    this.sourceEventSubscriptions.forEach((subscription) => eventBus.unsubscribeSourceEvent(subscription));
    this.sourceEventSubscriptions = [];
  }

  /** 业务拒绝/失败时释放客户端提交锁；若仍轮到 viewer，则恢复原操作按钮供重试。 */
  private handleSourceEventFailure(eventName: string, sourceEnvelope?: SourceEnvelope<unknown>): void {
    this.isViewerActionSubmissionPending = false;
    if (eventName === SOURCE_EVENT.PARTICIPANT_LEFT) this.isRoomReturnPending = false;
    const message = sourceEnvelope?.msg ?? `${eventName} failed`;
    console.error(`[DZPK source] ${message}`);
    requireDzpkRuntimeServices().uiMessageService.showTips(message);
    this.restoreViewerActionControlsIfApplicable();
  }

  // ────────────────── 2. RoomInfo 快照：首进桌与重连恢复 ──────────────────

  /**
   * RoomInfo 是可独立恢复整桌的权威快照。重连快照必须替换旧 socket 留下的延迟动画队列，
   * 否则旧发牌/结算会在新快照之后继续播放并覆盖正确画面。
   */
  public handleRoomSnapshotReceived(roomSnapshot: SourceRoomSnapshot): Promise<unknown> {
    return this.replacePresentationQueue(() => {
      const { gameContext } = requireDzpkRuntimeServices();
      const normalizedSnapshot = normalizeRoomSnapshot(roomSnapshot);
      this.tableStateModel.initializeFromRoomSnapshot(
        normalizedSnapshot,
        gameContext.getKey<SourceIdentity>('uid'),
      );
      this.renderCompleteRoomSnapshot(normalizedSnapshot);
    });
  }

  /** 按“清座位 -> 玩家 -> 庄位/底池 -> 公共牌/牌型 -> 提示/行动轮次”一次性重画快照。 */
  private renderCompleteRoomSnapshot(roomSnapshot: SourceRoomSnapshot): void {
    const presentation = this.requirePresentation();
    this.resetEverySeatPresentation();
    presentation.hideAllOpponentHoleCards();
    this.tableStateModel.participants.forEach((participant) =>
      this.renderParticipantSnapshot(participant, roomSnapshot));
    this.renderSnapshotDealerButton();
    this.renderSnapshotPotState();
    presentation.renderExistingCommunityCards(this.tableStateModel.publicBoardCards.slice());
    this.renderViewerHandCategoryFromPayload(roomSnapshot.px);
    this.renderSnapshotStatusTips();
    this.restoreSnapshotActionTurn();
  }

  /** 先清原六个座位和所有操作层，确保旧手牌残留不会混入新快照。 */
  private resetEverySeatPresentation(): void {
    const presentation = this.requirePresentation();
    for (let localSeat = 0; localSeat < SOURCE_TABLE_SEAT_COUNT; localSeat += 1) {
      presentation.resetParticipantSeatPresentation(localSeat);
      presentation.setParticipantSeatPresence(localSeat, null);
    }
    presentation.showPlayerActionControls(ACTION_CONTROL.HIDDEN, 0, this.tableStateModel);
    presentation.setRaiseSelectionVisible(false, [], 0, 0, false);
  }

  /**
   * 把单个玩家快照投影到本地座位：资料、余额、是否参局、底牌、下注、动作图片和弃牌灰化。
   */
  private renderParticipantSnapshot(
    participant: DzpkParticipantState,
    roomSnapshot: SourceRoomSnapshot,
  ): void {
    const presentation = this.requirePresentation();
    const sourceAction = readParticipantSourceAction(roomSnapshot.curbet, participant.participantId);
    participant.sourceActionCode = sourceAction.act;
    participant.displayedStreetContributionChips = sourceAction.gold;
    participant.isParticipating = participantParticipatesInSnapshot(
      participant,
      roomSnapshot.stage ?? SOURCE_STAGE.WAITING,
    );
    const localSeat = participant.viewerLocalSeatId;
    presentation.setParticipantSeatPresence(localSeat, participant);
    presentation.renderParticipantChipBalance(localSeat, participant.stackChips);
    presentation.renderParticipantActionCountdown(localSeat, null);
    presentation.setParticipantFoldedAppearance(
      localSeat,
      this.tableStateModel.sourceStageCode === SOURCE_STAGE.WAITING
        || (participant.isParticipating && sourceAction.act !== SOURCE_ACTION.FOLD),
    );
    presentation.renderParticipantHoleCards(localSeat, participant.holeCards.slice(), sourceAction.act);
    if (sourceAction.gold > 0) void presentation.animateParticipantWager(localSeat, sourceAction.gold, false);
    if (sourceAction.act > 0) {
      presentation.renderParticipantActionBadge(localSeat, sourceActionBadgeCode(sourceAction), false);
    } else presentation.hideParticipantActionBadge(localSeat);
  }

  private renderSnapshotDealerButton(): void {
    const dealer = this.tableStateModel.findParticipantByIdIfPresent(this.tableStateModel.dealerParticipantId);
    if (dealer) this.requirePresentation().renderDealerButtonAtSeat(dealer.viewerLocalSeatId);
  }

  /**
   * totalPot 包含整手累计；座位前仍可见的是本轮下注。二者相减得到已经归集到中央的前几轮底池。
   */
  private renderSnapshotPotState(): void {
    const visibleStreetWagers = sumVisibleStreetWagers(this.tableStateModel.participants);
    this.tableStateModel.collectedPreviousStreetPotChips = Math.max(
      0,
      this.tableStateModel.totalPotChips - visibleStreetWagers,
    );
    const presentation = this.requirePresentation();
    presentation.renderTotalPotAmount(this.tableStateModel.totalPotChips);
    presentation.renderCollectedPotAmount(this.tableStateModel.collectedPreviousStreetPotChips, false);
    this.renderViewerWagerDifference();
  }

  /** 计算 viewer 距本轮最高下注差额，只用于原提示节点；合法跟注额仍取服务端 actionNotice.minbet。 */
  private renderViewerWagerDifference(): void {
    const maximumStreetWager = this.tableStateModel.maximumNumericValue(
      this.tableStateModel.participants.map((participant) => participant.displayedStreetContributionChips),
    );
    const viewerStreetWager = this.tableStateModel.viewerParticipant?.displayedStreetContributionChips ?? 0;
    this.requirePresentation().renderWagerDifferenceAmount(Math.max(0, maximumStreetWager - viewerStreetWager));
  }

  private renderViewerHandCategoryFromPayload(handValuesByParticipant: unknown): void {
    const legacyHandValue = readIdentityMapValue(
      asSourceRecord(handValuesByParticipant),
      this.viewerParticipantId(),
    );
    this.requirePresentation().renderViewerHandCategory(
      typeof legacyHandValue === 'string' ? legacyHandValue : null,
    );
  }

  private renderSnapshotStatusTips(): void {
    const model = this.tableStateModel;
    const viewer = model.viewerParticipant;
    const viewerWaitsForNextHand = model.sourceStageCode > SOURCE_STAGE.WAITING
      && (!viewer || viewer.holeCards.length === 0 || model.sourceStageCode === SOURCE_STAGE.RESULT);
    const presentation = this.requirePresentation();
    if (viewerWaitsForNextHand) presentation.showTableStatusTip('wait', true);
    else if (model.sourceStageCode === SOURCE_STAGE.WAITING && model.participants.length < 3) {
      presentation.showTableStatusTip('oth', true);
    } else presentation.showTableStatusTip('wait', false);
  }

  /** 快照含合法 notice 时恢复倒计时/按钮；没有时保持按钮隐藏，等待下一条权威事件。 */
  private restoreSnapshotActionTurn(): void {
    const notice = this.tableStateModel.currentActionNotice;
    if (!notice || Array.isArray(notice) || notice.uid === undefined) {
      this.requirePresentation().showPlayerActionControls(ACTION_CONTROL.HIDDEN, 0, this.tableStateModel);
      return;
    }
    void this.renderActionTurnNotice(notice, false);
  }

  // ────────────────── 3. 入座、离座与一手牌开始 ──────────────────

  /** 新玩家/机器人入桌：已有 UID 做增量更新，新 UID 建状态；等待下一手前先按非参局状态显示。 */
  private handleParticipantEntered(participantSnapshot: SourceParticipantSnapshot): Promise<unknown> {
    return this.enqueuePresentationWork(() => {
      const existing = this.tableStateModel.findParticipantByIdIfPresent(participantSnapshot.uid);
      const participant = existing
        ? existing.applySourceSnapshot(participantSnapshot)
        : this.tableStateModel.addParticipantFromSourceSnapshot(participantSnapshot);
      participant.isParticipating = false;
      const presentation = this.requirePresentation();
      presentation.resetParticipantSeatPresentation(participant.viewerLocalSeatId);
      presentation.setParticipantSeatPresence(participant.viewerLocalSeatId, participant);
      presentation.renderParticipantChipBalance(participant.viewerLocalSeatId, participant.stackChips);
      presentation.setParticipantFoldedAppearance(
        participant.viewerLocalSeatId,
        this.tableStateModel.sourceStageCode === SOURCE_STAGE.WAITING,
      );
      this.renderSnapshotStatusTips();
    });
  }

  /**
   * 玩家离桌。普通座位按队列淡出；若离开的是 viewer，这是导航边界，必须抢占旧动画、使用服务端
   * 返回的结算后六位钱包回 Room，并让后端先完成合法 fold/结算而不是客户端直接删桌。
   */
  private handleParticipantLeft(leavePayload: SourceRecord): Promise<unknown> {
    const viewerLeft = sourceIdentityEquals(leavePayload.uid, this.viewerParticipantId());
    const applyParticipantLeave = (): void => {
      if (viewerLeft) this.isRoomReturnPending = false;
      const participant = this.tableStateModel.findParticipantByIdIfPresent(leavePayload.uid);
      if (participant) {
        this.tableStateModel.participants = this.tableStateModel.participants.filter((candidate) =>
          !sourceIdentityEquals(candidate.participantId, participant.participantId));
        const presentation = this.requirePresentation();
        presentation.resetParticipantSeatPresentation(participant.viewerLocalSeatId);
        presentation.setParticipantSeatPresence(participant.viewerLocalSeatId, null);
      }
      if (viewerLeft) {
        requireDzpkRuntimeServices().viewNavigator.returnToRoomFromTable(
          canonicalNonNegativeWalletAmount(leavePayload.gold),
        );
      }
      this.renderSnapshotStatusTips();
    };
    // 自己离桌不能排在旧发牌/动作动画后面，否则用户点击返回后仍会看几秒旧桌面。
    return viewerLeft
      ? this.replacePresentationQueue(applyParticipantLeave)
      : this.enqueuePresentationWork(applyParticipantLeave);
  }

  /**
   * `FaCards` 代表服务端已经开始一手。客户端从不主动请求“再来一局”，而是重置显示并按庄位顺序发牌。
   */
  private handlePrivateCardsDealt(dealPayload: DealPayload): Promise<unknown> {
    return this.replacePresentationQueue((presentationEpoch) => {
      this.prepareModelForNewHand(dealPayload);
      this.prepareSeatsForNewHand();
      this.renderSnapshotDealerButton();
      return this.animateSourceDealOrder(dealPayload, presentationEpoch);
    });
  }

  /**
   * 重置上一手模型。只有 viewer 能从 FaCards 直接拿到两张底牌；其他参与者保持空数组并显示牌背。
   */
  private prepareModelForNewHand(dealPayload: DealPayload): void {
    const inGameParticipantIds = Array.isArray(dealPayload.ingame) ? dealPayload.ingame : [];
    this.lastSettlementFingerprint = '';
    this.isViewerActionSubmissionPending = false;
    this.automaticActionToken += 1;
    this.tableStateModel.sourceStageCode = SOURCE_STAGE.DEALING;
    this.tableStateModel.publicBoardCards = [];
    this.tableStateModel.totalPotChips = 0;
    this.tableStateModel.collectedPreviousStreetPotChips = 0;
    this.tableStateModel.sourceActionsByParticipant = {};
    this.tableStateModel.handContributionsByParticipant = {};
    this.tableStateModel.currentActionNotice = [];
    this.tableStateModel.dealerParticipantId = dealPayload.bankeruid ?? 0;
    this.tableStateModel.participants.forEach((participant) => {
      participant.displayedStreetContributionChips = 0;
      participant.sourceActionCode = 0;
      participant.isParticipating = identityListContains(inGameParticipantIds, participant.participantId);
      participant.holeCards = sourceIdentityEquals(participant.participantId, this.viewerParticipantId())
        && participant.isParticipating ? safeCardArray(dealPayload.cards) : [];
    });
  }

  /** 清公共牌、底池、按钮和座位动画，同时保留入桌玩家资料/筹码，准备下一手。 */
  private prepareSeatsForNewHand(): void {
    const presentation = this.requirePresentation();
    presentation.renderExistingCommunityCards([]);
    presentation.renderViewerHandCategory(null);
    presentation.renderTotalPotAmount(0);
    presentation.renderCollectedPotAmount(0, true);
    presentation.renderWagerDifferenceAmount(0);
    presentation.hideAllOpponentHoleCards();
    presentation.showPlayerActionControls(ACTION_CONTROL.HIDDEN, 0, this.tableStateModel);
    presentation.setRaiseSelectionVisible(false, [], 0, 0, false);
    presentation.showTableStatusTip(
      'wait',
      !this.tableStateModel.viewerParticipant || !this.tableStateModel.viewerParticipant.isParticipating,
    );
    this.tableStateModel.participants.forEach((participant) => {
      const localSeat = participant.viewerLocalSeatId;
      presentation.resetParticipantSeatPresentation(localSeat);
      presentation.setParticipantSeatPresence(localSeat, participant);
      presentation.renderParticipantChipBalance(localSeat, participant.stackChips);
      presentation.setParticipantFoldedAppearance(localSeat, participant.isParticipating);
    });
  }

  // ────────────────── 4. 发牌、盲注与行动轮次 ──────────────────

  /**
   * 构造两轮逐座发牌步骤：从庄位开始环绕六座，每个参局玩家各两张；reduce 把异步动画严格串行。
   * 每一步检查 epoch，重连/退出后旧发牌序列会安静停止。
   */
  private animateSourceDealOrder(dealPayload: DealPayload, presentationEpoch: number): Promise<unknown> {
    const dealer = this.tableStateModel.findParticipantByIdIfPresent(dealPayload.bankeruid);
    const firstLocalSeat = dealer?.viewerLocalSeatId ?? 0;
    const dealSteps: Array<{ participant: DzpkParticipantState; cardIndex: number }> = [];
    for (let cardIndex = 0; cardIndex < SOURCE_DEAL_CARD_COUNT; cardIndex += 1) {
      for (let seatOffset = 0; seatOffset < SOURCE_TABLE_SEAT_COUNT; seatOffset += 1) {
        const localSeat = (firstLocalSeat + seatOffset) % SOURCE_TABLE_SEAT_COUNT;
        const participant = findParticipantByLocalSeat(this.tableStateModel, localSeat);
        if (participant?.isParticipating) dealSteps.push({ participant, cardIndex });
      }
    }
    return dealSteps.reduce<Promise<unknown>>((sequence, dealStep) => sequence.then(async () => {
      if (!this.isPresentationEpochCurrent(presentationEpoch)) return;
      await this.requirePresentation().animateHoleCardDeal(
        dealStep.participant.viewerLocalSeatId,
        dealStep.participant.holeCards.slice(),
        dealStep.cardIndex,
      );
      await this.delaySeconds(SOURCE_CARD_DEAL_INTERVAL_SECONDS, presentationEpoch);
    }), Promise.resolve());
  }

  /** `StageBet` 应用前注/大小盲等强制贡献，数据是每个玩家整手累计值。 */
  private handleForcedWagersPosted(stageBetPayload: SourceRecord): Promise<unknown> {
    return this.enqueuePresentationWork(() => {
      this.tableStateModel.sourceStageCode = SOURCE_STAGE.BETTING;
      const betsByParticipant = asSourceRecord(stageBetPayload.bets);
      Object.keys(betsByParticipant).forEach((participantId) => {
        this.applyAuthoritativeContribution(
          participantId,
          nonNegativeChipAmount(betsByParticipant[participantId]),
          true,
        );
      });
      this.requirePresentation().renderTotalPotAmount(this.tableStateModel.totalPotChips);
      this.renderViewerWagerDifference();
    });
  }

  /**
   * 把服务端“累计贡献”减去本地旧累计，得到本次新增 delta。只对 delta 扣桌上 stack、加底池，
   * 因此重放同一个累计值不会重复扣筹码。
   */
  private applyAuthoritativeContribution(
    participantId: SourceIdentity,
    authoritativeHandContribution: number,
    shouldAnimate: boolean,
  ): void {
    const participant = this.tableStateModel.findParticipantByIdIfPresent(participantId);
    if (!participant) return;
    const previousHandContribution = nonNegativeChipAmount(readIdentityMapValue(
      this.tableStateModel.handContributionsByParticipant,
      participantId,
    ));
    const contributionDelta = Math.max(0, authoritativeHandContribution - previousHandContribution);
    this.tableStateModel.handContributionsByParticipant[String(participantId)] = authoritativeHandContribution;
    participant.displayedStreetContributionChips += contributionDelta;
    participant.stackChips = Math.max(0, participant.stackChips - contributionDelta);
    this.tableStateModel.totalPotChips += contributionDelta;
    const presentation = this.requirePresentation();
    presentation.renderParticipantChipBalance(participant.viewerLocalSeatId, participant.stackChips);
    if (participant.displayedStreetContributionChips > 0) {
      void presentation.animateParticipantWager(
        participant.viewerLocalSeatId,
        participant.displayedStreetContributionChips,
        shouldAnimate,
      );
    }
  }

  /** `CallUserAct` 表示轮到某 UID 行动，排队显示倒计时和相应操作层。 */
  private handleActionTurnStarted(actionNotice: SourceActionNotice): Promise<unknown> {
    return this.enqueuePresentationWork((presentationEpoch) =>
      this.renderActionTurnNotice(actionNotice, true, presentationEpoch));
  }

  /**
   * 更新当前最低跟注和 notice，清旧倒计时，等待原事件切换间隔后区分“轮到自己/轮到别人”。
   */
  private async renderActionTurnNotice(
    actionNotice: SourceActionNotice,
    shouldDelay: boolean,
    presentationEpoch?: number,
  ): Promise<void> {
    const actor = this.tableStateModel.findParticipantByIdIfPresent(actionNotice.uid);
    if (!actor) return;
    this.isViewerActionSubmissionPending = false;
    this.automaticActionToken += 1;
    const currentAutomaticActionToken = this.automaticActionToken;
    this.tableStateModel.callAmountChips = nonNegativeChipAmount(actionNotice.minbet);
    this.tableStateModel.currentActionNotice = actionNotice;
    this.clearAllParticipantCountdowns();
    if (shouldDelay && !await this.delaySeconds(SOURCE_EVENT_TRANSITION_DELAY_SECONDS, presentationEpoch)) return;
    const presentation = this.requirePresentation();
    presentation.renderParticipantActionCountdown(actor.viewerLocalSeatId, nonNegativeChipAmount(actionNotice.time));
    presentation.hideParticipantActionBadge(actor.viewerLocalSeatId);
    if (sourceIdentityEquals(actor.participantId, this.viewerParticipantId())) {
      await this.presentViewerActionTurn(currentAutomaticActionToken, presentationEpoch);
    } else this.presentOpponentActionTurn();
  }

  /** 自己行动时若预选自动动作就延迟执行，否则显示 bet 操作层。 */
  private presentViewerActionTurn(automaticActionToken: number, presentationEpoch?: number): Promise<void> {
    const selectedIndex = this.tableStateModel.automaticActionSelections.indexOf(1);
    if (selectedIndex >= 0) {
      return this.executeAutomaticActionSelection(selectedIndex, automaticActionToken, presentationEpoch);
    }
    this.requirePresentation().showPlayerActionControls(
      ACTION_CONTROL.BETTING,
      this.tableStateModel.callAmountChips,
      this.tableStateModel,
    );
    return Promise.resolve();
  }

  /** 别人行动时，仍在牌局中的 viewer 可预选自动操作；已经弃牌则完全隐藏。 */
  private presentOpponentActionTurn(): void {
    const viewer = this.tableStateModel.viewerParticipant;
    const viewerCanSelectAutomaticAction = Boolean(
      viewer?.isParticipating && viewer.sourceActionCode !== SOURCE_ACTION.FOLD,
    );
    this.requirePresentation().showPlayerActionControls(
      viewerCanSelectAutomaticAction ? ACTION_CONTROL.AUTOMATIC : ACTION_CONTROL.HIDDEN,
      0,
      this.tableStateModel,
    );
  }

  /**
   * 延迟一秒执行预选：跟任何注取 min(call, stack)；自动过/弃根据当前 call 是否为 0 选择 0 或 -1。
   * token 变化代表轮次已更新，旧自动任务必须作废。
   */
  private async executeAutomaticActionSelection(
    selectedIndex: number,
    automaticActionToken: number,
    presentationEpoch?: number,
  ): Promise<void> {
    if (!await this.delaySeconds(AUTOMATIC_ACTION_DELAY_SECONDS, presentationEpoch)) return;
    if (automaticActionToken !== this.automaticActionToken) return;
    const viewer = this.tableStateModel.viewerParticipant;
    if (!viewer) return;
    if (selectedIndex === AUTOMATIC_ACTION.CALL_ANY_AMOUNT) {
      this.submitPlayerActionContribution(Math.min(this.tableStateModel.callAmountChips, viewer.stackChips));
      return;
    }
    this.clearAutomaticActionSelection();
    this.submitPlayerActionContribution(this.tableStateModel.callAmountChips === 0 ? 0 : -1);
  }

  private clearAllParticipantCountdowns(): void {
    this.tableStateModel.participants.forEach((participant) => {
      this.requirePresentation().renderParticipantActionCountdown(participant.viewerLocalSeatId, null);
    });
  }

  /**
   * `ActBet` 是服务端已接受的动作广播。此时才正式更新动作码、桌上筹码、底池、图片、音效和弃牌状态。
   * 玩家可能已离桌而旧 tick 迟到，这种事件安全忽略，不能让整条表现队列失败。
   */
  private handleParticipantActionApplied(actionPayload: ActionPayload): Promise<unknown> {
    return this.enqueuePresentationWork(() => {
      if (actionPayload.uid === undefined || actionPayload.uid === null) {
        throw new Error('Msg_DZPK_ActBet requires actor uid');
      }
      const participant = this.tableStateModel.findParticipantByIdIfPresent(actionPayload.uid);
      // 玩家刚离桌时旧 tick 可能迟到；权威快照中已无此人，忽略比中断后续动画更正确。
      if (!participant) return;
      const actionCode = Number(actionPayload.act);
      const contributionDelta = positiveChipAmountOrZero(actionPayload.gold);
      if (sourceIdentityEquals(participant.participantId, this.viewerParticipantId())) {
        this.isViewerActionSubmissionPending = false;
      }
      participant.sourceActionCode = actionCode;
      this.tableStateModel.sourceActionsByParticipant[String(participant.participantId)] = {
        act: actionCode,
        gold: participant.displayedStreetContributionChips + contributionDelta,
      };
      this.playParticipantActionAudio(participant, actionCode, contributionDelta);
      const presentation = this.requirePresentation();
      presentation.renderParticipantActionBadge(
        participant.viewerLocalSeatId,
        sourceActionBadgeCode({ act: actionCode, gold: contributionDelta }),
        actionCode === SOURCE_ACTION.ALL_IN,
      );
      if (actionCode === SOURCE_ACTION.FOLD) {
        participant.isParticipating = false;
        presentation.setParticipantFoldedAppearance(participant.viewerLocalSeatId, false);
        void presentation.animateParticipantCardsRecovery(participant.viewerLocalSeatId);
      }
      if (contributionDelta > 0) this.applyActionContributionDelta(participant, contributionDelta);
      this.renderViewerWagerDifference();
    });
  }

  /** 动作广播里的 gold 是本次增量：同步玩家本轮/整手贡献、stack、总底池和对应动画。 */
  private applyActionContributionDelta(participant: DzpkParticipantState, contributionDelta: number): void {
    participant.displayedStreetContributionChips += contributionDelta;
    participant.stackChips = Math.max(0, participant.stackChips - contributionDelta);
    const participantId = String(participant.participantId);
    const previousHandContribution = nonNegativeChipAmount(readIdentityMapValue(
      this.tableStateModel.handContributionsByParticipant,
      participantId,
    ));
    this.tableStateModel.handContributionsByParticipant[participantId] = previousHandContribution + contributionDelta;
    this.tableStateModel.totalPotChips += contributionDelta;
    const presentation = this.requirePresentation();
    presentation.renderParticipantChipBalance(participant.viewerLocalSeatId, participant.stackChips);
    void presentation.animateParticipantWager(
      participant.viewerLocalSeatId,
      participant.displayedStreetContributionChips,
      true,
    );
    presentation.renderTotalPotAmount(this.tableStateModel.totalPotChips);
  }

  /** 按头像性别目录和动作类型播放原语音；过牌金额为 0 时用敲桌声并触发环境动画。 */
  private playParticipantActionAudio(
    participant: DzpkParticipantState,
    actionCode: number,
    contributionDelta: number,
  ): void {
    const voiceFolder = sourceVoiceFolder(participant.avatarKey);
    if (actionCode === SOURCE_ACTION.FOLD) this.playSourceSound(`sound/${voiceFolder}/fold`);
    else if (actionCode === SOURCE_ACTION.ALL_IN) this.playSourceSound(`sound/${voiceFolder}/allin`);
    else if (contributionDelta === 0) {
      this.playSourceSound('sound/dongdong');
      this.requirePresentation().playAmbientTableAnimation(4);
    } else if (actionCode === SOURCE_ACTION.CALL_OR_CHECK) this.playSourceSound(`sound/${voiceFolder}/call`);
    else if (actionCode === SOURCE_ACTION.RAISE) this.playSourceSound(`sound/${voiceFolder}/raise`);
  }

  // ────────────────── 5. 公共牌与结算 ──────────────────

  /**
   * 公共牌事件：先等待动作切换、把各座本轮筹码收进中央，再追加新牌并播放翻牌/转牌/河牌动画，
   * 最后更新 viewer 当前牌型图片。顺序错了会出现筹码穿过牌或牌型提前显示。
   */
  private handleCommunityCardsRevealed(publicCardsPayload: SourceRecord): Promise<unknown> {
    return this.enqueuePresentationWork(async (presentationEpoch) => {
      if (!await this.delaySeconds(SOURCE_EVENT_TRANSITION_DELAY_SECONDS, presentationEpoch)) return;
      await this.collectStreetWagers(presentationEpoch);
      if (!this.isPresentationEpochCurrent(presentationEpoch)) return;
      const newlyRevealedCards = safeCardArray(publicCardsPayload.cards);
      this.tableStateModel.publicBoardCards.push(...newlyRevealedCards);
      await this.requirePresentation().animateCommunityCardReveal(
        this.tableStateModel.publicBoardCards.slice(),
        newlyRevealedCards.length,
      );
      if (!await this.delaySeconds(SOURCE_EVENT_TRANSITION_DELAY_SECONDS, presentationEpoch)) return;
      this.renderViewerHandCategoryFromPayload(publicCardsPayload.px);
    });
  }

  /**
   * 收集一轮下注：所有座位筹码飞向中央，然后把“已归集底池”设为当前总底池。
   * 玩家整手累计贡献保留，只有屏幕上的本轮 contribution 清零。
   */
  private collectStreetWagers(presentationEpoch: number): Promise<unknown> {
    const presentation = this.requirePresentation();
    const participantsWithWagers = this.tableStateModel.participants.filter((participant) =>
      participant.displayedStreetContributionChips > 0);
    participantsWithWagers.forEach((participant) => {
      presentation.animateWagerCollectionToPot(participant.viewerLocalSeatId);
      participant.displayedStreetContributionChips = 0;
      if (participant.sourceActionCode < SOURCE_ACTION.FOLD) {
        presentation.hideParticipantActionBadge(participant.viewerLocalSeatId);
      }
    });
    this.tableStateModel.collectedPreviousStreetPotChips = this.tableStateModel.totalPotChips;
    presentation.renderWagerDifferenceAmount(0);
    if (!participantsWithWagers.length) {
      presentation.renderCollectedPotAmount(this.tableStateModel.collectedPreviousStreetPotChips, false);
      return Promise.resolve();
    }
    this.playSourceSound('sound/chipfly');
    return this.delaySeconds(SOURCE_WAGER_COLLECTION_DELAY_SECONDS, presentationEpoch).then(() => {
      if (!this.isPresentationEpochCurrent(presentationEpoch)) return;
      presentation.renderCollectedPotAmount(this.tableStateModel.collectedPreviousStreetPotChips, true);
    });
  }

  /**
   * Result 入口。指纹拦截 WebSocket 重放的相同结算，隐藏所有操作并进入不可交互的结算表现序列。
   */
  private handleHandSettled(settlementPayload: SettlementPayload): Promise<unknown> {
    const fingerprint = settlementFingerprint(settlementPayload);
    if (fingerprint && fingerprint === this.lastSettlementFingerprint) return Promise.resolve();
    this.lastSettlementFingerprint = fingerprint;
    return this.enqueuePresentationWork((presentationEpoch) => {
      this.tableStateModel.sourceStageCode = SOURCE_STAGE.RESULT;
      this.isViewerActionSubmissionPending = false;
      this.automaticActionToken += 1;
      this.clearAllParticipantCountdowns();
      const presentation = this.requirePresentation();
      presentation.showPlayerActionControls(ACTION_CONTROL.HIDDEN, 0, this.tableStateModel);
      presentation.setRaiseSelectionVisible(false, [], 0, 0, false);
      return this.presentSettlement(settlementPayload, presentationEpoch);
    });
  }

  /**
   * 结算动画的完整时序：等待 -> 收最后下注 -> 摊牌 -> 高亮最佳牌 -> 底池飞向赢家 ->
   * 显示派奖/更新余额/播放胜利音效 -> 清场等待下一次 FaCards。
   * 每个等待点都检查 epoch，因此退出/重连不会继续操作已销毁牌桌。
   */
  private async presentSettlement(
    settlementPayload: SettlementPayload,
    presentationEpoch: number,
  ): Promise<void> {
    const settlementPresentation = createSettlementPresentation(this.tableStateModel, settlementPayload);
    if (!await this.delaySeconds(SOURCE_SETTLEMENT_OPENING_DELAY_SECONDS, presentationEpoch)) return;
    await this.collectStreetWagers(presentationEpoch);
    if (!await this.delaySeconds(SOURCE_SETTLEMENT_POT_DELAY_SECONDS, presentationEpoch)) return;
    this.renderSettlementShowdown(settlementPayload, settlementPresentation);
    this.playSourceSound('sound/jiesuantishi');
    if (!await this.delaySeconds(SOURCE_EVENT_TRANSITION_DELAY_SECONDS, presentationEpoch)) return;
    this.highlightPrimaryWinningCards(settlementPayload, settlementPresentation);
    await this.requirePresentation().animateStandardPotDistribution(settlementPresentation);
    if (!this.isPresentationEpochCurrent(presentationEpoch)) return;
    this.requirePresentation().renderSettlementAwardLabels(settlementPresentation);
    this.applySettlementBalances(settlementPayload.usergold);
    this.playSettlementWinAudio(settlementPresentation);
    if (!await this.delaySeconds(SOURCE_SETTLEMENT_CLEANUP_DELAY_SECONDS, presentationEpoch)) return;
    this.cleanupCompletedHandPresentation();
  }

  /**
   * 按服务端 cards 投影每位有摊牌数据的玩家：两张底牌、最佳五张、牌型、是否赢家/主赢家。
   */
  private renderSettlementShowdown(
    settlementPayload: SettlementPayload,
    settlementPresentation: DzpkSettlementPresentation,
  ): void {
    const cardsByParticipant = settlementPayload.cards ?? {};
    Object.keys(cardsByParticipant).forEach((participantId) => {
      const participant = this.tableStateModel.findParticipantByIdIfPresent(participantId);
      if (!participant) return;
      const cardProjection = cardsByParticipant[participantId] ?? {};
      const holeCards = safeCardArray(cardProjection.hcards);
      const bestFiveCards = safeCardArray(cardProjection.cards);
      if (holeCards.length < 2 || bestFiveCards.length < 5) return;
      const normalizedParticipantId = normalizeSourceIdentity(participantId);
      const isWinner = settlementPresentation.winningParticipantUids.includes(normalizedParticipantId);
      const isPrimaryWinner = normalizedParticipantId === settlementPresentation.primaryWinnerUid;
      participant.holeCards = holeCards;
      this.requirePresentation().renderParticipantShowdown(
        participant.viewerLocalSeatId,
        holeCards,
        bestFiveCards,
        typeof cardProjection.value === 'string' ? cardProjection.value : '0',
        isWinner,
        isPrimaryWinner,
      );
      if (sourceIdentityEquals(participant.participantId, this.viewerParticipantId())) {
        this.requirePresentation().renderViewerHandCategory(
          typeof cardProjection.value === 'string' ? cardProjection.value : null,
        );
      }
    });
  }

  /** 从主赢家最佳五张中找公共牌部分，把未参与最佳组合的桌面牌灰化。 */
  private highlightPrimaryWinningCards(
    settlementPayload: SettlementPayload,
    settlementPresentation: DzpkSettlementPresentation,
  ): void {
    const primaryCards = readIdentityMapValue(
      settlementPayload.cards,
      settlementPresentation.primaryWinnerUid,
    ) as SettlementCardProjection | undefined;
    if (!primaryCards) return;
    this.requirePresentation().highlightWinningCommunityCards(
      safeCardArray(primaryCards.cards),
      this.tableStateModel.publicBoardCards.slice(),
    );
  }

  /** 使用 Result.usergold 覆盖每位玩家结算后的权威桌上筹码，而不是本地自行加减派奖。 */
  private applySettlementBalances(balanceByParticipant: unknown): void {
    const balanceMap = asSourceRecord(balanceByParticipant);
    Object.keys(balanceMap).forEach((participantId) => {
      const participant = this.tableStateModel.findParticipantByIdIfPresent(participantId);
      if (!participant) return;
      participant.stackChips = nonNegativeChipAmount(balanceMap[participantId]);
      this.requirePresentation().renderParticipantChipBalance(
        participant.viewerLocalSeatId,
        participant.stackChips,
      );
    });
  }

  /** 主派奖超过 100 个小盲播放大胜音效，否则播放普通胜利音效；只影响声音。 */
  private playSettlementWinAudio(settlementPresentation: DzpkSettlementPresentation): void {
    const primaryAward = nonNegativeChipAmount(
      settlementPresentation.payoutAmountByUid[settlementPresentation.primaryWinnerUid],
    );
    const blindUnit = Math.max(1, this.tableStateModel.smallBlindChips);
    this.playSourceSound(primaryAward / blindUnit > 100 ? 'sound/bigying' : 'sound/ying');
  }

  /**
   * 结算展示结束后的纯画面清理：底池/牌/动作归零，玩家资料和结算后 stack 保留，等待服务端下一手。
   */
  private cleanupCompletedHandPresentation(): void {
    this.tableStateModel.totalPotChips = 0;
    this.tableStateModel.collectedPreviousStreetPotChips = 0;
    this.tableStateModel.currentActionNotice = [];
    const presentation = this.requirePresentation();
    presentation.renderTotalPotAmount(0);
    presentation.renderCollectedPotAmount(0, true);
    presentation.renderWagerDifferenceAmount(0);
    presentation.renderViewerHandCategory(null);
    presentation.renderExistingCommunityCards([]);
    presentation.showTableStatusTip('oth', true);
    this.tableStateModel.participants.forEach((participant) => {
      participant.holeCards = [];
      participant.displayedStreetContributionChips = 0;
      participant.sourceActionCode = 0;
      participant.isParticipating = false;
      void presentation.animateParticipantCardsRecovery(participant.viewerLocalSeatId);
      presentation.hideParticipantActionBadge(participant.viewerLocalSeatId);
      presentation.restoreParticipantHoleCardColors(participant.viewerLocalSeatId);
      presentation.setParticipantFoldedAppearance(participant.viewerLocalSeatId, true);
    });
  }

  /** `ChangGold` 是服务端主动余额刷新；直接覆盖指定玩家 stack。 */
  private handleParticipantBalanceChanged(balancePayload: SourceRecord): Promise<unknown> {
    return this.enqueuePresentationWork(() => {
      const participant = this.tableStateModel.findParticipantByIdIfPresent(balancePayload.uid);
      if (!participant) return;
      participant.stackChips = nonNegativeChipAmount(balancePayload.gold);
      this.requirePresentation().renderParticipantChipBalance(
        participant.viewerLocalSeatId,
        participant.stackChips,
      );
    });
  }

  /** 兼容原 local_Event/up_Gold：从共享上下文把自己的最新值投影回桌面。 */
  private handleLegacyGoldRefreshRequested(): void {
    const viewer = this.tableStateModel.viewerParticipant;
    if (!viewer) return;
    const currentGold = Number(requireDzpkRuntimeServices().gameContext.getKey('gold'));
    if (!Number.isFinite(currentGold) || currentGold < 0) return;
    void this.handleParticipantBalanceChanged({ uid: viewer.participantId, gold: currentGold });
  }

  /** socket 关闭时取消自动动作/提交锁、倒计时和按钮，防止离线状态继续接受输入。 */
  private handleNetworkStateChanged(networkState: unknown): void {
    if (!String(networkState).includes('已关闭')) return;
    this.automaticActionToken += 1;
    this.isViewerActionSubmissionPending = false;
    this.clearAllParticipantCountdowns();
    this.requirePresentation().showPlayerActionControls(ACTION_CONTROL.HIDDEN, 0, this.tableStateModel);
  }

  /** 请求发送失败时，只有仍处于 viewer 当前行动 notice 才恢复下注按钮。 */
  private restoreViewerActionControlsIfApplicable(): void {
    const notice = this.tableStateModel.currentActionNotice;
    if (!notice || Array.isArray(notice)) return;
    if (!sourceIdentityEquals(notice.uid, this.viewerParticipantId())) return;
    this.requirePresentation().showPlayerActionControls(
      ACTION_CONTROL.BETTING,
      this.tableStateModel.callAmountChips,
      this.tableStateModel,
    );
  }

  // ────────────────── 6. 原 Prefab 按钮入口 ──────────────────

  private viewerParticipantId(): SourceIdentity | null {
    return this.tableStateModel.viewerParticipant?.participantId ?? null;
  }

  // 原协议用 gold=-1 表示弃牌、0 表示过牌、正整数表示本次要贡献的筹码。
  public requestFoldAction(_event?: Event): boolean { return this.submitPlayerActionContribution(-1); }
  public requestCallAction(_event?: Event): boolean {
    return this.submitPlayerActionContribution(this.tableStateModel.callAmountChips);
  }
  public requestCheckAction(_event?: Event): boolean { return this.submitPlayerActionContribution(0); }

  /** 打开原加注面板，按当前底池/盲注/stack 生成档位并播放按钮声。 */
  public openRaiseSelection(_event?: Event): void {
    const viewer = this.viewerParticipantForActionIfEligible();
    if (!viewer) return;
    const raisePresets = this.tableStateModel.calculateRaiseSelectionPresetContributions();
    this.requirePresentation().setRaiseSelectionVisible(
      true,
      raisePresets,
      viewer.stackChips,
      this.tableStateModel.smallBlindChips,
    );
    requireDzpkRuntimeServices().audioService.playButtonSound();
  }

  /** 关闭加注层并恢复原下注按钮层。 */
  public closeRaiseSelection(_event?: Event): void {
    this.requirePresentation().setRaiseSelectionVisible(false, [], 0, 0);
    requireDzpkRuntimeServices().audioService.playButtonSound();
  }

  /** 翻牌前快捷倍率按钮：Prefab 传索引，模型计算实际贡献，再走统一提交。 */
  public requestPreflopPresetByIndex(_event?: Event, presetIndexValue?: string): boolean {
    return this.submitIndexedContribution(
      this.tableStateModel.calculatePreflopBlindPresetContributions(),
      presetIndexValue,
    );
  }

  /** 翻牌后半池/2/3 池/满池按钮。 */
  public requestPostflopPresetByIndex(_event?: Event, presetIndexValue?: string): boolean {
    return this.submitIndexedContribution(
      this.tableStateModel.calculatePostflopPotPresetContributions(),
      presetIndexValue,
    );
  }

  private submitIndexedContribution(presets: number[], presetIndexValue?: string): boolean {
    const presetIndex = requireArrayIndex(presetIndexValue, presets.length);
    return this.submitPlayerActionContribution(presets[presetIndex]);
  }

  /** 从被点击 Node 向父级查找运行时绑定的加注金额，再走统一提交，避免相信按钮文字。 */
  public submitRaiseSelectionFromButton(buttonEvent?: Event): boolean {
    return this.submitPlayerActionContribution(
      this.requirePresentation().readContributionFromButtonTarget(buttonEvent?.target),
    );
  }

  /** Prefab Slider 回调只转交给 Presentation，同步滑杆、进度条、金额和 All-in 动画。 */
  public handleRaiseSliderChanged(sliderEvent?: Event): void {
    this.requirePresentation().handleRaiseSliderChanged(sliderEvent);
  }

  /** 三个自动动作互斥；再次点已选项会取消，状态和 Toggle 画面同步。 */
  public toggleAutomaticActionSelection(_event?: Event, selectionIndexValue?: string): void {
    const selectionIndex = requireArrayIndex(
      selectionIndexValue,
      this.tableStateModel.automaticActionSelections.length,
    );
    const wasSelected = this.tableStateModel.automaticActionSelections[selectionIndex] === 1;
    this.tableStateModel.automaticActionSelections = [0, 0, 0];
    if (!wasSelected) this.tableStateModel.automaticActionSelections[selectionIndex] = 1;
    this.requirePresentation().synchronizeAutomaticActionToggles(wasSelected ? -1 : selectionIndex);
    requireDzpkRuntimeServices().audioService.playButtonSound();
  }

  private clearAutomaticActionSelection(): void {
    this.tableStateModel.automaticActionSelections = [0, 0, 0];
    this.requirePresentation().synchronizeAutomaticActionToggles(-1);
  }

  /**
   * 所有弃/过/跟/加/All-in 的唯一发送入口：
   * 先校验整数范围、是否轮到自己、是否超过 stack 和防重复锁；发送前隐藏按钮，成功与否都不在
   * 客户端预改筹码。只有后续服务端 ActBet 成功广播才更新模型；发送异常会释放锁并恢复按钮。
   */
  public submitPlayerActionContribution(contributionValue: unknown): boolean {
    const contribution = Number(contributionValue);
    if (!Number.isSafeInteger(contribution) || contribution < -1) {
      throw new Error('DZPK action contribution must be an integer of at least -1');
    }
    const viewer = this.viewerParticipantForActionIfEligible();
    if (!viewer) return false;
    if (contribution > viewer.stackChips) throw new Error('DZPK action contribution exceeds the viewer stack');
    if (this.isViewerActionSubmissionPending) return false;
    this.isViewerActionSubmissionPending = true;
    const presentation = this.requirePresentation();
    presentation.showPlayerActionControls(ACTION_CONTROL.HIDDEN, 0, this.tableStateModel);
    presentation.setRaiseSelectionVisible(false, [], 0, 0, false);
    try {
      requireDzpkRuntimeServices().authenticatedTransport.sendSourceEvent(
        SOURCE_EVENT.PARTICIPANT_ACTION_APPLIED,
        { gold: contribution },
      );
      requireDzpkRuntimeServices().audioService.playButtonSound();
      return true;
    } catch (sendError) {
      this.isViewerActionSubmissionPending = false;
      this.restoreViewerActionControlsIfApplicable();
      throw sendError;
    }
  }

  /** 同时检查参局、未弃牌、存在 notice 且 notice.uid 正是自己，才允许提交动作。 */
  private viewerParticipantForActionIfEligible(): DzpkParticipantState | null {
    const viewer = this.tableStateModel.viewerParticipant;
    if (!viewer || !viewer.isParticipating || viewer.sourceActionCode === SOURCE_ACTION.FOLD) {
      return null;
    }
    const actionNotice = this.tableStateModel.currentActionNotice;
    if (
      !actionNotice ||
      Array.isArray(actionNotice) ||
      !sourceIdentityEquals(actionNotice.uid, viewer.participantId)
    ) return null;
    return viewer;
  }

  /**
   * 牌桌返回只发送原 `Msg_DZPK_Out`。服务端会在必要时合法折牌并完成资金结算；收到成功 Out 后
   * handleParticipantLeft 才真正销毁桌面回 Room。`isRoomReturnPending` 防止连续点击重复请求。
   */
  public requestReturnToRoomSelection(_event?: Event): boolean {
    if (this.isRoomReturnPending) return false;
    requireDzpkRuntimeServices().audioService.playCloseSound();
    this.isRoomReturnPending = true;
    try {
      requireDzpkRuntimeServices().authenticatedTransport.sendSourceEvent(SOURCE_EVENT.PARTICIPANT_LEFT, []);
      return true;
    } catch (returnRequestError) {
      this.isRoomReturnPending = false;
      throw returnRequestError;
    }
  }

  /** 原牌桌 Bank 按钮在独立工程不适用，只提示，不触碰钱包。 */
  public handleUnavailableBankRequest(_event?: Event): boolean {
    requireDzpkRuntimeServices().uiMessageService.showTips('独立游戏不提供银行入口');
    return false;
  }

  /**
   * 兼容原 Prefab 的通用按钮回调名，把旧 actionName 映射到新的可读方法；序列化重绑完成前不能删除。
   */
  public handleLegacyPrimaryButton(_event?: Event, legacyActionName?: string): boolean | void {
    const actionByName: Record<string, () => boolean | void> = {
      bank: () => this.handleUnavailableBankRequest(),
      hall: () => this.requestReturnToRoomSelection(),
      qi: () => this.requestFoldAction(),
      gen: () => this.requestCallAction(),
      rang: () => this.requestCheckAction(),
      jia: () => this.openRaiseSelection(),
      closeJz: () => this.closeRaiseSelection(),
    };
    return actionByName[String(legacyActionName)]?.() ?? false;
  }

  // ────────────────── 7. 动画任务队列与通用收尾 ──────────────────

  /**
   * 把表现任务串到队尾。前一个 Promise 即使失败也会被统一记录，队列不会变成永久 rejected。
   * 任务执行前核对 epoch，跳过已被新快照/退出废弃的旧工作。
   */
  private enqueuePresentationWork(
    presentationWork: (presentationEpoch: number) => unknown,
  ): Promise<unknown> {
    const presentationEpoch = this.presentationEpoch;
    this.presentationQueue = this.presentationQueue
      .then(() => {
        if (!this.isPresentationEpochCurrent(presentationEpoch)) return undefined;
        return presentationWork(presentationEpoch);
      })
      .catch((presentationError) => this.logPresentationFailure(presentationError));
    return this.presentationQueue;
  }

  /**
   * 用于 RoomInfo/FaCards/自己 Out 等强边界：推进 epoch、取消自动动作、丢弃旧队列，再从新事实开始。
   */
  private replacePresentationQueue(
    presentationWork: (presentationEpoch: number) => unknown,
  ): Promise<unknown> {
    this.presentationEpoch += 1;
    this.automaticActionToken += 1;
    this.presentationQueue = Promise.resolve();
    return this.enqueuePresentationWork(presentationWork);
  }

  private isPresentationEpochCurrent(presentationEpoch: number): boolean {
    return presentationEpoch === this.presentationEpoch && isValid(this, true);
  }

  /**
   * 把 Cocos `scheduleOnce` 包成 Promise；等待结束时返回 epoch 是否仍有效，调用方可立即停止旧动画链。
   */
  private delaySeconds(seconds: number, presentationEpoch?: number): Promise<boolean> {
    return new Promise((resolve) => {
      this.scheduleOnce(() => {
        resolve(presentationEpoch === undefined || this.isPresentationEpochCurrent(presentationEpoch));
      }, seconds);
    });
  }

  /** 表现错误既写 Console 便于开发定位，也显示玩家提示；不会伪造后端状态。 */
  private logPresentationFailure(presentationError: unknown): void {
    const message = presentationError instanceof Error ? presentationError.message : String(presentationError);
    console.error(`[DZPK presentation] ${message}`, presentationError);
    requireDzpkRuntimeServices().uiMessageService.showTips(message);
  }

  private playSourceSound(soundPath: string): void {
    requireDzpkRuntimeServices().audioService.playSound(soundPath);
  }
}
