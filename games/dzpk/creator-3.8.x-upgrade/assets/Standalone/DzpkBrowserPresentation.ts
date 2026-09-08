/**
 * 浏览器展示边界：补当前游戏文档的 100dvh 样式，并在触屏设备的可信手势内尝试原生全屏。
 * requestFullscreen 必须同步发生在手势回调里；Promise 只用于吞掉拒绝，不把 resolve 当作全屏事实。
 * Safari 没有可用 API 或权限时只铺满视口。失败后最多再试两次，真正进入过后不再抢占用户退出。
 * dispose 移除本实例的样式和全部监听；不调用引擎 screen.requestFullScreen，避免留下隐藏重试监听。
 */
type FullscreenDocument = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitCurrentFullScreenElement?: Element | null;
  mozFullScreenEnabled?: boolean;
  mozFullScreenElement?: Element | null;
  msFullscreenEnabled?: boolean;
  msFullscreenElement?: Element | null;
};
type FullscreenRoot = HTMLElement & {
  webkitRequestFullscreen?: () => void | Promise<void>;
  webkitRequestFullScreen?: () => void | Promise<void>;
  mozRequestFullScreen?: () => void | Promise<void>;
  msRequestFullscreen?: () => void | Promise<void>;
};

const GESTURE_EVENTS = ['touchend', 'pointerup'] as const;
const FULLSCREEN_EVENTS = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'] as const;
const FULLSCREEN_ERROR_EVENTS = ['fullscreenerror', 'webkitfullscreenerror', 'mozfullscreenerror', 'MSFullscreenError'] as const;
const MAX_FULLSCREEN_ATTEMPTS = 3;
const DISTINCT_GESTURE_MILLISECONDS = 500;
const VIEWPORT_STYLE = `
html, body { width: 100%; height: 100%; height: 100dvh; margin: 0; padding: 0; overflow: hidden; background: #080e18; }
#GameDiv { position: fixed; inset: 0; width: 100% !important; height: 100% !important; height: 100dvh !important; margin: 0 !important; }
`;

export class DzpkBrowserPresentation {
  private readonly document: FullscreenDocument | null;
  private gestureTarget: EventTarget | null = null;
  private style: HTMLStyleElement | null = null;
  private requestNativeFullscreen: (() => void | Promise<void>) | null = null;
  private attempts = 0;
  private requestPending = false;
  private enteredFullscreen = false;
  private lastGestureTime = -Infinity;
  private disposed = false;

  public constructor(browserWindow: Window | null, private readonly viewportChanged: () => void) {
    this.document = browserWindow?.document ?? null;
    if (!this.document) return;
    if (this.document.head) {
      this.style = this.document.createElement('style');
      this.style.setAttribute('data-dzpk-viewport', 'fill');
      this.style.textContent = VIEWPORT_STYLE;
      this.document.head.appendChild(this.style);
    }
    const root = this.document.documentElement as FullscreenRoot;
    if (typeof root.requestFullscreen === 'function' && this.document.fullscreenEnabled !== false) {
      this.requestNativeFullscreen = () => root.requestFullscreen({ navigationUI: 'hide' });
    } else {
      const candidates = [
        [root.webkitRequestFullscreen ?? root.webkitRequestFullScreen, this.document.webkitFullscreenEnabled],
        [root.mozRequestFullScreen, this.document.mozFullScreenEnabled],
        [root.msRequestFullscreen, this.document.msFullscreenEnabled],
      ] as const;
      const request = candidates.find(([method, enabled]) => typeof method === 'function' && enabled !== false)?.[0];
      if (request) this.requestNativeFullscreen = () => request.call(root);
    }
    if (!this.requestNativeFullscreen) return;
    for (const event of FULLSCREEN_EVENTS) this.document.addEventListener(event, this.handleFullscreenChange);
    for (const event of FULLSCREEN_ERROR_EVENTS) this.document.addEventListener(event, this.handleFullscreenError);
    const navigator = browserWindow?.navigator;
    const touchPage = (navigator?.maxTouchPoints ?? 0) > 0 ||
      browserWindow?.matchMedia?.('(pointer: coarse)').matches === true ||
      /Android|iPhone|iPad|iPod/i.test(navigator?.userAgent ?? '');
    if (!touchPage || this.nativeFullscreenActive) { this.enteredFullscreen = this.nativeFullscreenActive; return; }
    // Cocos 会在 canvas 阻止冒泡；直接监听同一节点，仍排在音频 window/canvas 捕获之后。
    this.gestureTarget = this.document.getElementById?.('GameCanvas') ?? this.document;
    for (const event of GESTURE_EVENTS) this.gestureTarget.addEventListener(event, this.handleTrustedGesture);
  }

  /** API 可用性与真正进入状态分开；成功状态只读浏览器的 fullscreenElement。 */
  public get fullscreenSupported(): boolean { return this.requestNativeFullscreen !== null; }
  public get fullscreenAttempted(): boolean { return this.attempts > 0; }
  public get nativeFullscreenActive(): boolean {
    return Boolean(this.document?.fullscreenElement || this.document?.webkitFullscreenElement ||
      this.document?.webkitCurrentFullScreenElement || this.document?.mozFullScreenElement || this.document?.msFullscreenElement);
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.removeGestureListeners();
    for (const event of FULLSCREEN_EVENTS) this.document?.removeEventListener(event, this.handleFullscreenChange);
    for (const event of FULLSCREEN_ERROR_EVENTS) this.document?.removeEventListener(event, this.handleFullscreenError);
    this.style?.remove();
    this.style = null;
  }

  private readonly handleTrustedGesture = (event: Event): void => {
    if (!event.isTrusted) return;
    const gestureTime = event.timeStamp || Date.now();
    if (gestureTime - this.lastGestureTime < DISTINCT_GESTURE_MILLISECONDS) return;
    this.attemptFullscreen(gestureTime);
  };

  private readonly handleFullscreenChange = (): void => {
    if (this.disposed) return;
    if (this.nativeFullscreenActive) { this.enteredFullscreen = true; this.removeGestureListeners(); }
    this.requestPending = false;
    this.viewportChanged();
  };

  private readonly handleFullscreenError = (): void => { this.requestPending = false; };

  private attemptFullscreen(gestureTime: number): void {
    if (this.disposed || this.enteredFullscreen || this.requestPending || this.attempts >= MAX_FULLSCREEN_ATTEMPTS || !this.requestNativeFullscreen) return;
    if (this.nativeFullscreenActive) { this.handleFullscreenChange(); return; }
    this.lastGestureTime = gestureTime;
    this.attempts++;
    if (this.attempts >= MAX_FULLSCREEN_ATTEMPTS) this.removeGestureListeners();
    this.requestPending = true;
    try {
      const result = this.requestNativeFullscreen();
      if (result && typeof result.then === 'function') {
        void result.then(() => this.handleFullscreenChange(), this.handleFullscreenError);
      } else this.requestPending = false;
    } catch { this.requestPending = false; }
  }

  private removeGestureListeners(): void {
    for (const event of GESTURE_EVENTS) this.gestureTarget?.removeEventListener(event, this.handleTrustedGesture);
  }
}
