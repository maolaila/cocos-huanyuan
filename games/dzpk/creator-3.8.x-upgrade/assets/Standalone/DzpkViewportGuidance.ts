/**
 * 学习导读：按原 1334×750 比例铺满横屏视口，竖屏继续显示指引，不改变服务端计时或当前会话。
 * Boot 的 onLoad 创建本服务，onDestroy 调用 dispose；回到前台也刷新一次，避免错过旋转事件。
 *
 * Cocos API：view 的 FIXED_HEIGHT/FIXED_WIDTH 保持等比并扩展可见区；Node.active 显隐独立指引节点；
 * Canvas.on/off 的捕获阶段先于原按钮，能挡住旋转前已按下、旋转后才松开的触摸和鼠标事件。
 * 指引节点另外挂 BlockInputEvents，覆盖整个原画布，防止新触摸穿到牌桌。
 * Web 必须读 window.innerWidth/innerHeight：SHOW_ALL 后的 canvas 已经缩成横屏小框，不能拿它判断
 * 手机是否竖屏。CHILD_ADDED 监听原 Prefab 挂载，只对 Room/bg、DZPKMain/bg 做等比 cover。
 * 背景 scale 从首次快照计算，重复 resize 不累乘；其余 UI 的比例、位置和尺寸均不改。
 */
import { Event, Node, ResolutionPolicy, UITransform, Vec3, isValid, screen, view } from 'cc';
import { DzpkBrowserPresentation } from './DzpkBrowserPresentation';

const CANVAS_RESIZE_EVENT = 'canvas-resize';
const BROWSER_RESIZE_EVENT = 'resize';
const DESIGN_WIDTH = 1334;
const DESIGN_HEIGHT = 750;
const INPUT_EVENTS = [
  Node.EventType.TOUCH_START, Node.EventType.TOUCH_MOVE, Node.EventType.TOUCH_END,
  Node.EventType.MOUSE_DOWN, Node.EventType.MOUSE_MOVE, Node.EventType.MOUSE_UP,
  Node.EventType.MOUSE_WHEEL,
] as const;

/** 指引有自己的节点，短提示的 2.5 秒计时器不会把旋转提示隐藏。 */
export class DzpkViewportGuidance {
  private readonly browserWindow = typeof window === 'undefined' ? null : window;
  private readonly browserViewport = this.browserWindow?.visualViewport ?? null;
  private readonly browserPresentation: DzpkBrowserPresentation;
  private readonly containers: Node[];
  private readonly originalBackgroundScale = new WeakMap<Node, Vec3>();
  private viewportKey = '';
  private updatingViewport = false;
  private disposed = false;

  public constructor(private readonly canvasNode: Node, private readonly guidanceNode: Node) {
    this.containers = ['Room', 'Game'].map((name) => canvasNode.getChildByName(name)).filter((node): node is Node => node !== null);
    this.browserPresentation = new DzpkBrowserPresentation(this.browserWindow, this.refresh);
    view.on(CANVAS_RESIZE_EVENT, this.refresh, this);
    this.browserWindow?.addEventListener(BROWSER_RESIZE_EVENT, this.refresh);
    this.browserViewport?.addEventListener(BROWSER_RESIZE_EVENT, this.refresh);
    for (const eventType of INPUT_EVENTS) canvasNode.on(eventType, this.blockPortraitInput, this, true);
    for (const container of this.containers) container.on(Node.EventType.CHILD_ADDED, this.fitBackgrounds, this);
    this.refresh();
  }

  /** 宽屏固定高、较窄横屏固定宽；竖屏只显示原指引。先缓存再改策略，防同步 resize 递归。 */
  public readonly refresh = (): void => {
    if (this.disposed || this.updatingViewport) return;
    const width = this.browserViewport?.width || this.browserWindow?.innerWidth || screen.windowSize.width;
    const height = this.browserViewport?.height || this.browserWindow?.innerHeight || screen.windowSize.height;
    if (!(width > 0 && height > 0)) return;
    const portrait = height > width;
    this.guidanceNode.active = portrait;
    const policy = portrait ? ResolutionPolicy.SHOW_ALL
      : width / height >= DESIGN_WIDTH / DESIGN_HEIGHT ? ResolutionPolicy.FIXED_HEIGHT : ResolutionPolicy.FIXED_WIDTH;
    const key = `${width}:${height}:${policy}`;
    if (key !== this.viewportKey) {
      this.viewportKey = key;
      this.updatingViewport = true;
      try { view.setDesignResolutionSize(DESIGN_WIDTH, DESIGN_HEIGHT, policy); }
      finally { this.updatingViewport = false; }
    }
    this.fitBackgrounds();
  };

  /** getVisibleSize 是策略应用后的 Cocos 单位；只扩背景，人物、按钮和牌桌节点不一起缩放。 */
  private readonly fitBackgrounds = (): void => {
    if (this.disposed) return;
    const visible = view.getVisibleSize();
    for (const container of this.containers) for (const prefab of container.children) {
      if (prefab.name !== 'Room' && prefab.name !== 'DZPKMain') continue;
      const background = prefab.getChildByName('bg');
      const transform = background?.getComponent(UITransform);
      if (!background || !transform || !isValid(background, true)) continue;
      let original = this.originalBackgroundScale.get(background);
      if (!original) { original = background.scale.clone(); this.originalBackgroundScale.set(background, original); }
      const width = transform.contentSize.width * Math.abs(original.x);
      const height = transform.contentSize.height * Math.abs(original.y);
      if (!(width > 0 && height > 0)) continue;
      const factor = Math.max(1, visible.width / width, visible.height / height);
      background.setScale(original.x * factor, original.y * factor, original.z);
    }
  };

  /** 成对释放全局/视口/捕获监听，避免退出重进后旧 Scene 仍响应 resize。 */
  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    view.off(CANVAS_RESIZE_EVENT, this.refresh, this);
    this.browserWindow?.removeEventListener(BROWSER_RESIZE_EVENT, this.refresh);
    this.browserViewport?.removeEventListener(BROWSER_RESIZE_EVENT, this.refresh);
    this.browserPresentation.dispose();
    for (const container of this.containers) container.off(Node.EventType.CHILD_ADDED, this.fitBackgrounds, this);
    for (const eventType of INPUT_EVENTS) this.canvasNode.off(eventType, this.blockPortraitInput, this, true);
    if (isValid(this.guidanceNode, true)) this.guidanceNode.active = false;
  }

  /** 捕获旧触摸的松开事件，防止用户在旋转设备时意外触发下注；不拦截网络或服务端事件。 */
  private readonly blockPortraitInput = (event: Event): void => {
    if (this.guidanceNode.active) event.propagationStopped = true;
  };
}
