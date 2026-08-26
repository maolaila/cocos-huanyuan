export const SOURCE_TABLE_SEAT_COUNT = 6;
const SOURCE_BETTING_PROMPT_SECONDS = 15;

export const DZPK_TABLE_DISPLAY_CONFIG = {
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
  minimum: 2,
  maximum: SOURCE_TABLE_SEAT_COUNT,
};

export interface SourceParticipantSnapshot {
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

/** Viewer projection only; dealing and settlement stay server-authoritative. */
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

  public findParticipantByProperty(
    propertyName: string,
    expectedValue: unknown,
  ): DzpkParticipantState | undefined {
    return this.participants.find((participant) =>
      sourceIdentityEquals(participant.sourceValue(propertyName), expectedValue));
  }

  public findParticipantById(participantId: unknown): DzpkParticipantState {
    const participant = this.findParticipantByIdIfPresent(participantId);
    if (!participant) throw new Error(`DZPK participant not found: ${String(participantId)}`);
    return participant;
  }

  public findParticipantByIdIfPresent(participantId: unknown): DzpkParticipantState | undefined {
    return this.participants.find((participant) =>
      sourceIdentityEquals(participant.participantId, participantId));
  }

  public calculatePostflopPotPresetContributions(potChips = this.totalPotChips): number[] {
    const resolvedPot = nonNegativeNumberOrDefault(potChips, this.totalPotChips);
    return [Math.ceil(resolvedPot * 0.5), Math.ceil(resolvedPot * (2 / 3)), resolvedPot];
  }

  public calculatePreflopBlindPresetContributions(
    smallBlindChips = this.smallBlindChips,
    potChips = this.totalPotChips,
  ): number[] {
    const blind = nonNegativeNumberOrDefault(smallBlindChips, this.smallBlindChips);
    const pot = nonNegativeNumberOrDefault(potChips, this.totalPotChips);
    return [6 * blind, 8 * blind, pot];
  }

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

  public applyAuthenticatedHumanSeatDelta(_seatDelta: unknown): never {
    throw new Error('MULTI_HUMAN_ONLINE_NOT_IMPLEMENTED_IN_CREATOR_3_8_UPGRADE');
  }
}

export function sourceSeatToViewerLocalSeat(
  sourceSeatId: number,
  viewerSourceSeatId: number,
  seatCount = SOURCE_TABLE_SEAT_COUNT,
): number {
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
  if (leftValue === rightValue) return true;
  if (leftValue === null || leftValue === undefined) return false;
  if (rightValue === null || rightValue === undefined) return false;
  return String(leftValue) === String(rightValue);
}

function normalizeSourceSeatId(sourceSeatId: unknown): number {
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
  'uid', 'seat', 'l_seat', 'nickname', 'gold', 'headimgurl', 'cards', 'betGold',
  'act', 'join',
]);
