import {
  DzpkParticipantState,
  DzpkTableStateModel,
  SourceActionState,
  SourceRoomSnapshot,
  sourceIdentityEquals,
} from './DzpkTableStateModel';
import type { DzpkSettlementPresentation } from './DzpkTablePresentationTypes';

export const SOURCE_STAGE = { WAITING: 0, DEALING: 1, BETTING: 2, RESULT: 3 } as const;
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

export function participantParticipatesInSnapshot(
  participant: DzpkParticipantState,
  sourceStageCode: number,
): boolean {
  if (sourceStageCode === SOURCE_STAGE.WAITING) return false;
  if (participant.sourceActionCode === SOURCE_ACTION.FOLD) return true;
  return participant.holeCards.length > 0;
}

export function sourceActionBadgeCode(sourceAction: SourceActionState): number | string {
  return sourceAction.act === SOURCE_ACTION.CALL_OR_CHECK && sourceAction.gold === 0
    ? '3_0'
    : sourceAction.act;
}

export function findParticipantByLocalSeat(
  tableStateModel: DzpkTableStateModel,
  localSeat: number,
): DzpkParticipantState | undefined {
  return tableStateModel.participants.find((participant) => participant.viewerLocalSeatId === localSeat);
}

export function sumVisibleStreetWagers(participants: readonly DzpkParticipantState[]): number {
  return participants.reduce(
    (total, participant) => total + nonNegativeChipAmount(participant.displayedStreetContributionChips),
    0,
  );
}

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

export function identityListContains(identityList: SourceIdentity[], participantId: unknown): boolean {
  return identityList.some((candidateId) => sourceIdentityEquals(candidateId, participantId));
}

export function normalizeSourceIdentity(sourceIdentity: unknown): string {
  return sourceIdentity === null || sourceIdentity === undefined ? '' : String(sourceIdentity);
}

export function safeCardArray(cards: unknown): number[] {
  return Array.isArray(cards)
    ? cards.map(Number).filter((card) => Number.isInteger(card) && card > 0)
    : [];
}

export function nonNegativeChipAmount(value: unknown): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? Math.floor(numericValue) : 0;
}

export function positiveChipAmountOrZero(value: unknown): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : 0;
}

export function requireArrayIndex(indexValue: unknown, arrayLength: number): number {
  const index = Number(indexValue);
  if (!Number.isInteger(index) || index < 0 || index >= arrayLength) {
    throw new Error('DZPK button preset index is invalid');
  }
  return index;
}

export function sourceVoiceFolder(avatarKey: unknown): 'young_woman' | 'young_man' {
  const numericAvatarKey = Number(avatarKey);
  return Number.isFinite(numericAvatarKey) && numericAvatarKey % 12 < 6
    ? 'young_woman'
    : 'young_man';
}

export function asSourceRecord(value: unknown): SourceRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as SourceRecord
    : {};
}

function cloneIdentityMap(sourceMap: unknown): SourceRecord {
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
  const seen = new Set<string>();
  return sourceIdentities.map(normalizeSourceIdentity).filter((sourceIdentity) => {
    if (!sourceIdentity || seen.has(sourceIdentity)) return false;
    seen.add(sourceIdentity);
    return true;
  });
}
