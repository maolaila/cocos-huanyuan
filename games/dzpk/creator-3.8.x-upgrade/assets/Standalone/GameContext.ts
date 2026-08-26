export const DZPK_CLIENT_GAME_ID = 19;
export const DZPK_GAME_CODE = 'dzpk-955';
export const DZPK_BUNDLE_NAME = 'DZPK';

export interface AuthenticatedGameContext {
  gameCode: string;
  mode: 'TRIAL' | 'REAL';
  sessionId: string;
  sessionToken?: string;
  platformPlayerId?: string | number | null;
  merchantPlayerId?: string | null;
  wallet: { mainBalance: number | string };
  sdkConfig: { postMessageTargetOrigin?: string | null };
}

export interface ViewerProfile {
  uid: number;
  rid: string | number | null;
  gold: number;
  bank: number;
  headimgurl: number | string;
  nickname: string;
  [profileKey: string]: unknown;
}

export interface DzpkGameDefinition {
  gameCode: string;
  prefabUrl: string;
  zhName: string;
  enName: string;
  music: string;
  table: boolean;
  loadMaxSpeed: boolean;
  noticePos1: { x: number; y: number };
  noticePos2: { x: number; y: number };
}

/** Viewer-safe runtime context shared by the migrated 3.8 components. */
export class GameContext {
  public readonly gameID = DZPK_CLIENT_GAME_ID;
  public roomID: string | number | null = null;
  public roomLevel = 2;
  public roomConfig: Record<string, unknown> = {};
  public isReconnect = false;
  public readonly allVersion = { Main: '3.8.8-upgrade-in-progress' };
  public isNightMode = false;
  public postMessageTargetOrigin = '';

  private readonly viewerProfile: ViewerProfile = {
    uid: 0,
    rid: null,
    gold: 0,
    bank: 0,
    headimgurl: 7,
    nickname: '学习玩家',
  };

  private readonly gameDefinition: DzpkGameDefinition = {
    gameCode: DZPK_GAME_CODE,
    prefabUrl: 'prefab/DZPKMain',
    zhName: '德州扑克',
    enName: DZPK_BUNDLE_NAME,
    music: 'sound/back',
    table: false,
    loadMaxSpeed: false,
    noticePos1: { x: 0, y: 294 },
    noticePos2: { x: -195, y: 300 },
  };

  public applyAuthenticatedContext(authenticatedContext: AuthenticatedGameContext): void {
    const sourceIdentity = authenticatedContext.platformPlayerId
      ?? authenticatedContext.merchantPlayerId
      ?? authenticatedContext.sessionId;
    const numericSourceUid = Number(sourceIdentity);
    this.viewerProfile.uid = Number.isSafeInteger(numericSourceUid) && numericSourceUid > 0
      ? numericSourceUid
      : deriveStableSourceUid(String(sourceIdentity));
    this.viewerProfile.gold = normalizeSourceChipAmount(authenticatedContext.wallet.mainBalance);
    this.viewerProfile.nickname = String(
      authenticatedContext.merchantPlayerId
      ?? authenticatedContext.platformPlayerId
      ?? '学习玩家',
    ).slice(0, 20);
    this.postMessageTargetOrigin = authenticatedContext.sdkConfig.postMessageTargetOrigin ?? '';
  }

  public applyRoomIdentifier(roomId: string | number | null): void {
    this.roomID = roomId;
    this.viewerProfile.rid = roomId;
  }

  public applyViewerGoldAmount(goldAmount: unknown): void {
    this.viewerProfile.gold = normalizeSourceChipAmount(goldAmount);
  }

  public getKey<T = unknown>(profileKey: string): T {
    return this.viewerProfile[profileKey] as T;
  }

  public setKey(profileKey: string, profileValue: unknown): void {
    this.viewerProfile[profileKey] = profileValue;
    if (profileKey === 'rid') this.roomID = profileValue as string | number | null;
  }

  public getGame(): DzpkGameDefinition {
    return this.gameDefinition;
  }

  public getGameName(): string {
    return DZPK_BUNDLE_NAME;
  }

  public gameRepair(): boolean {
    return false;
  }

  public getDayNightRecommendation(): 0 | 1 {
    return new Date().getHours() >= 18 ? 1 : 0;
  }

  public setDayNightMode(isNightMode: boolean): void {
    this.isNightMode = isNightMode;
  }
}

function normalizeSourceChipAmount(chipAmount: unknown): number {
  const numericChipAmount = Number(chipAmount);
  if (!Number.isFinite(numericChipAmount) || numericChipAmount < 0) return 0;
  return Math.floor(numericChipAmount);
}

function deriveStableSourceUid(identityText: string): number {
  let sourceUid = 17;
  for (let characterIndex = 0; characterIndex < identityText.length; characterIndex += 1) {
    sourceUid = (sourceUid * 31 + identityText.charCodeAt(characterIndex)) % 2_000_000_000;
  }
  return Math.max(1, sourceUid);
}
