import { DzpkEventBus } from './DzpkEventBus';
import { GameContext } from './GameContext';
import { DzpkUiMessageService } from './DzpkUiMessageService';

const SOURCE_ERROR_EVENT_NAME = 'Msg_GameHub_Error';

export interface SourceEnvelope<T = unknown> {
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

/** Encodes and projects the original KG Base64 JSON envelope. */
export class SourceProtocolAdapter {
  public constructor(
    private readonly gameContext: GameContext,
    private readonly eventBus: DzpkEventBus,
    private readonly uiMessageService: DzpkUiMessageService,
  ) {}

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
  const bytes = new TextEncoder().encode(sourceText);
  let binaryText = '';
  bytes.forEach((byte) => { binaryText += String.fromCharCode(byte); });
  return window.btoa(binaryText);
}

function decodeUtf8Base64(sourceFrame: string): string {
  const binaryText = window.atob(sourceFrame);
  const bytes = Uint8Array.from(binaryText, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
