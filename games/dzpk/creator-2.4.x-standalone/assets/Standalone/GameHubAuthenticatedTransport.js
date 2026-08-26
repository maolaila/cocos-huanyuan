'use strict';

var DZPK_GAME_CODE = require('GameContext').DZPK_GAME_CODE;
var DZPK_CLIENT_GAME_ID = require('GameContext').DZPK_CLIENT_GAME_ID;
var DZPK_SESSION_RECONNECT_STORAGE_KEY = 'gamehub.dzpk.session-reconnect.v1';

/**
 * Exchanges the one-time launch credential and owns the authenticated GameHub
 * KG websocket. Original game scripts only submit source player intent.
 */
function GameHubAuthenticatedTransport(gameContext, eventBus, protocolAdapter, uiMessageService) {
  this.gameContext = gameContext;
  this.eventBus = eventBus;
  this.protocolAdapter = protocolAdapter;
  this.uiMessageService = uiMessageService;
  this.backendBaseUrl = '';
  this.sessionCredential = '';
  this.sessionId = '';
  this.websocket = null;
  this.requestSequence = 0;
  this.shouldReconnect = true;
  this.reconnectSchedule = null;
  this.reconnectAttemptCount = 0;
  this.reconnectRoomId = null;
  this.reconnectRoomLevel = null;
  this.subscribeReconnectLocationUpdates();
}

GameHubAuthenticatedTransport.prototype.initializeAuthenticatedSession = function () {
  var transport = this;
  var currentUrl = new URL(window.location.href);
  var explicitBackendUrl = currentUrl.searchParams.get('backendUrl');
  var storedReconnectState = readSessionReconnectState();
  this.backendBaseUrl = (
    explicitBackendUrl
    || (storedReconnectState && storedReconnectState.backendBaseUrl)
    || window.location.origin
  ).replace(/\/$/, '');
  // GameHub launchPath uses `token`; explicit names remain accepted for study tools.
  var genericLaunchCredential = currentUrl.searchParams.get('token');
  var launchCode = currentUrl.searchParams.get('launchCode') || genericLaunchCredential;
  var launchToken = currentUrl.searchParams.get('launchToken');
  var sessionToken = currentUrl.searchParams.get('sessionToken')
    || (storedReconnectState && storedReconnectState.sessionToken);
  if (storedReconnectState && storedReconnectState.roomId) {
    this.reconnectRoomId = storedReconnectState.roomId;
    this.reconnectRoomLevel = storedReconnectState.roomLevel;
    this.gameContext.roomLevel = storedReconnectState.roomLevel;
    this.gameContext.applyRoomIdentifier(storedReconnectState.roomId);
    this.gameContext.isReconnect = true;
  }
  var credentialRequest = launchCode
    ? { launchCode: launchCode }
    : sessionToken
      ? { sessionToken: sessionToken }
      : { launchToken: launchToken };
  if (!launchCode && !launchToken && !sessionToken) {
    return Promise.reject(new Error('URL 缺少 GameHub launchCode/launchToken'));
  }
  return window.fetch(this.backendBaseUrl + '/gameapi/v1/context/init', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(credentialRequest)
  }).then(function (contextResponse) {
    return contextResponse.json();
  }).then(function (contextEnvelope) {
    if (!contextEnvelope || contextEnvelope.code !== 0 || !contextEnvelope.data) {
      throw new Error(contextEnvelope && contextEnvelope.message
        ? contextEnvelope.message
        : 'GameHub context/init 失败');
    }
    var authenticatedContext = contextEnvelope.data;
    if (authenticatedContext.gameCode !== DZPK_GAME_CODE) {
      throw new Error('GameHub context gameCode 不是 dzpk-955');
    }
    if (authenticatedContext.mode !== 'TRIAL') {
      throw new Error('Phase A 原版还原仅允许 TRIAL 会话');
    }
    transport.sessionCredential = authenticatedContext.sessionToken
      || sessionToken
      || launchToken
      || launchCode;
    transport.sessionId = authenticatedContext.sessionId;
    transport.gameContext.applyAuthenticatedContext(authenticatedContext);
    persistSessionReconnectState({
      backendBaseUrl: transport.backendBaseUrl,
      sessionId: transport.sessionId,
      sessionToken: transport.sessionCredential,
      roomId: transport.reconnectRoomId,
      roomLevel: transport.reconnectRoomLevel
    });
    removeLaunchCredentialFromBrowserAddress(currentUrl);
    return authenticatedContext;
  });
};

GameHubAuthenticatedTransport.prototype.connectAuthenticatedWebSocket = function () {
  var transport = this;
  this.shouldReconnect = true;
  return new Promise(function (resolve, reject) {
    var websocketUrl = createWebsocketUrl(
      transport.backendBaseUrl,
      transport.sessionCredential,
      transport.sessionId
    );
    var connectionTimeout = setTimeout(function () {
      reject(new Error('GameHub KG websocket 连接超时'));
    }, 10000);
    transport.websocket = new WebSocket(websocketUrl);
    transport.websocket.onmessage = function (websocketMessage) {
      try {
        transport.protocolAdapter.handleSourceResponseFrame(websocketMessage.data);
      } catch (protocolError) {
        transport.uiMessageService.showTransientMessage(protocolError.message);
      }
    };
    transport.websocket.onerror = function () {
      clearTimeout(connectionTimeout);
      reject(new Error('GameHub KG websocket 连接失败'));
    };
    transport.websocket.onclose = function () {
      transport.eventBus.publishSourceEvent('local_SocketState', 'socket---已关闭');
      if (transport.shouldReconnect) transport.scheduleAuthenticatedReconnect();
    };
    transport.websocket.onopen = function () {
      clearTimeout(connectionTimeout);
      transport.reconnectAttemptCount = 0;
      var hallConnected = transport.waitForSourceEvent('Msg_Hall_Connect', 10000);
      transport.sendSourceEvent('Msg_Hall_Connect', { gtype: DZPK_CLIENT_GAME_ID });
      hallConnected.then(resolve).catch(reject);
    };
  });
};

GameHubAuthenticatedTransport.prototype.sendSourceEvent = function (eventName, eventPayload) {
  if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
    throw new Error('GameHub KG websocket 尚未连接');
  }
  this.requestSequence += 1;
  var requestId = this.sessionId + ':' + this.requestSequence;
  var sourceFrame = this.protocolAdapter.createSourceRequestFrame(
    eventName,
    eventPayload,
    requestId
  );
  this.websocket.send(sourceFrame);
};

GameHubAuthenticatedTransport.prototype.waitForSourceEvent = function (eventName, timeoutMs) {
  var eventBus = this.eventBus;
  return new Promise(function (resolve, reject) {
    var eventTimeout = setTimeout(function () {
      eventBus.unsubscribeSourceEvent(subscription);
      reject(new Error('等待原版事件超时: ' + eventName));
    }, timeoutMs);
    var subscription = eventBus.subscribeSourceEvent(eventName, function (sourceEnvelope) {
      clearTimeout(eventTimeout);
      eventBus.unsubscribeSourceEvent(subscription);
      if (sourceEnvelope.status !== 1) {
        reject(new Error(sourceEnvelope.msg || eventName + ' 被拒绝'));
        return;
      }
      resolve(sourceEnvelope);
    });
  });
};

GameHubAuthenticatedTransport.prototype.scheduleAuthenticatedReconnect = function () {
  var transport = this;
  if (this.reconnectSchedule) return;
  var reconnectDelayMs = Math.min(
    10000,
    5000 * Math.pow(2, this.reconnectAttemptCount)
  );
  this.reconnectAttemptCount += 1;
  this.reconnectSchedule = setTimeout(function () {
    transport.reconnectSchedule = null;
    transport.connectAuthenticatedWebSocket().catch(function (reconnectError) {
      transport.uiMessageService.showTransientMessage(reconnectError.message);
      if (transport.shouldReconnect) transport.scheduleAuthenticatedReconnect();
    });
  }, reconnectDelayMs);
};

GameHubAuthenticatedTransport.prototype.restoreAuthenticatedConnection = function () {
  if (this.websocket && this.websocket.readyState === WebSocket.OPEN) return Promise.resolve();
  return this.connectAuthenticatedWebSocket();
};

GameHubAuthenticatedTransport.prototype.closeAuthenticatedConnection = function () {
  this.shouldReconnect = false;
  if (this.reconnectSchedule) clearTimeout(this.reconnectSchedule);
  this.reconnectSchedule = null;
  this.reconnectAttemptCount = 0;
  if (this.websocket) this.websocket.close();
  this.websocket = null;
};

GameHubAuthenticatedTransport.prototype.endAuthenticatedSession = function () {
  this.closeAuthenticatedConnection();
  clearSessionReconnectState();
};

GameHubAuthenticatedTransport.prototype.subscribeReconnectLocationUpdates = function () {
  var transport = this;
  this.eventBus.subscribeSourceEvent('Msg_Hall_EnterRoom', function (sourceEnvelope) {
    if (!sourceEnvelope || sourceEnvelope.status !== 1 || !sourceEnvelope.data) return;
    transport.reconnectRoomId = sourceEnvelope.data.rid;
    transport.reconnectRoomLevel = transport.gameContext.roomLevel;
    transport.persistCurrentSessionReconnectState();
  });
  this.eventBus.subscribeSourceEvent('Msg_DZPK_RoomInfo', function (sourceEnvelope) {
    if (!sourceEnvelope || sourceEnvelope.status !== 1 || !sourceEnvelope.data) return;
    transport.reconnectRoomId = transport.gameContext.roomID;
    transport.reconnectRoomLevel = Number(sourceEnvelope.data.level)
      || transport.gameContext.roomLevel;
    transport.persistCurrentSessionReconnectState();
  });
  this.eventBus.subscribeSourceEvent('Msg_DZPK_Out', function (sourceEnvelope) {
    if (!sourceEnvelope || sourceEnvelope.status !== 1 || !sourceEnvelope.data) return;
    if (Number(sourceEnvelope.data.uid) !== Number(transport.gameContext.getKey('uid'))) return;
    transport.reconnectRoomId = null;
    transport.reconnectRoomLevel = null;
    transport.persistCurrentSessionReconnectState();
  });
};

GameHubAuthenticatedTransport.prototype.persistCurrentSessionReconnectState = function () {
  if (!this.sessionCredential || !this.sessionId) return;
  persistSessionReconnectState({
    backendBaseUrl: this.backendBaseUrl,
    sessionId: this.sessionId,
    sessionToken: this.sessionCredential,
    roomId: this.reconnectRoomId,
    roomLevel: this.reconnectRoomLevel
  });
};

// Thin network compatibility methods used by the original scripts.
GameHubAuthenticatedTransport.prototype.send = GameHubAuthenticatedTransport.prototype.sendSourceEvent;
GameHubAuthenticatedTransport.prototype.close = GameHubAuthenticatedTransport.prototype.closeAuthenticatedConnection;
GameHubAuthenticatedTransport.prototype.rejectReconnect = function () {
  this.shouldReconnect = false;
};

function createWebsocketUrl(backendBaseUrl, sessionCredential, sessionId) {
  var websocketOrigin = backendBaseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  return websocketOrigin
    + '/gameapi/v1/kg-ws/?launchToken=' + encodeURIComponent(sessionCredential)
    + '&gameCode=' + encodeURIComponent(DZPK_GAME_CODE)
    + '&sessionId=' + encodeURIComponent(sessionId);
}

function removeLaunchCredentialFromBrowserAddress(currentUrl) {
  currentUrl.searchParams.delete('launchCode');
  currentUrl.searchParams.delete('launchToken');
  currentUrl.searchParams.delete('token');
  currentUrl.searchParams.delete('sessionToken');
  var credentialFreeUrl = currentUrl.pathname
    + (currentUrl.searchParams.toString() ? '?' + currentUrl.searchParams.toString() : '')
    + currentUrl.hash;
  window.history.replaceState(window.history.state, document.title, credentialFreeUrl);
}

function readSessionReconnectState() {
  try {
    var encodedReconnectState = window.sessionStorage.getItem(
      DZPK_SESSION_RECONNECT_STORAGE_KEY
    );
    if (!encodedReconnectState) return null;
    var reconnectState = JSON.parse(encodedReconnectState);
    if (
      !reconnectState
      || reconnectState.gameCode !== DZPK_GAME_CODE
      || reconnectState.runtimeOrigin !== window.location.origin
      || typeof reconnectState.backendBaseUrl !== 'string'
      || typeof reconnectState.sessionId !== 'string'
      || typeof reconnectState.sessionToken !== 'string'
      || !reconnectState.sessionToken
      || (
        reconnectState.roomId !== null
        && typeof reconnectState.roomId !== 'string'
        && (!Number.isSafeInteger(reconnectState.roomId) || reconnectState.roomId <= 0)
      )
      || (
        reconnectState.roomLevel !== null
        && (!Number.isInteger(reconnectState.roomLevel) || reconnectState.roomLevel < 1)
      )
    ) {
      clearSessionReconnectState();
      return null;
    }
    return reconnectState;
  } catch (storageReadFailure) {
    clearSessionReconnectState();
    return null;
  }
}

function persistSessionReconnectState(reconnectState) {
  try {
    window.sessionStorage.setItem(DZPK_SESSION_RECONNECT_STORAGE_KEY, JSON.stringify({
      schema: 'gamehub-dzpk-session-reconnect-v1',
      gameCode: DZPK_GAME_CODE,
      runtimeOrigin: window.location.origin,
      backendBaseUrl: reconnectState.backendBaseUrl,
      sessionId: reconnectState.sessionId,
      sessionToken: reconnectState.sessionToken,
      roomId: reconnectState.roomId || null,
      roomLevel: reconnectState.roomLevel || null
    }));
  } catch (storageWriteFailure) {
    // Private browsing may disable storage; the live session remains playable.
  }
}

function clearSessionReconnectState() {
  try {
    window.sessionStorage.removeItem(DZPK_SESSION_RECONNECT_STORAGE_KEY);
  } catch (storageClearFailure) {
    // Nothing else should fail merely because storage is unavailable.
  }
}

module.exports = { GameHubAuthenticatedTransport: GameHubAuthenticatedTransport };
