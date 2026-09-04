/**
 * 学习导读：这是原 KG `Msg_Hall_* / Msg_DZPK_* / local_Event` 的进程内事件中转站。
 * 网络层收到消息后发布事件，Room/Table 组件按名字订阅；这样网络代码不直接依赖某个画面实例。
 *
 * Cocos API 速查：`isValid(target, true)` 会把“已经调用 destroy、但尚未到帧末真正释放”的 Cocos
 * 对象也视为无效。异步消息到达时先检查，可避免给已退出的 Room/Table 组件继续回调。
 */
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

/** 带订阅目标生命周期检查的事件总线；原版消息名保持不变。 */
export class DzpkEventBus {
  private readonly listenerGroupsByEventName = new Map<string, Map<number, ListenerRecord>>();
  private nextSubscriptionId = 1;

  /**
   * 注册监听并返回唯一 subscription。调用方保存它，在 `onDestroy` 时准确退订。
   * `listenerTarget` 同时决定回调中的 `this`，也用于 Cocos 销毁检查。
   */
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

  /** 按订阅 id 移除单个监听；传空值安全无操作，方便销毁代码直接调用。 */
  public unsubscribeSourceEvent(subscription: EventSubscription | null | undefined): void {
    if (!subscription) return;
    this.listenerGroupsByEventName.get(subscription.name)?.delete(subscription.id);
  }

  /**
   * 同步广播一个原版事件。发现目标组件已销毁时顺手清理监听，不让僵尸订阅长期留在 Map 中。
   */
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

  /** 删除某个事件的全部监听，主要用于整体重置而不是普通组件退出。 */
  public clearSourceEvent(eventName: string): void {
    this.listenerGroupsByEventName.delete(eventName);
  }
}
