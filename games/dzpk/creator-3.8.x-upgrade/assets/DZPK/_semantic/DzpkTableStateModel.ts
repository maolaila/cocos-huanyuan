/**
 * 学习导读：这是牌桌的“纯数据模型”，不操作 Cocos Node，也不播放动画。你可以把它理解成画面要
 * 展示的数据草稿：玩家坐哪、剩余筹码、当前下注、公共牌、底池、轮到谁。
 *
 * 数据来源全部是 GameHub 返回的原 `Msg_DZPK_*` 快照/事件；本模型不洗牌、不判断胜负、不扣真钱。
 * Controller 负责按事件更新它，Presentation 再把它画到原 Prefab。
 *
 * 本文件刻意不导入 `cc`：这让座位换算、下注预设等逻辑不依赖渲染引擎，更容易单独阅读和测试。
 */
export const SOURCE_TABLE_SEAT_COUNT = 6;
const SOURCE_BETTING_PROMPT_SECONDS = 15;

export const DZPK_TABLE_DISPLAY_CONFIG = {
  // 原倒计时、牌点数/花色图片命名映射；只用于显示，不是扑克牌规则计算表。
  betTime: SOURCE_BETTING_PROMPT_SECONDS,
  pokerColor: { 4: 'black', 3: 'red', 2: 'black', 1: 'red' } as Record<number, string>,
  pokerID: {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8',
    9: '9', 10: '10', 11: '11', 12: '12', 13: '13', 14: '1',
  } as Record<number, string>,
  pokerShape: {
    4: 'shape_spade', 3: 'shape_heart', 2: 'shape_club', 1: 'shape_diamond',
  } as Record<number, string>,
};

export const FUTURE_AUTHENTICATED_HUMAN_SEAT_LIMITS = {
  // 为未来 2–6 真人保留类型边界；当前版本仍只有 1 真人 + 机器人，不代表联机真人已实现。
  minimum: 2,
  maximum: SOURCE_TABLE_SEAT_COUNT,
};

export interface SourceParticipantSnapshot {
  // 单个玩家在原 source 消息中的字段。索引签名保留尚未显式建模的原字段，避免迁移时静默丢数据。
  uid?: string | number;
  seat?: number;
  l_seat?: number;
  nickname?: string;
  gold?: number;
  headimgurl?: string | number;
  cards?: number[];
  betGold?: number;
  act?: number;
  join?: boolean;
  [fieldName: string]: unknown;
}

export interface SourceActionState {
  act: number;
  gold: number;
}

export interface SourceActionNotice {
  uid?: string | number;
  minbet?: number;
  time?: number;
  deadline?: number;
  [fieldName: string]: unknown;
}

export interface SourceRoomSnapshot {
  // 一份 RoomInfo 可完整恢复牌桌画面的最小快照：玩家、公共牌、底池、行动、庄位和阶段。
  players?: SourceParticipantSnapshot[];
  publiccards?: number[];
  allbet?: number;
  notice?: SourceActionNotice | unknown[];
  level?: number;
  doublescore?: number;
  curbet?: Record<string, SourceActionState>;
  allbets?: Record<string, number>;
  bankeruid?: string | number;
  stage?: number;
  px?: Record<string, unknown>;
  [fieldName: string]: unknown;
}

export class DzpkParticipantState {
  // 字段名改为可读语义，`sourceValue` 仍可用原 uid/seat/gold 等名字访问，兼容旧调用。
  public participantId: string | number | null = null;
  public sourceSeatId = 0;
  public viewerLocalSeatId = 0;
  public displayName = '';
  public stackChips = 0;
  public avatarKey: string | number | null = null;
  public holeCards: number[] = [];
  public displayedStreetContributionChips = 0;
  public sourceActionCode = 0;
  public isParticipating = false;
  public readonly additionalSourceFields: Record<string, unknown> = {};

  public constructor(sourceParticipantSnapshot: SourceParticipantSnapshot = {}) {
    this.applySourceSnapshot(sourceParticipantSnapshot);
  }

  /**
   * 增量应用玩家快照：source 没传的字段保持原值；未知字段放进 additionalSourceFields。
   * 返回 this 便于“找到已有玩家后立即更新”的链式使用。
   */
  public applySourceSnapshot(snapshot: SourceParticipantSnapshot): this {
    if (snapshot.uid !== undefined) this.participantId = snapshot.uid;
    if (snapshot.seat !== undefined) this.sourceSeatId = snapshot.seat;
    if (snapshot.l_seat !== undefined) this.viewerLocalSeatId = snapshot.l_seat;
    if (snapshot.nickname !== undefined) this.displayName = snapshot.nickname;
    if (snapshot.gold !== undefined) this.stackChips = snapshot.gold;
    if (snapshot.headimgurl !== undefined) this.avatarKey = snapshot.headimgurl;
    if (snapshot.cards !== undefined) this.holeCards = safeCardArray(snapshot.cards);
    if (snapshot.betGold !== undefined) {
      this.displayedStreetContributionChips = snapshot.betGold;
    }
    if (snapshot.act !== undefined) this.sourceActionCode = snapshot.act;
    if (snapshot.join !== undefined) this.isParticipating = snapshot.join;
    Object.keys(snapshot).forEach((fieldName) => {
      if (!PARTICIPANT_SOURCE_FIELDS.has(fieldName)) {
        this.additionalSourceFields[fieldName] = snapshot[fieldName];
      }
    });
    return this;
  }

  /** 把原字段名和新的可读字段名都映射到同一数据，供通用查找使用。 */
  public sourceValue(fieldName: string): unknown {
    switch (fieldName) {
      case 'uid': case 'participantId': return this.participantId;
      case 'seat': case 'sourceSeatId': return this.sourceSeatId;
      case 'l_seat': case 'viewerLocalSeatId': return this.viewerLocalSeatId;
      case 'nickname': case 'displayName': return this.displayName;
      case 'gold': case 'stackChips': return this.stackChips;
      case 'headimgurl': case 'avatarKey': return this.avatarKey;
      case 'cards': case 'holeCards': return this.holeCards;
      case 'betGold': return this.displayedStreetContributionChips;
      case 'act': return this.sourceActionCode;
      case 'join': return this.isParticipating;
      default: return this.additionalSourceFields[fieldName];
    }
  }
}

/** 只保存当前观看者视角的投影；发牌和结算继续由服务端权威决定。 */
export class DzpkTableStateModel {
  public participants: DzpkParticipantState[] = [];
  public collectedPreviousStreetPotChips = 0;
  public viewerLocalSeatId = 0;
  public automaticActionSelections = [0, 0, 0];
  public callAmountChips = 0;
  public publicBoardCards: number[] = [];
  public totalPotChips = 0;
  public currentActionNotice: SourceActionNotice | unknown[] = [];
  public viewerSourceSeatId = 0;
  public viewerParticipant: DzpkParticipantState | null = null;
  public roomLevel = 0;
  public smallBlindChips = 0;
  public sourceActionsByParticipant: Record<string, SourceActionState> = {};
  public handContributionsByParticipant: Record<string, number> = {};
  public dealerParticipantId: string | number = 0;
  public sourceStageCode = 0;

  /**
   * 用一份 RoomInfo 整体重建模型。先找到当前 viewer 的 source seat，再把所有座位旋转成“自己永远在
   * 本地 0 号位”的视角；找不到自己说明快照与会话不一致，直接拒绝继续展示。
   */
  public initializeFromRoomSnapshot(
    roomSnapshot: SourceRoomSnapshot,
    viewerParticipantId: string | number,
  ): this {
    const sourceParticipants = Array.isArray(roomSnapshot.players) ? roomSnapshot.players : [];
    const viewerSourceParticipant = sourceParticipants.find((participant) =>
      sourceIdentityEquals(participant.uid, viewerParticipantId));
    if (!viewerSourceParticipant) {
      throw new Error('Room snapshot does not contain the current viewer participant');
    }
    this.publicBoardCards = safeCardArray(roomSnapshot.publiccards);
    this.totalPotChips = nonNegativeNumberOrDefault(roomSnapshot.allbet, 0);
    this.currentActionNotice = roomSnapshot.notice ?? [];
    this.viewerSourceSeatId = normalizeSourceSeatId(viewerSourceParticipant.seat);
    this.participants = [];
    this.viewerParticipant = null;
    sourceParticipants.forEach((sourceParticipant) => {
      const participant = this.addParticipantFromSourceSnapshot(sourceParticipant);
      if (sourceIdentityEquals(participant.participantId, viewerParticipantId)) {
        this.viewerParticipant = participant;
      }
    });
    this.roomLevel = numberOrDefault(roomSnapshot.level, 0);
    this.smallBlindChips = nonNegativeNumberOrDefault(roomSnapshot.doublescore, 0);
    this.sourceActionsByParticipant = roomSnapshot.curbet ?? {};
    this.handContributionsByParticipant = roomSnapshot.allbets ?? {};
    this.dealerParticipantId = roomSnapshot.bankeruid ?? 0;
    this.sourceStageCode = numberOrDefault(roomSnapshot.stage, 0);
    return this;
  }

  /** 新增玩家并计算相对 viewer 的本地座位；source seat 必须存在。 */
  public addParticipantFromSourceSnapshot(
    sourceParticipantSnapshot: SourceParticipantSnapshot,
  ): DzpkParticipantState {
    if (sourceParticipantSnapshot.seat === undefined) {
      throw new Error('Source participant seat is required');
    }
    const participant = new DzpkParticipantState(sourceParticipantSnapshot);
    participant.viewerLocalSeatId = sourceSeatToViewerLocalSeat(
      normalizeSourceSeatId(participant.sourceSeatId),
      this.viewerSourceSeatId,
    );
    this.participants.push(participant);
    return participant;
  }

  /** 按 source 或语义字段查玩家，身份比较允许 number/string 表示同一 UID。 */
  public findParticipantByProperty(
    propertyName: string,
    expectedValue: unknown,
  ): DzpkParticipantState | undefined {
    return this.participants.find((participant) =>
      sourceIdentityEquals(participant.sourceValue(propertyName), expectedValue));
  }

  /** 必须找到玩家的版本；用于后续逻辑不能容忍缺席的场景。 */
  public findParticipantById(participantId: unknown): DzpkParticipantState {
    const participant = this.findParticipantByIdIfPresent(participantId);
    if (!participant) throw new Error(`DZPK participant not found: ${String(participantId)}`);
    return participant;
  }

  /** 可选查找版本；迟到事件或玩家刚离桌时允许返回 undefined。 */
  public findParticipantByIdIfPresent(participantId: unknown): DzpkParticipantState | undefined {
    return this.participants.find((participant) =>
      sourceIdentityEquals(participant.participantId, participantId));
  }

  /** 翻牌后原快捷按钮：半池、2/3 池、满池，向上取整成整数筹码。 */
  public calculatePostflopPotPresetContributions(potChips = this.totalPotChips): number[] {
    const resolvedPot = nonNegativeNumberOrDefault(potChips, this.totalPotChips);
    return [Math.ceil(resolvedPot * 0.5), Math.ceil(resolvedPot * (2 / 3)), resolvedPot];
  }

  /** 翻牌前原快捷按钮：6/8 个小盲及当前底池。 */
  public calculatePreflopBlindPresetContributions(
    smallBlindChips = this.smallBlindChips,
    potChips = this.totalPotChips,
  ): number[] {
    const blind = nonNegativeNumberOrDefault(smallBlindChips, this.smallBlindChips);
    const pot = nonNegativeNumberOrDefault(potChips, this.totalPotChips);
    return [6 * blind, 8 * blind, pot];
  }

  /**
   * 加注面板五个固定盲注倍率和最低合法加注。最后一项供滑杆/提交按钮作为下界，且不超过自己筹码。
   */
  public calculateRaiseSelectionPresetContributions(
    callAmountChips = this.callAmountChips,
    viewerStackChips = this.viewerParticipant?.stackChips ?? 0,
    smallBlindChips = this.smallBlindChips,
  ): number[] {
    const blind = nonNegativeNumberOrDefault(smallBlindChips, this.smallBlindChips);
    const call = nonNegativeNumberOrDefault(callAmountChips, this.callAmountChips);
    const stack = nonNegativeNumberOrDefault(viewerStackChips, 0);
    const minimumRaise = Math.ceil(2 * blind + call);
    return [20 * blind, 40 * blind, 100 * blind, 200 * blind, 400 * blind,
      Math.min(minimumRaise, stack)];
  }

  public maximumNumericValue(
    valuesByKey: Record<string, unknown> | readonly number[],
    defaultMaximum = 0,
  ): number {
    return maximumNumericValue(valuesByKey, defaultMaximum);
  }

  /**
   * 未来真人座位协议的故意空白门：当前若有人误调用会明确报未实现，而不是悄悄伪造多人联机。
   */
  public applyAuthenticatedHumanSeatDelta(_seatDelta: unknown): never {
    throw new Error('MULTI_HUMAN_ONLINE_NOT_IMPLEMENTED_IN_CREATOR_3_8_UPGRADE');
  }
}

export function sourceSeatToViewerLocalSeat(
  sourceSeatId: number,
  viewerSourceSeatId: number,
  seatCount = SOURCE_TABLE_SEAT_COUNT,
): number {
  // 环形座位换算：viewer 的 source seat 减去自身后变 0，其余按六座顺时针排列。
  if (!Number.isInteger(seatCount) || seatCount < 2) {
    throw new Error('Seat count must be an integer of at least two');
  }
  if (!Number.isInteger(sourceSeatId) || !Number.isInteger(viewerSourceSeatId)) {
    throw new Error('Source and viewer seats must be integers');
  }
  return ((sourceSeatId - viewerSourceSeatId) % seatCount + seatCount) % seatCount;
}

export function maximumNumericValue(
  valuesByKey: Record<string, unknown> | readonly number[] | null | undefined,
  defaultMaximum = 0,
): number {
  // 安全忽略 NaN/非数字，常用于从各玩家本轮下注中找当前最高额。
  let resolvedMaximum = numberOrDefault(defaultMaximum, 0);
  if (!valuesByKey) return resolvedMaximum;
  Object.values(valuesByKey).forEach((rawValue) => {
    const candidateValue = Number(rawValue);
    if (Number.isFinite(candidateValue) && candidateValue > resolvedMaximum) {
      resolvedMaximum = candidateValue;
    }
  });
  return resolvedMaximum;
}

export function sourceIdentityEquals(leftValue: unknown, rightValue: unknown): boolean {
  // source 消息可能一处发 123、一处发 "123"；只在双方非空时允许字符串化相等。
  if (leftValue === rightValue) return true;
  if (leftValue === null || leftValue === undefined) return false;
  if (rightValue === null || rightValue === undefined) return false;
  return String(leftValue) === String(rightValue);
}

function normalizeSourceSeatId(sourceSeatId: unknown): number {
  // 原桌固定 0–5 六个 source seat，越界意味着后端/快照合同错误。
  const numericSeatId = Number(sourceSeatId);
  if (!Number.isInteger(numericSeatId) || numericSeatId < 0 || numericSeatId >= SOURCE_TABLE_SEAT_COUNT) {
    throw new Error('Source seat must be an integer from zero to five');
  }
  return numericSeatId;
}

function safeCardArray(cards: unknown): number[] {
  return Array.isArray(cards)
    ? cards.map(Number).filter((card) => Number.isInteger(card) && card > 0)
    : [];
}

function numberOrDefault(value: unknown, defaultValue: number): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : defaultValue;
}

function nonNegativeNumberOrDefault(value: unknown, defaultValue: number): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : defaultValue;
}

const PARTICIPANT_SOURCE_FIELDS = new Set([
  // 已显式建模的原字段；其余字段被保存到 additionalSourceFields，便于后续恢复功能时追查。
  'uid', 'seat', 'l_seat', 'nickname', 'gold', 'headimgurl', 'cards', 'betGold',
  'act', 'join',
]);
