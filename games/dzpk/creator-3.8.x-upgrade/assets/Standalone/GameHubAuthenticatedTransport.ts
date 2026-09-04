/**
 * 学习导读：这是独立 Cocos 客户端的网络层。它不决定发牌/输赢，只负责：
 * 1. 用 URL 中的一次性 launchCode/launchToken 调 GameHub `context/init`；
 * 2. 用认证凭证建立 KG-compatible WebSocket；
 * 3. 发送原 `Msg_Hall_* / Msg_DZPK_*`，并把收到的帧交给 SourceProtocolAdapter；
 * 4. 每 5 秒发送原版 Hall 心跳，断线后指数退避重连并请求 Room 快照；
 * 5. 在当前浏览器标签的 sessionStorage 中保存同一会话重连位置。
 *
 * 本文件主要使用浏览器标准 API，而不是 Cocos 渲染 API：
 * - `fetch`：调用 HTTP context/init；只有拿到成功上下文后才可连 WS。
 * - `WebSocket`：双向实时事件；`OPEN` 只说明通道打开，仍需 `Msg_Hall_Connect` 成功才算认证完成。
 * - `setTimeout/setInterval`：连接超时、重连退避和 5 秒心跳。
 * - `sessionStorage`：只在当前标签生命周期保留会话；不会写入长期 localStorage。
 * - `history.replaceState`：兑换凭证后从地址栏移除 token，减少复制 URL 或浏览历史泄漏。
 */
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

/** 持有一条已认证 GameHub 会话及原 KG 事件兼容 WebSocket。 */
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

  // ────────────────── 1. 启动认证与首次连接 ──────────────────

  /** 构造时只注册重连位置监听；真正网络 IO 从 initialize/connect 两步开始。 */
  public constructor(
    private readonly gameContext: GameContext,
    private readonly eventBus: DzpkEventBus,
    private readonly protocolAdapter: SourceProtocolAdapter,
    private readonly uiMessageService: DzpkUiMessageService,
  ) {
    this.subscribeReconnectLocationUpdates();
  }

  /**
   * 兑换/恢复 GameHub 会话。
   * 凭证优先级是显式 URL > 当前标签缓存；只要 URL 带新 launch 凭证，就绝不能误恢复旧房间。
   * context 成功后先保存服务端返回的 sessionToken，再从地址栏清除所有敏感凭证。
   */
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

    // 新 launch 凭证代表新会话；只有明确复用同一 sessionToken 才恢复旧 Room。
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

  /**
   * 建立 WebSocket 并完成 source Hall 握手。
   * `connectionPromise` 合并并发调用，防止前台恢复和自动重连同时创建两条 socket。
   * onopen 后仍先等待 `Msg_Hall_Connect` 成功；若是重连，再发送 FinishLoad 让服务端返回 RoomInfo。
   */
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
      // 浏览器 WS message 可能是 Blob/ArrayBuffer；source 协议只接受文本 Base64 帧。
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
      // 只有当前 socket 的 close 才能清状态；旧 socket 迟到的 close 不能覆盖新连接。
      socket.onclose = () => {
        clearTimeout(connectionTimeout);
        if (this.websocket !== socket) return;
        this.stopSourceHeartbeat();
        this.websocket = null;
        this.eventBus.publishSourceEvent('local_SocketState', 'socket---已关闭');
        if (this.shouldReconnect) this.scheduleAuthenticatedReconnect();
      };
      // WebSocket 打开后完成应用层 Hall Connect，不能把 101 Upgrade 当作游戏认证成功。
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

  /** 使用当前已打开 socket 发送一条原版事件；未连接时明确拒绝，不静默丢消息。 */
  public sendSourceEvent(eventName: string, eventPayload: unknown = []): void {
    if (!this.websocket) {
      throw new Error('GameHub KG websocket 尚未连接');
    }
    this.sendSourceEventThroughSocket(this.websocket, eventName, eventPayload);
  }

  /**
   * 为每个请求生成 `sessionId:递增序号`，再由协议适配器编码。显式传 socket 用于握手阶段，
   * 可保证消息发到本次刚打开的连接，而不是字段里后来被替换的新连接。
   */
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

  /**
   * 把一次性 EventBus 响应转换成 Promise。成功、业务拒绝和超时三条路径都会退订，避免监听泄漏。
   */
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

  // ────────────────── 2. 断线重连、关闭与原版心跳 ──────────────────

  /** 已连接就不做事；正在连接则复用 Promise；确实断线才发起带房间恢复的连接。 */
  public restoreAuthenticatedConnection(): Promise<SourceEnvelope | void> {
    if (this.connectionPromise) return this.connectionPromise;
    if (this.websocket?.readyState === WebSocket.OPEN) return Promise.resolve();
    return this.connectAuthenticatedWebSocket(true);
  }

  /** 主动关闭连接并取消所有自动重连/心跳；用于 Scene 销毁或真正退出。 */
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

  /** 在关闭网络之外删除本标签重连凭据，因此之后刷新不能再回到这局。 */
  public endAuthenticatedSession(): void {
    this.closeAuthenticatedConnection();
    clearSessionReconnectState();
  }

  /**
   * 指数退避重连：5 秒、10 秒，之后封顶 10 秒。只有一个 timer 可以存在；失败后继续安排下一次。
   */
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

  /**
   * 恢复原 NetNode 的 5 秒 `Msg_Hall_Heart`。GameHub 用同一事件刷新权威会话存活时间；
   * 不能换成客户端自创 ping，否则浏览器看似在线但服务端会回收 session。
   */
  private startSourceHeartbeat(socket: WebSocket): void {
    this.stopSourceHeartbeat();
    this.sourceHeartbeatTimer = setInterval(() => {
      if (this.websocket !== socket || socket.readyState !== WebSocket.OPEN) return;
      try {
        this.sendSourceEventThroughSocket(socket, 'Msg_Hall_Heart', []);
      } catch {
        // send 抛错后等待 onclose 统一负责重连，避免这里再并发创建连接。
      }
    }, ORIGINAL_SOURCE_HEARTBEAT_INTERVAL_MS);
  }

  /** 关闭/替换 socket 前停止旧心跳，防止旧连接继续发送。 */
  private stopSourceHeartbeat(): void {
    if (this.sourceHeartbeatTimer) clearInterval(this.sourceHeartbeatTimer);
    this.sourceHeartbeatTimer = null;
  }

  // ────────────────── 3. 保存同一标签页的重连位置 ──────────────────

  /**
   * 监听成功进入房间、RoomInfo 和自己 Out，把“同一会话刷新后应恢复到哪里”写入缓存。
   * 这里只记录位置，不保存整副牌；真正牌局快照必须重新向 GameHub 权威请求。
   */
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

  /** 只有已经拿到 sessionId 和认证凭证后才允许保存可恢复状态。 */
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
  // HTTP(S) Origin 对应 WS(S)；所有查询值都 encode，避免 token 特殊字符破坏 URL。
  const websocketOrigin = backendBaseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  return `${websocketOrigin}/gameapi/v1/kg-ws/?launchToken=${encodeURIComponent(sessionCredential)}`
    + `&gameCode=${encodeURIComponent(DZPK_GAME_CODE)}`
    + `&sessionId=${encodeURIComponent(sessionId)}`;
}

function removeLaunchCredentialFromBrowserAddress(currentUrl: URL): void {
  // replaceState 不刷新页面，只替换当前历史条目的可见 URL。
  ['launchCode', 'launchToken', 'token', 'sessionToken'].forEach((key) => {
    currentUrl.searchParams.delete(key);
  });
  const credentialFreeUrl = currentUrl.pathname
    + (currentUrl.searchParams.toString() ? `?${currentUrl.searchParams.toString()}` : '')
    + currentUrl.hash;
  window.history.replaceState(window.history.state, document.title, credentialFreeUrl);
}

function readSessionReconnectState(): SessionReconnectState | null {
  // 缓存必须同时属于本游戏和当前静态资源 Origin；否则清除，防止另一构建误用旧 token。
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
    // 隐私模式可能禁止 storage；连接仍可继续，只是整页刷新无法恢复。
  }
}

function clearSessionReconnectState(): void {
  try {
    window.sessionStorage.removeItem(DZPK_SESSION_RECONNECT_STORAGE_KEY);
  } catch {
    // 清缓存失败不能阻止用户退出和 socket 关闭。
  }
}

function normalizeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
