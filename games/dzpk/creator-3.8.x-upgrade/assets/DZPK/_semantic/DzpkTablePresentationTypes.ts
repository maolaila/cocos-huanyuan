/**
 * 学习导读：这是 Controller 交给 Presentation 的结算“只读说明书”。单独放类型文件可以防止
 * Controller 和 Presentation 互相运行时 import，降低循环依赖。
 *
 * 所有值都来自服务端权威 Result：赢家 UID 列表、正常派彩、无人跟注退回、UID 到本地座位映射、
 * 以及原始分池。表现层只能据此播放动画和文字，不能修改或重新计算胜负。
 */
export interface DzpkSettlementPresentation {
  readonly primaryWinnerUid: string;
  readonly winningParticipantUids: string[];
  readonly payoutAmountByUid: Record<string, number>;
  readonly returnAmountByUid: Record<string, number>;
  readonly localSeatByUid: Record<string, number>;
  readonly sourcePotLayers: ReadonlyArray<Record<string, unknown>>;
}
