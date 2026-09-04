/**
 * 学习导读：这里保存“当前玩家和当前游戏的客户端上下文”。原 KG 大厅过去通过全局对象提供这些
 * 数据；独立 3.8 工程改为一个明确实例，让每个值从哪里来、什么时候更新都能追踪。
 *
 * 这个文件不直接导入 Cocos API，也不操作节点。它位于网络与画面之间：
 * - `context/init` 成功后写入 mode、币种、语言、玩家、精确钱包和父页面 Origin；
 * - Hall/Room/Table 原版事件继续更新 rid、roomLevel 和桌上整数筹码；
 * - Room/Set/Presentation 只读取这些值来显示。
 *
 * 重要边界：GameHub 钱包保留最多六位小数的字符串事实；KG 牌桌事件使用整数筹码。显示层可以缩写，
 * 但绝不能把缩写后的文字写回这里当作真钱。
 */
export const DZPK_CLIENT_GAME_ID = 19;
export const DZPK_GAME_CODE = 'dzpk-955';
export const DZPK_BUNDLE_NAME = 'DZPK';

export interface AuthenticatedGameContext {
  // GameHub `/gameapi/v1/context/init` 返回给已认证游戏客户端的最小上下文。
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
  // 为兼容原组件的 getKey/setKey 访问方式，保留 uid/rid/gold/bank/headimgurl/nickname 键。
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
  // 原大厅游戏定义中 DZPK 真正运行所需的部分；不包含可见大厅 UI。
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

/** 迁移后组件共享、且只包含玩家可见信息的运行上下文。 */
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

  /**
   * 应用 GameHub 认证结果。
   * `TRANSFER` 钱包读 gameBalance，其余读 mainBalance；UID 不能安全转成正整数时，用身份文本稳定派生
   * 一个客户端协议 UID。派生 UID 只为兼容 source envelope，真正身份仍由服务端 session 认证。
   */
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
    // KG 牌桌协议是整数筹码，GameHub 钱包是 decimal(20,6)。RoomInfo 到来前先保留精确钱包文本。
    this.viewerProfile.gold = normalizeGameHubWalletBalance(effectiveBalance);
    this.viewerProfile.nickname = resolveViewerDisplayName(
      authenticatedContext.nickname
      ?? authenticatedContext.merchantPlayerId
      ?? authenticatedContext.platformPlayerId,
      this.language,
    );
    this.postMessageTargetOrigin = authenticatedContext.sdkConfig.postMessageTargetOrigin ?? '';
  }

  /**
   * 保存服务端发布的三房间配置。TRIAL 使用学习筹码：若通用试玩余额低于所有原房间门槛，只把
   * Room 的可进入显示提升到最高门槛；第一份 RoomInfo 会用权威桌上筹码覆盖，REAL 完全不走此桥接。
   */
  public applyRoomConfiguration(roomConfiguration: Record<string, unknown>): void {
    this.roomConfig = roomConfiguration;
    if (this.mode !== 'TRIAL') return;

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

  /** 同步上下文 roomID 和原 ViewerProfile.rid；退出成功时传 null。 */
  public applyRoomIdentifier(roomId: string | number | null): void {
    this.roomID = roomId;
    this.viewerProfile.rid = roomId;
  }

  /** Room/Table source 事件中的 gold 是整数桌上筹码，因此在这里校验并向下取整。 */
  public applyViewerGoldAmount(goldAmount: unknown): void {
    this.viewerProfile.gold = normalizeSourceChipAmount(goldAmount);
  }

  /** 保留旧组件 `getKey('gold')` 风格，同时用泛型让调用处声明期望类型。 */
  public getKey<T = unknown>(profileKey: string): T {
    return this.viewerProfile[profileKey] as T;
  }

  /** 保留旧写法；写 rid 时必须同步新的显式 `roomID` 字段。 */
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

  /** 原大厅维护判断的兼容面；当前游戏维护由 GameHub 启动/配置层控制，因此本地不额外拦截。 */
  public gameRepair(): boolean {
    return false;
  }

  /** 原自动昼夜规则：本地时间 18 点后推荐夜间；0=白天，1=夜间。 */
  public getDayNightRecommendation(): 0 | 1 {
    return new Date().getHours() >= 18 ? 1 : 0;
  }

  public setDayNightMode(isNightMode: boolean): void {
    this.isNightMode = isNightMode;
  }
}

function normalizeSourceChipAmount(chipAmount: unknown): number {
  // 牌桌筹码拒绝负数/NaN，并保持 source 的整数语义。
  const numericChipAmount = Number(chipAmount);
  if (!Number.isFinite(numericChipAmount) || numericChipAmount < 0) return 0;
  return Math.floor(numericChipAmount);
}

function normalizeGameHubWalletBalance(walletBalance: unknown): string {
  // 用字符串保留 decimal(20,6)，避免 JS 浮点数在大额钱包上产生精度误差。
  const normalizedText = String(walletBalance ?? '').trim();
  return /^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(normalizedText) ? normalizedText : '0';
}

function normalizeCurrencyCode(currencyCode: unknown): string {
  const normalizedCode = String(currencyCode ?? '').trim().toUpperCase();
  return normalizedCode || 'CNY';
}

function resolveViewerDisplayName(identityValue: unknown, language: string): string {
  // 不把 plr_/sid_ 等内部机器 ID 暴露到原版窄昵称栏；真实昵称仍保留并限制异常超长输入。
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
  // 简单稳定哈希：同一身份每次得到同一正整数，且控制在 JS 安全整数和 source UID 范围内。
  let sourceUid = 17;
  for (let characterIndex = 0; characterIndex < identityText.length; characterIndex += 1) {
    sourceUid = (sourceUid * 31 + identityText.charCodeAt(characterIndex)) % 2_000_000_000;
  }
  return Math.max(1, sourceUid);
}
