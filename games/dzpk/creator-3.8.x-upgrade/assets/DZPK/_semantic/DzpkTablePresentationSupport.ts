import { Component, Event, Node, Slider, UIOpacity, Vec3, find } from 'cc';
import type { DzpkSettlementPresentation } from './DzpkTablePresentationTypes';

export interface SliderProgressSource {
  readonly progress?: number;
  readonly target?: unknown;
}

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
  return [...destinationSeats];
}

export function sourceHiddenSeatPosition(localSeatId: number): Vec3 {
  if (localSeatId < 2) return new Vec3(0, -360);
  return new Vec3(localSeatId < 4 ? -360 : 360, 0);
}

export function readSliderProgress(sliderEvent?: Event | SliderProgressSource): number {
  const source = sliderEvent as SliderProgressSource | undefined;
  const directProgress = Number(source?.progress);
  if (Number.isFinite(directProgress)) return directProgress;
  const targetNode = source?.target instanceof Node ? source.target : null;
  const targetProgress = targetNode?.getComponent(Slider)?.progress;
  return Number.isFinite(targetProgress) ? Number(targetProgress) : 0;
}

export function requireChild(parentNode: Node, childName: string): Node {
  const childNode = parentNode.getChildByName(childName);
  if (!childNode) throw new Error(`Original DZPK node missing: ${parentNode.name}/${childName}`);
  return childNode;
}

export function requireNode(path: string, referenceNode: Node): Node {
  const resolvedNode = find(path, referenceNode);
  if (!resolvedNode) throw new Error(`Original DZPK node path missing: ${referenceNode.name}/${path}`);
  return resolvedNode;
}

export function requireArrayItem<T>(items: readonly T[], index: number, itemDescription: string): T {
  const item = items[index];
  if (item === undefined) throw new Error(`Original DZPK ${itemDescription} missing at index ${index}`);
  return item;
}

export function requireBinding<T>(value: T | null, bindingName: string): T {
  if (value === null) throw new Error(`DZPK ${bindingName} is not bound`);
  return value;
}

export function requireComponent<T extends Component>(
  targetNode: Node,
  componentType: Constructor<T>,
): T {
  const component = targetNode.getComponent(componentType);
  if (!component) throw new Error(`${componentType.name} missing on original DZPK node ${targetNode.name}`);
  return component;
}

export function requireOpacity(targetNode: Node): UIOpacity {
  return targetNode.getComponent(UIOpacity) ?? targetNode.addComponent(UIOpacity);
}

export function randomInteger(minimum: number, maximum: number): number {
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}
