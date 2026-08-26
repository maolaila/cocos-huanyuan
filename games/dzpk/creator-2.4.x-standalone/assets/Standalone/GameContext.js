'use strict';

var DZPK_CLIENT_GAME_ID = 19;
var DZPK_GAME_CODE = 'dzpk-955';
var DZPK_BUNDLE_NAME = 'DZPK';

/**
 * Stores only the viewer-safe context needed by the original DZPK scripts.
 * Session credentials stay inside GameHubAuthenticatedTransport and are never
 * exposed through the legacy wGameData adapter.
 */
function GameContext() {
  this.gameID = DZPK_CLIENT_GAME_ID;
  this.roomID = null;
  this.roomLevel = 2;
  this.roomConfig = {};
  this.isReconnect = false;
  this.allVersion = { Main: '2.4.7-original-parity' };
  this.isNightMode = false;
  this.viewerProfile = {
    uid: 0,
    rid: null,
    gold: 0,
    bank: 0,
    headimgurl: 7,
    nickname: '学习玩家'
  };
  this.gameDefinition = {
    gameCode: DZPK_GAME_CODE,
    prefabUrl: 'prefab/DZPKMain',
    zhName: '德州扑克',
    enName: DZPK_BUNDLE_NAME,
    music: 'sound/back',
    table: false,
    loadMaxSpeed: false,
    noticePos1: cc.v2(0, 294),
    noticePos2: cc.v2(-195, 300)
  };
  this.postMessageTargetOrigin = '';
}

GameContext.prototype.applyAuthenticatedContext = function (authenticatedContext) {
  var sourceUid = authenticatedContext.platformPlayerId || authenticatedContext.merchantPlayerId;
  var numericSourceUid = Number(sourceUid);
  this.viewerProfile.uid = Number.isSafeInteger(numericSourceUid) && numericSourceUid > 0
    ? numericSourceUid
    : deriveStableSourceUid(String(sourceUid || authenticatedContext.sessionId));
  this.viewerProfile.gold = normalizeSourceChipAmount(authenticatedContext.wallet.mainBalance);
  this.viewerProfile.nickname = String(
    authenticatedContext.merchantPlayerId || authenticatedContext.platformPlayerId || '学习玩家'
  ).slice(0, 20);
  this.postMessageTargetOrigin = authenticatedContext.sdkConfig.postMessageTargetOrigin || '';
};

GameContext.prototype.applyRoomIdentifier = function (roomId) {
  this.roomID = roomId;
  this.viewerProfile.rid = roomId;
};

GameContext.prototype.applyViewerGoldAmount = function (goldAmount) {
  this.viewerProfile.gold = normalizeSourceChipAmount(goldAmount);
};

GameContext.prototype.getKey = function (profileKey) {
  return this.viewerProfile[profileKey];
};

GameContext.prototype.setKey = function (profileKey, profileValue) {
  this.viewerProfile[profileKey] = profileValue;
  if (profileKey === 'rid') this.roomID = profileValue;
};

GameContext.prototype.getGame = function () {
  return this.gameDefinition;
};

GameContext.prototype.getGameName = function () {
  return DZPK_BUNDLE_NAME;
};

GameContext.prototype.gameRepair = function () {
  return false;
};

GameContext.prototype.get_day_night = function () {
  var currentHour = new Date().getHours();
  return currentHour >= 18 ? 1 : 0;
};

GameContext.prototype.setDayNightMode = function (isNightMode) {
  this.isNightMode = isNightMode === true;
};

function normalizeSourceChipAmount(chipAmount) {
  var numericChipAmount = Number(chipAmount);
  if (!Number.isFinite(numericChipAmount) || numericChipAmount < 0) return 0;
  return Math.floor(numericChipAmount);
}

function deriveStableSourceUid(identityText) {
  var sourceUid = 17;
  for (var characterIndex = 0; characterIndex < identityText.length; characterIndex += 1) {
    sourceUid = (sourceUid * 31 + identityText.charCodeAt(characterIndex)) % 2000000000;
  }
  return Math.max(1, sourceUid);
}

module.exports = {
  DZPK_BUNDLE_NAME: DZPK_BUNDLE_NAME,
  DZPK_CLIENT_GAME_ID: DZPK_CLIENT_GAME_ID,
  DZPK_GAME_CODE: DZPK_GAME_CODE,
  GameContext: GameContext
};
