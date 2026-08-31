import { DZPK_CLIENT_GAME_ID, DZPK_GAME_CODE, AuthenticatedGameContext, GameContext } from './GameContext';
import { DzpkEventBus, EventSubscription } from './DzpkEventBus';
import { SourceEnvelope, SourceProtocolAdapter } from './SourceProtocolAdapter';
import { DzpkUiMessageService } from './DzpkUiMessageService';

const DZPK_SESSION_RECONNECT_STORAGE_KEY = 'gamehub.dzpk.session-reconnect.v1';
/** Local Creator/build default for the shared GameHub online-test backend. */
const GAMEHUB_ONLINE_TEST_BACKEND_BASE_URL = 'https://54.46.108.233';
/** Original KG NetNode sends Msg_Hall_Heart every five seconds. */
const ORIGINAL_SOURCE_HEARTBEAT_INTERVAL_MS = 5_000;

interface SessionReconnectState {
  backendBaseUrl: string;
  sessionId: string;
  sessionToken: string;
  roomId: string | number | null;
  roomLevel: number | null;
}

interface ContextEnvelope {
  code: number;
  message?: string;
  data?: AuthenticatedGameContext;
}

/** Owns the authenticated GameHub session and original KG websocket. */
export class GameHubAuthenticatedTransport {
  private backendBaseUrl = '';
  private sessionCredential = '';
  private sessionId = '';
  private websocket: WebSocket | null = null;
  private connectionPromise: Promise<SourceEnvelope> | null = null;
  private requestSequence = 0;
  private shouldReconnect = true;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private sourceHeartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttemptCount = 0;
  private reconnectRoomId: string | number | null = null;
  private reconnectRoomLevel: number | null = null;

  public constructor(
    private readonly gameContext: GameContext,
    private readonly eventBus: DzpkEventBus,
    private readonly protocolAdapter: SourceProtocolAdapter,
    private readonly uiMessageService: DzpkUiMessageService,
  ) {
    this.subscribeReconnectLocationUpdates();
  }

  public async initializeAuthenticatedSession(): Promise<AuthenticatedGameContext> {
    const currentUrl = new URL(window.location.href);
    const storedReconnectState = readSessionReconnectState();
    const genericLaunchCredential = currentUrl.searchParams.get('token');
    const launchCode = currentUrl.searchParams.get('launchCode') ?? genericLaunchCredential;
    const launchToken = currentUrl.searchParams.get('launchToken');
    const explicitSessionToken = currentUrl.searchParams.get('sessionToken');
    const hasExplicitLaunchCredential = Boolean(
      launchCode
      || launchToken
      || explicitSessionToken,
    );
    this.backendBaseUrl = (
      currentUrl.searchParams.get('backendUrl')
      ?? (!hasExplicitLaunchCredential ? storedReconnectState?.backendBaseUrl : null)
      ?? GAMEHUB_ONLINE_TEST_BACKEND_BASE_URL
    ).replace(/\/$/, '');

    const sessionToken = explicitSessionToken
      ?? storedReconnectState?.sessionToken
      ?? null;

    // A new launch credential starts a new GameHub session. Only restore the
    // previous room when this page is reopening the same session credential.
    const shouldRestoreStoredRoom = Boolean(
      storedReconnectState?.roomId
      && !launchCode
      && !launchToken
      && (!explicitSessionToken || explicitSessionToken === storedReconnectState.sessionToken),
    );
    if (shouldRestoreStoredRoom && storedReconnectState) {
      this.reconnectRoomId = storedReconnectState.roomId;
      this.reconnectRoomLevel = storedReconnectState.roomLevel;
      this.gameContext.roomLevel = storedReconnectState.roomLevel ?? this.gameContext.roomLevel;
      this.gameContext.applyRoomIdentifier(storedReconnectState.roomId);
      this.gameContext.isReconnect = true;
    }

    const credentialRequest = launchCode
      ? { launchCode }
      : launchToken
        ? { launchToken }
        : sessionToken
          ? { sessionToken }
          : null;
    if (!credentialRequest) {
      throw new Error('URL 缺少 GameHub launchCode/launchToken');
    }

    const contextResponse = await window.fetch(`${this.backendBaseUrl}/gameapi/v1/context/init`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(credentialRequest),
    });
    const contextEnvelope = await contextResponse.json() as ContextEnvelope;
    if (contextEnvelope.code !== 0 || !contextEnvelope.data) {
      throw new Error(contextEnvelope.message ?? 'GameHub context/init 失败');
    }
    const authenticatedContext = contextEnvelope.data;
    if (authenticatedContext.gameCode !== DZPK_GAME_CODE) {
      throw new Error('GameHub context gameCode 不是 dzpk-955');
    }
    this.sessionCredential = authenticatedContext.sessionToken
      ?? launchToken
      ?? launchCode
      ?? sessionToken
      ?? '';
    this.sessionId = authenticatedContext.sessionId;
    this.gameContext.applyAuthenticatedContext(authenticatedContext);
    this.persistCurrentSessionReconnectState();
    removeLaunchCredentialFromBrowserAddress(currentUrl);
    return authenticatedContext;
  }

  public connectAuthenticatedWebSocket(restoreRoomAfterConnect = false): Promise<SourceEnvelope> {
    if (this.connectionPromise) return this.connectionPromise;
    this.shouldReconnect = true;
    const connectionPromise = new Promise<SourceEnvelope>((resolve, reject) => {
      const socket = new WebSocket(createWebsocketUrl(
        this.backendBaseUrl,
        this.sessionCredential,
        this.sessionId,
      ));
      this.websocket = socket;
      const connectionTimeout = setTimeout(() => {
        socket.close();
        reject(new Error('GameHub KG websocket 连接超时'));
      }, 10_000);
      socket.onmessage = (message) => {
        if (typeof message.data !== 'string') {
          this.uiMessageService.showTransientMessage('KG websocket 返回了非文本帧');
          return;
        }
        try {
          this.protocolAdapter.handleSourceResponseFrame(message.data);
        } catch (protocolError) {
          this.uiMessageService.showTransientMessage(normalizeErrorMessage(protocolError));
        }
      };
      socket.onerror = () => {
        clearTimeout(connectionTimeout);
        reject(new Error('GameHub KG websocket 连接失败'));
      };
      socket.onclose = () => {
        clearTimeout(connectionTimeout);
        if (this.websocket !== socket) return;
        this.stopSourceHeartbeat();
        this.websocket = null;
        this.eventBus.publishSourceEvent('local_SocketState', 'socket---已关闭');
        if (this.shouldReconnect) this.scheduleAuthenticatedReconnect();
      };
      socket.onopen = () => {
        if (this.websocket !== socket) {
          socket.close();
          reject(new Error('GameHub KG websocket 连接已被更新连接取代'));
          return;
        }
        clearTimeout(connectionTimeout);
        this.reconnectAttemptCount = 0;
        this.startSourceHeartbeat(socket);
        const hallConnected = this.waitForSourceEvent('Msg_Hall_Connect', 10_000);
        this.sendSourceEventThroughSocket(socket, 'Msg_Hall_Connect', {
          gtype: DZPK_CLIENT_GAME_ID,
        });
        hallConnected.then((sourceEnvelope) => {
          if (restoreRoomAfterConnect && this.reconnectRoomId !== null) {
            this.sendSourceEventThroughSocket(socket, 'Msg_Hall_FinishLoad', {
              rid: this.reconnectRoomId,
            });
          }
          resolve(sourceEnvelope);
        }).catch((connectionError) => {
          socket.close();
          reject(connectionError);
        });
      };
    });
    this.connectionPromise = connectionPromise;
    const clearConnectionPromise = (): void => {
      if (this.connectionPromise === connectionPromise) this.connectionPromise = null;
    };
    connectionPromise.then(clearConnectionPromise, clearConnectionPromise);
    return connectionPromise;
  }

  public sendSourceEvent(eventName: string, eventPayload: unknown = []): void {
    if (!this.websocket) {
      throw new Error('GameHub KG websocket 尚未连接');
    }
    this.sendSourceEventThroughSocket(this.websocket, eventName, eventPayload);
  }

  private sendSourceEventThroughSocket(
    socket: WebSocket,
    eventName: string,
    eventPayload: unknown,
  ): void {
    if (socket.readyState !== WebSocket.OPEN) {
      throw new Error('GameHub KG websocket 尚未连接');
    }
    this.requestSequence += 1;
    const requestId = `${this.sessionId}:${this.requestSequence}`;
    socket.send(this.protocolAdapter.createSourceRequestFrame(
      eventName,
      eventPayload,
      requestId,
    ));
  }

  public waitForSourceEvent(eventName: string, timeoutMs: number): Promise<SourceEnvelope> {
    return new Promise((resolve, reject) => {
      let subscription: EventSubscription;
      const eventTimeout = setTimeout(() => {
        this.eventBus.unsubscribeSourceEvent(subscription);
        reject(new Error(`等待原版事件超时: ${eventName}`));
      }, timeoutMs);
      subscription = this.eventBus.subscribeSourceEvent(eventName, (envelopeValue) => {
        const sourceEnvelope = envelopeValue as SourceEnvelope;
        clearTimeout(eventTimeout);
        this.eventBus.unsubscribeSourceEvent(subscription);
        if (sourceEnvelope.status !== 1) {
          reject(new Error(sourceEnvelope.msg ?? `${eventName} 被拒绝`));
          return;
        }
        resolve(sourceEnvelope);
      });
    });
  }

  public restoreAuthenticatedConnection(): Promise<SourceEnvelope | void> {
    if (this.connectionPromise) return this.connectionPromise;
    if (this.websocket?.readyState === WebSocket.OPEN) return Promise.resolve();
    return this.connectAuthenticatedWebSocket(true);
  }

  public closeAuthenticatedConnection(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.stopSourceHeartbeat();
    this.reconnectAttemptCount = 0;
    this.connectionPromise = null;
    const socket = this.websocket;
    this.websocket = null;
    socket?.close();
  }

  public endAuthenticatedSession(): void {
    this.closeAuthenticatedConnection();
    clearSessionReconnectState();
  }

  private scheduleAuthenticatedReconnect(): void {
    if (this.reconnectTimer) return;
    const reconnectDelayMs = Math.min(10_000, 5_000 * 2 ** this.reconnectAttemptCount);
    this.reconnectAttemptCount += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectAuthenticatedWebSocket(true).catch((reconnectError) => {
        this.uiMessageService.showTransientMessage(normalizeErrorMessage(reconnectError));
        if (this.shouldReconnect) this.scheduleAuthenticatedReconnect();
      });
    }, reconnectDelayMs);
  }

  private startSourceHeartbeat(socket: WebSocket): void {
    this.stopSourceHeartbeat();
    this.sourceHeartbeatTimer = setInterval(() => {
      if (this.websocket !== socket || socket.readyState !== WebSocket.OPEN) return;
      try {
        // Preserves the original KG liveness event. GameHub uses the same
        // dispatch to refresh the authoritative session heartbeat.
        this.sendSourceEventThroughSocket(socket, 'Msg_Hall_Heart', []);
      } catch {
        // onclose owns reconnect and user-facing diagnostics.
      }
    }, ORIGINAL_SOURCE_HEARTBEAT_INTERVAL_MS);
  }

  private stopSourceHeartbeat(): void {
    if (this.sourceHeartbeatTimer) clearInterval(this.sourceHeartbeatTimer);
    this.sourceHeartbeatTimer = null;
  }

  private subscribeReconnectLocationUpdates(): void {
    this.eventBus.subscribeSourceEvent('Msg_Hall_EnterRoom', (envelopeValue) => {
      const envelope = envelopeValue as SourceEnvelope<{ rid?: string | number }>;
      if (envelope.status !== 1 || !envelope.data?.rid) return;
      this.reconnectRoomId = envelope.data.rid;
      this.reconnectRoomLevel = this.gameContext.roomLevel;
      this.persistCurrentSessionReconnectState();
    });
    this.eventBus.subscribeSourceEvent('Msg_DZPK_RoomInfo', (envelopeValue) => {
      const envelope = envelopeValue as SourceEnvelope<{ level?: number }>;
      if (envelope.status !== 1 || !envelope.data) return;
      this.reconnectRoomId = this.gameContext.roomID;
      this.reconnectRoomLevel = Number(envelope.data.level) || this.gameContext.roomLevel;
      this.persistCurrentSessionReconnectState();
    });
    this.eventBus.subscribeSourceEvent('Msg_DZPK_Out', (envelopeValue) => {
      const envelope = envelopeValue as SourceEnvelope<{ uid?: number | string }>;
      if (envelope.status !== 1 || !envelope.data) return;
      if (Number(envelope.data.uid) !== Number(this.gameContext.getKey('uid'))) return;
      this.reconnectRoomId = null;
      this.reconnectRoomLevel = null;
      this.persistCurrentSessionReconnectState();
    });
  }

  private persistCurrentSessionReconnectState(): void {
    if (!this.sessionCredential || !this.sessionId) return;
    persistSessionReconnectState({
      backendBaseUrl: this.backendBaseUrl,
      sessionId: this.sessionId,
      sessionToken: this.sessionCredential,
      roomId: this.reconnectRoomId,
      roomLevel: this.reconnectRoomLevel,
    });
  }
}

function createWebsocketUrl(backendBaseUrl: string, sessionCredential: string, sessionId: string): string {
  const websocketOrigin = backendBaseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  return `${websocketOrigin}/gameapi/v1/kg-ws/?launchToken=${encodeURIComponent(sessionCredential)}`
    + `&gameCode=${encodeURIComponent(DZPK_GAME_CODE)}`
    + `&sessionId=${encodeURIComponent(sessionId)}`;
}

function removeLaunchCredentialFromBrowserAddress(currentUrl: URL): void {
  ['launchCode', 'launchToken', 'token', 'sessionToken'].forEach((key) => {
    currentUrl.searchParams.delete(key);
  });
  const credentialFreeUrl = currentUrl.pathname
    + (currentUrl.searchParams.toString() ? `?${currentUrl.searchParams.toString()}` : '')
    + currentUrl.hash;
  window.history.replaceState(window.history.state, document.title, credentialFreeUrl);
}

function readSessionReconnectState(): SessionReconnectState | null {
  try {
    const encodedState = window.sessionStorage.getItem(DZPK_SESSION_RECONNECT_STORAGE_KEY);
    if (!encodedState) return null;
    const state = JSON.parse(encodedState) as SessionReconnectState & {
      gameCode?: string;
      runtimeOrigin?: string;
    };
    if (
      state.gameCode !== DZPK_GAME_CODE
      || state.runtimeOrigin !== window.location.origin
      || typeof state.backendBaseUrl !== 'string'
      || typeof state.sessionId !== 'string'
      || typeof state.sessionToken !== 'string'
      || !state.sessionToken
    ) {
      clearSessionReconnectState();
      return null;
    }
    return state;
  } catch {
    clearSessionReconnectState();
    return null;
  }
}

function persistSessionReconnectState(state: SessionReconnectState): void {
  try {
    window.sessionStorage.setItem(DZPK_SESSION_RECONNECT_STORAGE_KEY, JSON.stringify({
      schema: 'gamehub-dzpk-session-reconnect-v1',
      gameCode: DZPK_GAME_CODE,
      runtimeOrigin: window.location.origin,
      ...state,
    }));
  } catch {
    // A live session remains usable when private browsing disables storage.
  }
}

function clearSessionReconnectState(): void {
  try {
    window.sessionStorage.removeItem(DZPK_SESSION_RECONNECT_STORAGE_KEY);
  } catch {
    // Session cleanup must not break game exit.
  }
}

function normalizeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
