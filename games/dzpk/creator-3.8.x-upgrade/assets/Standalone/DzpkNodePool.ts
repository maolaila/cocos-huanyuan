/**
 * 学习导读：发牌、下注和派奖会反复使用相同图片节点。对象池把用完的节点收回来复用，避免一手牌
 * 内频繁 `instantiate/destroy` 造成垃圾回收卡顿。
 *
 * Cocos API 速查：`NodePool` 是节点回收容器；`instantiate(template)` 深拷贝模板节点；
 * `isValid(node, true)` 防止把已经销毁的节点重新放回池中。
 */
import { Node, NodePool, instantiate, isValid } from 'cc';

/** 只服务牌和筹码动画的轻量 NodePool 包装，不承担业务状态。 */
export class DzpkNodePool {
  private readonly pool = new NodePool();

  /** 根据原 Prefab 模板预热指定数量；预热用于减少第一次动画的创建抖动。 */
  public constructor(private readonly templateNode: Node, initialCount = 0) {
    for (let index = 0; index < initialCount; index += 1) {
      this.pool.put(instantiate(templateNode));
    }
  }

  /** 有缓存就取缓存，没有才克隆模板。取出的节点由调用方重新设置 parent/位置/显隐。 */
  public acquire(): Node {
    return this.pool.size() > 0 ? this.pool.get()! : instantiate(this.templateNode);
  }

  /** 放回池中；NodePool.put 会把节点从当前父节点移走，等待下一次 acquire。 */
  public release(node: Node): void {
    if (isValid(node, true)) this.pool.put(node);
  }

  /** 把一个动画容器当前所有子节点逐个回收，常用于底池动画收尾。 */
  public releaseAllChildren(parentNode: Node): void {
    while (parentNode.children.length > 0) this.release(parentNode.children[0]);
  }

  /** 牌桌销毁时清空池，释放池内节点引用。 */
  public clear(): void {
    this.pool.clear();
  }
}
