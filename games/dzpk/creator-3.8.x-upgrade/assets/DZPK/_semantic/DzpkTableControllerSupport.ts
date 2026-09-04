/**
 * 学习导读：Table Controller 的纯函数辅助层。它把不需要 Cocos 节点的“输入清洗、身份匹配、底池
 * 结算投影、金额校验”从大控制器拆出来，方便独立理解。
 *
 * 本文件也不导入 `cc`。所有输入都视为网络边界数据：可能缺字段、类型不一致或重复，因此先规范化，
 * 再交给画面。这里绝不重新判断扑克胜负；结算 winners/pots 仍以服务端为准。
 * `import type` 只用于 TypeScript 编译检查，构建后的 JavaScript 不会加载该模块值。
 */
import {
  DzpkParticipantState,
  DzpkTableStateModel,
  SourceActionState,
  SourceRoomSnapshot,
  sourceIdentityEquals,
} from './DzpkTableStateModel';
import type { DzpkSettlementPresentation } from './DzpkTablePresentationTypes';

export const SOURCE_STAGE = { WAITING: 0, DEALING: 1, BETTING: 2, RESULT: 3 } as const;
// 事件中的原动作码：3 加注、4 跟注/过牌、5 弃牌、6 All-in。保留数字是协议兼容，不是魔法猜测。
export const SOURCE_ACTION = { RAISE: 3, CALL_OR_CHECK: 4, FOLD: 5, ALL_IN: 6 } as const;

export type SourceRecord = Record<string, unknown>;
export type SourceIdentity = string | number;

export interface DealPayload extends SourceRecord {
  ingame?: SourceIdentity[];
  bankeruid?: SourceIdentity;
  cards?: number[];
}

export interface ActionPayload extends SourceRecord {
  uid?: SourceIdentity;
  act?: number;
  gold?: number;
}

export interface SettlementCardProjection extends SourceRecord {
  hcards?: number[];
  cards?: number[];
  value?: string;
}

export interface SourcePotLayer extends SourceRecord {
  awards?: Record<string, unknown>;
  uncalledReturn?: boolean;
}

export interface SettlementPayload extends SourceRecord {
  handId?: SourceIdentity;
  revision?: number;
  winner?: SourceIdentity;
  winners?: SourceIdentity[];
  wingold?: number;
  upgold?: Record<string, unknown>;
  usergold?: Record<string, unknown>;
  uncalledReturns?: Record<string, unknown>;
  pots?: SourcePotLayer[];
  cards?: Record<string, SettlementCardProjection>;
}

/**
 * 深度足够的快照副本：复制 players/cards/下注 Map，防止 Controller 改显示状态时污染原 envelope。
 * 旧快照在首轮下注阶段可能只有 allbets；这里补成 curbet 供统一画面恢复。
 */
export function normalizeRoomSnapshot(roomSnapshot: SourceRoomSnapshot): SourceRoomSnapshot {
  const normalized: SourceRoomSnapshot = { ...roomSnapshot };
  normalized.players = Array.isArray(roomSnapshot.players)
    ? roomSnapshot.players.map((participant) => ({ ...participant, cards: safeCardArray(participant.cards) }))
    : [];
  normalized.publiccards = safeCardArray(roomSnapshot.publiccards);
  normalized.curbet = cloneIdentityMap(roomSnapshot.curbet) as Record<string, SourceActionState>;
  normalized.allbets = cloneIdentityMap(roomSnapshot.allbets) as Record<string, number>;
  normalized.allbet = nonNegativeChipAmount(roomSnapshot.allbet);
  normalized.stage = Number(roomSnapshot.stage) || 0;
  if (normalized.publiccards.length === 0 && normalized.stage === SOURCE_STAGE.BETTING) {
    Object.keys(normalized.allbets).forEach((participantId) => {
      if (!normalized.curbet![participantId]) {
        normalized.curbet![participantId] = {
          act: 0,
          gold: nonNegativeChipAmount(normalized.allbets![participantId]),
        };
      } else if (normalized.curbet![participantId].gold === undefined) {
        normalized.curbet![participantId].gold = nonNegativeChipAmount(normalized.allbets![participantId]);
      }
    });
  }
  return normalized;
}

/** 从以 UID 为键的 Map 安全读取动作；缺失时返回 `{act:0,gold:0}`，让调用处无需反复判空。 */
export function readParticipantSourceAction(
  actionsByParticipant: Record<string, SourceActionState> | undefined,
  participantId: SourceIdentity | null,
): SourceActionState {
  const sourceAction = readIdentityMapValue(
    actionsByParticipant,
    participantId,
  ) as SourceActionState | undefined;
  return { act: Number(sourceAction?.act) || 0, gold: nonNegativeChipAmount(sourceAction?.gold) };
}

/** 判断快照中玩家是否属于当前手：等待阶段无人参局；弃牌玩家仍属于本手，只是已 fold。 */
export function participantParticipatesInSnapshot(
  participant: DzpkParticipantState,
  sourceStageCode: number,
): boolean {
  if (sourceStageCode === SOURCE_STAGE.WAITING) return false;
  if (participant.sourceActionCode === SOURCE_ACTION.FOLD) return true;
  return participant.holeCards.length > 0;
}

/** 原图片字把“过牌”表示成特殊 `3_0`：同一 CALL_OR_CHECK 动作码、金额为 0 时使用它。 */
export function sourceActionBadgeCode(sourceAction: SourceActionState): number | string {
  return sourceAction.act === SOURCE_ACTION.CALL_OR_CHECK && sourceAction.gold === 0
    ? '3_0'
    : sourceAction.act;
}

/** 按旋转后的 viewer 本地座位找玩家，供发牌动画按屏幕座次循环。 */
export function findParticipantByLocalSeat(
  tableStateModel: DzpkTableStateModel,
  localSeat: number,
): DzpkParticipantState | undefined {
  return tableStateModel.participants.find((participant) => participant.viewerLocalSeatId === localSeat);
}

/** 汇总还摆在每个座位前、尚未飞入中央底池的本轮筹码。 */
export function sumVisibleStreetWagers(participants: readonly DzpkParticipantState[]): number {
  return participants.reduce(
    (total, participant) => total + nonNegativeChipAmount(participant.displayedStreetContributionChips),
    0,
  );
}

/**
 * 把服务端结算投影成表现层容易消费的结构：
 * - 普通 pot awards 计入 payout；`uncalledReturn` 计入无人跟注退回；
 * - 老版本没有 pots 时回退到 upgold/wingold；
 * - 同时冻结 UID -> 本地座位映射，供飞筹码动画找到终点。
 * 这只是读取权威结果，不在客户端重新分池或选赢家。
 */
export function createSettlementPresentation(
  tableStateModel: DzpkTableStateModel,
  settlementPayload: SettlementPayload,
): DzpkSettlementPresentation {
  const sourcePotLayers = Array.isArray(settlementPayload.pots) ? settlementPayload.pots.slice() : [];
  const winningParticipantUids = uniqueSourceIdentities(
    Array.isArray(settlementPayload.winners)
      ? settlementPayload.winners
      : settlementPayload.winner === undefined ? [] : [settlementPayload.winner],
  );
  const primaryWinnerUid = normalizeSourceIdentity(settlementPayload.winner ?? winningParticipantUids[0]);
  if (primaryWinnerUid && !winningParticipantUids.includes(primaryWinnerUid)) {
    winningParticipantUids.unshift(primaryWinnerUid);
  }
  const payoutAmountByUid: Record<string, number> = {};
  const returnAmountByUid: Record<string, number> = {};
  sourcePotLayers.forEach((sourcePotLayer) => {
    Object.keys(sourcePotLayer.awards ?? {}).forEach((participantId) => {
      const participantKey = normalizeSourceIdentity(participantId);
      const awardAmount = nonNegativeChipAmount(sourcePotLayer.awards?.[participantId]);
      const destination = sourcePotLayer.uncalledReturn ? returnAmountByUid : payoutAmountByUid;
      destination[participantKey] = (destination[participantKey] ?? 0) + awardAmount;
    });
  });
  Object.keys(settlementPayload.uncalledReturns ?? {}).forEach((participantId) => {
    returnAmountByUid[normalizeSourceIdentity(participantId)] = nonNegativeChipAmount(
      settlementPayload.uncalledReturns?.[participantId],
    );
  });
  if (Object.keys(payoutAmountByUid).length === 0) {
    winningParticipantUids.forEach((participantId) => {
      payoutAmountByUid[participantId] = nonNegativeChipAmount(
        readIdentityMapValue(settlementPayload.upgold, participantId),
      );
    });
    if (primaryWinnerUid && payoutAmountByUid[primaryWinnerUid] === 0) {
      payoutAmountByUid[primaryWinnerUid] = nonNegativeChipAmount(settlementPayload.wingold);
    }
  }
  const localSeatByUid: Record<string, number> = {};
  tableStateModel.participants.forEach((participant) => {
    localSeatByUid[normalizeSourceIdentity(participant.participantId)] = participant.viewerLocalSeatId;
  });
  return {
    primaryWinnerUid,
    winningParticipantUids,
    payoutAmountByUid,
    returnAmountByUid,
    localSeatByUid,
    sourcePotLayers,
  };
}

/**
 * 提取会改变结算画面的字段生成指纹，用于忽略重放的同一 Result；JSON 失败时返回空串而不误去重。
 */
export function settlementFingerprint(settlementPayload: SettlementPayload): string {
  try {
    return JSON.stringify({
      handId: settlementPayload.handId,
      revision: settlementPayload.revision,
      winner: settlementPayload.winner,
      winners: settlementPayload.winners,
      usergold: settlementPayload.usergold,
      pots: settlementPayload.pots,
      cards: settlementPayload.cards,
    });
  } catch {
    return '';
  }
}

/**
 * source 的对象键永远是字符串，但调用处 UID 可能是 number；先直取，再按规范化身份扫描匹配。
 */
export function readIdentityMapValue(
  valuesByIdentity: Record<string, unknown> | undefined,
  participantId: unknown,
): unknown {
  if (!valuesByIdentity || participantId === null || participantId === undefined) return undefined;
  const directKey = String(participantId);
  if (Object.prototype.hasOwnProperty.call(valuesByIdentity, directKey)) return valuesByIdentity[directKey];
  const normalizedId = normalizeSourceIdentity(participantId);
  const matchingKey = Object.keys(valuesByIdentity).find((candidateKey) =>
    normalizeSourceIdentity(candidateKey) === normalizedId);
  return matchingKey === undefined ? undefined : valuesByIdentity[matchingKey];
}

/** 使用 sourceIdentityEquals 判断列表是否包含 UID，兼容 `123` 和 `"123"`。 */
export function identityListContains(identityList: SourceIdentity[], participantId: unknown): boolean {
  return identityList.some((candidateId) => sourceIdentityEquals(candidateId, participantId));
}

export function normalizeSourceIdentity(sourceIdentity: unknown): string {
  return sourceIdentity === null || sourceIdentity === undefined ? '' : String(sourceIdentity);
}

/** 只保留正整数牌码，过滤网络中的 null、字符串垃圾或非法值。 */
export function safeCardArray(cards: unknown): number[] {
  return Array.isArray(cards)
    ? cards.map(Number).filter((card) => Number.isInteger(card) && card > 0)
    : [];
}

/** 把网络金额规范成非负整数筹码；负数/NaN 均为 0。 */
export function nonNegativeChipAmount(value: unknown): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? Math.floor(numericValue) : 0;
}

/**
 * 把离桌 GameHub 钱包规范成固定六位小数字符串。超过 JS 安全整数就拒绝，避免 Number 精度悄悄丢失。
 */
export function canonicalNonNegativeWalletAmount(value: unknown): string {
  const raw = typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(6)
    : String(value ?? '').trim();
  const match = /^(\d+)(?:\.(\d{1,6}))?$/.exec(raw);
  if (!match || Number(match[1]) > Number.MAX_SAFE_INTEGER) {
    throw new Error('DZPK wallet balance projection is invalid');
  }
  return `${match[1]}.${(match[2] ?? '').padEnd(6, '0')}`;
}

/** 动作增量只有严格大于 0 才生效；过牌/弃牌的 0 或 -1 不会误加到底池。 */
export function positiveChipAmountOrZero(value: unknown): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : 0;
}

/** 校验 Prefab 传来的按钮索引，防止越界读取错误加注档位。 */
export function requireArrayIndex(indexValue: unknown, arrayLength: number): number {
  const index = Number(indexValue);
  if (!Number.isInteger(index) || index < 0 || index >= arrayLength) {
    throw new Error('DZPK button preset index is invalid');
  }
  return index;
}

/** 按原 12 头像编号选择男/女语音目录；只影响表现声音。 */
export function sourceVoiceFolder(avatarKey: unknown): 'young_woman' | 'young_man' {
  const numericAvatarKey = Number(avatarKey);
  return Number.isFinite(numericAvatarKey) && numericAvatarKey % 12 < 6
    ? 'young_woman'
    : 'young_man';
}

/** 网络值只有“非数组对象”才可当字段 Map，其余统一给空对象。 */
export function asSourceRecord(value: unknown): SourceRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as SourceRecord
    : {};
}

function cloneIdentityMap(sourceMap: unknown): SourceRecord {
  // 对每个一级对象值再浅拷贝一层，足够隔离 curbet/allbets 的动作小对象。
  const clone: SourceRecord = {};
  const record = asSourceRecord(sourceMap);
  Object.keys(record).forEach((identityKey) => {
    const value = record[identityKey];
    clone[identityKey] = value && typeof value === 'object' && !Array.isArray(value)
      ? { ...(value as SourceRecord) }
      : value;
  });
  return clone;
}

function uniqueSourceIdentities(sourceIdentities: SourceIdentity[]): string[] {
  // Set 只用于去重，保留原 winners 顺序；空身份被过滤。
  const seen = new Set<string>();
  return sourceIdentities.map(normalizeSourceIdentity).filter((sourceIdentity) => {
    if (!sourceIdentity || seen.has(sourceIdentity)) return false;
    seen.add(sourceIdentity);
    return true;
  });
}
