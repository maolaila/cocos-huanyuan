/**
 * 学习导读：这是 GameHub WebSocket 与原 KG Cocos 组件之间的“协议翻译边界”。KG 使用的帧格式是
 * `UTF-8 JSON -> Base64 字符串`，内部仍保留 `Msg_Hall_* / Msg_DZPK_*` 事件名。
 *
 * 发送方向：Controller 的事件名和 data -> 补 area/uid/request_id -> JSON -> UTF-8 -> Base64。
 * 接收方向：Base64 -> UTF-8 -> JSON -> 校验 envelope -> 更新少量 GameContext -> 发布同名本地事件。
 *
 * 这里不用 `cc` 包，因为编码和协议不依赖渲染；浏览器 `TextEncoder/TextDecoder` 正确处理中文，
 * `window.btoa/atob` 只负责二进制字符串与 Base64，不能直接安全编码中文字符串。
 */
import { DzpkEventBus } from './DzpkEventBus';
import { GameContext } from './GameContext';
import { DzpkUiMessageService } from './DzpkUiMessageService';

const SOURCE_ERROR_EVENT_NAME = 'Msg_GameHub_Error';

export interface SourceEnvelope<T = unknown> {
  // 原 KG 服务端每条消息的公共外壳；具体 `data` 由事件自己的类型决定。
  event: string;
  area?: number;
  uid?: number | string;
  status?: number;
  msg?: string;
  data: T;
}

interface SourcePlayerProjection {
  uid: number | string;
  gold: number;
}

/** 编解码原 KG Base64 JSON envelope，并把公共身份/房间字段投影进 GameContext。 */
export class SourceProtocolAdapter {
  public constructor(
    private readonly gameContext: GameContext,
    private readonly eventBus: DzpkEventBus,
    private readonly uiMessageService: DzpkUiMessageService,
  ) {}

  /** 创建一条可直接交给 WebSocket.send 的 source 请求帧。 */
  public createSourceRequestFrame(
    eventName: string,
    eventPayload: unknown,
    requestId: string,
  ): string {
    return encodeUtf8Base64(JSON.stringify({
      event: eventName,
      area: 0,
      uid: this.gameContext.getKey<number>('uid') || 0,
      request_id: requestId,
      data: eventPayload === undefined ? [] : eventPayload,
    }));
  }

  /**
   * 处理一条服务端文本帧。协议错误直接抛给 transport 统一提示；业务拒绝事件只显示原因，
   * 不再当作正常 Msg_DZPK 事件推进画面。
   */
  public handleSourceResponseFrame(sourceFrame: string): void {
    let sourceEnvelope: SourceEnvelope;
    try {
      sourceEnvelope = JSON.parse(decodeUtf8Base64(sourceFrame)) as SourceEnvelope;
    } catch {
      throw new Error('GameHub KG websocket returned invalid Base64 JSON');
    }
    validateSourceEnvelope(sourceEnvelope);
    if (sourceEnvelope.event === SOURCE_ERROR_EVENT_NAME) {
      const errorData = sourceEnvelope.data as { reason?: string } | null;
      this.uiMessageService.showTransientMessage(errorData?.reason ?? 'GameHub 拒绝了当前操作');
      return;
    }
    this.applySourceEnvelopeToGameContext(sourceEnvelope);
    this.eventBus.publishSourceEvent(sourceEnvelope.event, sourceEnvelope);
  }

  /**
   * 只同步所有页面共同依赖的公共事实：服务端 UID、房间 id/等级、房间配置和自己的余额。
   * 牌局 participants/cards/pot 等复杂状态留给 Table Controller，避免上下文变成第二套牌桌状态机。
   */
  private applySourceEnvelopeToGameContext(sourceEnvelope: SourceEnvelope): void {
    const eventPayload = sourceEnvelope.data as Record<string, unknown> | null;
    if (sourceEnvelope.event === 'Msg_Hall_Connect' && sourceEnvelope.status === 1) {
      const authenticatedSourceUid = Number(sourceEnvelope.uid);
      if (!Number.isSafeInteger(authenticatedSourceUid) || authenticatedSourceUid <= 0) {
        throw new Error('Msg_Hall_Connect 未返回有效的服务端 source uid');
      }
      this.gameContext.setKey('uid', authenticatedSourceUid);
    }
    if (sourceEnvelope.event === 'Msg_Hall_EnterRoom' && sourceEnvelope.status === 1 && eventPayload) {
      this.gameContext.applyRoomIdentifier(eventPayload.rid as string | number);
    }
    if (sourceEnvelope.event === 'Msg_Hall_GameSessions' && sourceEnvelope.status === 1) {
      this.gameContext.applyRoomConfiguration(
        (sourceEnvelope.data ?? {}) as Record<string, unknown>,
      );
    }
    if (sourceEnvelope.event === 'Msg_DZPK_RoomInfo' && sourceEnvelope.status === 1 && eventPayload) {
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
  }

  /** 从 RoomInfo.players 中只找当前 viewer，把权威桌上筹码写回共享上下文。 */
  private applyRoomViewerProfile(roomPayload: Record<string, unknown>): void {
    const sourcePlayers = Array.isArray(roomPayload.players)
      ? roomPayload.players as SourcePlayerProjection[]
      : [];
    const viewerUid = Number(this.gameContext.getKey('uid'));
    const viewerPlayer = sourcePlayers.find((participant) => Number(participant.uid) === viewerUid);
    if (viewerPlayer) this.gameContext.applyViewerGoldAmount(viewerPlayer.gold);
  }
}

function validateSourceEnvelope(sourceEnvelope: SourceEnvelope): void {
  // 在信任网络数据前检查最小合同；data 即使为 null 也必须明确存在。
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

function encodeUtf8Base64(sourceText: string): string {
  // btoa 只接收 0–255 字节，因此先用 TextEncoder 把 Unicode 字符串变成 UTF-8 字节。
  const bytes = new TextEncoder().encode(sourceText);
  let binaryText = '';
  bytes.forEach((byte) => { binaryText += String.fromCharCode(byte); });
  return window.btoa(binaryText);
}

function decodeUtf8Base64(sourceFrame: string): string {
  // 与发送方向相反：atob 得到字节字符串，再由 TextDecoder 还原 UTF-8 JSON。
  const binaryText = window.atob(sourceFrame);
  const bytes = Uint8Array.from(binaryText, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
