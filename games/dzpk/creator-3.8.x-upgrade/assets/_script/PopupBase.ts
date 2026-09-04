/**
 * 学习导读：规则、设置等弹窗共用的“出现/消失动画骨架”。子类只关心内容，本类负责遮罩、透明度、
 * 缩放和动画结束回调。
 *
 * Cocos API 速查：
 * - `BlockInputEvents`：吞掉落在遮罩节点上的触摸/鼠标事件，避免关闭动画期间点穿到牌桌。
 * - `UITransform`：保存 UI 节点尺寸；动态遮罩复制弹窗根尺寸才能覆盖完整点击区域。
 * - `UIOpacity`：以 0–255 控制节点及其子树透明度。
 * - `Vec3.ONE`：等于缩放 `(1,1,1)`。
 * - `tween`：顺序描述缩放、延迟和回调，最后必须 `.start()` 才会真正播放。
 */
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

/** Creator 3.8 弹窗基类，保留原版淡入和轻微放大回弹效果。 */
@ccclass('PopupBase')
export class PopupBase extends Component {
  // `background` 是半透明全屏背景，`main` 是弹窗主体；都由各原 Prefab 绑定。
  @property(Node) public background: Node | null = null;
  @property(Node) public main: Node | null = null;

  protected animationSeconds = 0.2;
  protected options: unknown = null;
  private blocker: Node | null = null;
  private finishCallback: (() => void) | null = null;

  /**
   * 显示弹窗：先恢复节点和初始透明度，再让子类填数据，最后播放原版入场动画。
   * `options` 使用 unknown，强迫具体子类在自己边界内判断类型，避免共享基类猜业务结构。
   */
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

  /** 关闭弹窗。动画期间打开 blocker，避免用户连点；动画完成后才真正隐藏节点。 */
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

  /** 注册一次弹窗结束后的业务回调，例如导航层在完全收起后再销毁 Prefab。 */
  public setFinishCallback(callback: (() => void) | null): void {
    this.finishCallback = callback;
  }

  // 下面四个空钩子是模板方法：具体弹窗按需覆写，本基类不掺入规则/设置业务。
  protected init(_options?: unknown): void {}
  protected updateDisplay(_options?: unknown): void {}
  protected onShow(): void {}
  protected onHide(): void {}

  /** 首次关闭时才创建输入遮罩，避免每次 show/hide 重复创建节点。 */
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
  // 原 Prefab 的必需绑定缺失时立即抛出清楚错误，而不是继续产生 contentSize 等空引用。
  if (!node) throw new Error(`PopupBase.${propertyName} is not bound`);
  return node;
}

function opacityOf(node: Node): UIOpacity {
  return node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
}

function setOpacity(node: Node, opacity: number): void {
  // 统一入口保证节点先拥有 UIOpacity，再写透明度。
  opacityOf(node).opacity = opacity;
}
