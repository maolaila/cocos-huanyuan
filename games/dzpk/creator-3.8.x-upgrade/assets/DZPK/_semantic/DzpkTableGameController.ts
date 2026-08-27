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
 * Source-order table state orchestrator. Presentation stays on the original
 * 321-node Prefab; money, dealing and settlement remain server-authoritative.
 */
@ccclass('DzpkTableGameController')
export class DzpkTableGameController extends Component {
  private readonly tableStateModel = new DzpkTableStateModel();
  private tablePresentation: DzpkTablePresentation | null = null;
  private sourceEventSubscriptions: EventSubscription[] = [];
  private presentationQueue: Promise<unknown> = Promise.resolve();
  private presentationEpoch = 1;
  private automaticActionToken = 0;
  private isViewerActionSubmissionPending = false;
  private isRoomReturnPending = false;
  private lastSettlementFingerprint = '';

  public onLoad(): void {
    this.initializeSemanticController();
    this.subscribeToSourceTableEvents();
  }

  public onDestroy(): void {
    this.presentationEpoch += 1;
    this.automaticActionToken += 1;
    this.unsubscribeFromSourceTableEvents();
  }

  private initializeSemanticController(): void {
    const presentationComponent = this.node.getComponent(DzpkTablePresentation);
    if (!presentationComponent) throw new Error('DzpkTablePresentation must be attached to DZPKMain');
    this.tablePresentation = presentationComponent;
    presentationComponent.initializeTablePresentation();
  }

  private requirePresentation(): DzpkTablePresentation {
    if (!this.tablePresentation) throw new Error('DZPK table presentation is not initialized');
    return this.tablePresentation;
  }

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

  private unsubscribeFromSourceTableEvents(): void {
    const { eventBus } = requireDzpkRuntimeServices();
    this.sourceEventSubscriptions.forEach((subscription) => eventBus.unsubscribeSourceEvent(subscription));
    this.sourceEventSubscriptions = [];
  }

  private handleSourceEventFailure(eventName: string, sourceEnvelope?: SourceEnvelope<unknown>): void {
    this.isViewerActionSubmissionPending = false;
    if (eventName === SOURCE_EVENT.PARTICIPANT_LEFT) this.isRoomReturnPending = false;
    const message = sourceEnvelope?.msg ?? `${eventName} failed`;
    console.error(`[DZPK source] ${message}`);
    requireDzpkRuntimeServices().uiMessageService.showTips(message);
    this.restoreViewerActionControlsIfApplicable();
  }

  /** A reconnect snapshot supersedes delayed animation from the old socket. */
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

  private resetEverySeatPresentation(): void {
    const presentation = this.requirePresentation();
    for (let localSeat = 0; localSeat < SOURCE_TABLE_SEAT_COUNT; localSeat += 1) {
      presentation.resetParticipantSeatPresentation(localSeat);
      presentation.setParticipantSeatPresence(localSeat, null);
    }
    presentation.showPlayerActionControls(ACTION_CONTROL.HIDDEN, 0, this.tableStateModel);
    presentation.setRaiseSelectionVisible(false, [], 0, 0, false);
  }

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

  private restoreSnapshotActionTurn(): void {
    const notice = this.tableStateModel.currentActionNotice;
    if (!notice || Array.isArray(notice) || notice.uid === undefined) {
      this.requirePresentation().showPlayerActionControls(ACTION_CONTROL.HIDDEN, 0, this.tableStateModel);
      return;
    }
    void this.renderActionTurnNotice(notice, false);
  }

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

  private handleParticipantLeft(leavePayload: SourceRecord): Promise<unknown> {
    return this.enqueuePresentationWork(() => {
      const viewerLeft = sourceIdentityEquals(leavePayload.uid, this.viewerParticipantId());
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
          nonNegativeChipAmount(leavePayload.gold),
        );
      }
      this.renderSnapshotStatusTips();
    });
  }

  /** A FaCards event starts a server-owned hand; the client never requests one. */
  private handlePrivateCardsDealt(dealPayload: DealPayload): Promise<unknown> {
    return this.replacePresentationQueue((presentationEpoch) => {
      this.prepareModelForNewHand(dealPayload);
      this.prepareSeatsForNewHand();
      this.renderSnapshotDealerButton();
      return this.animateSourceDealOrder(dealPayload, presentationEpoch);
    });
  }

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

  private handleActionTurnStarted(actionNotice: SourceActionNotice): Promise<unknown> {
    return this.enqueuePresentationWork((presentationEpoch) =>
      this.renderActionTurnNotice(actionNotice, true, presentationEpoch));
  }

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

  private handleParticipantActionApplied(actionPayload: ActionPayload): Promise<unknown> {
    return this.enqueuePresentationWork(() => {
      if (actionPayload.uid === undefined || actionPayload.uid === null) {
        throw new Error('Msg_DZPK_ActBet requires actor uid');
      }
      const participant = this.tableStateModel.findParticipantByIdIfPresent(actionPayload.uid);
      if (!participant) throw new Error('ActBet actor is absent from the table snapshot');
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

  private playSettlementWinAudio(settlementPresentation: DzpkSettlementPresentation): void {
    const primaryAward = nonNegativeChipAmount(
      settlementPresentation.payoutAmountByUid[settlementPresentation.primaryWinnerUid],
    );
    const blindUnit = Math.max(1, this.tableStateModel.smallBlindChips);
    this.playSourceSound(primaryAward / blindUnit > 100 ? 'sound/bigying' : 'sound/ying');
  }

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

  private handleLegacyGoldRefreshRequested(): void {
    const viewer = this.tableStateModel.viewerParticipant;
    if (!viewer) return;
    const currentGold = Number(requireDzpkRuntimeServices().gameContext.getKey('gold'));
    if (!Number.isFinite(currentGold) || currentGold < 0) return;
    void this.handleParticipantBalanceChanged({ uid: viewer.participantId, gold: currentGold });
  }

  private handleNetworkStateChanged(networkState: unknown): void {
    if (!String(networkState).includes('已关闭')) return;
    this.automaticActionToken += 1;
    this.isViewerActionSubmissionPending = false;
    this.clearAllParticipantCountdowns();
    this.requirePresentation().showPlayerActionControls(ACTION_CONTROL.HIDDEN, 0, this.tableStateModel);
  }

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

  private viewerParticipantId(): SourceIdentity | null {
    return this.tableStateModel.viewerParticipant?.participantId ?? null;
  }

  public requestFoldAction(_event?: Event): boolean { return this.submitPlayerActionContribution(-1); }
  public requestCallAction(_event?: Event): boolean {
    return this.submitPlayerActionContribution(this.tableStateModel.callAmountChips);
  }
  public requestCheckAction(_event?: Event): boolean { return this.submitPlayerActionContribution(0); }

  public openRaiseSelection(_event?: Event): void {
    const viewer = this.requireViewerParticipantForAction();
    const raisePresets = this.tableStateModel.calculateRaiseSelectionPresetContributions();
    this.requirePresentation().setRaiseSelectionVisible(
      true,
      raisePresets,
      viewer.stackChips,
      this.tableStateModel.smallBlindChips,
    );
    requireDzpkRuntimeServices().audioService.playButtonSound();
  }

  public closeRaiseSelection(_event?: Event): void {
    this.requirePresentation().setRaiseSelectionVisible(false, [], 0, 0);
    requireDzpkRuntimeServices().audioService.playButtonSound();
  }

  public requestPreflopPresetByIndex(_event?: Event, presetIndexValue?: string): boolean {
    return this.submitIndexedContribution(
      this.tableStateModel.calculatePreflopBlindPresetContributions(),
      presetIndexValue,
    );
  }

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

  public submitRaiseSelectionFromButton(buttonEvent?: Event): boolean {
    return this.submitPlayerActionContribution(
      this.requirePresentation().readContributionFromButtonTarget(buttonEvent?.target),
    );
  }

  public handleRaiseSliderChanged(sliderEvent?: Event): void {
    this.requirePresentation().handleRaiseSliderChanged(sliderEvent);
  }

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

  public submitPlayerActionContribution(contributionValue: unknown): boolean {
    const contribution = Number(contributionValue);
    if (!Number.isSafeInteger(contribution) || contribution < -1) {
      throw new Error('DZPK action contribution must be an integer of at least -1');
    }
    const viewer = this.requireViewerParticipantForAction();
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

  private requireViewerParticipantForAction(): DzpkParticipantState {
    const viewer = this.tableStateModel.viewerParticipant;
    if (!viewer || !viewer.isParticipating || viewer.sourceActionCode === SOURCE_ACTION.FOLD) {
      throw new Error('DZPK viewer is not eligible to act');
    }
    return viewer;
  }

  public requestReturnToRoomSelection(_event?: Event): boolean {
    const viewer = this.tableStateModel.viewerParticipant;
    if (viewer?.isParticipating && viewer.sourceActionCode !== SOURCE_ACTION.FOLD) {
      requireDzpkRuntimeServices().uiMessageService.showTips('游戏正在进行中！');
      return false;
    }
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

  public handleUnavailableBankRequest(_event?: Event): boolean {
    requireDzpkRuntimeServices().uiMessageService.showTips('独立游戏不提供银行入口');
    return false;
  }

  /** Compatibility for study Prefabs that still route one generic source button callback. */
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

  private delaySeconds(seconds: number, presentationEpoch?: number): Promise<boolean> {
    return new Promise((resolve) => {
      this.scheduleOnce(() => {
        resolve(presentationEpoch === undefined || this.isPresentationEpochCurrent(presentationEpoch));
      }, seconds);
    });
  }

  private logPresentationFailure(presentationError: unknown): void {
    const message = presentationError instanceof Error ? presentationError.message : String(presentationError);
    console.error(`[DZPK presentation] ${message}`, presentationError);
    requireDzpkRuntimeServices().uiMessageService.showTips(message);
  }

  private playSourceSound(soundPath: string): void {
    requireDzpkRuntimeServices().audioService.playSound(soundPath);
  }
}
