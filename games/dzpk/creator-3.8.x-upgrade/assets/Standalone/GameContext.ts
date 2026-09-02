export const DZPK_CLIENT_GAME_ID = 19;
export const DZPK_GAME_CODE = 'dzpk-955';
export const DZPK_BUNDLE_NAME = 'DZPK';

export interface AuthenticatedGameContext {
  gameCode: string;
  mode: 'TRIAL' | 'REAL';
  sessionId: string;
  sessionToken?: string;
  walletMode?: 'SINGLE' | 'TRANSFER' | null;
  currency?: string;
  language?: string;
  platformPlayerId?: string | number | null;
  merchantPlayerId?: string | null;
  nickname?: string | null;
  wallet: {
    mainBalance: number | string;
    gameBalance?: number | string | null;
  };
  sdkConfig: { postMessageTargetOrigin?: string | null };
}

export interface ViewerProfile {
  uid: number;
  rid: string | number | null;
  /** Exact GameHub wallet text in the room view; source table events remain integer chips. */
  gold: number | string;
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
  public mode: AuthenticatedGameContext['mode'] = 'TRIAL';
  public currency = 'CNY';
  public language = 'zh-CN';
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
    this.mode = authenticatedContext.mode;
    this.currency = normalizeCurrencyCode(authenticatedContext.currency);
    this.language = String(authenticatedContext.language ?? 'zh-CN');
    const sourceIdentity = authenticatedContext.platformPlayerId
      ?? authenticatedContext.merchantPlayerId
      ?? authenticatedContext.sessionId;
    const numericSourceUid = Number(sourceIdentity);
    this.viewerProfile.uid = Number.isSafeInteger(numericSourceUid) && numericSourceUid > 0
      ? numericSourceUid
      : deriveStableSourceUid(String(sourceIdentity));
    const effectiveBalance = authenticatedContext.walletMode === 'TRANSFER'
      ? (authenticatedContext.wallet.gameBalance ?? authenticatedContext.wallet.mainBalance)
      : authenticatedContext.wallet.mainBalance;
    // The KG table protocol is integer-chip based, but a GameHub wallet is decimal(20,6).
    // Keep the authenticated wallet fact exact until a source table snapshot supplies chips.
    this.viewerProfile.gold = normalizeGameHubWalletBalance(effectiveBalance);
    this.viewerProfile.nickname = resolveViewerDisplayName(
      authenticatedContext.nickname
      ?? authenticatedContext.merchantPlayerId
      ?? authenticatedContext.platformPlayerId,
      this.language,
    );
    this.postMessageTargetOrigin = authenticatedContext.sdkConfig.postMessageTargetOrigin ?? '';
  }

  public applyRoomConfiguration(roomConfiguration: Record<string, unknown>): void {
    this.roomConfig = roomConfiguration;
    if (this.mode !== 'TRIAL') return;

    // DZPK TRIAL uses the source study-chip authority, not GameHub's generic
    // 1,000-unit trial wallet. Seed the Room-only affordability check from the
    // published source rooms so every original room remains selectable; the
    // first RoomInfo snapshot then replaces this with the authoritative stack.
    const highestMinimumEntry = Object.values(roomConfiguration).reduce(
      (highestMinimum, candidate) => {
        if (!candidate || typeof candidate !== 'object') return highestMinimum;
        const minimumEntry = Number((candidate as { min_gold?: unknown }).min_gold);
        return Number.isFinite(minimumEntry)
          ? Math.max(highestMinimum, minimumEntry)
          : highestMinimum;
      },
      0,
    );
    const currentGold = Number(this.viewerProfile.gold);
    if (highestMinimumEntry > 0 && (!Number.isFinite(currentGold) || currentGold < highestMinimumEntry)) {
      this.viewerProfile.gold = highestMinimumEntry;
    }
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

function normalizeGameHubWalletBalance(walletBalance: unknown): string {
  const normalizedText = String(walletBalance ?? '').trim();
  return /^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(normalizedText) ? normalizedText : '0';
}

function normalizeCurrencyCode(currencyCode: unknown): string {
  const normalizedCode = String(currencyCode ?? '').trim().toUpperCase();
  return normalizedCode || 'CNY';
}

function resolveViewerDisplayName(identityValue: unknown, language: string): string {
  const identityText = String(identityValue ?? '').trim();
  if (identityText && !isMachineGeneratedIdentity(identityText)) return identityText.slice(0, 40);
  const normalizedLanguage = language.toLowerCase();
  if (normalizedLanguage.startsWith('vi')) return 'Người chơi';
  if (normalizedLanguage.startsWith('zh')) return '玩家';
  return 'Player';
}

function isMachineGeneratedIdentity(identityText: string): boolean {
  return /^(?:plr|pp|sid)_[A-Za-z0-9_-]{12,}$/.test(identityText)
    || /^[0-9a-f]{24,}$/i.test(identityText);
}

function deriveStableSourceUid(identityText: string): number {
  let sourceUid = 17;
  for (let characterIndex = 0; characterIndex < identityText.length; characterIndex += 1) {
    sourceUid = (sourceUid * 31 + identityText.charCodeAt(characterIndex)) % 2_000_000_000;
  }
  return Math.max(1, sourceUid);
}
