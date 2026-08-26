import { isValid } from 'cc';

export interface EventSubscription {
  readonly name: string;
  readonly id: number;
  readonly target: object | null;
}

type SourceEventListener = (...eventArguments: unknown[]) => void;

interface ListenerRecord {
  readonly listener: SourceEventListener;
  readonly listenerTarget: object | null;
}

/** Target-aware event bus retaining the original Msg_Hall/Msg_DZPK names. */
export class DzpkEventBus {
  private readonly listenerGroupsByEventName = new Map<string, Map<number, ListenerRecord>>();
  private nextSubscriptionId = 1;

  public subscribeSourceEvent(
    eventName: string,
    listener: SourceEventListener,
    listenerTarget: object | null = null,
  ): EventSubscription {
    if (!eventName) throw new Error('Source event name is required');
    const listenerGroup = this.listenerGroupsByEventName.get(eventName) ?? new Map();
    this.listenerGroupsByEventName.set(eventName, listenerGroup);
    const subscriptionId = this.nextSubscriptionId;
    this.nextSubscriptionId += 1;
    listenerGroup.set(subscriptionId, { listener, listenerTarget });
    return { name: eventName, id: subscriptionId, target: listenerTarget };
  }

  public unsubscribeSourceEvent(subscription: EventSubscription | null | undefined): void {
    if (!subscription) return;
    this.listenerGroupsByEventName.get(subscription.name)?.delete(subscription.id);
  }

  public publishSourceEvent(eventName: string, ...eventArguments: unknown[]): void {
    const listenerGroup = this.listenerGroupsByEventName.get(eventName);
    if (!listenerGroup) return;
    listenerGroup.forEach((record, subscriptionId) => {
      if (record.listenerTarget && !isValid(record.listenerTarget, true)) {
        listenerGroup.delete(subscriptionId);
        return;
      }
      record.listener.apply(record.listenerTarget, eventArguments);
    });
  }

  public clearSourceEvent(eventName: string): void {
    this.listenerGroupsByEventName.delete(eventName);
  }
}
