import { Node, NodePool, instantiate, isValid } from 'cc';

/** Narrow replacement for the original NodePool wrapper used by card/chip animations. */
export class DzpkNodePool {
  private readonly pool = new NodePool();

  public constructor(private readonly templateNode: Node, initialCount = 0) {
    for (let index = 0; index < initialCount; index += 1) {
      this.pool.put(instantiate(templateNode));
    }
  }

  public acquire(): Node {
    return this.pool.size() > 0 ? this.pool.get()! : instantiate(this.templateNode);
  }

  public release(node: Node): void {
    if (isValid(node, true)) this.pool.put(node);
  }

  public releaseAllChildren(parentNode: Node): void {
    while (parentNode.children.length > 0) this.release(parentNode.children[0]);
  }

  public clear(): void {
    this.pool.clear();
  }
}
