'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var OriginalDzpkConfig = require('Config').Config;
var OriginalNodePool = require('NodePool').default;

var SOURCE_TABLE_SEAT_COUNT = 6;
var DEAL_CARD_OVERLAY_COUNT = 2;
var WAGER_CHIP_ANIMATION_COUNT = 3;
var POT_CHIP_ANIMATION_COUNT = 5;

/**
 * Semantic presentation component mounted on the original DZPKMain Prefab.
 * Every visible node, SpriteFrame and animation still belongs to that Prefab.
 */
var DzpkTablePresentation = cc.Class({
  name: 'DzpkTablePresentation',
  extends: cc.Component,

  properties: {
    opponentWaitingTipNode: { default: null, type: cc.Node },
    participantSeatRootNode: { default: null, type: cc.Node },
    totalPotLabel: { default: null, type: cc.Label },
    collectedPotNode: { default: null, type: cc.Node },
    cardSpriteAtlas: { default: null, type: cc.SpriteAtlas },
    handCategorySpriteAtlas: { default: null, type: cc.SpriteAtlas }
  },

  initializeTablePresentation: function () {
    this.viewerMaximumChipAmount = 0;
    this.minimumRaiseContributionChips = 0;
    wUIHelp.hideSonNode(this.participantSeatRootNode);
    this.renderOriginalRoomTitle();

    var cardPoolTemplate = this.node.getChildByName('s_pos').getChildByName('item');
    this.cardNodePool = new OriginalNodePool(cardPoolTemplate, 10);
    this.cardNodePool.put(cardPoolTemplate);

    var chipPoolTemplate = this.node.getChildByName('chip').getChildByName('item');
    this.chipNodePool = new OriginalNodePool(chipPoolTemplate, 10);
    this.chipNodePool.put(chipPoolTemplate);

    this.hideAllOpponentHoleCards();
    this.renderExistingCommunityCards([]);
    this.playAmbientTableAnimation(wUtils.random(1, 4));
    this.node.getChildByName('allBet').scaleY = cc.winSize.width / 1334;
  },

  /** The source title is selected before RoomInfo arrives, using roomLevel. */
  renderOriginalRoomTitle: function () {
    var roomLevelIndex = Math.max(0, Number(wGameData.roomLevel || 1) - 1);
    var roomNames = ['体验场', '新手场', '初级场', '中级场', '高级场'];
    var sourceBlindDescriptions = [
      '1万/2万  前注:20万',
      '1千/2千  前注:2万',
      '5千/1万  前注:10万'
    ];
    var roomName = roomNames[roomLevelIndex] || roomNames[0];
    var blindDescription = sourceBlindDescriptions[roomLevelIndex]
      || sourceBlindDescriptions[sourceBlindDescriptions.length - 1];
    this.node.getChildByName('gameType').getComponent(cc.Label).string =
      roomName + '  小/大盲注:' + blindDescription;
  },

  playAmbientTableAnimation: function (animationIndex) {
    var tablePresentation = this;
    var ambientSpineNode = this.node.getChildByName('spine');
    wUIHelp.playSpine(ambientSpineNode, 'suiji' + animationIndex, function () {
      if (!cc.isValid(tablePresentation, true)) return;
      tablePresentation.playAmbientTableAnimation(wUtils.random(1, 4));
    });
  },

  setParticipantSeatPresence: function (localSeatId, participantState) {
    var participantSeatNode = this.participantSeatRootNode.children[localSeatId];
    if (!participantSeatNode.sourceInformationPosition) {
      participantSeatNode.sourceInformationPosition = participantSeatNode.getPosition();
    }
    var participantInformationNode = participantSeatNode.getChildByName('info');
    if (participantState) {
      if (localSeatId < 2) {
        participantInformationNode.y = -360;
      } else {
        participantInformationNode.x = localSeatId < 4 ? -360 : 360;
      }
      participantInformationNode.stopAllActions();
      participantInformationNode.runAction(cc.moveTo(0.25, cc.v2(0, 0)));
      participantSeatNode.active = true;
      this.renderParticipantProfile(localSeatId, participantState);
      this.resetParticipantSeatPresentation(localSeatId);
      return;
    }
    if (!participantSeatNode.active) return;
    var hiddenInformationPosition = localSeatId < 2
      ? cc.v2(0, -360)
      : localSeatId < 4
        ? cc.v2(-360, 0)
        : cc.v2(360, 0);
    participantInformationNode.stopAllActions();
    participantInformationNode.runAction(cc.sequence(
      cc.moveTo(0.25, hiddenInformationPosition),
      cc.callFunc(function () {
        participantSeatNode.active = false;
      })
    ));
  },

  renderParticipantProfile: function (localSeatId, participantState) {
    var participantInformationNode = this.participantSeatRootNode.children[localSeatId].getChildByName('info');
    wUIHelp.setHead(
      participantInformationNode.getChildByName('head'),
      participantState.avatarKey !== undefined ? participantState.avatarKey : participantState.headimgurl,
      true
    );
    var participantDisplayName = participantState.displayName !== undefined
      ? participantState.displayName
      : participantState.nickname;
    participantInformationNode.getChildByName('name').getComponent(cc.Label).string =
      wUtils.handleNameLen(participantDisplayName, 3, false);
    this.renderParticipantChipBalance(
      localSeatId,
      participantState.stackChips !== undefined ? participantState.stackChips : participantState.gold
    );
  },

  renderParticipantChipBalance: function (localSeatId, chipAmount) {
    this.participantSeatRootNode.children[localSeatId]
      .getChildByName('info')
      .getChildByName('gold')
      .getComponent(cc.Label).string = wUtils.goldFormat(chipAmount, 2);
  },

  resetParticipantSeatPresentation: function (localSeatId) {
    this.renderParticipantActionBadge(localSeatId, null);
    this.renderParticipantActionCountdown(localSeatId, null);
    this.animateParticipantWager(localSeatId, null);
    this.renderParticipantHoleCards(localSeatId, null, null);
    this.setParticipantFoldedAppearance(localSeatId, true);
  },

  renderParticipantActionBadge: function (
    localSeatId,
    sourceActionCode,
    shouldPlayAllInBanner
  ) {
    var participantInformationNode = this.participantSeatRootNode.children[localSeatId].getChildByName('info');
    var actionBadgeNode = participantInformationNode.getChildByName('tips');
    var actionSpriteIndex = -1;
    switch (String(sourceActionCode)) {
      case '6':
        actionSpriteIndex = 4;
        break;
      case '4':
        actionSpriteIndex = 1;
        break;
      case '5':
        actionSpriteIndex = 2;
        break;
      case '3':
        actionSpriteIndex = 0;
        break;
      case '3_0':
        actionSpriteIndex = 3;
        break;
    }
    var hasActionBadge = actionSpriteIndex !== -1;
    actionBadgeNode.active = hasActionBadge;
    participantInformationNode.getChildByName('name').active = !hasActionBadge;
    participantInformationNode.getChildByName('allBet').active = actionSpriteIndex === 4;
    if (!hasActionBadge) return;
    actionBadgeNode.getComponent(cc.Sprite).spriteFrame =
      this.handCategorySpriteAtlas.getSpriteFrame('t' + actionSpriteIndex + '.png');
    if (actionSpriteIndex !== 4 || !shouldPlayAllInBanner) return;
    var allInBannerNode = this.node.getChildByName('allBet');
    allInBannerNode.active = true;
    allInBannerNode.stopAllActions();
    allInBannerNode.runAction(cc.sequence(
      cc.delayTime(3),
      cc.callFunc(function () {
        allInBannerNode.active = false;
      })
    ));
  },

  renderParticipantActionCountdown: function (localSeatId, remainingSeconds) {
    var countdownNode = this.participantSeatRootNode.children[localSeatId]
      .getChildByName('info')
      .getChildByName('prog');
    countdownNode.active = Boolean(remainingSeconds);
    countdownNode.stopAllActions();
    if (!remainingSeconds) return;
    countdownNode.getComponent(cc.Animation).play().speed = 1 / remainingSeconds;
    if (remainingSeconds <= 3 || localSeatId !== 0) return;
    countdownNode.runAction(cc.sequence(
      cc.delayTime(remainingSeconds - 3),
      cc.callFunc(function () {
        wAudioMgr.playSound('sound/half_time', 'DZPK');
      })
    ));
  },

  animateParticipantWager: function (localSeatId, wagerChips, shouldAnimate) {
    if (shouldAnimate === undefined) shouldAnimate = true;
    var participantSeatNode = this.participantSeatRootNode.children[localSeatId];
    var wagerNode = participantSeatNode.getChildByName('bet');
    if (!wagerChips) {
      wagerNode.active = false;
      return Promise.resolve();
    }
    if (!shouldAnimate) {
      wagerNode.active = true;
      wagerNode.getChildByName('label').getComponent(cc.Label).string =
        wUtils.goldFormat(wagerChips, 2);
      return Promise.resolve();
    }

    wAudioMgr.playSound('sound/hechip', 'DZPK');
    var chipAnimationRoot = this.node.getChildByName('chip');
    var participantStartPosition = participantSeatNode.getPosition();
    var wagerDestinationPosition = wUtils.world_local_POS(
      chipAnimationRoot,
      wUtils.local_world__POS(cc.find('bet/img', participantSeatNode))
    );
    var movingChipNodes = [];
    var tablePresentation = this;

    function animateNextWagerChip(chipAnimationIndex) {
      if (chipAnimationIndex >= WAGER_CHIP_ANIMATION_COUNT) return Promise.resolve();
      var movingChipNode = tablePresentation.chipNodePool.getNode;
      movingChipNode.parent = chipAnimationRoot;
      movingChipNode.setPosition(participantStartPosition);
      movingChipNode.active = true;
      movingChipNodes.push(movingChipNode);
      movingChipNode.stopAllActions();
      movingChipNode.runAction(cc.sequence(
        cc.moveTo(0.15, wagerDestinationPosition),
        cc.callFunc(function () {
          if (chipAnimationIndex !== WAGER_CHIP_ANIMATION_COUNT - 1) return;
          movingChipNodes.forEach(function (completedChipNode) {
            tablePresentation.chipNodePool.put(completedChipNode);
          });
          wagerNode.active = true;
          wagerNode.getChildByName('label').getComponent(cc.Label).string =
            wUtils.goldFormat(wagerChips, 2);
        })
      ));
      return wUtils.syncDelayed(0.075, tablePresentation).then(function () {
        return animateNextWagerChip(chipAnimationIndex + 1);
      });
    }
    return animateNextWagerChip(0);
  },

  renderParticipantHoleCards: function (localSeatId, sourceCards, sourceActionCode) {
    var participantCardRoot = this.participantSeatRootNode.children[localSeatId].getChildByName('poker');
    participantCardRoot.active = Boolean(sourceCards);
    if (!sourceCards && localSeatId === 0) this.renderViewerHandCategory(null);
    if (sourceActionCode === 5 && localSeatId !== 0) {
      participantCardRoot.active = false;
      return;
    }
    if (!sourceCards || !sourceCards.length || participantCardRoot.parent.name !== '0') return;
    for (var cardIndex = 0; cardIndex < sourceCards.length; cardIndex += 1) {
      var participantCardNode = participantCardRoot.children[cardIndex];
      wUIHelp.hideSonNode(participantCardNode);
      participantCardNode.getComponent(cc.Sprite).spriteFrame =
        this.cardSpriteAtlas.getSpriteFrame('plist_puke_front_big');
      this.renderCardFace(sourceCards[cardIndex], participantCardNode);
      wUIHelp.setNodeColor(
        participantCardNode,
        sourceActionCode === 5
          ? OriginalDzpkConfig.colorSet.ash
          : OriginalDzpkConfig.colorSet.white
      );
    }
  },

  setParticipantFoldedAppearance: function (localSeatId, isActiveParticipant) {
    var participantInformationNode = this.participantSeatRootNode.children[localSeatId].getChildByName('info');
    wUIHelp.setNodeColor(
      participantInformationNode,
      isActiveParticipant
        ? OriginalDzpkConfig.colorSet.white
        : OriginalDzpkConfig.colorSet.ash
    );
  },

  hideAllOpponentHoleCards: function () {
    for (var localSeatId = 1; localSeatId < SOURCE_TABLE_SEAT_COUNT; localSeatId += 1) {
      var participantCardRoot = this.participantSeatRootNode.children[localSeatId].getChildByName('poker');
      participantCardRoot.active = false;
      wUIHelp.setNodeColor(participantCardRoot, OriginalDzpkConfig.colorSet.white);
    }
  },

  resolvePokerSpriteFrameNames: function (sourceCardCode) {
    var sourceRank = Math.floor(sourceCardCode / 100);
    var zeroBasedSuitIndex = sourceCardCode % 100 - 1;
    if (sourceRank >= 14) sourceRank = 1;
    return {
      rankFrameName: 'plist_puke_value_' + zeroBasedSuitIndex % 2 + '_' + sourceRank,
      largeSuitFrameName: 'plist_puke_color_big_' + zeroBasedSuitIndex,
      smallSuitFrameName: 'plist_puke_color_small_' + zeroBasedSuitIndex
    };
  },

  renderCardFace: function (sourceCardCode, cardNode) {
    var cardFrameNames = this.resolvePokerSpriteFrameNames(sourceCardCode);
    // Original DZPKView mapping: xh is the 79x83 large suit and dh is the
    // 32x32 corner suit. Swapping them stretches the small glyph visibly.
    var frameNameByOriginalChild = {
      p: cardFrameNames.rankFrameName,
      xh: cardFrameNames.largeSuitFrameName,
      dh: cardFrameNames.smallSuitFrameName
    };
    cardNode.children.forEach(function (cardFacePartNode) {
      var spriteFrameName = frameNameByOriginalChild[cardFacePartNode.name];
      var cardSpriteFrame = this.cardSpriteAtlas.getSpriteFrame(spriteFrameName);
      cardFacePartNode.getComponent(cc.Sprite).spriteFrame = cardSpriteFrame;
      if (!cardSpriteFrame) {
        wLog.w(cardFrameNames);
        wLog.e(spriteFrameName);
      }
      cardFacePartNode.active = true;
    }, this);
  },

  renderDealerButtonAtSeat: function (localSeatId) {
    var dealerAnchorNode = this.participantSeatRootNode.children[localSeatId].getChildByName('D');
    var dealerButtonNode = this.node.getChildByName('BankD');
    var dealerTargetPosition = wUtils.world_local_POS(
      this.node,
      wUtils.local_world__POS(dealerAnchorNode)
    );
    if (dealerButtonNode.active) {
      dealerButtonNode.runAction(cc.moveTo(0.3, dealerTargetPosition));
      return;
    }
    dealerButtonNode.active = true;
    dealerButtonNode.setPosition(dealerTargetPosition);
  },

  renderTotalPotAmount: function (totalPotChips) {
    this.totalPotLabel.string = '底池:' + wUtils.goldFormat(totalPotChips, 2);
  },

  renderCollectedPotAmount: function (collectedPotChips, shouldRecoverChipNodes) {
    if (shouldRecoverChipNodes === undefined) shouldRecoverChipNodes = true;
    this.collectedPotNode.active = Boolean(collectedPotChips);
    if (!collectedPotChips) return;
    if (shouldRecoverChipNodes) {
      var tablePresentation = this;
      this.scheduleOnce(function () {
        tablePresentation.chipNodePool.recoveryAll(tablePresentation.node.getChildByName('chip'));
      }, 0.2);
    }
    this.collectedPotNode.getChildByName('label').getComponent(cc.Label).string =
      wUtils.goldFormat(collectedPotChips, 2);
  },

  renderWagerDifferenceAmount: function (differenceChips) {
    if (!differenceChips) return;
    var differenceNode = cc.find('label/cazhi', this.node);
    differenceNode.getChildByName('label').getComponent(cc.Label).string =
      wUtils.goldFormat(differenceChips, 2);
    differenceNode.active = false;
  },

  showTableStatusTip: function (tipNodeName, shouldShowTip) {
    var tipRootNode = this.node.getChildByName('tips');
    wUIHelp.hideSonNode(tipRootNode);
    var selectedTipNode = tipRootNode.getChildByName(tipNodeName);
    if (selectedTipNode) {
      selectedTipNode.active = shouldShowTip;
      return;
    }
    this.unscheduleAllCallbacks();
  },

  showPlayerActionControls: function (controlNodeName, minimumContributionChips, tableStateModel) {
    var actionControlRoot = this.node.getChildByName('btn');
    actionControlRoot.active = true;
    wUIHelp.hideSonNode(actionControlRoot);
    if (!controlNodeName) return;
    var selectedControlNode = actionControlRoot.getChildByName(controlNodeName);
    if (!selectedControlNode) return;
    selectedControlNode.active = true;
    if (controlNodeName !== 'bet') return;

    var viewerStackChips = tableStateModel.viewerParticipant.stackChips;
    var presetRootNode;
    var presetContributions;
    if (tableStateModel.publicBoardCards.length > 0) {
      presetRootNode = selectedControlNode.getChildByName('dichi');
      presetRootNode.active = true;
      selectedControlNode.getChildByName('dm').active = false;
      presetContributions = tableStateModel.calculatePostflopPotPresetContributions();
    } else {
      presetRootNode = selectedControlNode.getChildByName('dm');
      selectedControlNode.getChildByName('dichi').active = false;
      presetRootNode.active = true;
      presetContributions = tableStateModel.calculatePreflopBlindPresetContributions();
    }
    presetRootNode.children.forEach(function (presetButtonNode) {
      var presetIndex = Number(presetButtonNode.name);
      var presetContributionChips = presetContributions[presetIndex];
      var isPresetLegal = presetContributionChips >= minimumContributionChips
        && presetContributionChips <= viewerStackChips;
      presetButtonNode.getComponent(cc.Button).interactable = isPresetLegal;
      wUIHelp.setNodeColor(
        presetButtonNode,
        isPresetLegal ? OriginalDzpkConfig.colorSet.white : OriginalDzpkConfig.colorSet.ash
      );
    });

    selectedControlNode.getChildByName('btn_yellow').getComponent(cc.Button).interactable =
      minimumContributionChips + 2 * tableStateModel.smallBlindChips <= viewerStackChips;
    selectedControlNode.getChildByName('btn_rang').active = minimumContributionChips <= 0;
    selectedControlNode.getChildByName('btn_green').active = minimumContributionChips > 0;
    cc.find('btn_green/layout/label', selectedControlNode).getComponent(cc.Label).string =
      wUtils.goldFormat(minimumContributionChips);
  },

  synchronizeAutomaticActionToggles: function (selectedAutomaticActionIndex) {
    var automaticActionRoot = this.node.getChildByName('btn').getChildByName('auto');
    for (
      var automaticActionIndex = 0;
      automaticActionIndex < automaticActionRoot.childrenCount;
      automaticActionIndex += 1
    ) {
      if (automaticActionIndex !== selectedAutomaticActionIndex) {
        automaticActionRoot.children[automaticActionIndex].getComponent(cc.Toggle).uncheck();
      }
    }
  },

  setRaiseSelectionVisible: function (
    shouldShowRaiseSelection,
    raisePresetContributions,
    viewerStackChips,
    smallBlindChips,
    shouldRestoreBettingControls
  ) {
    if (shouldRestoreBettingControls === undefined) shouldRestoreBettingControls = true;
    this.viewerMaximumChipAmount = viewerStackChips;
    var raiseSelectionRoot = this.node.getChildByName('btn').getChildByName('jiabet');
    raiseSelectionRoot.active = shouldShowRaiseSelection;
    this.node.getChildByName('btn').getChildByName('bet').active =
      shouldShowRaiseSelection ? false : shouldRestoreBettingControls;
    if (!shouldShowRaiseSelection) return;

    for (var presetIndex = 0; presetIndex < 5; presetIndex += 1) {
      var presetButtonNode = raiseSelectionRoot.getChildByName(String(presetIndex));
      var presetContributionChips = raisePresetContributions[presetIndex];
      presetButtonNode.children[0].getComponent(cc.Label).string =
        wUtils.goldFormat(presetContributionChips, 2);
      presetButtonNode.getComponent(cc.Button).interactable =
        presetContributionChips <= viewerStackChips;
      presetButtonNode.betGold = presetContributionChips;
    }
    var submitRaiseButtonNode = raiseSelectionRoot.getChildByName('btn');
    submitRaiseButtonNode.betGold = raisePresetContributions[5];
    this.minimumRaiseContributionChips = raisePresetContributions[5];

    var addBlindButtonNode = cc.find('slider/slider/Handle/btn_add', raiseSelectionRoot);
    var subtractBlindButtonNode = cc.find('slider/slider/Handle/btn_sub', raiseSelectionRoot);
    addBlindButtonNode.off('click');
    subtractBlindButtonNode.off('click');
    var tablePresentation = this;
    function adjustRaiseByBlindUnits(directionMultiplier) {
      var nextRaiseContribution = submitRaiseButtonNode.betGold
        + directionMultiplier * smallBlindChips;
      tablePresentation.handleRaiseSliderChanged({
        progress: viewerStackChips > 0 ? nextRaiseContribution / viewerStackChips : 0
      });
    }
    addBlindButtonNode.on('click', function () {
      adjustRaiseByBlindUnits(1);
    });
    subtractBlindButtonNode.on('click', function () {
      adjustRaiseByBlindUnits(-1);
    });
    this.handleRaiseSliderChanged({ progress: 0 });
  },

  handleRaiseSliderChanged: function (sliderEvent) {
    var sliderProgress = Number(sliderEvent.progress || 0);
    var minimumProgress = this.viewerMaximumChipAmount > 0
      ? this.minimumRaiseContributionChips / this.viewerMaximumChipAmount
      : 0;
    sliderProgress = Math.max(minimumProgress, Math.min(1, sliderProgress));
    var sliderPresentationRoot = cc.find('btn/jiabet/slider', this.node);
    sliderPresentationRoot.getChildByName('slider').getComponent(cc.Slider).progress = sliderProgress;
    sliderPresentationRoot.getChildByName('slider').getComponent(cc.ProgressBar).progress = sliderProgress;
    var selectedRaiseContributionChips = Math.floor(
      this.viewerMaximumChipAmount * sliderProgress
    );
    cc.find('slider/Handle/label', sliderPresentationRoot).getComponent(cc.Label).string =
      wUtils.goldFormat(selectedRaiseContributionChips, 2);
    sliderPresentationRoot.parent.getChildByName('btn').betGold = selectedRaiseContributionChips;

    var allInSpineNode = cc.find('slider/spine', sliderPresentationRoot);
    if (sliderProgress < 1) {
      allInSpineNode.active = false;
    } else if (!allInSpineNode.active) {
      allInSpineNode.active = true;
      wUIHelp.playSpine(allInSpineNode, 'start', function () {
        wUIHelp.playSpine(allInSpineNode, 'idle', null, false);
      });
    }

    var sliderBarLayout = cc.find('slider/bar/layout', sliderPresentationRoot);
    var visibleSegmentCount = Math.max(2, Math.floor(31 * sliderProgress));
    for (var segmentIndex = 1; segmentIndex < 32; segmentIndex += 1) {
      sliderBarLayout.children[segmentIndex - 1].active = visibleSegmentCount >= segmentIndex;
    }
    var sliderSparkNode = sliderBarLayout.getChildByName('anim');
    sliderSparkNode.active = true;
    sliderSparkNode.setPosition(sliderBarLayout.children[visibleSegmentCount - 1].getPosition());
    sliderSparkNode.y += 12;
    sliderSparkNode.children[0].getComponent(cc.Animation).play();
  },

  animateHoleCardDeal: function (localSeatId, participantCards, cardIndex) {
    var tablePresentation = this;
    var participantCardRoot = this.participantSeatRootNode.children[localSeatId].getChildByName('poker');
    if (cardIndex === 0) {
      participantCardRoot.active = true;
      wUIHelp.hideSonNode(participantCardRoot);
    }
    var dealOriginNode = this.node.getChildByName('s_pos');
    var firstOverlayCardNode = this.cardNodePool.getNode;
    firstOverlayCardNode.parent = dealOriginNode;
    firstOverlayCardNode.setPosition(0, 3);
    firstOverlayCardNode.scale = 0.4;
    firstOverlayCardNode.angle = -180;
    firstOverlayCardNode.opacity = 255;
    firstOverlayCardNode.active = true;
    var destinationCardNode = participantCardRoot.children[Number(cardIndex)];
    if (localSeatId === 0) {
      this.renderCardFace(participantCards[Number(cardIndex)], destinationCardNode);
      wUIHelp.hideSonNode(destinationCardNode);
      destinationCardNode.getComponent(cc.Sprite).spriteFrame =
        this.cardSpriteAtlas.getSpriteFrame('plist_puke_back_big_1');
    }
    var dealDestinationPosition = wUtils.world_local_POS(
      dealOriginNode,
      wUtils.local_world__POS(destinationCardNode)
    );
    firstOverlayCardNode.stopAllActions();
    firstOverlayCardNode.runAction(cc.sequence(
      cc.spawn(
        cc.moveTo(0.2, dealDestinationPosition),
        cc.rotateTo(0.2, 0),
        cc.scaleTo(0.2, destinationCardNode.scaleX, destinationCardNode.scaleY)
      ),
      cc.callFunc(function () {
        destinationCardNode.active = true;
        tablePresentation.cardNodePool.put(firstOverlayCardNode);
      })
    ));

    return wUtils.syncDelayed(0.15, this).then(function () {
      var secondOverlayCardNode = tablePresentation.cardNodePool.getNode;
      secondOverlayCardNode.parent = dealOriginNode;
      secondOverlayCardNode.setPosition(0, 3);
      secondOverlayCardNode.scale = 0.4;
      secondOverlayCardNode.angle = -180;
      secondOverlayCardNode.opacity = 255;
      secondOverlayCardNode.active = true;
      secondOverlayCardNode.stopAllActions();
      secondOverlayCardNode.runAction(cc.sequence(
        cc.spawn(
          cc.moveTo(0.2, dealDestinationPosition),
          cc.rotateTo(0.2, 0),
          cc.scaleTo(0.2, destinationCardNode.scaleX, destinationCardNode.scaleY),
          cc.fadeTo(0.2, 80)
        ),
        cc.callFunc(function () {
          tablePresentation.cardNodePool.put(secondOverlayCardNode);
          if (localSeatId === 0 && cardIndex === DEAL_CARD_OVERLAY_COUNT - 1) {
            tablePresentation.scheduleOnce(function () {
              participantCardRoot.children.forEach(function (viewerCardNode) {
                wUIHelp.hideSonNode(viewerCardNode, true);
                viewerCardNode.getComponent(cc.Sprite).spriteFrame =
                  tablePresentation.cardSpriteAtlas.getSpriteFrame('plist_puke_front_big');
              });
            }, 0.25);
          }
        })
      ));
    });
  },

  animateWagerCollectionToPot: function (localSeatId) {
    var tablePresentation = this;
    var participantSeatNode = this.participantSeatRootNode.children[localSeatId];
    var wagerImageNode = participantSeatNode.getChildByName('bet').children[0];
    if (!wagerImageNode.parent.active) return Promise.resolve();
    var chipAnimationRoot = this.node.getChildByName('chip');
    var wagerStartPosition = wUtils.world_local_POS(
      chipAnimationRoot,
      wUtils.local_world__POS(wagerImageNode)
    );
    var potDestinationWorldPosition = wUtils.local_world__POS(cc.find('label/allbet', this.node));
    potDestinationWorldPosition.x += 10;
    var potDestinationPosition = wUtils.world_local_POS(
      chipAnimationRoot,
      potDestinationWorldPosition
    );

    function animateNextCollectedChip(chipAnimationIndex) {
      if (chipAnimationIndex >= 4) {
        wagerImageNode.parent.active = false;
        return Promise.resolve();
      }
      var collectedChipNode = tablePresentation.chipNodePool.getNode;
      collectedChipNode.parent = chipAnimationRoot;
      collectedChipNode.setPosition(wagerStartPosition);
      collectedChipNode.act = true;
      collectedChipNode.stopAllActions();
      collectedChipNode.runAction(cc.moveTo(0.25, potDestinationPosition));
      return wUtils.syncDelayed(0.07, tablePresentation).then(function () {
        return animateNextCollectedChip(chipAnimationIndex + 1);
      });
    }
    return animateNextCollectedChip(0);
  },

  animateStandardPotDistribution: function (settlementPresentation) {
    var destinationLocalSeats = collectAwardDestinationSeats(settlementPresentation);
    var tablePresentation = this;
    return Promise.all(destinationLocalSeats.map(function (destinationLocalSeat) {
      return tablePresentation.animateCentralPotToParticipant(destinationLocalSeat);
    }));
  },

  animateCentralPotToParticipant: function (destinationLocalSeat) {
    var tablePresentation = this;
    var chipAnimationRoot = this.node.getChildByName('chip');
    var destinationSeatNode = this.participantSeatRootNode.children[destinationLocalSeat];
    var destinationPosition = wUtils.world_local_POS(
      this.node,
      wUtils.local_world__POS(destinationSeatNode)
    );
    var potStartPosition = wUtils.world_local_POS(
      chipAnimationRoot,
      wUtils.local_world__POS(cc.find('label/allbet/img', this.node))
    );

    function animateNextAwardChip(chipAnimationIndex) {
      if (chipAnimationIndex >= POT_CHIP_ANIMATION_COUNT) {
        tablePresentation.renderCollectedPotAmount(null);
        return Promise.resolve();
      }
      var awardChipNode = tablePresentation.chipNodePool.getNode;
      awardChipNode.opacity = 255;
      awardChipNode.parent = chipAnimationRoot;
      awardChipNode.setPosition(potStartPosition);
      awardChipNode.act = true;
      awardChipNode.stopAllActions();
      awardChipNode.runAction(cc.sequence(
        cc.moveTo(0.25, destinationPosition),
        cc.fadeOut(0.15),
        cc.callFunc(function () {
          awardChipNode.opacity = 255;
          tablePresentation.chipNodePool.put(awardChipNode);
        })
      ));
      return wUtils.syncDelayed(0.08, tablePresentation).then(function () {
        return animateNextAwardChip(chipAnimationIndex + 1);
      });
    }
    return animateNextAwardChip(0).then(function () {
      return wUtils.syncDelayed(1, tablePresentation);
    });
  },

  renderSettlementAwardLabels: function (settlementPresentation) {
    var tablePresentation = this;
    var creditedAmountByUid = {};
    settlementPresentation.winningParticipantUids.forEach(function (winnerUid) {
      creditedAmountByUid[winnerUid] = settlementPresentation.payoutAmountByUid[winnerUid] || 0;
    });
    Object.keys(settlementPresentation.returnAmountByUid).forEach(function (returningUid) {
      creditedAmountByUid[returningUid] = (creditedAmountByUid[returningUid] || 0)
        + settlementPresentation.returnAmountByUid[returningUid];
    });
    Object.keys(creditedAmountByUid).forEach(function (creditedUid) {
      var creditedLocalSeat = settlementPresentation.localSeatByUid[creditedUid];
      var creditedChips = creditedAmountByUid[creditedUid];
      if (creditedLocalSeat === undefined || creditedChips <= 0) return;
      if (String(creditedUid) === settlementPresentation.primaryWinnerUid) {
        tablePresentation.renderPrimaryWinnerAward(creditedLocalSeat, creditedChips);
        return;
      }
      // The source UI displays one numeric settlement amount per seat. Merge
      // payout and return before cloning that original numeric label.
      tablePresentation.renderClonedOriginalAmountLabel(
        creditedLocalSeat,
        creditedChips,
        '',
        'AdditionalSettlementAmount'
      );
    });
  },

  renderPrimaryWinnerAward: function (winnerLocalSeat, winnerAwardChips) {
    var settlementAnimationRoot = this.node.getChildByName('win');
    var originalWinnerLabelNode = settlementAnimationRoot.getChildByName('winlabel');
    originalWinnerLabelNode.zIndex = 20;
    originalWinnerLabelNode.getComponent(cc.Label).string =
      '+' + wUtils.goldFormat(winnerAwardChips);
    originalWinnerLabelNode.active = true;
    originalWinnerLabelNode.setPosition(
      this.participantSeatRootNode.children[winnerLocalSeat].getPosition()
    );
    originalWinnerLabelNode.runAction(cc.sequence(
      cc.moveBy(0.2, 0, 100).easing(cc.easeOut(1)),
      cc.delayTime(2),
      cc.callFunc(function () {
        originalWinnerLabelNode.active = false;
      })
    ));

    if (String(winnerLocalSeat) === '0') {
      var viewerWinnerSpineNode = settlementAnimationRoot.getChildByName('spine');
      viewerWinnerSpineNode.active = true;
      wUIHelp.playSpine(viewerWinnerSpineNode, 'animation', function () {
        viewerWinnerSpineNode.active = false;
      });
    }
    var seatWinnerAnimationNode = settlementAnimationRoot.getChildByName(String(winnerLocalSeat));
    if (seatWinnerAnimationNode) {
      seatWinnerAnimationNode.getChildByName('gold').getComponent(cc.Label).string =
        wUtils.goldFormat(winnerAwardChips);
      var seatWinnerSpineNode = seatWinnerAnimationNode.getChildByName('spine');
      seatWinnerSpineNode.active = true;
      wUIHelp.playSpine(seatWinnerSpineNode, 'animation', function () {
        seatWinnerSpineNode.active = false;
      });
      return;
    }
    var movableWinnerSpineNode = settlementAnimationRoot.getChildByName('winspine');
    movableWinnerSpineNode.active = true;
    movableWinnerSpineNode.setPosition(
      this.participantSeatRootNode.children[winnerLocalSeat].getPosition()
    );
    wUIHelp.playSpine(movableWinnerSpineNode, 'animation', function () {
      movableWinnerSpineNode.active = false;
    });
  },

  renderClonedOriginalAmountLabel: function (
    localSeatId,
    chipAmount,
    labelSuffix,
    semanticNodeName
  ) {
    var originalWinnerLabelNode = this.node.getChildByName('win').getChildByName('winlabel');
    var clonedAmountLabelNode = cc.instantiate(originalWinnerLabelNode);
    clonedAmountLabelNode.name = semanticNodeName || 'AdditionalWinnerAmount';
    clonedAmountLabelNode.parent = originalWinnerLabelNode.parent;
    clonedAmountLabelNode.zIndex = 20;
    clonedAmountLabelNode.opacity = 255;
    clonedAmountLabelNode.active = true;
    clonedAmountLabelNode.getComponent(cc.Label).string =
      '+' + wUtils.goldFormat(chipAmount) + labelSuffix;
    clonedAmountLabelNode.setPosition(
      this.participantSeatRootNode.children[localSeatId].getPosition()
    );
    clonedAmountLabelNode.runAction(cc.sequence(
      cc.moveBy(0.2, 0, 100).easing(cc.easeOut(1)),
      cc.delayTime(2),
      cc.callFunc(function () {
        if (cc.isValid(clonedAmountLabelNode, true)) clonedAmountLabelNode.destroy();
      })
    ));
  },

  renderParticipantShowdown: function (
    localSeatId,
    participantHoleCards,
    bestFiveCards,
    legacyHandValue,
    isWinningParticipant,
    isPrimaryWinner
  ) {
    var pokerTypeIndex = this.parseLegacyHandCategory(legacyHandValue);
    var settlementAnimationRoot = this.node.getChildByName('win');
    var settlementTemplateName = isWinningParticipant ? 'win' : 'lose';
    if (pokerTypeIndex > 6 && isPrimaryWinner) settlementTemplateName = 'bigwin';
    var settlementTemplateNode = settlementAnimationRoot.getChildByName(settlementTemplateName);
    var participantSettlementNode = cc.instantiate(settlementTemplateNode);
    settlementAnimationRoot.addChild(participantSettlementNode, 10, String(localSeatId));
    this.scheduleOnce(function () {
      if (cc.isValid(participantSettlementNode, true)) participantSettlementNode.destroy();
    }, 5);
    participantSettlementNode.setPosition(
      this.participantSeatRootNode.children[localSeatId].getPosition()
    );
    participantSettlementNode.active = true;
    participantSettlementNode.getChildByName('type').getComponent(cc.Sprite).spriteFrame =
      this.handCategorySpriteAtlas.getSpriteFrame(
        (isWinningParticipant ? 'w' : '') + pokerTypeIndex + '.png'
      );

    var tablePresentation = this;
    var settlementHoleCardRoot = participantSettlementNode.getChildByName('poker');
    settlementHoleCardRoot.children.forEach(function (settlementHoleCardNode) {
      var holeCardIndex = Number(settlementHoleCardNode.name);
      tablePresentation.renderCardFace(
        participantHoleCards[holeCardIndex],
        settlementHoleCardNode
      );
      settlementHoleCardNode.setPosition(-24.5, 3);
      settlementHoleCardNode.runAction(cc.sequence(
        cc.sequence(
          cc.moveBy(0.15, 0, 50),
          cc.moveBy(0.15, 0, -50)
        ).easing(cc.easeOut(1.5)),
        cc.callFunc(function () {
          if (settlementHoleCardNode.name === '1') {
            settlementHoleCardNode.runAction(cc.moveTo(0.15, cc.v2(28, 3)));
          }
        })
      ));
    });

    return wUtils.syncDelayed(0.5, this).then(function () {
      settlementHoleCardRoot.children.forEach(function (settlementHoleCardNode) {
        var holeCardIndex = Number(settlementHoleCardNode.name);
        var shouldHighlightHoleCard = isWinningParticipant
          && bestFiveCards.indexOf(participantHoleCards[holeCardIndex]) !== -1;
        wUIHelp.setNodeColor(
          settlementHoleCardNode,
          shouldHighlightHoleCard
            ? OriginalDzpkConfig.colorSet.white
            : OriginalDzpkConfig.colorSet.ash
        );
      });
      if (pokerTypeIndex <= 6 || !isPrimaryWinner) return;
      var premiumHandAnimationRoot = tablePresentation.node.getChildByName('dwin1');
      wUIHelp.hideSonNode(premiumHandAnimationRoot);
      var premiumHandAnimationNode = premiumHandAnimationRoot.getChildByName(
        String(pokerTypeIndex)
      );
      premiumHandAnimationNode.active = true;
      wUIHelp.playSpine(premiumHandAnimationNode, 'animation', function () {
        premiumHandAnimationNode.active = false;
      });
    });
  },

  animateParticipantCardsRecovery: function (localSeatId) {
    var participantCardRoot = this.participantSeatRootNode.children[localSeatId].getChildByName('poker');
    var cardRecoveryPosition = wUtils.world_local_POS(
      participantCardRoot,
      wUtils.local_world__POS(this.node.getChildByName('s_pos'))
    );
    if (localSeatId !== 0) {
      var tablePresentation = this;
      participantCardRoot.children.forEach(function (participantCardNode) {
        var sourceCardPosition = participantCardNode.getPosition();
        participantCardNode.runAction(cc.sequence(
          cc.moveTo(0.3, cardRecoveryPosition),
          cc.fadeOut(0.3),
          cc.callFunc(function () {
            tablePresentation.scheduleOnce(function () {
              participantCardRoot.active = false;
              participantCardNode.opacity = 255;
              wUIHelp.setNodeColor(participantCardNode, OriginalDzpkConfig.colorSet.white);
              participantCardNode.setPosition(sourceCardPosition);
            });
          })
        ));
      });
      return Promise.resolve();
    }

    this.renderViewerHandCategory(null);
    var viewerCardNodes = participantCardRoot.children.slice();
    var tablePresentationForViewer = this;
    function recoverNextViewerCard(viewerCardIndex) {
      if (viewerCardIndex >= viewerCardNodes.length) {
        return wUtils.syncDelayed(0.2, tablePresentationForViewer).then(function () {
          var revealSequence = Promise.resolve();
          viewerCardNodes.forEach(function (viewerCardNode) {
            revealSequence = revealSequence.then(function () {
              viewerCardNode.active = true;
              var sourceViewerCardPosition = viewerCardNode.getPosition();
              viewerCardNode.y -= 200;
              wUIHelp.setNodeColor(viewerCardNode, OriginalDzpkConfig.colorSet.ash);
              viewerCardNode.runAction(cc.moveTo(0.3, sourceViewerCardPosition));
              return wUtils.syncDelayed(0.06, tablePresentationForViewer);
            });
          });
          return revealSequence;
        });
      }
      var viewerCardNode = viewerCardNodes[viewerCardIndex];
      var originalViewerCardPosition = viewerCardNode.getPosition();
      viewerCardNode.runAction(cc.sequence(
        cc.spawn(
          cc.moveTo(0.35, cardRecoveryPosition),
          cc.fadeTo(0.35, 80),
          cc.scaleTo(0.35, 0.4),
          cc.rotateTo(0.35, -180)
        ),
        cc.callFunc(function () {
          tablePresentationForViewer.scheduleOnce(function () {
            viewerCardNode.active = false;
            viewerCardNode.opacity = 255;
            viewerCardNode.scale = 0.58;
            viewerCardNode.angle = 0;
            wUIHelp.setNodeColor(viewerCardNode, OriginalDzpkConfig.colorSet.white);
            viewerCardNode.setPosition(originalViewerCardPosition);
          });
        })
      ));
      return wUtils.syncDelayed(0.15, tablePresentationForViewer).then(function () {
        return recoverNextViewerCard(viewerCardIndex + 1);
      });
    }
    return recoverNextViewerCard(0);
  },

  hideParticipantActionBadge: function (localSeatId) {
    this.participantSeatRootNode.children[localSeatId]
      .getChildByName('info')
      .getChildByName('tips').active = false;
  },

  restoreParticipantHoleCardColors: function (localSeatId) {
    this.participantSeatRootNode.children[localSeatId]
      .getChildByName('poker').children.forEach(function (participantCardNode) {
        wUIHelp.setNodeColor(participantCardNode, OriginalDzpkConfig.colorSet.white);
      });
  },

  renderViewerHandCategory: function (legacyHandValue) {
    var viewerCategoryNode = this.participantSeatRootNode.children[0].getChildByName('type');
    viewerCategoryNode.active = Boolean(legacyHandValue);
    if (!legacyHandValue) return;
    var pokerTypeIndex = this.parseLegacyHandCategory(legacyHandValue);
    viewerCategoryNode.getChildByName('img').getComponent(cc.Sprite).spriteFrame =
      this.handCategorySpriteAtlas.getSpriteFrame(pokerTypeIndex + '.png');
  },

  parseLegacyHandCategory: function (legacyHandValue) {
    var bestFiveCardSuffix = legacyHandValue.slice(-10);
    return legacyHandValue.slice(0, legacyHandValue.length - bestFiveCardSuffix.length);
  },

  renderExistingCommunityCards: function (communityCards) {
    var communityCardRoot = this.node.getChildByName('poker');
    wUIHelp.hideSonNode(communityCardRoot);
    if (!communityCards || communityCards.length === 0) return;
    communityCardRoot.getChildByName('di').active = true;
    for (var communityCardIndex = 0; communityCardIndex < communityCards.length; communityCardIndex += 1) {
      var communityCardNode = communityCardRoot.children[communityCardIndex + 1];
      communityCardNode.active = true;
      communityCardNode.getComponent(cc.Sprite).spriteFrame =
        this.cardSpriteAtlas.getSpriteFrame('plist_puke_front_big');
      wUIHelp.hideSonNode(communityCardNode);
      this.renderCardFace(communityCards[communityCardIndex], communityCardNode);
    }
  },

  animateCommunityCardReveal: function (allCommunityCards, newlyRevealedCardCount) {
    var communityCardRoot = this.node.getChildByName('poker');
    if (allCommunityCards.length === 0) {
      wUIHelp.hideSonNode(communityCardRoot);
      return Promise.resolve();
    }
    communityCardRoot.active = true;
    if (newlyRevealedCardCount === 3 || newlyRevealedCardCount === 5) {
      return this.animateInitialCommunityCardBatch(allCommunityCards, communityCardRoot);
    }
    return this.animateIncrementalCommunityCards(allCommunityCards, communityCardRoot);
  },

  animateInitialCommunityCardBatch: function (communityCards, communityCardRoot) {
    wUIHelp.hideSonNode(communityCardRoot);
    communityCardRoot.getChildByName('di').active = true;
    var tablePresentation = this;
    function animateNextFaceDownCard(communityCardIndex) {
      if (communityCardIndex >= communityCards.length) {
        return wUtils.syncDelayed(0.2, tablePresentation).then(function () {
          for (
            var revealCardIndex = 0;
            revealCardIndex < communityCards.length;
            revealCardIndex += 1
          ) {
            var revealedCardNode = communityCardRoot.children[revealCardIndex + 1];
            revealedCardNode.getComponent(cc.Sprite).spriteFrame =
              tablePresentation.cardSpriteAtlas.getSpriteFrame('plist_puke_front_big');
            tablePresentation.renderCardFace(communityCards[revealCardIndex], revealedCardNode);
            if (revealCardIndex > 0) {
              revealedCardNode.runAction(cc.moveTo(0.15, revealedCardNode.sourcePosition));
            }
          }
        });
      }
      var communityCardNode = communityCardRoot.children[communityCardIndex + 1];
      wAudioMgr.playSound('sound/fapaia', 'DZPK');
      wUIHelp.hideSonNode(communityCardNode);
      communityCardNode.getComponent(cc.Sprite).spriteFrame =
        tablePresentation.cardSpriteAtlas.getSpriteFrame('plist_puke_back_big_1');
      communityCardNode.active = true;
      if (!communityCardNode.sourcePosition) {
        communityCardNode.sourcePosition = communityCardNode.getPosition();
      }
      communityCardNode.scale = 0.2;
      communityCardNode.setPosition(-6, 206);
      communityCardNode.runAction(cc.spawn(
        cc.scaleTo(0.25, 0.66),
        cc.moveTo(0.25, -246, 13.338)
      ));
      return wUtils.syncDelayed(0.1, tablePresentation).then(function () {
        return animateNextFaceDownCard(communityCardIndex + 1);
      });
    }
    return animateNextFaceDownCard(0);
  },

  animateIncrementalCommunityCards: function (communityCards, communityCardRoot) {
    var firstNewCardIndex = communityCardRoot.children[4].active ? 4 : 3;
    var tablePresentation = this;
    function animateNextNewCard(communityCardIndex) {
      if (communityCardIndex >= communityCards.length) return Promise.resolve();
      wAudioMgr.playSound('sound/fapaia', 'DZPK');
      var communityCardNode = communityCardRoot.children[communityCardIndex + 1];
      wUIHelp.hideSonNode(communityCardNode);
      communityCardNode.getComponent(cc.Sprite).spriteFrame =
        tablePresentation.cardSpriteAtlas.getSpriteFrame('plist_puke_back_big_1');
      communityCardNode.active = true;
      if (!communityCardNode.sourcePosition) {
        communityCardNode.sourcePosition = communityCardNode.getPosition();
      }
      communityCardNode.scale = 0.2;
      communityCardNode.setPosition(-6, 206);
      communityCardNode.runAction(cc.sequence(
        cc.spawn(
          cc.scaleTo(0.25, 0.66),
          cc.moveTo(0.25, communityCardNode.sourcePosition)
        ),
        cc.callFunc(function () {
          communityCardNode.getComponent(cc.Sprite).spriteFrame =
            tablePresentation.cardSpriteAtlas.getSpriteFrame('plist_puke_front_big');
          tablePresentation.renderCardFace(
            communityCards[communityCardIndex],
            communityCardNode
          );
        })
      ));
      return wUtils.syncDelayed(0.2, tablePresentation).then(function () {
        return animateNextNewCard(communityCardIndex + 1);
      });
    }
    return animateNextNewCard(firstNewCardIndex);
  },

  highlightWinningCommunityCards: function (bestFiveCards, communityCards) {
    var communityCardRoot = this.node.getChildByName('poker');
    if (!bestFiveCards) {
      wUIHelp.hideSonNode(communityCardRoot);
      wUIHelp.setNodeColor(communityCardRoot, OriginalDzpkConfig.colorSet.white);
      return;
    }
    for (
      var communityCardIndex = 0;
      communityCardIndex < communityCards.length;
      communityCardIndex += 1
    ) {
      var communityCardNode = communityCardRoot.children[communityCardIndex + 1];
      wUIHelp.setNodeColor(
        communityCardNode,
        bestFiveCards.indexOf(communityCards[communityCardIndex]) !== -1
          ? OriginalDzpkConfig.colorSet.white
          : OriginalDzpkConfig.colorSet.ash
      );
    }
  },

  // Serialized SliderEvent compatibility; the Prefab is migrated to the
  // semantic method name, but old study snapshots can still call this alias.
  sliderEvevt: function (sliderEvent) {
    return this.handleRaiseSliderChanged(sliderEvent);
  }
});

exports.default = DzpkTablePresentation;

function collectAwardDestinationSeats(settlementPresentation) {
  var destinationSeatLookup = {};
  settlementPresentation.winningParticipantUids.forEach(function (winnerUid) {
    if ((settlementPresentation.payoutAmountByUid[winnerUid] || 0) <= 0) return;
    var winnerLocalSeat = settlementPresentation.localSeatByUid[winnerUid];
    if (winnerLocalSeat !== undefined) destinationSeatLookup[String(winnerLocalSeat)] = true;
  });
  Object.keys(settlementPresentation.returnAmountByUid).forEach(function (returningUid) {
    var returningLocalSeat = settlementPresentation.localSeatByUid[returningUid];
    if (returningLocalSeat !== undefined) destinationSeatLookup[String(returningLocalSeat)] = true;
  });
  return Object.keys(destinationSeatLookup).map(function (localSeatText) {
    return Number(localSeatText);
  });
}
