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

/**
 * Creator 3.8 presentation for the original DZPKMain Prefab.
 * Rendering APIs and timing are migrated; the source node tree is not redrawn.
 */
@ccclass('DzpkTablePresentation')
export class DzpkTablePresentation extends Component {
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
  private readonly sourcePositionByNode = new WeakMap<Node, Vec3>();
  private readonly contributionByButtonNode = new WeakMap<Node, number>();

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

  public onDestroy(): void {
    this.cardNodePool?.clear();
    this.chipNodePool?.clear();
  }

  /** The source selects this title before RoomInfo arrives, using roomLevel. */
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

  public playAmbientTableAnimation(animationIndex: number): void {
    const ambientSpineNode = requireChild(this.node, 'spine');
    playOriginalSpine(ambientSpineNode, `suiji${animationIndex}`, false, () => {
      if (isValid(this, true)) this.playAmbientTableAnimation(randomInteger(1, 4));
    });
  }

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

  public renderParticipantChipBalance(localSeatId: number, chipAmount: number): void {
    const goldNode = requireChild(requireChild(this.requireSeat(localSeatId), 'info'), 'gold');
    this.renderAmountLabel(
      requireComponent(goldNode, Label),
      chipAmount,
      6,
      2,
    );
  }

  public resetParticipantSeatPresentation(localSeatId: number): void {
    this.renderParticipantActionBadge(localSeatId, null);
    this.renderParticipantActionCountdown(localSeatId, null);
    void this.animateParticipantWager(localSeatId, null);
    this.renderParticipantHoleCards(localSeatId, null, null);
    this.setParticipantFoldedAppearance(localSeatId, true);
  }

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

  public setParticipantFoldedAppearance(localSeatId: number, isActiveParticipant: boolean): void {
    setOriginalNodeColor(
      requireChild(this.requireSeat(localSeatId), 'info'),
      isActiveParticipant ? ORIGINAL_WHITE_COLOR : ORIGINAL_ASH_COLOR,
    );
  }

  public hideAllOpponentHoleCards(): void {
    for (let localSeatId = 1; localSeatId < SOURCE_TABLE_SEAT_COUNT; localSeatId += 1) {
      const participantCardRoot = requireChild(this.requireSeat(localSeatId), 'poker');
      participantCardRoot.active = false;
      setOriginalNodeColor(participantCardRoot, ORIGINAL_WHITE_COLOR);
    }
  }

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

  public renderCardFace(sourceCardCode: number, cardNode: Node): void {
    const frameNames = this.resolvePokerSpriteFrameNames(sourceCardCode);
    // Source DZPKView maps xh to the 79x83 large suit and dh to the 32x32 corner suit.
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

  public renderTotalPotAmount(totalPotChips: number): void {
    const totalPotLabel = requireBinding(this.totalPotLabel, 'totalPotLabel');
    constrainSingleLineLabel(totalPotLabel);
    totalPotLabel.string = `底池:${this.formatTableAmount(totalPotChips, 7, 2)}`;
  }

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

  public renderWagerDifferenceAmount(differenceChips: number): void {
    if (!differenceChips) return;
    const differenceNode = requireNode('label/cazhi', this.node);
    this.renderAmountLabel(
      requireComponent(requireChild(differenceNode, 'label'), Label),
      differenceChips,
      6,
      2,
    );
    // Preserved source behavior: prepared but hidden until its source animation uses it.
    differenceNode.active = false;
  }

  public showTableStatusTip(tipNodeName: string, shouldShowTip: boolean): void {
    const tipRootNode = requireChild(this.node, 'tips');
    hideOriginalChildNodes(tipRootNode);
    const selectedTipNode = tipRootNode.getChildByName(tipNodeName);
    if (selectedTipNode) selectedTipNode.active = shouldShowTip;
  }

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

  public synchronizeAutomaticActionToggles(selectedAutomaticActionIndex: number): void {
    const automaticActionRoot = requireNode('btn/auto', this.node);
    automaticActionRoot.children.forEach((automaticActionNode, automaticActionIndex) => {
      if (automaticActionIndex !== selectedAutomaticActionIndex) {
        requireComponent(automaticActionNode, Toggle).isChecked = false;
      }
    });
  }

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

  public readContributionFromButtonTarget(buttonTarget: unknown): number {
    let targetNode = buttonTarget instanceof Node ? buttonTarget : null;
    while (targetNode) {
      const contribution = this.contributionByButtonNode.get(targetNode);
      if (contribution !== undefined) return contribution;
      targetNode = targetNode.parent;
    }
    throw new Error('DZPK raise contribution is not bound to the clicked original button');
  }

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

  public animateStandardPotDistribution(
    settlementPresentation: DzpkSettlementPresentation,
  ): Promise<void[]> {
    return Promise.all(
      collectAwardDestinationSeats(settlementPresentation)
        .map((localSeatId) => this.animateCentralPotToParticipant(localSeatId)),
    );
  }

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

  public hideParticipantActionBadge(localSeatId: number): void {
    requireChild(requireChild(this.requireSeat(localSeatId), 'info'), 'tips').active = false;
  }

  public restoreParticipantHoleCardColors(localSeatId: number): void {
    requireChild(this.requireSeat(localSeatId), 'poker').children.forEach((participantCardNode) => {
      setOriginalNodeColor(participantCardNode, ORIGINAL_WHITE_COLOR);
    });
  }

  public renderViewerHandCategory(legacyHandValue: string | null): void {
    const viewerCategoryNode = requireChild(this.requireSeat(0), 'type');
    viewerCategoryNode.active = Boolean(legacyHandValue);
    if (!legacyHandValue) return;
    const handCategoryIndex = this.parseLegacyHandCategory(legacyHandValue);
    requireComponent(requireChild(viewerCategoryNode, 'img'), Sprite).spriteFrame =
      requireBinding(this.handCategorySpriteAtlas, 'handCategorySpriteAtlas')
        .getSpriteFrame(`${handCategoryIndex}.png`);
  }

  public parseLegacyHandCategory(legacyHandValue: string): number {
    const bestFiveCardSuffix = legacyHandValue.slice(-10);
    const categoryText = legacyHandValue.slice(0, legacyHandValue.length - bestFiveCardSuffix.length);
    return Number(categoryText) || 0;
  }

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

  /** Serialized compatibility for older study Prefabs; current Prefab uses the semantic name. */
  public sliderEvevt(sliderEvent?: Event): void {
    this.handleRaiseSliderChanged(sliderEvent);
  }

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

  private playOneShotSpine(spineNode: Node): void {
    spineNode.active = true;
    playOriginalSpine(spineNode, 'animation', false, () => { spineNode.active = false; });
  }

  private rememberSourcePosition(targetNode: Node): void {
    if (!this.sourcePositionByNode.has(targetNode)) {
      this.sourcePositionByNode.set(targetNode, targetNode.position.clone());
    }
  }

  private requireSourcePosition(targetNode: Node): Vec3 {
    const sourcePosition = this.sourcePositionByNode.get(targetNode);
    if (!sourcePosition) throw new Error(`Original position not captured for ${targetNode.name}`);
    return sourcePosition.clone();
  }

  private delaySeconds(seconds: number): Promise<void> {
    return new Promise((resolve) => this.scheduleOnce(() => resolve(), Math.max(0, seconds)));
  }

  private currencyCode(): string {
    return requireDzpkRuntimeServices().gameContext.currency;
  }

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

  private requireSeat(localSeatId: number): Node {
    if (!Number.isInteger(localSeatId) || localSeatId < 0 || localSeatId >= SOURCE_TABLE_SEAT_COUNT) {
      throw new Error(`DZPK local seat is outside the original six-seat table: ${localSeatId}`);
    }
    const seatRoot = requireBinding(this.participantSeatRootNode, 'participantSeatRootNode');
    return requireArrayItem(seatRoot.children, localSeatId, 'participant seat');
  }

  private requireCardPool(): DzpkNodePool {
    if (!this.cardNodePool) throw new Error('DZPK card pool is not initialized');
    return this.cardNodePool;
  }

  private requireChipPool(): DzpkNodePool {
    if (!this.chipNodePool) throw new Error('DZPK chip pool is not initialized');
    return this.chipNodePool;
  }
}

function setControlTreeInteractable(rootNode: Node, interactable: boolean): void {
  rootNode.getComponentsInChildren(Button).forEach((button) => {
    button.interactable = interactable;
  });
  rootNode.getComponentsInChildren(Toggle).forEach((toggle) => {
    toggle.interactable = interactable;
  });
}
