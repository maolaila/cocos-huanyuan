/**
 * 学习导读：只管理竖屏时的横屏指引，不改变原 1334×750 牌桌、服务端计时或当前会话。
 * Boot 的 onLoad 创建本服务，onDestroy 调用 dispose；回到前台也刷新一次，避免错过旋转事件。
 *
 * Cocos API：view.on/off 的 canvas-resize 在画布适配后通知；Node.active 显隐独立指引节点；
 * Canvas.on/off 的捕获阶段先于原按钮，能挡住旋转前已按下、旋转后才松开的触摸和鼠标事件。
 * 指引节点另外挂 BlockInputEvents，覆盖整个原画布，防止新触摸穿到牌桌。
 * Web 必须读 window.innerWidth/innerHeight：SHOW_ALL 后的 canvas 已经缩成横屏小框，不能拿它判断
 * 手机是否竖屏。window/visualViewport 的 resize 只读取可见区域，不创建 HTML 外壳或重启网络。
 */
import { Event, Node, isValid, screen, view } from 'cc';

const CANVAS_RESIZE_EVENT = 'canvas-resize';
const BROWSER_RESIZE_EVENT = 'resize';
const INPUT_EVENTS = [
  Node.EventType.TOUCH_START, Node.EventType.TOUCH_MOVE, Node.EventType.TOUCH_END,
  Node.EventType.MOUSE_DOWN, Node.EventType.MOUSE_MOVE, Node.EventType.MOUSE_UP,
  Node.EventType.MOUSE_WHEEL,
] as const;

/** 指引有自己的节点，短提示的 2.5 秒计时器不会把旋转提示隐藏。 */
export class DzpkViewportGuidance {
  private readonly browserWindow = typeof window === 'undefined' ? null : window;
  private readonly browserViewport = this.browserWindow?.visualViewport ?? null;
  private disposed = false;

  public constructor(private readonly canvasNode: Node, private readonly guidanceNode: Node) {
    view.on(CANVAS_RESIZE_EVENT, this.refresh, this);
    this.browserWindow?.addEventListener(BROWSER_RESIZE_EVENT, this.refresh);
    this.browserViewport?.addEventListener(BROWSER_RESIZE_EVENT, this.refresh);
    for (const eventType of INPUT_EVENTS) canvasNode.on(eventType, this.blockPortraitInput, this, true);
    this.refresh();
  }

  /** 只切换指引显隐；横屏恢复原交互，牌局、金额、动画和连接都继续由原服务管理。 */
  public readonly refresh = (): void => {
    if (this.disposed) return;
    const width = this.browserWindow?.innerWidth ?? screen.windowSize.width;
    const height = this.browserWindow?.innerHeight ?? screen.windowSize.height;
    this.guidanceNode.active = width > 0 && height > width;
  };

  /** 成对释放全局/视口/捕获监听，避免退出重进后旧 Scene 仍响应 resize。 */
  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    view.off(CANVAS_RESIZE_EVENT, this.refresh, this);
    this.browserWindow?.removeEventListener(BROWSER_RESIZE_EVENT, this.refresh);
    this.browserViewport?.removeEventListener(BROWSER_RESIZE_EVENT, this.refresh);
    for (const eventType of INPUT_EVENTS) this.canvasNode.off(eventType, this.blockPortraitInput, this, true);
    if (isValid(this.guidanceNode, true)) this.guidanceNode.active = false;
  }

  /** 捕获旧触摸的松开事件，防止用户在旋转设备时意外触发下注；不拦截网络或服务端事件。 */
  private readonly blockPortraitInput = (event: Event): void => {
    if (this.guidanceNode.active) event.propagationStopped = true;
  };
}
