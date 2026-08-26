"use strict";
Object.defineProperty(exports, "__esModule", {
  value: true,
});
var PokerBase = require("PokerBase").default;
var DzpkTableStateModel = require("DzpkTableStateModel").DzpkTableStateModel;
var DzpkTablePresentation = require("DzpkTablePresentation").default;
var SOURCE_EVENT = {
  ROOM_SNAPSHOT: "Msg_DZPK_RoomInfo",
  PLAYER_ENTERED: "Msg_DZPK_PlayerAct", PRIVATE_CARDS_DEALT: "Msg_DZPK_FaCards",
  FORCED_WAGERS_POSTED: "Msg_DZPK_StageBet", ACTION_TURN_STARTED: "Msg_DZPK_CallUserAct",
  PARTICIPANT_ACTION_APPLIED: "Msg_DZPK_ActBet", COMMUNITY_CARDS_REVEALED: "Msg_DZPK_PublicCards",
  HAND_SETTLED: "Msg_DZPK_Result", PARTICIPANT_BALANCE_CHANGED: "Msg_DZPK_ChangGold",
  PARTICIPANT_LEFT: "Msg_DZPK_Out"
};
var SOURCE_STAGE = { WAITING: 0, DEALING: 1, BETTING: 2, RESULT: 3 };
var SOURCE_ACTION = { RAISE: 3, CALL_OR_CHECK: 4, FOLD: 5, ALL_IN: 6 };
var ACTION_CONTROL = { HIDDEN: "", BETTING: "bet", AUTOMATIC: "auto" };
var AUTOMATIC_ACTION = { CHECK_OR_FOLD_ONCE: 0, AUTOMATIC_CHECK_OR_FOLD: 1, CALL_ANY_AMOUNT: 2 };
var TABLE_SEAT_COUNT = 6;
var SOURCE_DEAL_CARD_COUNT = 2;
var SOURCE_CARD_DEAL_INTERVAL_SECONDS = 0.1;
var SOURCE_EVENT_TRANSITION_DELAY_SECONDS = 0.5;
var SOURCE_WAGER_COLLECTION_DELAY_SECONDS = 0.7;
var SOURCE_SETTLEMENT_OPENING_DELAY_SECONDS = 1.5;
var SOURCE_SETTLEMENT_POT_DELAY_SECONDS = 1;
var SOURCE_SETTLEMENT_CLEANUP_DELAY_SECONDS = 4;
var AUTOMATIC_ACTION_DELAY_SECONDS = 1;
var DzpkTableGameController = cc.Class({
  extends: PokerBase,
  name: "DzpkTableGameController",
  onLoad: function () {
    this.initializeSemanticController();
    this.subscribeToSourceTableEvents();
    this.m_init();
  },
  onDestroy: function () {
    this.presentationEpoch += 1;
    this.automaticActionToken += 1;
    this.unsubscribeFromSourceTableEvents();
  },
  /** Owns table state and orchestration; the sibling component owns visuals. */
  initializeSemanticController: function () {
    var presentationComponent = this.node.getComponent(DzpkTablePresentation);
    if (!presentationComponent) {
      throw new Error("DzpkTablePresentation must be attached to DZPKMain");
    }
    this.tableStateModel = new DzpkTableStateModel();
    this.tablePresentation = presentationComponent;
    this.sourceEventSubscriptions = [];
    this.presentationQueue = Promise.resolve();
    this.presentationEpoch = 1;
    this.automaticActionToken = 0;
    this.isViewerActionSubmissionPending = false;
    this.isRoomReturnPending = false;
    this.lastSettlementFingerprint = "";
    this.tablePresentation.initializeTablePresentation();
  },
  subscribeToSourceTableEvents: function () {
    this.subscribeToSuccessfulSourceEvent(SOURCE_EVENT.PLAYER_ENTERED, "handleParticipantEntered");
    this.subscribeToSuccessfulSourceEvent(SOURCE_EVENT.PRIVATE_CARDS_DEALT, "handlePrivateCardsDealt");
    this.subscribeToSuccessfulSourceEvent(SOURCE_EVENT.FORCED_WAGERS_POSTED, "handleForcedWagersPosted");
    this.subscribeToSuccessfulSourceEvent(SOURCE_EVENT.ACTION_TURN_STARTED, "handleActionTurnStarted");
    this.subscribeToSuccessfulSourceEvent(SOURCE_EVENT.PARTICIPANT_ACTION_APPLIED, "handleParticipantActionApplied");
    this.subscribeToSuccessfulSourceEvent(SOURCE_EVENT.COMMUNITY_CARDS_REVEALED, "handleCommunityCardsRevealed");
    this.subscribeToSuccessfulSourceEvent(SOURCE_EVENT.HAND_SETTLED, "handleHandSettled");
    this.subscribeToSuccessfulSourceEvent(SOURCE_EVENT.PARTICIPANT_BALANCE_CHANGED, "handleParticipantBalanceChanged");
    this.subscribeToSuccessfulSourceEvent(SOURCE_EVENT.PARTICIPANT_LEFT, "handleParticipantLeft");
  },
  subscribeToSuccessfulSourceEvent: function (eventName, semanticHandlerName) {
    var controller = this;
    var subscription = wGEvent.on(
      eventName,
      function (sourceEnvelope) {
        if (!sourceEnvelope || sourceEnvelope.status !== 1) {
          controller.handleSourceEventFailure(eventName, sourceEnvelope);
          return;
        }
        controller[semanticHandlerName](sourceEnvelope.data || {});
      },
      this,
    );
    this.sourceEventSubscriptions.push(subscription);
  },
  unsubscribeFromSourceTableEvents: function () {
    if (typeof wGEvent === "undefined" || !wGEvent || typeof wGEvent.off !== "function") return;
    this.sourceEventSubscriptions.forEach(function (subscription) {
      wGEvent.off(subscription);
    });
    this.sourceEventSubscriptions = [];
  },
  handleSourceEventFailure: function (eventName, sourceEnvelope) {
    this.isViewerActionSubmissionPending = false;
    if (eventName === SOURCE_EVENT.PARTICIPANT_LEFT) this.isRoomReturnPending = false;
    var message = sourceEnvelope && sourceEnvelope.msg ? sourceEnvelope.msg : eventName + " failed";
    if (typeof wLog !== "undefined" && wLog && typeof wLog.e === "function") wLog.e(message);
    this.restoreViewerActionControlsIfApplicable();
  },
  /** A reconnect snapshot supersedes every delayed animation from the old socket. */
  handleRoomSnapshotReceived: function (roomSnapshot) {
    var controller = this;
    return this.replacePresentationQueue(function () {
      var normalizedSnapshot = normalizeRoomSnapshot(roomSnapshot);
      controller.tableStateModel.initializeFromRoomSnapshot(normalizedSnapshot);
      controller.renderCompleteRoomSnapshot(normalizedSnapshot);
    });
  },
  renderCompleteRoomSnapshot: function (roomSnapshot) {
    this.resetEverySeatPresentation();
    this.tablePresentation.hideAllOpponentHoleCards();
    this.tableStateModel.participants.forEach(function (participant) {
      this.renderParticipantSnapshot(participant, roomSnapshot);
    }, this);
    this.renderSnapshotDealerButton();
    this.renderSnapshotPotState();
    this.tablePresentation.renderExistingCommunityCards(this.tableStateModel.publicBoardCards.slice());
    this.renderViewerHandCategoryFromPayload(roomSnapshot.px);
    this.renderSnapshotStatusTips();
    this.restoreSnapshotActionTurn();
  },
  resetEverySeatPresentation: function () {
    for (var localSeat = 0; localSeat < TABLE_SEAT_COUNT; localSeat += 1) {
      this.tablePresentation.resetParticipantSeatPresentation(localSeat);
      this.tablePresentation.setParticipantSeatPresence(localSeat, null);
    }
    this.tablePresentation.showPlayerActionControls(ACTION_CONTROL.HIDDEN, 0, this.tableStateModel);
    this.tablePresentation.setRaiseSelectionVisible(false, [], 0, 0, false);
  },
  renderParticipantSnapshot: function (participant, roomSnapshot) {
    var sourceAction = readParticipantSourceAction(roomSnapshot.curbet, participant.participantId);
    participant.sourceActionCode = sourceAction.act;
    participant.displayedStreetContributionChips = sourceAction.gold;
    participant.isParticipating = participantParticipatesInSnapshot(participant, roomSnapshot.stage);
    var localSeat = participant.viewerLocalSeatId;
    this.tablePresentation.setParticipantSeatPresence(localSeat, participant);
    this.tablePresentation.renderParticipantChipBalance(localSeat, participant.stackChips);
    this.tablePresentation.renderParticipantActionCountdown(localSeat, null);
    this.tablePresentation.setParticipantFoldedAppearance(
      localSeat,
      this.tableStateModel.sourceStageCode === SOURCE_STAGE.WAITING ||
        (participant.isParticipating && sourceAction.act !== SOURCE_ACTION.FOLD)
    );
    this.tablePresentation.renderParticipantHoleCards(localSeat, participant.holeCards.slice(), sourceAction.act);
    if (sourceAction.gold > 0) {
      this.tablePresentation.animateParticipantWager(localSeat, sourceAction.gold, false);
    }
    if (sourceAction.act > 0) {
      this.tablePresentation.renderParticipantActionBadge(localSeat, sourceActionBadgeCode(sourceAction), false);
    } else {
      this.tablePresentation.hideParticipantActionBadge(localSeat);
    }
  },
  renderSnapshotDealerButton: function () {
    var dealer = this.tableStateModel.findParticipantById(this.tableStateModel.dealerParticipantId);
    if (dealer) {
      this.tablePresentation.renderDealerButtonAtSeat(dealer.viewerLocalSeatId);
    }
  },
  renderSnapshotPotState: function () {
    var visibleStreetWagers = sumVisibleStreetWagers(this.tableStateModel.participants);
    this.tableStateModel.collectedPreviousStreetPotChips = Math.max(0, this.tableStateModel.totalPotChips - visibleStreetWagers);
    this.tablePresentation.renderTotalPotAmount(this.tableStateModel.totalPotChips);
    this.tablePresentation.renderCollectedPotAmount(this.tableStateModel.collectedPreviousStreetPotChips, false);
    this.renderViewerWagerDifference();
  },
  renderViewerWagerDifference: function () {
    var maximumStreetWager = this.tableStateModel.maximumNumericValue(
      this.tableStateModel.participants.map(function (participant) {
        return participant.displayedStreetContributionChips;
      }),
    );
    var viewerStreetWager = this.tableStateModel.viewerParticipant ? this.tableStateModel.viewerParticipant.displayedStreetContributionChips : 0;
    this.tablePresentation.renderWagerDifferenceAmount(Math.max(0, maximumStreetWager - viewerStreetWager));
  },
  renderViewerHandCategoryFromPayload: function (handValuesByParticipant) {
    var viewerParticipantId = this.tableStateModel.viewerParticipant ? this.tableStateModel.viewerParticipant.participantId : null;
    var legacyHandValue = readIdentityMapValue(handValuesByParticipant, viewerParticipantId);
    this.tablePresentation.renderViewerHandCategory(legacyHandValue || null);
  },
  renderSnapshotStatusTips: function () {
    var model = this.tableStateModel;
    var viewer = model.viewerParticipant;
    var viewerWaitsForNextHand = model.sourceStageCode > SOURCE_STAGE.WAITING && (!viewer || viewer.holeCards.length === 0 || model.sourceStageCode === SOURCE_STAGE.RESULT);
    if (viewerWaitsForNextHand) this.tablePresentation.showTableStatusTip("wait", true);
    else if (model.sourceStageCode === SOURCE_STAGE.WAITING && model.participants.length < 3) this.tablePresentation.showTableStatusTip("oth", true);
    else this.tablePresentation.showTableStatusTip("wait", false);
  },
  restoreSnapshotActionTurn: function () {
    var notice = this.tableStateModel.currentActionNotice;
    if (!notice || Array.isArray(notice) || notice.uid === undefined) {
      this.tablePresentation.showPlayerActionControls(ACTION_CONTROL.HIDDEN, 0, this.tableStateModel);
      return;
    }
    this.renderActionTurnNotice(notice, false);
  },
  handleParticipantEntered: function (participantSnapshot) {
    var controller = this;
    return this.enqueuePresentationWork(function () {
      var existing = controller.tableStateModel.findParticipantByIdIfPresent(participantSnapshot.uid);
      var participant = existing ? existing.applySourceSnapshot(participantSnapshot) : controller.tableStateModel.addParticipantFromSourceSnapshot(participantSnapshot);
      participant.isParticipating = false;
      controller.tablePresentation.resetParticipantSeatPresentation(participant.viewerLocalSeatId);
      controller.tablePresentation.setParticipantSeatPresence(participant.viewerLocalSeatId, participant);
      controller.tablePresentation.renderParticipantChipBalance(participant.viewerLocalSeatId, participant.stackChips);
      controller.tablePresentation.setParticipantFoldedAppearance(
        participant.viewerLocalSeatId,
        controller.tableStateModel.sourceStageCode === SOURCE_STAGE.WAITING
      );
      controller.renderSnapshotStatusTips();
    });
  },
  handleParticipantLeft: function (leavePayload) {
    var controller = this;
    return this.enqueuePresentationWork(function () {
      if (sourceIdentityEquals(
        leavePayload.uid,
        controller.tableStateModel.viewerParticipant
          && controller.tableStateModel.viewerParticipant.participantId
      )) {
        controller.isRoomReturnPending = false;
      }
      var participant = controller.tableStateModel.findParticipantByIdIfPresent(leavePayload.uid);
      if (!participant) return;
      controller.tableStateModel.participants = controller.tableStateModel.participants.filter(function (candidate) {
        return !sourceIdentityEquals(candidate.participantId, participant.participantId);
      });
      controller.tablePresentation.resetParticipantSeatPresentation(participant.viewerLocalSeatId);
      controller.tablePresentation.setParticipantSeatPresence(participant.viewerLocalSeatId, null);
      controller.renderSnapshotStatusTips();
    });
  },
  /** A FaCards event starts a new server-owned hand; the client never requests one. */
  handlePrivateCardsDealt: function (dealPayload) {
    var controller = this;
    return this.replacePresentationQueue(function (presentationEpoch) {
      controller.prepareModelForNewHand(dealPayload);
      controller.prepareSeatsForNewHand();
      controller.renderSnapshotDealerButton();
      return controller.animateSourceDealOrder(dealPayload, presentationEpoch);
    });
  },
  prepareModelForNewHand: function (dealPayload) {
    var inGameParticipantIds = Array.isArray(dealPayload.ingame) ? dealPayload.ingame : [];
    this.lastSettlementFingerprint = "";
    this.isViewerActionSubmissionPending = false;
    this.automaticActionToken += 1;
    this.tableStateModel.sourceStageCode = SOURCE_STAGE.DEALING;
    this.tableStateModel.publicBoardCards = [];
    this.tableStateModel.totalPotChips = 0;
    this.tableStateModel.collectedPreviousStreetPotChips = 0;
    this.tableStateModel.sourceActionsByParticipant = {};
    this.tableStateModel.handContributionsByParticipant = {};
    this.tableStateModel.currentActionNotice = [];
    this.tableStateModel.dealerParticipantId = dealPayload.bankeruid;
    this.tableStateModel.participants.forEach(function (participant) {
      participant.displayedStreetContributionChips = 0;
      participant.sourceActionCode = 0;
      participant.isParticipating = identityListContains(inGameParticipantIds, participant.participantId);
      participant.holeCards =
        sourceIdentityEquals(participant.participantId, this.tableStateModel.viewerParticipant && this.tableStateModel.viewerParticipant.participantId) && participant.isParticipating ? safeCardArray(dealPayload.cards) : [];
    }, this);
  },
  prepareSeatsForNewHand: function () {
    this.tablePresentation.renderExistingCommunityCards([]);
    this.tablePresentation.renderViewerHandCategory(null);
    this.tablePresentation.renderTotalPotAmount(0);
    this.tablePresentation.renderCollectedPotAmount(0, true);
    this.tablePresentation.renderWagerDifferenceAmount(0);
    this.tablePresentation.hideAllOpponentHoleCards();
    this.tablePresentation.showPlayerActionControls(ACTION_CONTROL.HIDDEN, 0, this.tableStateModel);
    this.tablePresentation.setRaiseSelectionVisible(false, [], 0, 0, false);
    this.tablePresentation.showTableStatusTip("wait", !this.tableStateModel.viewerParticipant || !this.tableStateModel.viewerParticipant.isParticipating);
    this.tableStateModel.participants.forEach(function (participant) {
      var localSeat = participant.viewerLocalSeatId;
      this.tablePresentation.resetParticipantSeatPresentation(localSeat);
      this.tablePresentation.setParticipantSeatPresence(localSeat, participant);
      this.tablePresentation.renderParticipantChipBalance(localSeat, participant.stackChips);
      this.tablePresentation.setParticipantFoldedAppearance(localSeat, participant.isParticipating);
    }, this);
  },
  animateSourceDealOrder: function (dealPayload, presentationEpoch) {
    var dealer = this.tableStateModel.findParticipantById(dealPayload.bankeruid);
    var firstLocalSeat = dealer ? dealer.viewerLocalSeatId : 0;
    var dealSteps = [];
    for (var cardIndex = 0; cardIndex < SOURCE_DEAL_CARD_COUNT; cardIndex += 1) {
      for (var seatOffset = 0; seatOffset < TABLE_SEAT_COUNT; seatOffset += 1) {
        var localSeat = (firstLocalSeat + seatOffset) % TABLE_SEAT_COUNT;
        var participant = findParticipantByLocalSeat(this.tableStateModel, localSeat);
        if (participant && participant.isParticipating) {
          dealSteps.push({ participant: participant, cardIndex: cardIndex });
        }
      }
    }
    var controller = this;
    return dealSteps.reduce(function (sequence, dealStep) {
      return sequence.then(function () {
        if (!controller.isPresentationEpochCurrent(presentationEpoch)) return undefined;
        return Promise.resolve(controller.tablePresentation.animateHoleCardDeal(dealStep.participant.viewerLocalSeatId, dealStep.participant.holeCards.slice(), dealStep.cardIndex)).then(function () {
          return controller.delaySeconds(SOURCE_CARD_DEAL_INTERVAL_SECONDS, presentationEpoch);
        });
      });
    }, Promise.resolve());
  },
  handleForcedWagersPosted: function (stageBetPayload) {
    var controller = this;
    return this.enqueuePresentationWork(function () {
      controller.tableStateModel.sourceStageCode = SOURCE_STAGE.BETTING;
      var betsByParticipant = stageBetPayload.bets || {};
      Object.keys(betsByParticipant).forEach(function (participantId) {
        controller.applyAuthoritativeContribution(participantId, nonNegativeChipAmount(betsByParticipant[participantId]), true);
      });
      controller.tablePresentation.renderTotalPotAmount(controller.tableStateModel.totalPotChips);
      controller.renderViewerWagerDifference();
    });
  },
  applyAuthoritativeContribution: function (participantId, authoritativeHandContribution, shouldAnimate) {
    var participant = this.tableStateModel.findParticipantById(participantId);
    if (!participant) return;
    var previousHandContribution = nonNegativeChipAmount(readIdentityMapValue(this.tableStateModel.handContributionsByParticipant, participantId));
    var contributionDelta = Math.max(0, authoritativeHandContribution - previousHandContribution);
    this.tableStateModel.handContributionsByParticipant[String(participantId)] = authoritativeHandContribution;
    participant.displayedStreetContributionChips += contributionDelta;
    participant.stackChips = Math.max(0, participant.stackChips - contributionDelta);
    this.tableStateModel.totalPotChips += contributionDelta;
    this.tablePresentation.renderParticipantChipBalance(participant.viewerLocalSeatId, participant.stackChips);
    if (participant.displayedStreetContributionChips > 0) {
      this.tablePresentation.animateParticipantWager(participant.viewerLocalSeatId, participant.displayedStreetContributionChips, shouldAnimate);
    }
  },
  handleActionTurnStarted: function (actionNotice) {
    var controller = this;
    return this.enqueuePresentationWork(function (presentationEpoch) {
      return controller.renderActionTurnNotice(actionNotice, true, presentationEpoch);
    });
  },
  renderActionTurnNotice: function (actionNotice, shouldDelay, presentationEpoch) {
    var actor = this.tableStateModel.findParticipantById(actionNotice.uid);
    if (!actor) return Promise.resolve();
    this.isViewerActionSubmissionPending = false;
    this.automaticActionToken += 1;
    var currentAutomaticActionToken = this.automaticActionToken;
    this.tableStateModel.callAmountChips = nonNegativeChipAmount(actionNotice.minbet);
    this.tableStateModel.currentActionNotice = actionNotice;
    this.clearAllParticipantCountdowns();
    var controller = this;
    var delay = shouldDelay ? this.delaySeconds(SOURCE_EVENT_TRANSITION_DELAY_SECONDS, presentationEpoch) : Promise.resolve();
    return delay.then(function () {
      if (presentationEpoch && !controller.isPresentationEpochCurrent(presentationEpoch)) return;
      controller.tablePresentation.renderParticipantActionCountdown(actor.viewerLocalSeatId, nonNegativeChipAmount(actionNotice.time));
      controller.tablePresentation.hideParticipantActionBadge(actor.viewerLocalSeatId);
      if (sourceIdentityEquals(actor.participantId, controller.viewerParticipantId())) {
        return controller.presentViewerActionTurn(currentAutomaticActionToken, presentationEpoch);
      }
      controller.presentOpponentActionTurn();
      return undefined;
    });
  },
  presentViewerActionTurn: function (automaticActionToken, presentationEpoch) {
    var selectedIndex = this.tableStateModel.automaticActionSelections.indexOf(1);
    if (selectedIndex >= 0) {
      return this.executeAutomaticActionSelection(selectedIndex, automaticActionToken, presentationEpoch);
    }
    this.tablePresentation.showPlayerActionControls(ACTION_CONTROL.BETTING, this.tableStateModel.callAmountChips, this.tableStateModel);
    return Promise.resolve();
  },
  presentOpponentActionTurn: function () {
    var viewer = this.tableStateModel.viewerParticipant;
    var viewerCanSelectAutomaticAction = viewer && viewer.isParticipating && viewer.sourceActionCode !== SOURCE_ACTION.FOLD;
    this.tablePresentation.showPlayerActionControls(viewerCanSelectAutomaticAction ? ACTION_CONTROL.AUTOMATIC : ACTION_CONTROL.HIDDEN, 0, this.tableStateModel);
  },
  executeAutomaticActionSelection: function (selectedIndex, automaticActionToken, presentationEpoch) {
    var controller = this;
    return this.delaySeconds(AUTOMATIC_ACTION_DELAY_SECONDS, presentationEpoch).then(function () {
      if (automaticActionToken !== controller.automaticActionToken) return;
      if (presentationEpoch && !controller.isPresentationEpochCurrent(presentationEpoch)) return;
      var viewer = controller.tableStateModel.viewerParticipant;
      if (!viewer) return;
      if (selectedIndex === AUTOMATIC_ACTION.CALL_ANY_AMOUNT) {
        controller.submitPlayerActionContribution(Math.min(controller.tableStateModel.callAmountChips, viewer.stackChips));
        return;
      }
      controller.clearAutomaticActionSelection();
      controller.submitPlayerActionContribution(controller.tableStateModel.callAmountChips === 0 ? 0 : -1);
    });
  },
  clearAllParticipantCountdowns: function () {
    this.tableStateModel.participants.forEach(function (participant) {
      this.tablePresentation.renderParticipantActionCountdown(participant.viewerLocalSeatId, null);
    }, this);
  },
  handleParticipantActionApplied: function (actionPayload) {
    var controller = this;
    return this.enqueuePresentationWork(function () {
      if (actionPayload.uid === undefined || actionPayload.uid === null) {
        throw new Error("Msg_DZPK_ActBet requires actor uid");
      }
      var participant = controller.tableStateModel.findParticipantById(actionPayload.uid);
      if (!participant) throw new Error("ActBet actor is absent from the table snapshot");
      var actionCode = Number(actionPayload.act);
      var contributionDelta = positiveChipAmountOrZero(actionPayload.gold);
      if (sourceIdentityEquals(participant.participantId, controller.viewerParticipantId())) {
        controller.isViewerActionSubmissionPending = false;
      }
      participant.sourceActionCode = actionCode;
      controller.tableStateModel.sourceActionsByParticipant[String(participant.participantId)] = {
        act: actionCode,
        gold: participant.displayedStreetContributionChips + contributionDelta,
      };
      controller.playParticipantActionAudio(participant, actionCode, contributionDelta);
      controller.tablePresentation.renderParticipantActionBadge(participant.viewerLocalSeatId, sourceActionBadgeCode({ act: actionCode, gold: contributionDelta }), actionCode === SOURCE_ACTION.ALL_IN);
      if (actionCode === SOURCE_ACTION.FOLD) {
        participant.isParticipating = false;
        controller.tablePresentation.setParticipantFoldedAppearance(participant.viewerLocalSeatId, false);
        controller.tablePresentation.animateParticipantCardsRecovery(participant.viewerLocalSeatId);
      }
      if (contributionDelta > 0) {
        controller.applyActionContributionDelta(participant, contributionDelta);
      }
      controller.renderViewerWagerDifference();
    });
  },
  applyActionContributionDelta: function (participant, contributionDelta) {
    participant.displayedStreetContributionChips += contributionDelta;
    participant.stackChips = Math.max(0, participant.stackChips - contributionDelta);
    var participantId = String(participant.participantId);
    var previousHandContribution = nonNegativeChipAmount(readIdentityMapValue(this.tableStateModel.handContributionsByParticipant, participantId));
    this.tableStateModel.handContributionsByParticipant[participantId] = previousHandContribution + contributionDelta;
    this.tableStateModel.totalPotChips += contributionDelta;
    this.tablePresentation.renderParticipantChipBalance(participant.viewerLocalSeatId, participant.stackChips);
    this.tablePresentation.animateParticipantWager(participant.viewerLocalSeatId, participant.displayedStreetContributionChips, true);
    this.tablePresentation.renderTotalPotAmount(this.tableStateModel.totalPotChips);
  },
  playParticipantActionAudio: function (participant, actionCode, contributionDelta) {
    var voiceFolder = sourceVoiceFolder(participant.avatarKey);
    if (actionCode === SOURCE_ACTION.FOLD) {
      playSourceSound("sound/" + voiceFolder + "/fold");
      return;
    }
    if (actionCode === SOURCE_ACTION.ALL_IN) {
      playSourceSound("sound/" + voiceFolder + "/allin");
      return;
    }
    if (contributionDelta === 0) {
      playSourceSound("sound/dongdong");
      this.tablePresentation.playAmbientTableAnimation(4);
      return;
    }
    if (actionCode === SOURCE_ACTION.CALL_OR_CHECK) {
      playSourceSound("sound/" + voiceFolder + "/call");
    } else if (actionCode === SOURCE_ACTION.RAISE) {
      playSourceSound("sound/" + voiceFolder + "/raise");
    }
  },
  handleCommunityCardsRevealed: function (publicCardsPayload) {
    var controller = this;
    return this.enqueuePresentationWork(function (presentationEpoch) {
      return controller
        .delaySeconds(SOURCE_EVENT_TRANSITION_DELAY_SECONDS, presentationEpoch)
        .then(function () {
          return controller.collectStreetWagers(presentationEpoch);
        })
        .then(function () {
          if (!controller.isPresentationEpochCurrent(presentationEpoch)) return;
          var newlyRevealedCards = safeCardArray(publicCardsPayload.cards);
          Array.prototype.push.apply(controller.tableStateModel.publicBoardCards, newlyRevealedCards);
          return Promise.resolve(controller.tablePresentation.animateCommunityCardReveal(controller.tableStateModel.publicBoardCards.slice(), newlyRevealedCards.length)).then(function () {
            return controller.delaySeconds(SOURCE_EVENT_TRANSITION_DELAY_SECONDS, presentationEpoch);
          });
        })
        .then(function () {
          if (!controller.isPresentationEpochCurrent(presentationEpoch)) return;
          controller.renderViewerHandCategoryFromPayload(publicCardsPayload.px);
        });
    });
  },
  collectStreetWagers: function (presentationEpoch) {
    var controller = this;
    var participantsWithWagers = this.tableStateModel.participants.filter(function (participant) {
      return participant.displayedStreetContributionChips > 0;
    });
    participantsWithWagers.forEach(function (participant) {
      controller.tablePresentation.animateWagerCollectionToPot(participant.viewerLocalSeatId);
      participant.displayedStreetContributionChips = 0;
      if (participant.sourceActionCode < SOURCE_ACTION.FOLD) {
        controller.tablePresentation.hideParticipantActionBadge(participant.viewerLocalSeatId);
      }
    });
    this.tableStateModel.collectedPreviousStreetPotChips = this.tableStateModel.totalPotChips;
    this.tablePresentation.renderWagerDifferenceAmount(0);
    if (!participantsWithWagers.length) {
      this.tablePresentation.renderCollectedPotAmount(this.tableStateModel.collectedPreviousStreetPotChips, false);
      return Promise.resolve();
    }
    playSourceSound("sound/chipfly");
    return this.delaySeconds(SOURCE_WAGER_COLLECTION_DELAY_SECONDS, presentationEpoch).then(function () {
      if (!controller.isPresentationEpochCurrent(presentationEpoch)) return;
      controller.tablePresentation.renderCollectedPotAmount(controller.tableStateModel.collectedPreviousStreetPotChips, true);
    });
  },
  handleHandSettled: function (settlementPayload) {
    var fingerprint = settlementFingerprint(settlementPayload);
    if (fingerprint && fingerprint === this.lastSettlementFingerprint) return Promise.resolve();
    this.lastSettlementFingerprint = fingerprint;
    var controller = this;
    return this.enqueuePresentationWork(function (presentationEpoch) {
      controller.tableStateModel.sourceStageCode = SOURCE_STAGE.RESULT;
      controller.isViewerActionSubmissionPending = false;
      controller.automaticActionToken += 1;
      controller.clearAllParticipantCountdowns();
      controller.tablePresentation.showPlayerActionControls(ACTION_CONTROL.HIDDEN, 0, controller.tableStateModel);
      controller.tablePresentation.setRaiseSelectionVisible(false, [], 0, 0, false);
      return controller.presentSettlement(settlementPayload, presentationEpoch);
    });
  },
  presentSettlement: function (settlementPayload, presentationEpoch) {
    var controller = this;
    var settlementPresentation = createSettlementPresentation(this.tableStateModel, settlementPayload);
    return this.delaySeconds(SOURCE_SETTLEMENT_OPENING_DELAY_SECONDS, presentationEpoch)
      .then(function () {
        return controller.collectStreetWagers(presentationEpoch);
      })
      .then(function () {
        return controller.delaySeconds(SOURCE_SETTLEMENT_POT_DELAY_SECONDS, presentationEpoch);
      })
      .then(function () {
        if (!controller.isPresentationEpochCurrent(presentationEpoch)) return;
        controller.renderSettlementShowdown(settlementPayload, settlementPresentation);
        playSourceSound("sound/jiesuantishi");
        return controller.delaySeconds(SOURCE_EVENT_TRANSITION_DELAY_SECONDS, presentationEpoch);
      })
      .then(function () {
        if (!controller.isPresentationEpochCurrent(presentationEpoch)) return;
        controller.highlightPrimaryWinningCards(settlementPayload, settlementPresentation);
        return Promise.resolve(controller.tablePresentation.animateStandardPotDistribution(settlementPresentation));
      })
      .then(function () {
        if (!controller.isPresentationEpochCurrent(presentationEpoch)) return;
        controller.tablePresentation.renderSettlementAwardLabels(settlementPresentation);
        controller.applySettlementBalances(settlementPayload.usergold);
        controller.playSettlementWinAudio(settlementPresentation);
        return controller.delaySeconds(SOURCE_SETTLEMENT_CLEANUP_DELAY_SECONDS, presentationEpoch);
      })
      .then(function () {
        if (!controller.isPresentationEpochCurrent(presentationEpoch)) return;
        controller.cleanupCompletedHandPresentation();
      });
  },
  renderSettlementShowdown: function (settlementPayload, settlementPresentation) {
    var cardsByParticipant = settlementPayload.cards || {};
    var controller = this;
    Object.keys(cardsByParticipant).forEach(function (participantId) {
      var participant = controller.tableStateModel.findParticipantById(participantId);
      if (!participant) return;
      var cardProjection = cardsByParticipant[participantId] || {};
      var holeCards = safeCardArray(cardProjection.hcards);
      var bestFiveCards = safeCardArray(cardProjection.cards);
      if (holeCards.length < 2 || bestFiveCards.length < 5) return;
      var normalizedParticipantId = normalizeSourceIdentity(participantId);
      var isWinner = settlementPresentation.winningParticipantUids.indexOf(normalizedParticipantId) >= 0;
      var isPrimaryWinner = normalizedParticipantId === settlementPresentation.primaryWinnerUid;
      participant.holeCards = holeCards;
      controller.tablePresentation.renderParticipantShowdown(participant.viewerLocalSeatId, holeCards, bestFiveCards, cardProjection.value || "0", isWinner, isPrimaryWinner);
      if (sourceIdentityEquals(participant.participantId, controller.viewerParticipantId())) {
        controller.tablePresentation.renderViewerHandCategory(cardProjection.value || null);
      }
    });
  },
  highlightPrimaryWinningCards: function (settlementPayload, settlementPresentation) {
    var cardsByParticipant = settlementPayload.cards || {};
    var primaryCards = readIdentityMapValue(cardsByParticipant, settlementPresentation.primaryWinnerUid);
    if (!primaryCards) return;
    this.tablePresentation.highlightWinningCommunityCards(safeCardArray(primaryCards.cards), this.tableStateModel.publicBoardCards.slice());
  },
  applySettlementBalances: function (balanceByParticipant) {
    var controller = this;
    Object.keys(balanceByParticipant || {}).forEach(function (participantId) {
      var participant = controller.tableStateModel.findParticipantById(participantId);
      if (!participant) return;
      participant.stackChips = nonNegativeChipAmount(balanceByParticipant[participantId]);
      controller.tablePresentation.renderParticipantChipBalance(participant.viewerLocalSeatId, participant.stackChips);
    });
  },
  playSettlementWinAudio: function (settlementPresentation) {
    var primaryAward = nonNegativeChipAmount(settlementPresentation.payoutAmountByUid[settlementPresentation.primaryWinnerUid]);
    var blindUnit = Math.max(1, this.tableStateModel.smallBlindChips);
    playSourceSound(primaryAward / blindUnit > 100 ? "sound/bigying" : "sound/ying");
  },
  cleanupCompletedHandPresentation: function () {
    this.tableStateModel.totalPotChips = 0;
    this.tableStateModel.collectedPreviousStreetPotChips = 0;
    this.tableStateModel.currentActionNotice = [];
    this.tablePresentation.renderTotalPotAmount(0);
    this.tablePresentation.renderCollectedPotAmount(0, true);
    this.tablePresentation.renderWagerDifferenceAmount(0);
    this.tablePresentation.renderViewerHandCategory(null);
    this.tablePresentation.renderExistingCommunityCards([]);
    this.tablePresentation.showTableStatusTip("oth", true);
    this.tableStateModel.participants.forEach(function (participant) {
      participant.holeCards = [];
      participant.displayedStreetContributionChips = 0;
      participant.sourceActionCode = 0;
      participant.isParticipating = false;
      this.tablePresentation.animateParticipantCardsRecovery(participant.viewerLocalSeatId);
      this.tablePresentation.hideParticipantActionBadge(participant.viewerLocalSeatId);
      this.tablePresentation.restoreParticipantHoleCardColors(participant.viewerLocalSeatId);
      this.tablePresentation.setParticipantFoldedAppearance(participant.viewerLocalSeatId, true);
    }, this);
  },
  handleParticipantBalanceChanged: function (balancePayload) {
    var controller = this;
    return this.enqueuePresentationWork(function () {
      var participant = controller.tableStateModel.findParticipantById(balancePayload.uid);
      if (!participant) return;
      participant.stackChips = nonNegativeChipAmount(balancePayload.gold);
      controller.tablePresentation.renderParticipantChipBalance(participant.viewerLocalSeatId, participant.stackChips);
    });
  },
  handleLegacyGoldRefreshRequested: function () {
    var viewer = this.tableStateModel.viewerParticipant;
    if (!viewer || typeof wGameData === "undefined" || !wGameData) return;
    var currentGold = typeof wGameData.getKey === "function" ? Number(wGameData.getKey("gold")) : Number.NaN;
    if (!Number.isFinite(currentGold) || currentGold < 0) return;
    this.handleParticipantBalanceChanged({ uid: viewer.participantId, gold: currentGold });
  },
  handleNetworkStateChanged: function (networkState) {
    if (String(networkState).indexOf("已关闭") < 0) return;
    this.automaticActionToken += 1;
    this.isViewerActionSubmissionPending = false;
    this.clearAllParticipantCountdowns();
    this.tablePresentation.showPlayerActionControls(ACTION_CONTROL.HIDDEN, 0, this.tableStateModel);
  },
  restoreViewerActionControlsIfApplicable: function () {
    var notice = this.tableStateModel.currentActionNotice;
    if (!notice || Array.isArray(notice)) return;
    if (!sourceIdentityEquals(notice.uid, this.viewerParticipantId())) return;
    this.tablePresentation.showPlayerActionControls(ACTION_CONTROL.BETTING, this.tableStateModel.callAmountChips, this.tableStateModel);
  },
  viewerParticipantId: function () {
    return this.tableStateModel.viewerParticipant ? this.tableStateModel.viewerParticipant.participantId : null;
  },
  requestFoldAction: function () {
    return this.submitPlayerActionContribution(-1);
  },
  requestCallAction: function () {
    return this.submitPlayerActionContribution(this.tableStateModel.callAmountChips);
  },
  requestCheckAction: function () {
    return this.submitPlayerActionContribution(0);
  },
  openRaiseSelection: function () {
    var viewer = this.requireViewerParticipantForAction();
    var raisePresets = this.tableStateModel.calculateRaiseSelectionPresetContributions();
    this.tablePresentation.setRaiseSelectionVisible(true, raisePresets, viewer.stackChips, this.tableStateModel.smallBlindChips);
    playButtonSound();
  },
  closeRaiseSelection: function () {
    this.tablePresentation.setRaiseSelectionVisible(false, [], 0, 0);
    playButtonSound();
  },
  requestPreflopPresetByIndex: function (_buttonEvent, presetIndexValue) {
    var presets = this.tableStateModel.calculatePreflopBlindPresetContributions();
    return this.submitIndexedContribution(presets, presetIndexValue);
  },
  requestPostflopPresetByIndex: function (_buttonEvent, presetIndexValue) {
    var presets = this.tableStateModel.calculatePostflopPotPresetContributions();
    return this.submitIndexedContribution(presets, presetIndexValue);
  },
  submitIndexedContribution: function (presets, presetIndexValue) {
    var presetIndex = requireArrayIndex(presetIndexValue, presets.length);
    return this.submitPlayerActionContribution(presets[presetIndex]);
  },
  submitRaiseSelectionFromButton: function (buttonEvent) {
    var contribution = buttonEvent && buttonEvent.target ? buttonEvent.target.betGold : undefined;
    return this.submitPlayerActionContribution(contribution);
  },
  handleRaiseSliderChanged: function (sliderEvent) {
    return this.tablePresentation.handleRaiseSliderChanged(sliderEvent);
  },
  toggleAutomaticActionSelection: function (_toggleEvent, selectionIndexValue) {
    var selectionIndex = requireArrayIndex(selectionIndexValue, this.tableStateModel.automaticActionSelections.length);
    var wasSelected = this.tableStateModel.automaticActionSelections[selectionIndex] === 1;
    this.tableStateModel.automaticActionSelections = [0, 0, 0];
    if (!wasSelected) this.tableStateModel.automaticActionSelections[selectionIndex] = 1;
    this.tablePresentation.synchronizeAutomaticActionToggles(wasSelected ? -1 : selectionIndex);
    playButtonSound();
  },
  clearAutomaticActionSelection: function () {
    this.tableStateModel.automaticActionSelections = [0, 0, 0];
    this.tablePresentation.synchronizeAutomaticActionToggles(-1);
  },
  submitPlayerActionContribution: function (contributionValue) {
    var contribution = Number(contributionValue);
    if (!Number.isSafeInteger(contribution) || contribution < -1) {
      throw new Error("DZPK action contribution must be an integer of at least -1");
    }
    var viewer = this.requireViewerParticipantForAction();
    if (contribution > viewer.stackChips) {
      throw new Error("DZPK action contribution exceeds the viewer stack");
    }
    if (this.isViewerActionSubmissionPending) return false;
    this.isViewerActionSubmissionPending = true;
    this.tablePresentation.showPlayerActionControls(ACTION_CONTROL.HIDDEN, 0, this.tableStateModel);
    this.tablePresentation.setRaiseSelectionVisible(false, [], 0, 0, false);
    try {
      wNetWork.send(SOURCE_EVENT.PARTICIPANT_ACTION_APPLIED, { gold: contribution });
      playButtonSound();
      return true;
    } catch (sendError) {
      this.isViewerActionSubmissionPending = false;
      this.restoreViewerActionControlsIfApplicable();
      throw sendError;
    }
  },
  requireViewerParticipantForAction: function () {
    var viewer = this.tableStateModel.viewerParticipant;
    if (!viewer || !viewer.isParticipating || viewer.sourceActionCode === SOURCE_ACTION.FOLD) {
      throw new Error("DZPK viewer is not eligible to act");
    }
    return viewer;
  },
  requestReturnToRoomSelection: function () {
    var viewer = this.tableStateModel.viewerParticipant;
    if (viewer && viewer.isParticipating && viewer.sourceActionCode !== SOURCE_ACTION.FOLD) {
      if (typeof wUIManager !== "undefined" && wUIManager) {
        wUIManager.showTips("游戏正在进行中！");
      }
      return false;
    }
    if (this.isRoomReturnPending) return false;
    if (typeof wAudioMgr !== "undefined" && wAudioMgr && wAudioMgr.playCloseSound) {
      wAudioMgr.playCloseSound();
    }
    this.isRoomReturnPending = true;
    try {
      // Original PokerBase consumes Msg_DZPK_Out and calls wViewMgr.quitGame,
      // which the standalone navigator maps to the original Room Prefab.
      wNetWork.send(SOURCE_EVENT.PARTICIPANT_LEFT, [], true);
      return true;
    } catch (returnRequestError) {
      this.isRoomReturnPending = false;
      throw returnRequestError;
    }
  },
  handleUnavailableBankRequest: function () {
    if (typeof wUIManager !== "undefined" && wUIManager) {
      wUIManager.showTips("独立游戏不提供银行入口", wUIManager.TIPS_OK);
    }
    return false;
  },
  handleLegacyPrimaryButton: function (buttonEvent, legacyActionName) {
    switch (legacyActionName) {
      case "bank":
        return this.handleUnavailableBankRequest();
      case "hall":
        return this.requestReturnToRoomSelection();
      case "qi":
        return this.requestFoldAction();
      case "gen":
        return this.requestCallAction();
      case "rang":
        return this.requestCheckAction();
      case "jia":
        return this.openRaiseSelection();
      case "closeJz":
        return this.closeRaiseSelection();
      default:
        return false;
    }
  },
  enqueuePresentationWork: function (presentationWork) {
    var controller = this;
    var presentationEpoch = this.presentationEpoch;
    this.presentationQueue = this.presentationQueue
      .then(function () {
        if (!controller.isPresentationEpochCurrent(presentationEpoch)) return undefined;
        return presentationWork(presentationEpoch);
      })
      .catch(function (presentationError) {
        controller.logPresentationFailure(presentationError);
      });
    return this.presentationQueue;
  },
  replacePresentationQueue: function (presentationWork) {
    this.presentationEpoch += 1;
    this.automaticActionToken += 1;
    this.presentationQueue = Promise.resolve();
    return this.enqueuePresentationWork(presentationWork);
  },
  isPresentationEpochCurrent: function (presentationEpoch) {
    return presentationEpoch === this.presentationEpoch && cc.isValid(this, true);
  },
  delaySeconds: function (seconds, presentationEpoch) {
    var controller = this;
    return new Promise(function (resolve) {
      controller.scheduleOnce(function () {
        resolve(presentationEpoch === undefined || controller.isPresentationEpochCurrent(presentationEpoch));
      }, seconds);
    });
  },
  logPresentationFailure: function (presentationError) {
    var message = presentationError instanceof Error ? presentationError.message : String(presentationError);
    if (typeof wLog !== "undefined" && wLog && typeof wLog.e === "function") {
      wLog.e("DZPK semantic presentation failed: " + message);
    } else {
      cc.error(presentationError);
    }
  },
});
// One-line adapters preserve PokerBase and the source Prefab while semantic bindings replace them.
DzpkTableGameController.prototype.m_roomInfo = function (payload) { return this.handleRoomSnapshotReceived(payload); };
DzpkTableGameController.prototype.m_upGameGold = function () { return this.handleLegacyGoldRefreshRequested(); };
DzpkTableGameController.prototype.m_NetWorkState = function (state) { return this.handleNetworkStateChanged(state); };
DzpkTableGameController.prototype.initProxy = function () { return this.initializeSemanticController(); };
DzpkTableGameController.prototype.initEvevt = function () { return this.subscribeToSourceTableEvents(); };
DzpkTableGameController.prototype.Msg_DZPK_PlayerAct = function (payload) { return this.handleParticipantEntered(payload); };
DzpkTableGameController.prototype.Msg_DZPK_FaCards = function (payload) { return this.handlePrivateCardsDealt(payload); };
DzpkTableGameController.prototype.Msg_DZPK_StageBet = function (payload) { return this.handleForcedWagersPosted(payload); };
DzpkTableGameController.prototype.Msg_DZPK_CallUserAct = function (payload) { return this.handleActionTurnStarted(payload); };
DzpkTableGameController.prototype.Msg_DZPK_ActBet = function (payload) { return this.handleParticipantActionApplied(payload); };
DzpkTableGameController.prototype.Msg_DZPK_PublicCards = function (payload) { return this.handleCommunityCardsRevealed(payload); };
DzpkTableGameController.prototype.Msg_DZPK_Result = function (payload) { return this.handleHandSettled(payload); };
DzpkTableGameController.prototype.Msg_DZPK_ChangGold = function (payload) { return this.handleParticipantBalanceChanged(payload); };
DzpkTableGameController.prototype.Msg_DZPK_Out = function (payload) { return this.handleParticipantLeft(payload); };
DzpkTableGameController.prototype.onClick = function (event, actionName) { return this.handleLegacyPrimaryButton(event, actionName); };
DzpkTableGameController.prototype.autoOnClick = function (event, index) { return this.toggleAutomaticActionSelection(event, index); };
DzpkTableGameController.prototype.dmOnClick = function (event, index) { return this.requestPreflopPresetByIndex(event, index); };
DzpkTableGameController.prototype.dcOnClick = function (event, index) { return this.requestPostflopPresetByIndex(event, index); };
DzpkTableGameController.prototype.selectBet = function (event) { return this.submitRaiseSelectionFromButton(event); };
DzpkTableGameController.prototype.sliderEvevt = function (event) { return this.handleRaiseSliderChanged(event); };
DzpkTableGameController.prototype.sendMsgActBet = function (amount) { return this.submitPlayerActionContribution(amount); };
function normalizeRoomSnapshot(roomSnapshot) {
  var normalized = Object.assign({}, roomSnapshot || {});
  normalized.players = Array.isArray(normalized.players)
    ? normalized.players.map(function (participant) {
        return Object.assign({}, participant, {
          cards: safeCardArray(participant.cards),
        });
      })
    : [];
  normalized.publiccards = safeCardArray(normalized.publiccards);
  normalized.curbet = cloneIdentityMap(normalized.curbet);
  normalized.allbets = cloneIdentityMap(normalized.allbets);
  normalized.allbet = nonNegativeChipAmount(normalized.allbet);
  normalized.stage = Number(normalized.stage) || 0;
  if (normalized.publiccards.length === 0 && normalized.stage === SOURCE_STAGE.BETTING) {
    Object.keys(normalized.allbets).forEach(function (participantId) {
      if (!normalized.curbet[participantId]) {
        normalized.curbet[participantId] = { act: 0, gold: normalized.allbets[participantId] };
      } else if (normalized.curbet[participantId].gold === undefined) {
        normalized.curbet[participantId].gold = normalized.allbets[participantId];
      }
    });
  }
  return normalized;
}
function readParticipantSourceAction(actionsByParticipant, participantId) {
  var sourceAction = readIdentityMapValue(actionsByParticipant, participantId) || {};
  return {
    act: Number(sourceAction.act) || 0,
    gold: nonNegativeChipAmount(sourceAction.gold),
  };
}
function participantParticipatesInSnapshot(participant, sourceStageCode) {
  if (sourceStageCode === SOURCE_STAGE.WAITING) return false;
  if (participant.sourceActionCode === SOURCE_ACTION.FOLD) return true;
  return participant.holeCards.length > 0;
}
function sourceActionBadgeCode(sourceAction) {
  if (sourceAction.act === SOURCE_ACTION.CALL_OR_CHECK && sourceAction.gold === 0) return "3_0";
  return sourceAction.act;
}
function findParticipantByLocalSeat(tableStateModel, localSeat) {
  return tableStateModel.participants.find(function (participant) {
    return participant.viewerLocalSeatId === localSeat;
  });
}
function sumVisibleStreetWagers(participants) {
  return participants.reduce(function (total, participant) {
    return total + nonNegativeChipAmount(participant.displayedStreetContributionChips);
  }, 0);
}
function createSettlementPresentation(tableStateModel, settlementPayload) {
  var sourcePotLayers = Array.isArray(settlementPayload.pots) ? settlementPayload.pots.slice() : [];
  var winningParticipantUids = uniqueSourceIdentities(Array.isArray(settlementPayload.winners) ? settlementPayload.winners : settlementPayload.winner === undefined ? [] : [settlementPayload.winner]);
  var primaryWinnerUid = normalizeSourceIdentity(settlementPayload.winner !== undefined ? settlementPayload.winner : winningParticipantUids[0]);
  if (primaryWinnerUid && winningParticipantUids.indexOf(primaryWinnerUid) < 0) {
    winningParticipantUids.unshift(primaryWinnerUid);
  }
  var payoutAmountByUid = {};
  var returnAmountByUid = {};
  sourcePotLayers.forEach(function (sourcePotLayer) {
    Object.keys(sourcePotLayer.awards || {}).forEach(function (participantId) {
      var participantKey = normalizeSourceIdentity(participantId);
      var awardAmount = nonNegativeChipAmount(sourcePotLayer.awards[participantId]);
      var destination = sourcePotLayer.uncalledReturn ? returnAmountByUid : payoutAmountByUid;
      destination[participantKey] = (destination[participantKey] || 0) + awardAmount;
    });
  });
  Object.keys(settlementPayload.uncalledReturns || {}).forEach(function (participantId) {
    returnAmountByUid[normalizeSourceIdentity(participantId)] = nonNegativeChipAmount(settlementPayload.uncalledReturns[participantId]);
  });
  if (Object.keys(payoutAmountByUid).length === 0) {
    winningParticipantUids.forEach(function (participantId) {
      payoutAmountByUid[participantId] = nonNegativeChipAmount(readIdentityMapValue(settlementPayload.upgold, participantId));
    });
    if (primaryWinnerUid && payoutAmountByUid[primaryWinnerUid] === 0) {
      payoutAmountByUid[primaryWinnerUid] = nonNegativeChipAmount(settlementPayload.wingold);
    }
  }
  var localSeatByUid = {};
  tableStateModel.participants.forEach(function (participant) {
    localSeatByUid[normalizeSourceIdentity(participant.participantId)] = participant.viewerLocalSeatId;
  });
  return {
    primaryWinnerUid: primaryWinnerUid,
    winningParticipantUids: winningParticipantUids,
    payoutAmountByUid: payoutAmountByUid,
    returnAmountByUid: returnAmountByUid,
    localSeatByUid: localSeatByUid,
    sourcePotLayers: sourcePotLayers,
  };
}
function settlementFingerprint(settlementPayload) {
  try {
    return JSON.stringify({
      handId: settlementPayload.handId,
      revision: settlementPayload.revision,
      winner: settlementPayload.winner,
      winners: settlementPayload.winners,
      usergold: settlementPayload.usergold,
      pots: settlementPayload.pots,
      cards: settlementPayload.cards,
    });
  } catch (_serializationError) {
    return "";
  }
}
function readIdentityMapValue(valuesByIdentity, participantId) {
  if (!valuesByIdentity || participantId === null || participantId === undefined) return undefined;
  if (Object.prototype.hasOwnProperty.call(valuesByIdentity, participantId)) {
    return valuesByIdentity[participantId];
  }
  var normalizedId = normalizeSourceIdentity(participantId);
  var matchingKey = Object.keys(valuesByIdentity).find(function (candidateKey) {
    return normalizeSourceIdentity(candidateKey) === normalizedId;
  });
  return matchingKey === undefined ? undefined : valuesByIdentity[matchingKey];
}
function cloneIdentityMap(sourceMap) {
  var clone = {};
  Object.keys(sourceMap || {}).forEach(function (identityKey) {
    var value = sourceMap[identityKey];
    clone[identityKey] = value && typeof value === "object" ? Object.assign({}, value) : value;
  });
  return clone;
}
function identityListContains(identityList, participantId) {
  return identityList.some(function (candidateId) {
    return sourceIdentityEquals(candidateId, participantId);
  });
}
function sourceIdentityEquals(leftValue, rightValue) {
  if (leftValue === rightValue) return true;
  if (leftValue === null || leftValue === undefined) return false;
  if (rightValue === null || rightValue === undefined) return false;
  return String(leftValue) === String(rightValue);
}
function normalizeSourceIdentity(sourceIdentity) {
  return sourceIdentity === null || sourceIdentity === undefined ? "" : String(sourceIdentity);
}
function uniqueSourceIdentities(sourceIdentities) {
  var seen = {};
  return sourceIdentities.map(normalizeSourceIdentity).filter(function (sourceIdentity) {
    if (!sourceIdentity || seen[sourceIdentity]) return false;
    seen[sourceIdentity] = true;
    return true;
  });
}
function safeCardArray(cards) {
  return Array.isArray(cards) ? cards.slice() : [];
}
function nonNegativeChipAmount(value) {
  var numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? Math.floor(numericValue) : 0;
}
function positiveChipAmountOrZero(value) {
  var numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : 0;
}
function requireArrayIndex(indexValue, arrayLength) {
  var index = Number(indexValue);
  if (!Number.isInteger(index) || index < 0 || index >= arrayLength) {
    throw new Error("DZPK button preset index is invalid");
  }
  return index;
}
function sourceVoiceFolder(avatarKey) {
  var numericAvatarKey = Number(avatarKey);
  return Number.isFinite(numericAvatarKey) && numericAvatarKey % 12 < 6 ? "young_woman" : "young_man";
}
function playSourceSound(soundPath) {
  if (typeof wAudioMgr === "undefined" || !wAudioMgr || !wAudioMgr.playSound) return;
  wAudioMgr.playSound(soundPath, "DZPK");
}
function playButtonSound() {
  if (typeof wAudioMgr !== "undefined" && wAudioMgr && wAudioMgr.playBtnSound) {
    wAudioMgr.playBtnSound();
  }
}
exports.default = DzpkTableGameController;
