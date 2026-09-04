/**
 * 学习导读：这是原 DZPKMain 321 节点 Prefab 的“表现层”。它只负责找原节点、换图片/文字、控制显隐
 * 和播放动画；它不决定谁赢、不洗牌、不校验真钱。业务顺序由 DzpkTableGameController 调用。
 *
 * 本文件常用的 Cocos 3.8 API：
 * - `Node`：场景树节点；`active/parent/children/position/scale/angle` 分别控制显隐、层级和变换。
 * - `Component` 与 `@property`：本组件及 Inspector 绑定的原节点/图集，字段名不可随意修改。
 * - `Sprite/SpriteFrame/SpriteAtlas`：把牌背、牌面、花色、动作和牌型图片放入原 Sprite。
 * - `Label`：显示筹码/底池/房间文字；金额统一在原宽度内压缩，不改变真实数值。
 * - `Button/Toggle/Slider/ProgressBar`：操作按钮、自动操作选择、加注滑杆及其可见进度。
 * - `Animation`：播放 Creator 动画剪辑；3.8 中 `play()` 返回 void，要再 `getState()` 调速度。
 * - `tween/Tween`：补间位置、缩放、旋转、透明度；`Tween.stopAllByTarget` 停止同节点旧动画。
 * - `instantiate`：克隆原结算/牌/筹码模板；高频牌和筹码通过 DzpkNodePool 回收复用。
 * - `scheduleOnce`：随组件生命周期执行延迟回调；`isValid` 防止回调操作已销毁的临时节点。
 * - `view.getVisibleSize()`：按真实屏宽调整原 All-in 横幅比例。
 *
 * 阅读建议：先看 initialize 和座位/牌面渲染，再看下注控件，最后看发牌、收筹码、派奖和摊牌动画。
 */
import {
  Animation, Button, Component, Event, Label, Node, ProgressBar, Slider, Sprite,
  SpriteAtlas, Toggle, Tween, Vec3, instantiate, isValid, tween, view, _decorator,
} from 'cc';
import { DzpkNodePool } from '../../Standalone/DzpkNodePool';
import { requireDzpkRuntimeServices } from '../../Standalone/DzpkRuntimeServices';
import {
  ORIGINAL_ASH_COLOR,
  ORIGINAL_WHITE_COLOR,
  applyDzpkAmountLabel,
  applyNodeOpacity,
  constrainSingleLineLabel,
  convertNodeOriginToLocal,
  formatDzpkCurrencyAmount,
  hideOriginalChildNodes,
  playOriginalSpine,
  setOriginalAvatar,
  setOriginalNodeColor,
  truncateSourceDisplayName,
  type DzpkAmountLabelOptions,
} from '../../Standalone/DzpkUiHelpers';
import {
  DzpkParticipantState,
  DzpkTableStateModel,
  SOURCE_TABLE_SEAT_COUNT,
} from './DzpkTableStateModel';
import {
  SliderProgressSource,
  collectAwardDestinationSeats,
  randomInteger,
  readSliderProgress,
  requireArrayItem,
  requireBinding,
  requireChild,
  requireComponent,
  requireNode,
  requireOpacity,
  sourceHiddenSeatPosition,
} from './DzpkTablePresentationSupport';
import type { DzpkSettlementPresentation } from './DzpkTablePresentationTypes';

const { ccclass, property } = _decorator;
const DEAL_CARD_OVERLAY_COUNT = 2;
const WAGER_CHIP_ANIMATION_COUNT = 3;
const POT_CHIP_ANIMATION_COUNT = 5;

interface TableRoomConfiguration {
  doublescore?: number | string;
  vals?: { ante?: number | string };
}

/** Creator 3.8 原 DZPKMain 表现层：只迁移渲染 API 和时序，不重画 source 节点树。 */
@ccclass('DzpkTablePresentation')
export class DzpkTablePresentation extends Component {
  // 这些字段由官方导入后的 Prefab Inspector 绑定；null 表示迁移丢绑定，运行时会明确报错。
  @property(Node) public opponentWaitingTipNode: Node | null = null;
  @property(Node) public participantSeatRootNode: Node | null = null;
  @property(Label) public totalPotLabel: Label | null = null;
  @property(Node) public collectedPotNode: Node | null = null;
  @property(SpriteAtlas) public cardSpriteAtlas: SpriteAtlas | null = null;
  @property(SpriteAtlas) public handCategorySpriteAtlas: SpriteAtlas | null = null;

  private viewerMaximumChipAmount = 0;
  private minimumRaiseContributionChips = 0;
  private cardNodePool: DzpkNodePool | null = null;
  private chipNodePool: DzpkNodePool | null = null;
  private allInBannerToken = 0;
  private readonly countdownTokenBySeat = Array<number>(SOURCE_TABLE_SEAT_COUNT).fill(0);
  // WeakMap 保存临时运行态，不把 sourcePosition/betGold 等自造属性写到 Cocos Node 上。
  private readonly sourcePositionByNode = new WeakMap<Node, Vec3>();
  private readonly contributionByButtonNode = new WeakMap<Node, number>();

  // ────────────────── 1. 初始化、房间标题和座位资料 ──────────────────

  /**
   * 牌桌首次初始化：隐藏六座模板、渲染房间标题、用原 item 预热牌/筹码池、清公共牌和对手底牌，
   * 再启动原环境 Spine。模板放入 NodePool 后不再作为场景中的可见节点。
   */
  public initializeTablePresentation(): void {
    this.viewerMaximumChipAmount = 0;
    this.minimumRaiseContributionChips = 0;
    hideOriginalChildNodes(requireBinding(this.participantSeatRootNode, 'participantSeatRootNode'));
    this.renderOriginalRoomTitle();

    const cardTemplate = requireChild(requireChild(this.node, 's_pos'), 'item');
    this.cardNodePool = new DzpkNodePool(cardTemplate, 10);
    this.cardNodePool.release(cardTemplate);
    const chipTemplate = requireChild(requireChild(this.node, 'chip'), 'item');
    this.chipNodePool = new DzpkNodePool(chipTemplate, 10);
    this.chipNodePool.release(chipTemplate);

    this.hideAllOpponentHoleCards();
    this.renderExistingCommunityCards([]);
    this.playAmbientTableAnimation(randomInteger(1, 4));
    const allInBanner = requireChild(this.node, 'allBet');
    const bannerScale = allInBanner.scale;
    allInBanner.setScale(bannerScale.x, view.getVisibleSize().width / 1334, bannerScale.z);
  }

  /** 牌桌销毁时清两个对象池，避免返回 Room 后仍持有旧节点。 */
  public onDestroy(): void {
    this.cardNodePool?.clear();
    this.chipNodePool?.clear();
  }

  /**
   * RoomInfo 到来前按 gameContext.roomLevel 显示标题；配置存在时用动态盲注/前注，否则保留原文案兜底。
   */
  public renderOriginalRoomTitle(): void {
    const { gameContext } = requireDzpkRuntimeServices();
    const roomLevelIndex = Math.max(
      0,
      Number(gameContext.roomLevel || 1) - 1,
    );
    const roomNames = ['体验场', '新手场', '初级场', '中级场', '高级场'];
    const sourceFallbackDescriptions = ['1万/2万  前注:20万', '1千/2千  前注:2万', '5千/1万  前注:10万'];
    const roomName = roomNames[roomLevelIndex] ?? roomNames[0];
    const roomConfiguration = gameContext.roomConfig[String(roomLevelIndex + 1)] as TableRoomConfiguration | undefined;
    const smallBlindAmount = Number(roomConfiguration?.doublescore) || 0;
    const anteAmount = Number(roomConfiguration?.vals?.ante) || 0;
    const blindDescription = smallBlindAmount > 0 && anteAmount > 0
      ? `${this.formatTableAmount(smallBlindAmount, 5, 0)}/${this.formatTableAmount(
        smallBlindAmount * 2,
        5,
        0,
      )}  前注:${this.formatTableAmount(anteAmount, 6, 0)}`
      : sourceFallbackDescriptions[roomLevelIndex]
        ?? sourceFallbackDescriptions[sourceFallbackDescriptions.length - 1];
    const roomTitleLabel = requireComponent(requireChild(this.node, 'gameType'), Label);
    constrainSingleLineLabel(roomTitleLabel);
    roomTitleLabel.string = `${roomName}  小/大盲注:${blindDescription}`;
  }

  /** 播放一次原桌面随机 Spine，完成后若组件仍存在，再随机播放下一段；不影响牌局随机。 */
  public playAmbientTableAnimation(animationIndex: number): void {
    const ambientSpineNode = requireChild(this.node, 'spine');
    playOriginalSpine(ambientSpineNode, `suiji${animationIndex}`, false, () => {
      if (isValid(this, true)) this.playAmbientTableAnimation(randomInteger(1, 4));
    });
  }

  /**
   * 控制一个座位加入/离开：先停止旧 Tween；加入从屏外滑入，离开滑出后才 inactive。
   * `participantState=null` 只清画面，不等于服务端删除玩家。
   */
  public setParticipantSeatPresence(
    localSeatId: number,
    participantState: DzpkParticipantState | null,
  ): void {
    const seatNode = this.requireSeat(localSeatId);
    const informationNode = requireChild(seatNode, 'info');
    Tween.stopAllByTarget(informationNode);
    if (participantState) {
      informationNode.setPosition(sourceHiddenSeatPosition(localSeatId));
      seatNode.active = true;
      this.renderParticipantProfile(localSeatId, participantState);
      this.resetParticipantSeatPresentation(localSeatId);
      tween(informationNode).to(0.25, { position: Vec3.ZERO }).start();
      return;
    }
    if (!seatNode.active) return;
    tween(informationNode)
      .to(0.25, { position: sourceHiddenSeatPosition(localSeatId) })
      .call(() => { seatNode.active = false; })
      .start();
  }

  /** 把头像、三显示单位短昵称和筹码写入原 info 节点；头像加载失败只告警，不阻塞牌局。 */
  public renderParticipantProfile(localSeatId: number, participantState: DzpkParticipantState): void {
    const informationNode = requireChild(this.requireSeat(localSeatId), 'info');
    const headSprite = requireComponent(requireChild(informationNode, 'head'), Sprite);
    void setOriginalAvatar(headSprite, participantState.avatarKey).catch((avatarError) => {
      console.warn('[DZPK avatar]', avatarError);
    });
    const participantNameLabel = requireComponent(requireChild(informationNode, 'name'), Label);
    constrainSingleLineLabel(participantNameLabel);
    participantNameLabel.string = truncateSourceDisplayName(
      participantState.displayName,
      3,
      false,
    );
    this.renderParticipantChipBalance(localSeatId, participantState.stackChips);
  }

  /** 在每个座位原 gold Label 中用当前币种短格式显示桌上筹码。 */
  public renderParticipantChipBalance(localSeatId: number, chipAmount: number): void {
    const goldNode = requireChild(requireChild(this.requireSeat(localSeatId), 'info'), 'gold');
    this.renderAmountLabel(
      requireComponent(goldNode, Label),
      chipAmount,
      6,
      2,
    );
  }

  /** 清一个座位上一手的动作、倒计时、下注和底牌，但不删除玩家资料。 */
  public resetParticipantSeatPresentation(localSeatId: number): void {
    this.renderParticipantActionBadge(localSeatId, null);
    this.renderParticipantActionCountdown(localSeatId, null);
    void this.animateParticipantWager(localSeatId, null);
    this.renderParticipantHoleCards(localSeatId, null, null);
    this.setParticipantFoldedAppearance(localSeatId, true);
  }

  // ────────────────── 2. 玩家动作、倒计时、下注和底牌 ──────────────────

  /**
   * 把 source 动作码映射到原图集 `t*.png`，并切换昵称/All-in 小标。All-in 还显示 3 秒全桌横幅；
   * token 保证较新的横幅不会被旧定时回调提前关闭。
   */
  public renderParticipantActionBadge(
    localSeatId: number,
    sourceActionCode: number | string | null,
    shouldPlayAllInBanner = true,
  ): void {
    const informationNode = requireChild(this.requireSeat(localSeatId), 'info');
    const actionBadgeNode = requireChild(informationNode, 'tips');
    const actionSpriteIndexByCode: Record<string, number> = {
      '6': 4, '4': 1, '5': 2, '3': 0, '3_0': 3,
    };
    const actionSpriteIndex = actionSpriteIndexByCode[String(sourceActionCode)] ?? -1;
    const hasActionBadge = actionSpriteIndex !== -1;
    actionBadgeNode.active = hasActionBadge;
    requireChild(informationNode, 'name').active = !hasActionBadge;
    requireChild(informationNode, 'allBet').active = actionSpriteIndex === 4;
    if (!hasActionBadge) return;
    requireComponent(actionBadgeNode, Sprite).spriteFrame =
      requireBinding(this.handCategorySpriteAtlas, 'handCategorySpriteAtlas')
        .getSpriteFrame(`t${actionSpriteIndex}.png`);
    if (actionSpriteIndex !== 4 || !shouldPlayAllInBanner) return;
    const allInBannerToken = ++this.allInBannerToken;
    const allInBannerNode = requireChild(this.node, 'allBet');
    allInBannerNode.active = true;
    this.scheduleOnce(() => {
      if (allInBannerToken === this.allInBannerToken) allInBannerNode.active = false;
    }, 3);
  }

  /**
   * 播放座位原倒计时 Animation。Creator 3.8 `play()` 不返回 AnimationState，所以先 play，再用
   * `defaultClip.name -> getState()` 设置速度，使完整剪辑刚好在 remainingSeconds 内播完。
   * viewer 剩 3 秒时播放提示音；每座 token 防止旧计时器误响。
   */
  public renderParticipantActionCountdown(localSeatId: number, remainingSeconds: number | null): void {
    const countdownToken = ++this.countdownTokenBySeat[localSeatId];
    const countdownNode = requireChild(requireChild(this.requireSeat(localSeatId), 'info'), 'prog');
    const countdownAnimation = requireComponent(countdownNode, Animation);
    countdownNode.active = Boolean(remainingSeconds);
    countdownAnimation.stop();
    if (!remainingSeconds) return;
    countdownAnimation.play();
    if (countdownAnimation.defaultClip) {
      countdownAnimation.getState(countdownAnimation.defaultClip.name).speed = 1 / remainingSeconds;
    }
    if (remainingSeconds > 3 && localSeatId === 0) {
      this.scheduleOnce(() => {
        if (countdownToken === this.countdownTokenBySeat[localSeatId] && countdownNode.active) {
          requireDzpkRuntimeServices().audioService.playSound('sound/half_time');
        }
      }, remainingSeconds - 3);
    }
  }

  /**
   * 显示座位下注。无需动画时直接改原 Label；需要动画时从筹码池依次取 3 个节点飞到下注锚点，
   * 回收后才显示最终下注牌。坐标通过世界->局部转换，因 seat 和 chipRoot 不在同一父节点。
   */
  public async animateParticipantWager(
    localSeatId: number,
    wagerChips: number | null,
    shouldAnimate = true,
  ): Promise<void> {
    const seatNode = this.requireSeat(localSeatId);
    const wagerNode = requireChild(seatNode, 'bet');
    if (!wagerChips) {
      wagerNode.active = false;
      return;
    }
    const renderWager = (): void => {
      wagerNode.active = true;
      this.renderAmountLabel(
        requireComponent(requireChild(wagerNode, 'label'), Label),
        wagerChips,
        5,
        2,
      );
    };
    if (!shouldAnimate) {
      renderWager();
      return;
    }

    requireDzpkRuntimeServices().audioService.playSound('sound/hechip');
    const chipRoot = requireChild(this.node, 'chip');
    const destination = convertNodeOriginToLocal(requireNode('bet/img', seatNode), chipRoot);
    const movingChips: Node[] = [];
    for (let animationIndex = 0; animationIndex < WAGER_CHIP_ANIMATION_COUNT; animationIndex += 1) {
      const movingChip = this.requireChipPool().acquire();
      movingChip.parent = chipRoot;
      movingChip.setPosition(seatNode.position);
      movingChip.active = true;
      movingChips.push(movingChip);
      Tween.stopAllByTarget(movingChip);
      tween(movingChip).to(0.15, { position: destination }).start();
      await this.delaySeconds(0.075);
    }
    await this.delaySeconds(0.075);
    movingChips.forEach((movingChip) => this.requireChipPool().release(movingChip));
    renderWager();
  }

  /**
   * viewer(本地 0 号位)显示真实两张牌；对手仅由发牌动画显示牌背，结算前不泄露底牌；弃牌时隐藏。
   */
  public renderParticipantHoleCards(
    localSeatId: number,
    sourceCards: readonly number[] | null,
    sourceActionCode: number | null,
  ): void {
    const participantCardRoot = requireChild(this.requireSeat(localSeatId), 'poker');
    participantCardRoot.active = Boolean(sourceCards);
    if (!sourceCards && localSeatId === 0) this.renderViewerHandCategory(null);
    if (sourceActionCode === 5 && localSeatId !== 0) {
      participantCardRoot.active = false;
      return;
    }
    if (!sourceCards?.length || participantCardRoot.parent?.name !== '0') return;
    sourceCards.forEach((sourceCard, cardIndex) => {
      const participantCardNode = requireArrayItem(participantCardRoot.children, cardIndex, 'hole card');
      hideOriginalChildNodes(participantCardNode);
      requireComponent(participantCardNode, Sprite).spriteFrame =
        requireBinding(this.cardSpriteAtlas, 'cardSpriteAtlas').getSpriteFrame('plist_puke_front_big');
      this.renderCardFace(sourceCard, participantCardNode);
      setOriginalNodeColor(
        participantCardNode,
        sourceActionCode === 5 ? ORIGINAL_ASH_COLOR : ORIGINAL_WHITE_COLOR,
      );
    });
  }

  /** 弃牌玩家整块 info 递归灰化；恢复时回原白色。 */
  public setParticipantFoldedAppearance(localSeatId: number, isActiveParticipant: boolean): void {
    setOriginalNodeColor(
      requireChild(this.requireSeat(localSeatId), 'info'),
      isActiveParticipant ? ORIGINAL_WHITE_COLOR : ORIGINAL_ASH_COLOR,
    );
  }

  /** 初始化/清场时隐藏 1–5 号对手底牌并恢复颜色，0 号 viewer 单独处理。 */
  public hideAllOpponentHoleCards(): void {
    for (let localSeatId = 1; localSeatId < SOURCE_TABLE_SEAT_COUNT; localSeatId += 1) {
      const participantCardRoot = requireChild(this.requireSeat(localSeatId), 'poker');
      participantCardRoot.active = false;
      setOriginalNodeColor(participantCardRoot, ORIGINAL_WHITE_COLOR);
    }
  }

  // ────────────────── 3. 扑克牌图片、庄位和底池 ──────────────────

  /**
   * 把 source 牌码（点数×100 + 1-based 花色）转换成原图集帧名；A 的 source 点数 14 映射图片编号 1。
   */
  public resolvePokerSpriteFrameNames(sourceCardCode: number): {
    rankFrameName: string;
    largeSuitFrameName: string;
    smallSuitFrameName: string;
  } {
    let sourceRank = Math.floor(sourceCardCode / 100);
    const zeroBasedSuitIndex = sourceCardCode % 100 - 1;
    if (sourceRank >= 14) sourceRank = 1;
    return {
      rankFrameName: `plist_puke_value_${zeroBasedSuitIndex % 2}_${sourceRank}`,
      largeSuitFrameName: `plist_puke_color_big_${zeroBasedSuitIndex}`,
      smallSuitFrameName: `plist_puke_color_small_${zeroBasedSuitIndex}`,
    };
  }

  /**
   * 在原牌节点中分别替换 `p` 点数、`xh` 大花色、`dh` 角标小花色。这里修复过大小花色误用，
   * 必须继续遵循原 79×83 大图和 32×32 小图映射。
   */
  public renderCardFace(sourceCardCode: number, cardNode: Node): void {
    const frameNames = this.resolvePokerSpriteFrameNames(sourceCardCode);
    // 原 DZPKView：xh 对应 79×83 大花色，dh 对应 32×32 角标花色。
    const frameNameByChild: Record<string, string> = {
      p: frameNames.rankFrameName,
      xh: frameNames.largeSuitFrameName,
      dh: frameNames.smallSuitFrameName,
    };
    cardNode.children.forEach((cardFacePartNode) => {
      const frameName = frameNameByChild[cardFacePartNode.name];
      if (!frameName) return;
      const spriteFrame = requireBinding(this.cardSpriteAtlas, 'cardSpriteAtlas').getSpriteFrame(frameName);
      if (!spriteFrame) throw new Error(`Original DZPK card SpriteFrame missing: ${frameName}`);
      requireComponent(cardFacePartNode, Sprite).spriteFrame = spriteFrame;
      cardFacePartNode.active = true;
    });
  }

  /** 把全桌唯一 D 庄标移动到目标座位预留锚点；已有显示时用 Tween 平滑移动。 */
  public renderDealerButtonAtSeat(localSeatId: number): void {
    const dealerAnchorNode = requireChild(this.requireSeat(localSeatId), 'D');
    const dealerButtonNode = requireChild(this.node, 'BankD');
    const targetPosition = convertNodeOriginToLocal(dealerAnchorNode, this.node);
    if (dealerButtonNode.active) {
      Tween.stopAllByTarget(dealerButtonNode);
      tween(dealerButtonNode).to(0.3, { position: targetPosition }).start();
      return;
    }
    dealerButtonNode.active = true;
    dealerButtonNode.setPosition(targetPosition);
  }

  /** 更新顶部“底池:”文字；单行 SHRINK 防止 VND/大额覆盖公共牌。 */
  public renderTotalPotAmount(totalPotChips: number): void {
    const totalPotLabel = requireBinding(this.totalPotLabel, 'totalPotLabel');
    constrainSingleLineLabel(totalPotLabel);
    totalPotLabel.string = `底池:${this.formatTableAmount(totalPotChips, 7, 2)}`;
  }

  /**
   * 显示已归集中央底池。收筹码动画结束后延迟回收 chipRoot 子节点，避免还在飞行时被池移走。
   */
  public renderCollectedPotAmount(
    collectedPotChips: number | null,
    shouldRecoverChipNodes = true,
  ): void {
    const collectedPotNode = requireBinding(this.collectedPotNode, 'collectedPotNode');
    collectedPotNode.active = Boolean(collectedPotChips);
    if (!collectedPotChips) return;
    if (shouldRecoverChipNodes) {
      this.scheduleOnce(() => this.requireChipPool().releaseAllChildren(requireChild(this.node, 'chip')), 0.2);
    }
    this.renderAmountLabel(
      requireComponent(requireChild(collectedPotNode, 'label'), Label),
      collectedPotChips,
      6,
      2,
    );
  }

  /** 准备 viewer 距最高下注差额的原节点；按 source 行为先写值但保持隐藏，等待对应动画使用。 */
  public renderWagerDifferenceAmount(differenceChips: number): void {
    if (!differenceChips) return;
    const differenceNode = requireNode('label/cazhi', this.node);
    this.renderAmountLabel(
      requireComponent(requireChild(differenceNode, 'label'), Label),
      differenceChips,
      6,
      2,
    );
    // 原行为是“先准备文字、暂不显示”，不能因为看到 active=false 就当成无用代码删除。
    differenceNode.active = false;
  }

  /** 同一时间只显示 tips 下指定的一个原图片提示，例如等待其他玩家或等待下一局。 */
  public showTableStatusTip(tipNodeName: string, shouldShowTip: boolean): void {
    const tipRootNode = requireChild(this.node, 'tips');
    hideOriginalChildNodes(tipRootNode);
    const selectedTipNode = tipRootNode.getChildByName(tipNodeName);
    if (selectedTipNode) selectedTipNode.active = shouldShowTip;
  }

  // ────────────────── 4. 操作按钮与加注滑杆 ──────────────────

  /**
   * 在 `btn` 下切换 bet/auto 操作层。先把所有子树 inactive 且 Button/Toggle 不可交互，避免隐藏节点
   * 仍被点击；轮到自己时再根据翻牌前后选择档位组，并逐个校验最低跟注和自己的 stack。
   */
  public showPlayerActionControls(
    controlNodeName: string,
    minimumContributionChips: number,
    tableStateModel: DzpkTableStateModel,
  ): void {
    const actionControlRoot = requireChild(this.node, 'btn');
    actionControlRoot.active = true;
    actionControlRoot.children.forEach((childNode) => {
      childNode.active = false;
      setControlTreeInteractable(childNode, false);
    });
    if (!controlNodeName) return;
    const selectedControlNode = actionControlRoot.getChildByName(controlNodeName);
    if (!selectedControlNode) return;
    selectedControlNode.active = true;
    setControlTreeInteractable(selectedControlNode, true);
    if (controlNodeName !== 'bet') return;

    const viewerStackChips = tableStateModel.viewerParticipant?.stackChips ?? 0;
    const isPostflop = tableStateModel.publicBoardCards.length > 0;
    const presetRootNode = requireChild(selectedControlNode, isPostflop ? 'dichi' : 'dm');
    requireChild(selectedControlNode, 'dichi').active = isPostflop;
    requireChild(selectedControlNode, 'dm').active = !isPostflop;
    const presetContributions = isPostflop
      ? tableStateModel.calculatePostflopPotPresetContributions()
      : tableStateModel.calculatePreflopBlindPresetContributions();
    presetRootNode.children.forEach((presetButtonNode) => {
      const contribution = presetContributions[Number(presetButtonNode.name)];
      const isLegal = contribution >= minimumContributionChips && contribution <= viewerStackChips;
      requireComponent(presetButtonNode, Button).interactable = isLegal;
      setOriginalNodeColor(presetButtonNode, isLegal ? ORIGINAL_WHITE_COLOR : ORIGINAL_ASH_COLOR);
    });

    requireComponent(requireChild(selectedControlNode, 'btn_yellow'), Button).interactable =
      minimumContributionChips + 2 * tableStateModel.smallBlindChips <= viewerStackChips;
    requireChild(selectedControlNode, 'btn_rang').active = minimumContributionChips <= 0;
    requireChild(selectedControlNode, 'btn_green').active = minimumContributionChips > 0;
    this.renderAmountLabel(
      requireComponent(requireNode('btn_green/layout/label', selectedControlNode), Label),
      minimumContributionChips,
      5,
    );
  }

  /** 把三个原 Toggle 同步为互斥选择；传 -1 表示全部取消。 */
  public synchronizeAutomaticActionToggles(selectedAutomaticActionIndex: number): void {
    const automaticActionRoot = requireNode('btn/auto', this.node);
    automaticActionRoot.children.forEach((automaticActionNode, automaticActionIndex) => {
      if (automaticActionIndex !== selectedAutomaticActionIndex) {
        requireComponent(automaticActionNode, Toggle).isChecked = false;
      }
    });
  }

  /**
   * 打开/关闭原加注面板。打开时把五个预设金额写入按钮并用 WeakMap 绑定真实值；加减按钮每次打开
   * 先 `off` 旧监听再 `on`，防止重复打开后一次点击加多次小盲。
   */
  public setRaiseSelectionVisible(
    shouldShowRaiseSelection: boolean,
    raisePresetContributions: readonly number[],
    viewerStackChips: number,
    smallBlindChips: number,
    shouldRestoreBettingControls = true,
  ): void {
    this.viewerMaximumChipAmount = viewerStackChips;
    const actionControlRoot = requireChild(this.node, 'btn');
    const raiseSelectionRoot = requireChild(actionControlRoot, 'jiabet');
    raiseSelectionRoot.active = shouldShowRaiseSelection;
    requireChild(actionControlRoot, 'bet').active = shouldShowRaiseSelection
      ? false
      : shouldRestoreBettingControls;
    if (!shouldShowRaiseSelection) return;

    for (let presetIndex = 0; presetIndex < 5; presetIndex += 1) {
      const presetButtonNode = requireChild(raiseSelectionRoot, String(presetIndex));
      const presetContribution = raisePresetContributions[presetIndex] ?? 0;
      this.renderAmountLabel(
        requireComponent(requireArrayItem(presetButtonNode.children, 0, 'raise label'), Label),
        presetContribution,
        5,
        2,
      );
      requireComponent(presetButtonNode, Button).interactable = presetContribution <= viewerStackChips;
      this.contributionByButtonNode.set(presetButtonNode, presetContribution);
    }
    const submitRaiseButton = requireChild(raiseSelectionRoot, 'btn');
    this.minimumRaiseContributionChips = raisePresetContributions[5] ?? 0;
    this.contributionByButtonNode.set(submitRaiseButton, this.minimumRaiseContributionChips);

    const addBlindButton = requireNode('slider/slider/Handle/btn_add', raiseSelectionRoot);
    const subtractBlindButton = requireNode('slider/slider/Handle/btn_sub', raiseSelectionRoot);
    addBlindButton.off(Button.EventType.CLICK);
    subtractBlindButton.off(Button.EventType.CLICK);
    addBlindButton.on(Button.EventType.CLICK, () => this.adjustRaiseByBlindUnits(1, smallBlindChips));
    subtractBlindButton.on(Button.EventType.CLICK, () => this.adjustRaiseByBlindUnits(-1, smallBlindChips));
    this.handleRaiseSliderChanged({ progress: 0 });
  }

  /**
   * 同步加注滑杆全部视觉：夹紧最低合法进度、Slider 与 ProgressBar、Handle 金额、提交按钮绑定、
   * 满仓 All-in Spine、31 段亮条和火花位置。这里只选显示金额，最终合法性仍由服务端校验。
   */
  public handleRaiseSliderChanged(sliderEvent?: Event | SliderProgressSource): void {
    const requestedProgress = readSliderProgress(sliderEvent);
    const minimumProgress = this.viewerMaximumChipAmount > 0
      ? this.minimumRaiseContributionChips / this.viewerMaximumChipAmount
      : 0;
    const sliderProgress = Math.max(minimumProgress, Math.min(1, requestedProgress));
    const sliderPresentationRoot = requireNode('btn/jiabet/slider', this.node);
    const sliderNode = requireChild(sliderPresentationRoot, 'slider');
    requireComponent(sliderNode, Slider).progress = sliderProgress;
    requireComponent(sliderNode, ProgressBar).progress = sliderProgress;
    const selectedContribution = Math.floor(this.viewerMaximumChipAmount * sliderProgress);
    this.renderAmountLabel(
      requireComponent(requireNode('slider/Handle/label', sliderPresentationRoot), Label),
      selectedContribution,
      5,
      2,
    );
    this.contributionByButtonNode.set(requireChild(sliderPresentationRoot.parent!, 'btn'), selectedContribution);

    const allInSpineNode = requireNode('slider/spine', sliderPresentationRoot);
    if (sliderProgress < 1) {
      allInSpineNode.active = false;
    } else if (!allInSpineNode.active) {
      allInSpineNode.active = true;
      playOriginalSpine(allInSpineNode, 'start', false, () => {
        playOriginalSpine(allInSpineNode, 'idle', true);
      });
    }

    const sliderBarLayout = requireNode('slider/bar/layout', sliderPresentationRoot);
    const visibleSegmentCount = Math.max(2, Math.floor(31 * sliderProgress));
    for (let segmentIndex = 1; segmentIndex < 32; segmentIndex += 1) {
      requireArrayItem(sliderBarLayout.children, segmentIndex - 1, 'raise segment').active =
        visibleSegmentCount >= segmentIndex;
    }
    const sliderSparkNode = requireChild(sliderBarLayout, 'anim');
    const segmentPosition = requireArrayItem(
      sliderBarLayout.children,
      visibleSegmentCount - 1,
      'raise segment',
    ).position;
    sliderSparkNode.active = true;
    sliderSparkNode.setPosition(segmentPosition.x, segmentPosition.y + 12, segmentPosition.z);
    sliderSparkNode.children[0]?.getComponent(Animation)?.play();
  }

  /**
   * 点击可能落在按钮内的 Label/Sprite 子节点，因此沿 parent 向上找 WeakMap 绑定值；不解析显示文字，
   * 避免 `$1K/1Tr/1万` 等格式反向污染下注数值。
   */
  public readContributionFromButtonTarget(buttonTarget: unknown): number {
    let targetNode = buttonTarget instanceof Node ? buttonTarget : null;
    while (targetNode) {
      const contribution = this.contributionByButtonNode.get(targetNode);
      if (contribution !== undefined) return contribution;
      targetNode = targetNode.parent;
    }
    throw new Error('DZPK raise contribution is not bound to the clicked original button');
  }

  // ────────────────── 5. 发牌、收筹码与派奖动画 ──────────────────

  /**
   * 单张底牌发牌动画。对象池 overlay 从桌面发牌点飞到目标卡位；viewer 的目标卡先是牌背，第二层
   * overlay 完成后再统一翻为真实牌面，对手始终保留牌背直到 Result 摊牌。
   */
  public async animateHoleCardDeal(
    localSeatId: number,
    participantCards: readonly number[],
    cardIndex: number,
  ): Promise<void> {
    const participantCardRoot = requireChild(this.requireSeat(localSeatId), 'poker');
    if (cardIndex === 0) {
      participantCardRoot.active = true;
      hideOriginalChildNodes(participantCardRoot);
    }
    const dealOrigin = requireChild(this.node, 's_pos');
    const destinationCard = requireArrayItem(participantCardRoot.children, cardIndex, 'dealt card');
    if (localSeatId === 0) {
      this.renderCardFace(participantCards[cardIndex], destinationCard);
      hideOriginalChildNodes(destinationCard);
      requireComponent(destinationCard, Sprite).spriteFrame =
        requireBinding(this.cardSpriteAtlas, 'cardSpriteAtlas')
          .getSpriteFrame('plist_puke_back_big_1');
    }
    const destination = convertNodeOriginToLocal(destinationCard, dealOrigin);
    this.launchDealOverlay(dealOrigin, destinationCard, destination, 255, () => {
      destinationCard.active = true;
    });
    await this.delaySeconds(0.15);
    this.launchDealOverlay(dealOrigin, destinationCard, destination, 80, () => {
      if (localSeatId === 0 && cardIndex === DEAL_CARD_OVERLAY_COUNT - 1) {
        this.scheduleOnce(() => {
          participantCardRoot.children.forEach((viewerCardNode) => {
            requireComponent(viewerCardNode, Sprite).spriteFrame =
              requireBinding(this.cardSpriteAtlas, 'cardSpriteAtlas')
                .getSpriteFrame('plist_puke_front_big');
            viewerCardNode.children.forEach((childNode) => { childNode.active = true; });
          });
        }, 0.25);
      }
    });
  }

  /** 从某座下注锚点连续生成 4 个筹码飞向中央底池，完成后隐藏原座位下注牌。 */
  public async animateWagerCollectionToPot(localSeatId: number): Promise<void> {
    const wagerImageNode = requireArrayItem(
      requireChild(this.requireSeat(localSeatId), 'bet').children,
      0,
      'wager image',
    );
    if (!wagerImageNode.parent?.active) return;
    const chipRoot = requireChild(this.node, 'chip');
    const wagerStart = convertNodeOriginToLocal(wagerImageNode, chipRoot);
    const potDestination = convertNodeOriginToLocal(requireNode('label/allbet', this.node), chipRoot);
    potDestination.x += 10;
    for (let chipIndex = 0; chipIndex < 4; chipIndex += 1) {
      const chipNode = this.requireChipPool().acquire();
      chipNode.parent = chipRoot;
      chipNode.setPosition(wagerStart);
      chipNode.active = true;
      tween(chipNode).to(0.25, { position: potDestination }).start();
      await this.delaySeconds(0.07);
    }
    wagerImageNode.parent.active = false;
  }

  /** 对所有实际获得派彩/退回的座位并行播放中央底池飞筹码。 */
  public animateStandardPotDistribution(
    settlementPresentation: DzpkSettlementPresentation,
  ): Promise<void[]> {
    return Promise.all(
      collectAwardDestinationSeats(settlementPresentation)
        .map((localSeatId) => this.animateCentralPotToParticipant(localSeatId)),
    );
  }

  /**
   * 从中央取 5 个池筹码飞到赢家座位，同时在到达后淡出并回收。最后隐藏中央底池并等待一秒。
   */
  public async animateCentralPotToParticipant(destinationLocalSeat: number): Promise<void> {
    const chipRoot = requireChild(this.node, 'chip');
    const destination = convertNodeOriginToLocal(this.requireSeat(destinationLocalSeat), chipRoot);
    const potStart = convertNodeOriginToLocal(requireNode('label/allbet/img', this.node), chipRoot);
    for (let chipIndex = 0; chipIndex < POT_CHIP_ANIMATION_COUNT; chipIndex += 1) {
      const awardChipNode = this.requireChipPool().acquire();
      awardChipNode.parent = chipRoot;
      awardChipNode.setPosition(potStart);
      awardChipNode.active = true;
      applyNodeOpacity(awardChipNode, 255);
      tween(awardChipNode).to(0.25, { position: destination }).start();
      tween(requireOpacity(awardChipNode))
        .delay(0.25)
        .to(0.15, { opacity: 0 })
        .call(() => {
          applyNodeOpacity(awardChipNode, 255);
          this.requireChipPool().release(awardChipNode);
        })
        .start();
      await this.delaySeconds(0.08);
    }
    this.renderCollectedPotAmount(null);
    await this.delaySeconds(1);
  }

  /**
   * 合并普通派彩与无人跟注退回后逐座显示加钱浮字；主赢家使用原主动画，其余克隆原金额 Label。
   */
  public renderSettlementAwardLabels(settlement: DzpkSettlementPresentation): void {
    const creditedAmountByUid: Record<string, number> = {};
    settlement.winningParticipantUids.forEach((winnerUid) => {
      creditedAmountByUid[winnerUid] = settlement.payoutAmountByUid[winnerUid] ?? 0;
    });
    Object.keys(settlement.returnAmountByUid).forEach((returningUid) => {
      creditedAmountByUid[returningUid] = (creditedAmountByUid[returningUid] ?? 0)
        + settlement.returnAmountByUid[returningUid];
    });
    Object.entries(creditedAmountByUid).forEach(([participantUid, creditedChips]) => {
      const localSeatId = settlement.localSeatByUid[participantUid];
      if (localSeatId === undefined || creditedChips <= 0) return;
      if (participantUid === settlement.primaryWinnerUid) {
        this.renderPrimaryWinnerAward(localSeatId, creditedChips);
      } else {
        this.renderClonedOriginalAmountLabel(localSeatId, creditedChips, '', 'AdditionalSettlementAmount');
      }
    });
  }

  /**
   * 主赢家金额从座位上浮，2 秒后隐藏；自己获胜播放中央 Spine，其它座位优先用对应原赢家动画，
   * 没有专用节点时把通用 winspine 移到该座位。
   */
  public renderPrimaryWinnerAward(winnerLocalSeat: number, winnerAwardChips: number): void {
    const settlementRoot = requireChild(this.node, 'win');
    const originalWinnerLabel = requireChild(settlementRoot, 'winlabel');
    originalWinnerLabel.setSiblingIndex(settlementRoot.children.length - 1);
    this.renderAmountLabel(
      requireComponent(originalWinnerLabel, Label),
      winnerAwardChips,
      8,
      1,
      {
        prefix: '+',
        bitmapFontProfile: 'CNY_DECIMAL_UNITS',
        systemFontScale: 0.86,
      },
    );
    originalWinnerLabel.active = true;
    originalWinnerLabel.setPosition(this.requireSeat(winnerLocalSeat).position);
    tween(originalWinnerLabel)
      .by(0.2, { position: new Vec3(0, 100, 0) }, { easing: 'quadOut' })
      .delay(2)
      .call(() => { originalWinnerLabel.active = false; })
      .start();

    if (winnerLocalSeat === 0) this.playOneShotSpine(requireChild(settlementRoot, 'spine'));
    const seatWinnerAnimation = settlementRoot.getChildByName(String(winnerLocalSeat));
    if (seatWinnerAnimation) {
      this.renderAmountLabel(
        requireComponent(requireChild(seatWinnerAnimation, 'gold'), Label),
        winnerAwardChips,
        7,
      );
      this.playOneShotSpine(requireChild(seatWinnerAnimation, 'spine'));
      return;
    }
    const movableWinnerSpine = requireChild(settlementRoot, 'winspine');
    movableWinnerSpine.setPosition(this.requireSeat(winnerLocalSeat).position);
    this.playOneShotSpine(movableWinnerSpine);
  }

  /**
   * 为边池赢家/无人跟注退回克隆原 winlabel，而不是新建系统样式文字；动画后检查有效性并销毁。
   */
  public renderClonedOriginalAmountLabel(
    localSeatId: number,
    chipAmount: number,
    labelSuffix: string,
    semanticNodeName = 'AdditionalWinnerAmount',
  ): void {
    const settlementRoot = requireChild(this.node, 'win');
    const clonedLabel = instantiate(requireChild(settlementRoot, 'winlabel'));
    clonedLabel.name = semanticNodeName;
    clonedLabel.parent = settlementRoot;
    clonedLabel.setSiblingIndex(settlementRoot.children.length - 1);
    applyNodeOpacity(clonedLabel, 255);
    clonedLabel.active = true;
    this.renderAmountLabel(
      requireComponent(clonedLabel, Label),
      chipAmount,
      10,
      1,
      {
        prefix: '+',
        suffix: labelSuffix,
        bitmapFontProfile: 'CNY_DECIMAL_UNITS',
        systemFontScale: 0.86,
      },
    );
    clonedLabel.setPosition(this.requireSeat(localSeatId).position);
    tween(clonedLabel)
      .by(0.2, { position: new Vec3(0, 100, 0) }, { easing: 'quadOut' })
      .delay(2)
      .call(() => { if (isValid(clonedLabel, true)) clonedLabel.destroy(); })
      .start();
  }

  // ────────────────── 6. 摊牌、收牌和牌型 ──────────────────

  /**
   * 结算摊牌：从原 win/lose/bigwin 模板克隆玩家结算卡，显示两张底牌和牌型；先做翻牌弹跳，再把
   * 不属于最佳五张的底牌灰化。主赢家且牌型等级 > 6 时额外播放原高级牌型 Spine。
   */
  public async renderParticipantShowdown(
    localSeatId: number,
    participantHoleCards: readonly number[],
    bestFiveCards: readonly number[],
    legacyHandValue: string,
    isWinningParticipant: boolean,
    isPrimaryWinner: boolean,
  ): Promise<void> {
    const handCategoryIndex = this.parseLegacyHandCategory(legacyHandValue);
    const settlementRoot = requireChild(this.node, 'win');
    const templateName = handCategoryIndex > 6 && isPrimaryWinner
      ? 'bigwin'
      : isWinningParticipant ? 'win' : 'lose';
    const participantSettlement = instantiate(requireChild(settlementRoot, templateName));
    participantSettlement.name = String(localSeatId);
    participantSettlement.parent = settlementRoot;
    participantSettlement.setSiblingIndex(settlementRoot.children.length - 1);
    participantSettlement.setPosition(this.requireSeat(localSeatId).position);
    participantSettlement.active = true;
    this.scheduleOnce(() => {
      if (isValid(participantSettlement, true)) participantSettlement.destroy();
    }, 5);
    requireComponent(requireChild(participantSettlement, 'type'), Sprite).spriteFrame =
      requireBinding(this.handCategorySpriteAtlas, 'handCategorySpriteAtlas').getSpriteFrame(
        `${isWinningParticipant ? 'w' : ''}${handCategoryIndex}.png`,
      );

    const settlementHoleCardRoot = requireChild(participantSettlement, 'poker');
    settlementHoleCardRoot.children.forEach((holeCardNode) => {
      const holeCardIndex = Number(holeCardNode.name);
      this.renderCardFace(participantHoleCards[holeCardIndex], holeCardNode);
      holeCardNode.setPosition(-24.5, 3);
      tween(holeCardNode)
        .by(0.15, { position: new Vec3(0, 50, 0) }, { easing: 'quadOut' })
        .by(0.15, { position: new Vec3(0, -50, 0) }, { easing: 'quadOut' })
        .call(() => {
          if (holeCardNode.name === '1') {
            tween(holeCardNode).to(0.15, { position: new Vec3(28, 3) }).start();
          }
        })
        .start();
    });
    await this.delaySeconds(0.5);
    settlementHoleCardRoot.children.forEach((holeCardNode) => {
      const holeCardIndex = Number(holeCardNode.name);
      const shouldHighlight = isWinningParticipant
        && bestFiveCards.includes(participantHoleCards[holeCardIndex]);
      setOriginalNodeColor(holeCardNode, shouldHighlight ? ORIGINAL_WHITE_COLOR : ORIGINAL_ASH_COLOR);
    });
    if (handCategoryIndex <= 6 || !isPrimaryWinner) return;
    const premiumAnimationRoot = requireChild(this.node, 'dwin1');
    hideOriginalChildNodes(premiumAnimationRoot);
    this.playOneShotSpine(requireChild(premiumAnimationRoot, String(handCategoryIndex)));
  }

  /**
   * 收牌动画。对手牌直接飞回发牌点并淡出；viewer 的两张牌先旋转缩小收回，再从下方以灰牌形式
   * 回到等待位置，保留原版“上一手结束”的视觉节奏。
   */
  public async animateParticipantCardsRecovery(localSeatId: number): Promise<void> {
    const participantCardRoot = requireChild(this.requireSeat(localSeatId), 'poker');
    const recoveryPosition = convertNodeOriginToLocal(requireChild(this.node, 's_pos'), participantCardRoot);
    if (localSeatId !== 0) {
      participantCardRoot.children.forEach((participantCardNode) => {
        const sourcePosition = participantCardNode.position.clone();
        tween(participantCardNode).to(0.3, { position: recoveryPosition }).start();
        tween(requireOpacity(participantCardNode))
          .to(0.3, { opacity: 0 })
          .call(() => {
            participantCardRoot.active = false;
            applyNodeOpacity(participantCardNode, 255);
            setOriginalNodeColor(participantCardNode, ORIGINAL_WHITE_COLOR);
            participantCardNode.setPosition(sourcePosition);
          })
          .start();
      });
      return;
    }

    this.renderViewerHandCategory(null);
    const viewerCards = participantCardRoot.children.slice();
    for (const viewerCard of viewerCards) {
      const sourcePosition = viewerCard.position.clone();
      tween(viewerCard)
        .to(0.35, { position: recoveryPosition, scale: new Vec3(0.4, 0.4, 1), angle: -180 })
        .start();
      tween(requireOpacity(viewerCard))
        .to(0.35, { opacity: 80 })
        .call(() => {
          viewerCard.active = false;
          applyNodeOpacity(viewerCard, 255);
          viewerCard.setScale(0.58, 0.58, 1);
          viewerCard.angle = 0;
          setOriginalNodeColor(viewerCard, ORIGINAL_WHITE_COLOR);
          viewerCard.setPosition(sourcePosition);
        })
        .start();
      await this.delaySeconds(0.15);
    }
    await this.delaySeconds(0.2);
    for (const viewerCard of viewerCards) {
      const sourcePosition = viewerCard.position.clone();
      viewerCard.active = true;
      viewerCard.setPosition(sourcePosition.x, sourcePosition.y - 200, sourcePosition.z);
      setOriginalNodeColor(viewerCard, ORIGINAL_ASH_COLOR);
      tween(viewerCard).to(0.3, { position: sourcePosition }).start();
      await this.delaySeconds(0.06);
    }
  }

  /** 隐藏单座动作图片；名字显隐会在下一次 renderParticipantActionBadge 一并恢复。 */
  public hideParticipantActionBadge(localSeatId: number): void {
    requireChild(requireChild(this.requireSeat(localSeatId), 'info'), 'tips').active = false;
  }

  /** 把该座所有牌从结算高亮/弃牌灰化恢复成原白色。 */
  public restoreParticipantHoleCardColors(localSeatId: number): void {
    requireChild(this.requireSeat(localSeatId), 'poker').children.forEach((participantCardNode) => {
      setOriginalNodeColor(participantCardNode, ORIGINAL_WHITE_COLOR);
    });
  }

  /** 解析服务端旧牌型字符串，并在 viewer 座位使用原牌型图集显示；null 表示隐藏。 */
  public renderViewerHandCategory(legacyHandValue: string | null): void {
    const viewerCategoryNode = requireChild(this.requireSeat(0), 'type');
    viewerCategoryNode.active = Boolean(legacyHandValue);
    if (!legacyHandValue) return;
    const handCategoryIndex = this.parseLegacyHandCategory(legacyHandValue);
    requireComponent(requireChild(viewerCategoryNode, 'img'), Sprite).spriteFrame =
      requireBinding(this.handCategorySpriteAtlas, 'handCategorySpriteAtlas')
        .getSpriteFrame(`${handCategoryIndex}.png`);
  }

  /**
   * 原牌型值前半段是类别数字，末尾固定 10 个字符编码最佳五张牌；这里只取类别给图片索引。
   */
  public parseLegacyHandCategory(legacyHandValue: string): number {
    const bestFiveCardSuffix = legacyHandValue.slice(-10);
    const categoryText = legacyHandValue.slice(0, legacyHandValue.length - bestFiveCardSuffix.length);
    return Number(categoryText) || 0;
  }

  // ────────────────── 7. 公共牌翻牌/转牌/河牌 ──────────────────

  /**
   * 快照恢复专用：不播放动画，直接按现有公共牌重建原五张卡位；先隐藏模板子节点再填牌面。
   */
  public renderExistingCommunityCards(communityCards: readonly number[]): void {
    const communityCardRoot = requireChild(this.node, 'poker');
    hideOriginalChildNodes(communityCardRoot);
    if (!communityCards.length) return;
    requireChild(communityCardRoot, 'di').active = true;
    communityCards.forEach((communityCard, cardIndex) => {
      const cardNode = requireArrayItem(communityCardRoot.children, cardIndex + 1, 'community card');
      cardNode.active = true;
      requireComponent(cardNode, Sprite).spriteFrame =
        requireBinding(this.cardSpriteAtlas, 'cardSpriteAtlas')
          .getSpriteFrame('plist_puke_front_big');
      hideOriginalChildNodes(cardNode);
      this.renderCardFace(communityCard, cardNode);
    });
  }

  /**
   * 公共牌动画分流：一次出现 3 张（正常翻牌）或快照式 5 张走初始批次；新增 1 张走转/河牌动画。
   */
  public animateCommunityCardReveal(
    allCommunityCards: readonly number[],
    newlyRevealedCardCount: number,
  ): Promise<void> {
    const communityCardRoot = requireChild(this.node, 'poker');
    if (!allCommunityCards.length) {
      hideOriginalChildNodes(communityCardRoot);
      return Promise.resolve();
    }
    communityCardRoot.active = true;
    return newlyRevealedCardCount === 3 || newlyRevealedCardCount === 5
      ? this.animateInitialCommunityCardBatch(allCommunityCards, communityCardRoot)
      : this.animateIncrementalCommunityCards(allCommunityCards, communityCardRoot);
  }

  /**
   * 初始公共牌先以牌背从发牌点飞到中央，再换成正面并展开到各自原位置；sourcePosition 只记一次。
   */
  public async animateInitialCommunityCardBatch(
    communityCards: readonly number[],
    communityCardRoot: Node,
  ): Promise<void> {
    hideOriginalChildNodes(communityCardRoot);
    requireChild(communityCardRoot, 'di').active = true;
    for (let cardIndex = 0; cardIndex < communityCards.length; cardIndex += 1) {
      const cardNode = requireArrayItem(communityCardRoot.children, cardIndex + 1, 'community card');
      requireDzpkRuntimeServices().audioService.playSound('sound/fapaia');
      hideOriginalChildNodes(cardNode);
      requireComponent(cardNode, Sprite).spriteFrame =
        requireBinding(this.cardSpriteAtlas, 'cardSpriteAtlas')
          .getSpriteFrame('plist_puke_back_big_1');
      cardNode.active = true;
      this.rememberSourcePosition(cardNode);
      cardNode.setScale(0.2, 0.2, 1);
      cardNode.setPosition(-6, 206);
      tween(cardNode).to(0.25, {
        scale: new Vec3(0.66, 0.66, 1),
        position: new Vec3(-246, 13.338),
      }).start();
      await this.delaySeconds(0.1);
    }
    await this.delaySeconds(0.2);
    communityCards.forEach((communityCard, cardIndex) => {
      const cardNode = requireArrayItem(communityCardRoot.children, cardIndex + 1, 'community card');
      requireComponent(cardNode, Sprite).spriteFrame =
        requireBinding(this.cardSpriteAtlas, 'cardSpriteAtlas')
          .getSpriteFrame('plist_puke_front_big');
      this.renderCardFace(communityCard, cardNode);
      if (cardIndex > 0) {
        tween(cardNode).to(0.15, { position: this.requireSourcePosition(cardNode) }).start();
      }
    });
  }

  /** 转牌/河牌逐张从发牌点飞到自己的原卡位，到达后换正面。 */
  public async animateIncrementalCommunityCards(
    communityCards: readonly number[],
    communityCardRoot: Node,
  ): Promise<void> {
    const firstNewCardIndex = communityCardRoot.children[4]?.active ? 4 : 3;
    for (let cardIndex = firstNewCardIndex; cardIndex < communityCards.length; cardIndex += 1) {
      requireDzpkRuntimeServices().audioService.playSound('sound/fapaia');
      const cardNode = requireArrayItem(communityCardRoot.children, cardIndex + 1, 'community card');
      hideOriginalChildNodes(cardNode);
      requireComponent(cardNode, Sprite).spriteFrame =
        requireBinding(this.cardSpriteAtlas, 'cardSpriteAtlas')
          .getSpriteFrame('plist_puke_back_big_1');
      cardNode.active = true;
      this.rememberSourcePosition(cardNode);
      cardNode.setScale(0.2, 0.2, 1);
      cardNode.setPosition(-6, 206);
      tween(cardNode)
        .to(0.25, {
          scale: new Vec3(0.66, 0.66, 1),
          position: this.requireSourcePosition(cardNode),
        })
        .call(() => {
          requireComponent(cardNode, Sprite).spriteFrame =
            requireBinding(this.cardSpriteAtlas, 'cardSpriteAtlas')
              .getSpriteFrame('plist_puke_front_big');
          this.renderCardFace(communityCards[cardIndex], cardNode);
        })
        .start();
      await this.delaySeconds(0.2);
    }
  }

  /** 结算时保留最佳五张中的公共牌为白色，其余灰化；传 null 则清牌并恢复颜色。 */
  public highlightWinningCommunityCards(
    bestFiveCards: readonly number[] | null,
    communityCards: readonly number[],
  ): void {
    const communityCardRoot = requireChild(this.node, 'poker');
    if (!bestFiveCards) {
      hideOriginalChildNodes(communityCardRoot);
      setOriginalNodeColor(communityCardRoot, ORIGINAL_WHITE_COLOR);
      return;
    }
    communityCards.forEach((communityCard, cardIndex) => {
      const cardNode = requireArrayItem(communityCardRoot.children, cardIndex + 1, 'community card');
      setOriginalNodeColor(
        cardNode,
        bestFiveCards.includes(communityCard) ? ORIGINAL_WHITE_COLOR : ORIGINAL_ASH_COLOR,
      );
    });
  }

  /** 旧 Prefab 拼写为 `sliderEvevt` 的序列化兼容入口；当前逻辑统一转给语义清楚的方法。 */
  public sliderEvevt(sliderEvent?: Event): void {
    this.handleRaiseSliderChanged(sliderEvent);
  }

  // ────────────────── 8. 表现层内部小工具 ──────────────────

  /**
   * 从对象池取一张临时牌背，设置发牌点的缩放/旋转，Tween 到目标后调用 completed 并回收。
   * 第二条透明 overlay 用 UIOpacity 做层次感，不创建新牌面规则。
   */
  private launchDealOverlay(
    dealOrigin: Node,
    destinationCard: Node,
    destination: Vec3,
    targetOpacity: number,
    completed: () => void,
  ): void {
    const overlay = this.requireCardPool().acquire();
    overlay.parent = dealOrigin;
    overlay.setPosition(0, 3);
    overlay.setScale(0.4, 0.4, 1);
    overlay.angle = -180;
    applyNodeOpacity(overlay, 255);
    overlay.active = true;
    const destinationScale = destinationCard.scale;
    tween(overlay)
      .to(0.2, { position: destination, scale: destinationScale, angle: 0 })
      .call(() => {
        completed();
        this.requireCardPool().release(overlay);
      })
      .start();
    if (targetOpacity !== 255) {
      tween(requireOpacity(overlay)).to(0.2, { opacity: targetOpacity }).start();
    }
  }

  /** 加减按钮按一个小盲调整当前贡献，再转成 0–1 progress 复用滑杆主入口。 */
  private adjustRaiseByBlindUnits(directionMultiplier: number, smallBlindChips: number): void {
    const submitButton = requireNode('btn/jiabet/btn', this.node);
    const currentContribution = this.contributionByButtonNode.get(submitButton)
      ?? this.minimumRaiseContributionChips;
    this.handleRaiseSliderChanged({
      progress: this.viewerMaximumChipAmount > 0
        ? (currentContribution + directionMultiplier * smallBlindChips) / this.viewerMaximumChipAmount
        : 0,
    });
  }

  /** 播放名为 `animation` 的一次性 Spine，结束后隐藏节点。 */
  private playOneShotSpine(spineNode: Node): void {
    spineNode.active = true;
    playOriginalSpine(spineNode, 'animation', false, () => { spineNode.active = false; });
  }

  /** 首次移动节点前冻结原 Prefab 位置；WeakMap 不修改序列化数据。 */
  private rememberSourcePosition(targetNode: Node): void {
    if (!this.sourcePositionByNode.has(targetNode)) {
      this.sourcePositionByNode.set(targetNode, targetNode.position.clone());
    }
  }

  /** 读取原位置并 clone，避免 Tween 修改 WeakMap 中保存的同一个 Vec3 对象。 */
  private requireSourcePosition(targetNode: Node): Vec3 {
    const sourcePosition = this.sourcePositionByNode.get(targetNode);
    if (!sourcePosition) throw new Error(`Original position not captured for ${targetNode.name}`);
    return sourcePosition.clone();
  }

  /** 把 Component.scheduleOnce 包成 Promise，让复杂动画可以用 await 按顺序书写。 */
  private delaySeconds(seconds: number): Promise<void> {
    return new Promise((resolve) => this.scheduleOnce(() => resolve(), Math.max(0, seconds)));
  }

  /** 所有金额统一读取本次 GameHub 会话币种，避免某节点遗漏成固定 CNY。 */
  private currencyCode(): string {
    return requireDzpkRuntimeServices().gameContext.currency;
  }

  /** 只返回桌面短金额字符串，用于与“底池/盲注”文案拼接。 */
  private formatTableAmount(
    amount: number,
    maxCharacters: number,
    sourceDecimals: number,
  ): string {
    return formatDzpkCurrencyAmount(amount, this.currencyCode(), {
      maxCharacters,
      sourceTenThousandDecimals: sourceDecimals,
      sourceHundredMillionDecimals: sourceDecimals,
    });
  }

  /** 所有牌桌金额 Label 的唯一写入口，统一单位、字形检查和原框内收缩。 */
  private renderAmountLabel(
    label: Label,
    amount: number,
    maxCharacters: number,
    sourceDecimals = 1,
    options: DzpkAmountLabelOptions = {},
  ): void {
    applyDzpkAmountLabel(label, amount, this.currencyCode(), {
      maxCharacters,
      sourceTenThousandDecimals: sourceDecimals,
      sourceHundredMillionDecimals: sourceDecimals,
      ...options,
    });
  }

  /** 原桌固定六座；先校验 0–5，再按 participantSeatRoot 子节点顺序取得座位。 */
  private requireSeat(localSeatId: number): Node {
    if (!Number.isInteger(localSeatId) || localSeatId < 0 || localSeatId >= SOURCE_TABLE_SEAT_COUNT) {
      throw new Error(`DZPK local seat is outside the original six-seat table: ${localSeatId}`);
    }
    const seatRoot = requireBinding(this.participantSeatRootNode, 'participantSeatRootNode');
    return requireArrayItem(seatRoot.children, localSeatId, 'participant seat');
  }

  /** 牌池必须在 initializeTablePresentation 建立，缺失说明生命周期顺序错误。 */
  private requireCardPool(): DzpkNodePool {
    if (!this.cardNodePool) throw new Error('DZPK card pool is not initialized');
    return this.cardNodePool;
  }

  /** 筹码池必须在 initializeTablePresentation 建立。 */
  private requireChipPool(): DzpkNodePool {
    if (!this.chipNodePool) throw new Error('DZPK chip pool is not initialized');
    return this.chipNodePool;
  }
}

function setControlTreeInteractable(rootNode: Node, interactable: boolean): void {
  // getComponentsInChildren 会递归取整棵按钮树，保证隐藏层内的嵌套按钮/Toggle 都同步禁用。
  rootNode.getComponentsInChildren(Button).forEach((button) => {
    button.interactable = interactable;
  });
  rootNode.getComponentsInChildren(Toggle).forEach((toggle) => {
    toggle.interactable = interactable;
  });
}
