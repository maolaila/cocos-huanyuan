import {
  BlockInputEvents,
  Component,
  Node,
  UIOpacity,
  UITransform,
  Vec3,
  _decorator,
  tween,
} from 'cc';
import { requireDzpkRuntimeServices } from '../Standalone/DzpkRuntimeServices';

const { ccclass, property } = _decorator;

/** Creator 3.8 popup base preserving the original fade/scale contract. */
@ccclass('PopupBase')
export class PopupBase extends Component {
  @property(Node) public background: Node | null = null;
  @property(Node) public main: Node | null = null;

  protected animationSeconds = 0.2;
  protected options: unknown = null;
  private blocker: Node | null = null;
  private finishCallback: (() => void) | null = null;

  public show(options?: unknown): void {
    const background = requireNode(this.background, 'background');
    const main = requireNode(this.main, 'main');
    this.options = options;
    background.active = true;
    main.active = true;
    this.node.active = true;
    main.setScale(Vec3.ONE);
    setOpacity(background, 0);
    setOpacity(main, 0);
    this.init(options);
    this.updateDisplay(options);
    tween(opacityOf(background)).to(this.animationSeconds * 0.8, { opacity: 80 }).start();
    tween(opacityOf(main)).to(0.04, { opacity: 255 }).start();
    tween(main)
      .to(0.1, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'quadIn' })
      .to(0.1, { scale: Vec3.ONE }, { easing: 'quadIn' })
      .call(() => this.onShow())
      .start();
  }

  public hide(shouldPlayCloseSound = true): void {
    const background = requireNode(this.background, 'background');
    const main = requireNode(this.main, 'main');
    if (shouldPlayCloseSound) requireDzpkRuntimeServices().audioService.playCloseSound();
    this.ensureBlocker();
    if (this.blocker) this.blocker.active = true;
    tween(opacityOf(background))
      .delay(this.animationSeconds * 0.2)
      .to(this.animationSeconds * 0.8, { opacity: 0 })
      .call(() => { background.active = false; })
      .start();
    tween(main)
      .to(this.animationSeconds, { scale: new Vec3(0.85, 0.85, 1) }, { easing: 'quadIn' })
      .call(() => {
        if (this.blocker) this.blocker.active = false;
        main.active = false;
        this.node.active = false;
        this.onHide();
        this.finishCallback?.();
      })
      .start();
  }

  public setFinishCallback(callback: (() => void) | null): void {
    this.finishCallback = callback;
  }

  protected init(_options?: unknown): void {}
  protected updateDisplay(_options?: unknown): void {}
  protected onShow(): void {}
  protected onHide(): void {}

  private ensureBlocker(): void {
    if (this.blocker) return;
    this.blocker = new Node('blocker');
    this.blocker.addComponent(BlockInputEvents);
    this.blocker.parent = this.node;
    const rootTransform = this.node.getComponent(UITransform);
    const blockerTransform = this.blocker.addComponent(UITransform);
    if (rootTransform) blockerTransform.setContentSize(rootTransform.contentSize);
  }
}

function requireNode(node: Node | null, propertyName: string): Node {
  if (!node) throw new Error(`PopupBase.${propertyName} is not bound`);
  return node;
}

function opacityOf(node: Node): UIOpacity {
  return node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
}

function setOpacity(node: Node, opacity: number): void {
  opacityOf(node).opacity = opacity;
}
