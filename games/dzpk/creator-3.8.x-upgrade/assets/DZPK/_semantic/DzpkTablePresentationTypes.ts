/** Viewer projection of the server-authoritative settlement payload. */
export interface DzpkSettlementPresentation {
  readonly primaryWinnerUid: string;
  readonly winningParticipantUids: string[];
  readonly payoutAmountByUid: Record<string, number>;
  readonly returnAmountByUid: Record<string, number>;
  readonly localSeatByUid: Record<string, number>;
  readonly sourcePotLayers: ReadonlyArray<Record<string, unknown>>;
}
