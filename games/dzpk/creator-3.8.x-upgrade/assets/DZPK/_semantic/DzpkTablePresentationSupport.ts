/**
 * 学习导读：表现层的 Cocos 小工具。主要做节点/组件“必须存在”检查、滑杆事件兼容、座位动画坐标
 * 和派奖目标整理，让 DzpkTablePresentation 的主流程少写重复空值判断。
 *
 * Cocos API 速查：
 * - `Component` 是所有 Cocos 组件基类，用于泛型限制 `requireComponent`。
 * - `find(path, referenceNode)` 按相对路径查节点；`getChildByName` 只查直接子节点。
 * - `Event.target` 通常是触发事件的 Node；Slider 回调也可能直接传含 progress 的对象。
 * - `UIOpacity` 控制透明度；没有时可以安全补在需要淡入淡出的动画节点上。
 * - `Vec3` 表示 2D 节点仍使用的 x/y/z 位置。
 */
import { Component, Event, Node, Slider, UIOpacity, Vec3, find } from 'cc';
import type { DzpkSettlementPresentation } from './DzpkTablePresentationTypes';

export interface SliderProgressSource {
  readonly progress?: number;
  readonly target?: unknown;
}

/**
 * 汇总“实际收到钱”的本地座位：普通派彩和无人跟注退回都算；金额为 0 不播放飞筹码。
 */
export function collectAwardDestinationSeats(settlement: DzpkSettlementPresentation): number[] {
  const destinationSeats = new Set<number>();
  settlement.winningParticipantUids.forEach((winnerUid) => {
    if ((settlement.payoutAmountByUid[winnerUid] ?? 0) <= 0) return;
    const localSeatId = settlement.localSeatByUid[winnerUid];
    if (localSeatId !== undefined) destinationSeats.add(localSeatId);
  });
  Object.keys(settlement.returnAmountByUid).forEach((returningUid) => {
    const localSeatId = settlement.localSeatByUid[returningUid];
    if (localSeatId !== undefined) destinationSeats.add(localSeatId);
  });
  // 当前 Creator 构建会错误降级 `[...Set]`；显式 Array.from 才会在 Web 包中得到数字数组。
  return Array.from(destinationSeats);
}

/** 原座位进/退场方向：底部两席向下，其余从左或右滑入。 */
export function sourceHiddenSeatPosition(localSeatId: number): Vec3 {
  if (localSeatId < 2) return new Vec3(0, -360);
  return new Vec3(localSeatId < 4 ? -360 : 360, 0);
}

/**
 * 同时兼容代码主动传 `{progress}` 和 Creator Slider 事件传 Node target；读取失败按 0。
 */
export function readSliderProgress(sliderEvent?: Event | SliderProgressSource): number {
  const source = sliderEvent as SliderProgressSource | undefined;
  const directProgress = Number(source?.progress);
  if (Number.isFinite(directProgress)) return directProgress;
  const targetNode = source?.target instanceof Node ? source.target : null;
  const targetProgress = targetNode?.getComponent(Slider)?.progress;
  return Number.isFinite(targetProgress) ? Number(targetProgress) : 0;
}

export function requireChild(parentNode: Node, childName: string): Node {
  // 用“必须存在”代替可选链：原 Prefab 节点缺失是 parity 错误，不能静默跳过。
  const childNode = parentNode.getChildByName(childName);
  if (!childNode) throw new Error(`Original DZPK node missing: ${parentNode.name}/${childName}`);
  return childNode;
}

export function requireNode(path: string, referenceNode: Node): Node {
  // find 的 path 相对 referenceNode；错误同时打印根名和路径，便于在层级管理器定位。
  const resolvedNode = find(path, referenceNode);
  if (!resolvedNode) throw new Error(`Original DZPK node path missing: ${referenceNode.name}/${path}`);
  return resolvedNode;
}

export function requireArrayItem<T>(items: readonly T[], index: number, itemDescription: string): T {
  // 原座位/牌/刻度节点依靠固定顺序，越界应立即指出具体 index。
  const item = items[index];
  if (item === undefined) throw new Error(`Original DZPK ${itemDescription} missing at index ${index}`);
  return item;
}

export function requireBinding<T>(value: T | null, bindingName: string): T {
  // 适用于 @property 序列化资源/节点：null 表示 Inspector 没绑定或迁移丢引用。
  if (value === null) throw new Error(`DZPK ${bindingName} is not bound`);
  return value;
}

export function requireComponent<T extends Component>(
  targetNode: Node,
  componentType: Constructor<T>,
): T {
  // getComponent 只在目标节点本身查找，不向父子层级扩散，避免拿到同类型错误组件。
  const component = targetNode.getComponent(componentType);
  if (!component) throw new Error(`${componentType.name} missing on original DZPK node ${targetNode.name}`);
  return component;
}

export function requireOpacity(targetNode: Node): UIOpacity {
  // 已有 UIOpacity 可能带原值，优先复用；仅缺失时运行时补一个。
  return targetNode.getComponent(UIOpacity) ?? targetNode.addComponent(UIOpacity);
}

export function randomInteger(minimum: number, maximum: number): number {
  // 闭区间随机数，用于原桌面环境 Spine 1–4；不用于发牌或控制结果。
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}
