'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var SOURCE_TABLE_SEAT_COUNT = 6;
var SOURCE_BETTING_PROMPT_SECONDS = 15;

var SOURCE_CARD_COLOR_BY_SUIT = {
  4: 'black',
  3: 'red',
  2: 'black',
  1: 'red'
};

var SOURCE_CARD_RANK_SPRITE_ID = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: '11',
  12: '12',
  13: '13',
  14: '1'
};

var SOURCE_CARD_SHAPE_BY_SUIT = {
  4: 'shape_spade',
  3: 'shape_heart',
  2: 'shape_club',
  1: 'shape_diamond'
};

/** Source-compatible display configuration consumed by the original view. */
var DZPK_TABLE_DISPLAY_CONFIG = {
  betTime: SOURCE_BETTING_PROMPT_SECONDS,
  pokerColor: SOURCE_CARD_COLOR_BY_SUIT,
  pokerID: SOURCE_CARD_RANK_SPRITE_ID,
  pokerShape: SOURCE_CARD_SHAPE_BY_SUIT
};

/**
 * Documents the later authenticated multi-human boundary without opening it in
 * Phase A. Seat admission and networking remain server responsibilities.
 */
var FUTURE_AUTHENTICATED_HUMAN_SEAT_LIMITS = {
  minimum: 2,
  maximum: SOURCE_TABLE_SEAT_COUNT
};

var PARTICIPANT_SOURCE_FIELD_NAMES = {
  uid: true,
  seat: true,
  l_seat: true,
  nickname: true,
  gold: true,
  headimgurl: true,
  cards: true,
  betGold: true,
  act: true,
  join: true
};

/**
 * Viewer-safe state for one source participant.
 *
 * @param {Object=} sourceParticipantSnapshot Source RoomInfo player row.
 */
function DzpkParticipantState(sourceParticipantSnapshot) {
  this.participantId = null;
  this.sourceSeatId = 0;
  this.viewerLocalSeatId = 0;
  this.displayName = '';
  this.stackChips = 0;
  this.avatarKey = null;
  this.holeCards = [];
  this.displayedStreetContributionChips = 0;
  this.sourceActionCode = 0;
  this.isParticipating = false;

  defineParticipantCompatibilityProperties(this);
  this.applySourceSnapshot(sourceParticipantSnapshot || {});
}

/**
 * Replaces public/viewer-safe fields from one authoritative source snapshot.
 * Unknown display fields are preserved for original Prefab consumers.
 *
 * @param {Object} sourceParticipantSnapshot
 * @returns {DzpkParticipantState}
 */
DzpkParticipantState.prototype.applySourceSnapshot = function (sourceParticipantSnapshot) {
  var safeSnapshot = sourceParticipantSnapshot || {};

  if (safeSnapshot.uid !== undefined) this.participantId = safeSnapshot.uid;
  if (safeSnapshot.seat !== undefined) this.sourceSeatId = safeSnapshot.seat;
  if (safeSnapshot.l_seat !== undefined) this.viewerLocalSeatId = safeSnapshot.l_seat;
  if (safeSnapshot.nickname !== undefined) this.displayName = safeSnapshot.nickname;
  if (safeSnapshot.gold !== undefined) this.stackChips = safeSnapshot.gold;
  if (safeSnapshot.headimgurl !== undefined) this.avatarKey = safeSnapshot.headimgurl;
  if (safeSnapshot.cards !== undefined) {
    this.holeCards = Array.isArray(safeSnapshot.cards) ? safeSnapshot.cards.slice() : [];
  }
  if (safeSnapshot.betGold !== undefined) {
    this.displayedStreetContributionChips = safeSnapshot.betGold;
  }
  if (safeSnapshot.act !== undefined) this.sourceActionCode = safeSnapshot.act;
  if (safeSnapshot.join !== undefined) this.isParticipating = safeSnapshot.join;

  Object.keys(safeSnapshot).forEach(function (sourceFieldName) {
    if (!PARTICIPANT_SOURCE_FIELD_NAMES[sourceFieldName]) {
      this[sourceFieldName] = safeSnapshot[sourceFieldName];
    }
  }, this);

  return this;
};

function defineParticipantCompatibilityProperties(participantState) {
  defineCompatibilityProperty(participantState, 'uid', 'participantId');
  defineCompatibilityProperty(participantState, 'seat', 'sourceSeatId');
  defineCompatibilityProperty(participantState, 'l_seat', 'viewerLocalSeatId');
  defineCompatibilityProperty(participantState, 'nickname', 'displayName');
  defineCompatibilityProperty(participantState, 'gold', 'stackChips');
  defineCompatibilityProperty(participantState, 'headimgurl', 'avatarKey');
  defineCompatibilityProperty(participantState, 'cards', 'holeCards');
  defineCompatibilityProperty(
    participantState,
    'betGold',
    'displayedStreetContributionChips'
  );
  defineCompatibilityProperty(participantState, 'act', 'sourceActionCode');
  defineCompatibilityProperty(participantState, 'join', 'isParticipating');
}

/**
 * Viewer-oriented table projection. It contains no networking, dealing or
 * settlement authority.
 */
function DzpkTableStateModel() {
  this.participants = [];
  this.collectedPreviousStreetPotChips = 0;
  this.viewerLocalSeatId = 0;
  this.automaticActionSelections = [0, 0, 0];
  this.callAmountChips = 0;

  this.publicBoardCards = [];
  this.totalPotChips = 0;
  this.currentActionNotice = [];
  this.viewerSourceSeatId = 0;
  this.viewerParticipant = null;
  this.roomLevel = 0;
  this.smallBlindChips = 0;
  this.sourceActionsByParticipant = {};
  this.handContributionsByParticipant = {};
  this.dealerParticipantId = 0;
  this.sourceStageCode = 0;

  defineModelCompatibilityProperties(this);
}

/**
 * Rebuilds the model from one viewer-scoped Msg_DZPK_RoomInfo payload.
 *
 * @param {Object} roomSnapshot
 * @param {*=} viewerParticipantId Defaults to wGameData.getKey('uid').
 * @returns {DzpkTableStateModel}
 */
DzpkTableStateModel.prototype.initializeFromRoomSnapshot = function (
  roomSnapshot,
  viewerParticipantId
) {
  var safeRoomSnapshot = roomSnapshot || {};
  var sourceParticipants = Array.isArray(safeRoomSnapshot.players)
    ? safeRoomSnapshot.players
    : [];
  var resolvedViewerParticipantId = viewerParticipantId;

  if (resolvedViewerParticipantId === undefined || resolvedViewerParticipantId === null) {
    resolvedViewerParticipantId = readLegacyViewerParticipantId();
  }

  var viewerSourceParticipant = sourceParticipants.find(function (sourceParticipant) {
    return sourceIdentityEquals(sourceParticipant.uid, resolvedViewerParticipantId);
  });
  if (!viewerSourceParticipant) {
    throw new Error('Room snapshot does not contain the current viewer participant');
  }

  this.publicBoardCards = Array.isArray(safeRoomSnapshot.publiccards)
    ? safeRoomSnapshot.publiccards.slice()
    : [];
  this.totalPotChips = nonNegativeNumberOrDefault(safeRoomSnapshot.allbet, 0);
  this.currentActionNotice = safeRoomSnapshot.notice === undefined
    ? []
    : safeRoomSnapshot.notice;
  this.viewerSourceSeatId = normalizeSourceSeatId(viewerSourceParticipant.seat);
  this.participants = [];
  this.viewerParticipant = null;

  for (
    var participantIndex = 0;
    participantIndex < sourceParticipants.length;
    participantIndex += 1
  ) {
    var participantState = this.addParticipantFromSourceSnapshot(
      sourceParticipants[participantIndex]
    );
    if (sourceIdentityEquals(participantState.participantId, resolvedViewerParticipantId)) {
      this.viewerParticipant = participantState;
    }
  }

  this.roomLevel = numberOrDefault(safeRoomSnapshot.level, 0);
  this.smallBlindChips = nonNegativeNumberOrDefault(safeRoomSnapshot.doublescore, 0);
  this.sourceActionsByParticipant = safeRoomSnapshot.curbet || {};
  this.handContributionsByParticipant = safeRoomSnapshot.allbets || {};
  this.dealerParticipantId = safeRoomSnapshot.bankeruid || 0;
  this.sourceStageCode = numberOrDefault(safeRoomSnapshot.stage, 0);

  return this;
};

/**
 * Adds one viewer-safe participant row and calculates its local six-seat index.
 *
 * @param {Object} sourceParticipantSnapshot
 * @returns {DzpkParticipantState}
 */
DzpkTableStateModel.prototype.addParticipantFromSourceSnapshot = function (
  sourceParticipantSnapshot
) {
  if (!sourceParticipantSnapshot || sourceParticipantSnapshot.seat === undefined) {
    throw new Error('Source participant seat is required');
  }

  var participantState = new DzpkParticipantState(sourceParticipantSnapshot);
  participantState.viewerLocalSeatId = sourceSeatToViewerLocalSeat(
    normalizeSourceSeatId(participantState.sourceSeatId),
    this.viewerSourceSeatId,
    SOURCE_TABLE_SEAT_COUNT
  );
  this.participants.push(createObservableParticipantState(participantState));
  return this.participants[this.participants.length - 1];
};

/**
 * Finds a participant by a source-compatible or semantic property.
 *
 * @param {string} propertyName
 * @param {*} expectedValue
 * @returns {DzpkParticipantState|undefined}
 */
DzpkTableStateModel.prototype.findParticipantByProperty = function (
  propertyName,
  expectedValue
) {
  for (
    var participantIndex = 0;
    participantIndex < this.participants.length;
    participantIndex += 1
  ) {
    var participantState = this.participants[participantIndex];
    if (sourceIdentityEquals(participantState[propertyName], expectedValue)) {
      return participantState;
    }
  }

  logMissingParticipant(propertyName, expectedValue);
  return undefined;
};

/**
 * Finds a participant by its source uid.
 *
 * @param {*} participantId
 * @returns {DzpkParticipantState|undefined}
 */
DzpkTableStateModel.prototype.findParticipantById = function (participantId) {
  return this.findParticipantByProperty('participantId', participantId);
};

/** Optional lookup for normal join/leave deltas; absence is not a warning. */
DzpkTableStateModel.prototype.findParticipantByIdIfPresent = function (participantId) {
  return this.participants.find(function (participantState) {
    return sourceIdentityEquals(participantState.participantId, participantId);
  });
};

/**
 * Returns source postflop quick-bet contribution presets.
 *
 * @param {number=} potChips Defaults to the current total pot.
 * @returns {number[]} Half pot, two-thirds pot and full pot.
 */
DzpkTableStateModel.prototype.calculatePostflopPotPresetContributions = function (
  potChips
) {
  var resolvedPotChips = nonNegativeNumberOrDefault(potChips, this.totalPotChips);
  return [
    Math.ceil(resolvedPotChips * 0.5),
    Math.ceil(resolvedPotChips * (2 / 3)),
    resolvedPotChips
  ];
};

/**
 * Returns source preflop quick-bet contribution presets.
 *
 * @param {number=} smallBlindChips Defaults to the room small blind.
 * @param {number=} potChips Defaults to the current total pot.
 * @returns {number[]} Three big blinds, four big blinds and full pot.
 */
DzpkTableStateModel.prototype.calculatePreflopBlindPresetContributions = function (
  smallBlindChips,
  potChips
) {
  var resolvedSmallBlindChips = nonNegativeNumberOrDefault(
    smallBlindChips,
    this.smallBlindChips
  );
  var resolvedPotChips = nonNegativeNumberOrDefault(potChips, this.totalPotChips);
  return [
    6 * resolvedSmallBlindChips,
    8 * resolvedSmallBlindChips,
    resolvedPotChips
  ];
};

/**
 * Returns the original raise selector values. These are source request
 * contributions; the server adapter remains responsible for legal raiseTo.
 *
 * @param {number=} callAmountChips Defaults to the current source minbet.
 * @param {number=} viewerStackChips Defaults to the viewer stack.
 * @param {number=} smallBlindChips Defaults to the room small blind.
 * @returns {number[]}
 */
DzpkTableStateModel.prototype.calculateRaiseSelectionPresetContributions = function (
  callAmountChips,
  viewerStackChips,
  smallBlindChips
) {
  var resolvedSmallBlindChips = nonNegativeNumberOrDefault(
    smallBlindChips,
    this.smallBlindChips
  );
  var resolvedCallAmountChips = nonNegativeNumberOrDefault(
    callAmountChips,
    this.callAmountChips
  );
  var defaultViewerStackChips = this.viewerParticipant
    ? this.viewerParticipant.stackChips
    : 0;
  var resolvedViewerStackChips = nonNegativeNumberOrDefault(
    viewerStackChips,
    defaultViewerStackChips
  );
  var minimumSourceRaiseContribution = Math.ceil(
    2 * resolvedSmallBlindChips + resolvedCallAmountChips
  );

  return [
    20 * resolvedSmallBlindChips,
    40 * resolvedSmallBlindChips,
    100 * resolvedSmallBlindChips,
    200 * resolvedSmallBlindChips,
    400 * resolvedSmallBlindChips,
    Math.min(minimumSourceRaiseContribution, resolvedViewerStackChips)
  ];
};

/**
 * Returns the largest finite numeric value, or defaultMaximum when empty.
 *
 * @param {Object|number[]} valuesByKey
 * @param {number=} defaultMaximum Defaults to zero.
 * @returns {number}
 */
DzpkTableStateModel.prototype.maximumNumericValue = function (
  valuesByKey,
  defaultMaximum
) {
  return maximumNumericValue(valuesByKey, defaultMaximum);
};

/**
 * Reserved method slot for a later authenticated 2-6-human transport. Phase A
 * deliberately accepts only complete server RoomInfo snapshots.
 *
 * @param {Object} authenticatedSeatDelta
 * @returns {never}
 */
DzpkTableStateModel.prototype.applyAuthenticatedHumanSeatDelta = function (
  authenticatedSeatDelta
) {
  void authenticatedSeatDelta;
  throw new Error('MULTI_HUMAN_ONLINE_NOT_IMPLEMENTED_IN_PHASE_A');
};

function defineModelCompatibilityProperties(tableStateModel) {
  defineCompatibilityProperty(tableStateModel, 'playerList', 'participants');
  defineCompatibilityProperty(
    tableStateModel,
    'currentBet',
    'collectedPreviousStreetPotChips'
  );
  defineCompatibilityProperty(tableStateModel, 'my_l_seat', 'viewerLocalSeatId');
  defineCompatibilityProperty(
    tableStateModel,
    'autoList',
    'automaticActionSelections'
  );
  defineCompatibilityProperty(tableStateModel, 'genGold', 'callAmountChips');
  defineCompatibilityProperty(tableStateModel, 'publiccards', 'publicBoardCards');
  defineCompatibilityProperty(tableStateModel, 'allBet', 'totalPotChips');
  defineCompatibilityProperty(tableStateModel, 'notice', 'currentActionNotice');
  defineCompatibilityProperty(tableStateModel, 'my_s_seat', 'viewerSourceSeatId');
  defineCompatibilityProperty(tableStateModel, 'my_data', 'viewerParticipant');
  defineCompatibilityProperty(tableStateModel, 'level', 'roomLevel');
  defineCompatibilityProperty(tableStateModel, 'doublescore', 'smallBlindChips');
  defineCompatibilityProperty(
    tableStateModel,
    'curbet',
    'sourceActionsByParticipant'
  );
  defineCompatibilityProperty(
    tableStateModel,
    'allbets',
    'handContributionsByParticipant'
  );
  defineCompatibilityProperty(tableStateModel, 'bankeruid', 'dealerParticipantId');
  defineCompatibilityProperty(tableStateModel, 'stage', 'sourceStageCode');
}

/**
 * Converts a source seat into the current viewer's local seat index.
 *
 * @param {number} sourceSeatId
 * @param {number} viewerSourceSeatId
 * @param {number=} seatCount Defaults to six.
 * @returns {number}
 */
function sourceSeatToViewerLocalSeat(sourceSeatId, viewerSourceSeatId, seatCount) {
  var resolvedSeatCount = seatCount === undefined ? SOURCE_TABLE_SEAT_COUNT : seatCount;
  if (!Number.isInteger(resolvedSeatCount) || resolvedSeatCount < 2) {
    throw new Error('Seat count must be an integer of at least two');
  }
  if (!Number.isInteger(sourceSeatId) || !Number.isInteger(viewerSourceSeatId)) {
    throw new Error('Source and viewer seats must be integers');
  }
  return ((sourceSeatId - viewerSourceSeatId) % resolvedSeatCount + resolvedSeatCount)
    % resolvedSeatCount;
}

/**
 * @param {Object|number[]} valuesByKey
 * @param {number=} defaultMaximum
 * @returns {number}
 */
function maximumNumericValue(valuesByKey, defaultMaximum) {
  var resolvedMaximum = numberOrDefault(defaultMaximum, 0);
  if (!valuesByKey) return resolvedMaximum;

  Object.keys(valuesByKey).forEach(function (valueKey) {
    var candidateValue = Number(valuesByKey[valueKey]);
    if (Number.isFinite(candidateValue) && candidateValue > resolvedMaximum) {
      resolvedMaximum = candidateValue;
    }
  });
  return resolvedMaximum;
}

function createObservableParticipantState(participantState) {
  if (
    typeof wUtils !== 'undefined'
    && wUtils
    && typeof wUtils.creatorProxy === 'function'
  ) {
    return wUtils.creatorProxy(participantState);
  }
  return participantState;
}

function readLegacyViewerParticipantId() {
  if (
    typeof wGameData === 'undefined'
    || !wGameData
    || typeof wGameData.getKey !== 'function'
  ) {
    throw new Error('Viewer participant id is required before RoomInfo initialization');
  }
  return wGameData.getKey('uid');
}

function normalizeSourceSeatId(sourceSeatId) {
  var numericSeatId = Number(sourceSeatId);
  if (
    !Number.isInteger(numericSeatId)
    || numericSeatId < 0
    || numericSeatId >= SOURCE_TABLE_SEAT_COUNT
  ) {
    throw new Error('Source seat must be an integer from zero to five');
  }
  return numericSeatId;
}

function sourceIdentityEquals(leftValue, rightValue) {
  if (leftValue === rightValue) return true;
  if (leftValue === null || leftValue === undefined) return false;
  if (rightValue === null || rightValue === undefined) return false;
  return String(leftValue) === String(rightValue);
}

function numberOrDefault(value, defaultValue) {
  var numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : defaultValue;
}

function nonNegativeNumberOrDefault(value, defaultValue) {
  var numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0
    ? numericValue
    : defaultValue;
}

function defineCompatibilityProperty(target, compatibilityName, semanticName) {
  Object.defineProperty(target, compatibilityName, {
    configurable: true,
    enumerable: true,
    get: function () {
      return this[semanticName];
    },
    set: function (nextValue) {
      this[semanticName] = nextValue;
    }
  });
}

function logMissingParticipant(propertyName, expectedValue) {
  if (typeof wLog !== 'undefined' && wLog && typeof wLog.w === 'function') {
    wLog.w('没有找到该玩家', propertyName, expectedValue);
  }
}

// Original serialized-script compatibility aliases. New code uses semantic names.
DzpkTableStateModel.prototype.initRoom =
  DzpkTableStateModel.prototype.initializeFromRoomSnapshot;
DzpkTableStateModel.prototype.addPlayer =
  DzpkTableStateModel.prototype.addParticipantFromSourceSnapshot;
DzpkTableStateModel.prototype.getPlayer =
  DzpkTableStateModel.prototype.findParticipantByProperty;
DzpkTableStateModel.prototype.getDCBet =
  DzpkTableStateModel.prototype.calculatePostflopPotPresetContributions;
DzpkTableStateModel.prototype.getDMBet =
  DzpkTableStateModel.prototype.calculatePreflopBlindPresetContributions;
DzpkTableStateModel.prototype.getSelectBet =
  DzpkTableStateModel.prototype.calculateRaiseSelectionPresetContributions;
DzpkTableStateModel.prototype.getMaxObj =
  DzpkTableStateModel.prototype.maximumNumericValue;

exports.SOURCE_TABLE_SEAT_COUNT = SOURCE_TABLE_SEAT_COUNT;
exports.DZPK_TABLE_DISPLAY_CONFIG = DZPK_TABLE_DISPLAY_CONFIG;
exports.FUTURE_AUTHENTICATED_HUMAN_SEAT_LIMITS =
  FUTURE_AUTHENTICATED_HUMAN_SEAT_LIMITS;
exports.DzpkParticipantState = DzpkParticipantState;
exports.DzpkTableStateModel = DzpkTableStateModel;
exports.sourceSeatToViewerLocalSeat = sourceSeatToViewerLocalSeat;
exports.maximumNumericValue = maximumNumericValue;

// Explicit compatibility with the original DZPKMode module exports.
exports.DZPKConfig = DZPK_TABLE_DISPLAY_CONFIG;
exports.DZPKModel = DzpkTableStateModel;
