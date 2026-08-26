'use strict';

var SOURCE_ERROR_EVENT_NAME = 'Msg_GameHub_Error';

/** Encodes and projects the original KG Base64 JSON envelope. */
function SourceProtocolAdapter(gameContext, eventBus, uiMessageService) {
  this.gameContext = gameContext;
  this.eventBus = eventBus;
  this.uiMessageService = uiMessageService;
}

SourceProtocolAdapter.prototype.createSourceRequestFrame = function (
  eventName,
  eventPayload,
  requestId
) {
  return encodeUtf8Base64(JSON.stringify({
    event: eventName,
    area: 0,
    uid: this.gameContext.getKey('uid') || 0,
    request_id: requestId,
    data: eventPayload === undefined ? [] : eventPayload
  }));
};

SourceProtocolAdapter.prototype.handleSourceResponseFrame = function (sourceFrame) {
  var sourceEnvelope;
  try {
    sourceEnvelope = JSON.parse(decodeUtf8Base64(sourceFrame));
  } catch (decodeError) {
    throw new Error('GameHub KG websocket returned invalid Base64 JSON');
  }
  validateSourceEnvelope(sourceEnvelope);
  if (sourceEnvelope.event === SOURCE_ERROR_EVENT_NAME) {
    var rejectionReason = sourceEnvelope.data && sourceEnvelope.data.reason
      ? sourceEnvelope.data.reason
      : 'GameHub 拒绝了当前操作';
    this.uiMessageService.showTransientMessage(rejectionReason);
    return;
  }
  this.applySourceEnvelopeToGameContext(sourceEnvelope);
  this.eventBus.publishSourceEvent(sourceEnvelope.event, sourceEnvelope);
};

SourceProtocolAdapter.prototype.applySourceEnvelopeToGameContext = function (sourceEnvelope) {
  var eventPayload = sourceEnvelope.data;
  if (sourceEnvelope.event === 'Msg_Hall_Connect' && sourceEnvelope.status === 1) {
    var authenticatedSourceUid = Number(sourceEnvelope.uid);
    if (!Number.isSafeInteger(authenticatedSourceUid) || authenticatedSourceUid <= 0) {
      throw new Error('Msg_Hall_Connect 未返回有效的服务端 source uid');
    }
    this.gameContext.setKey('uid', authenticatedSourceUid);
  }
  if (sourceEnvelope.event === 'Msg_Hall_EnterRoom' && sourceEnvelope.status === 1) {
    this.gameContext.applyRoomIdentifier(eventPayload.rid);
  }
  if (sourceEnvelope.event === 'Msg_Hall_GameSessions' && sourceEnvelope.status === 1) {
    this.gameContext.roomConfig = eventPayload;
  }
  if (sourceEnvelope.event === 'Msg_DZPK_RoomInfo' && sourceEnvelope.status === 1) {
    this.gameContext.roomLevel = Number(eventPayload.level) || this.gameContext.roomLevel;
    this.applyRoomViewerProfile(eventPayload);
  }
  if (sourceEnvelope.event === 'Msg_DZPK_ChangGold' && eventPayload) {
    if (Number(eventPayload.uid) === Number(this.gameContext.getKey('uid'))) {
      this.gameContext.applyViewerGoldAmount(eventPayload.gold);
    }
  }
  if (sourceEnvelope.event === 'Msg_DZPK_Out' && sourceEnvelope.status === 1 && eventPayload) {
    if (Number(eventPayload.uid) === Number(this.gameContext.getKey('uid'))) {
      this.gameContext.applyViewerGoldAmount(eventPayload.gold);
      this.gameContext.applyRoomIdentifier(null);
    }
  }
};

SourceProtocolAdapter.prototype.applyRoomViewerProfile = function (roomPayload) {
  if (!roomPayload || !Array.isArray(roomPayload.players)) return;
  var viewerUid = Number(this.gameContext.getKey('uid'));
  var viewerPlayer = roomPayload.players.find(function (participant) {
    return Number(participant.uid) === viewerUid;
  });
  if (viewerPlayer) this.gameContext.applyViewerGoldAmount(viewerPlayer.gold);
};

function validateSourceEnvelope(sourceEnvelope) {
  if (!sourceEnvelope || typeof sourceEnvelope !== 'object' || Array.isArray(sourceEnvelope)) {
    throw new Error('KG websocket envelope must be an object');
  }
  if (typeof sourceEnvelope.event !== 'string' || !sourceEnvelope.event) {
    throw new Error('KG websocket envelope event is missing');
  }
  if (!Object.prototype.hasOwnProperty.call(sourceEnvelope, 'data')) {
    throw new Error('KG websocket envelope data is missing');
  }
}

function encodeUtf8Base64(sourceText) {
  return window.btoa(unescape(encodeURIComponent(sourceText)));
}

function decodeUtf8Base64(sourceFrame) {
  return decodeURIComponent(escape(window.atob(sourceFrame)));
}

module.exports = { SourceProtocolAdapter: SourceProtocolAdapter };
