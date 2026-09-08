/**
 * 浏览器展示边界：补当前游戏文档的 100dvh 样式，并在触屏设备的首次可信手势内尝试原生全屏。
 * requestFullscreen 必须同步发生在手势回调里；Promise 只用于吞掉拒绝，不把 resolve 当作全屏事实。
 * Safari 没有可用 API 或权限时只铺满视口。每个实例最多尝试一次，用户退出后不再次抢全屏。
 * dispose 移除本实例的样式和全部监听；不调用引擎 screen.requestFullScreen，避免留下隐藏重试监听。
 */
type FullscreenDocument = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
};
type FullscreenRoot = HTMLElement & {
  webkitRequestFullscreen?: () => void | Promise<void>;
  webkitRequestFullScreen?: () => void | Promise<void>;
};

const GESTURE_EVENTS = ['touchend', 'pointerup'] as const;
const FULLSCREEN_EVENTS = ['fullscreenchange', 'webkitfullscreenchange'] as const;
const VIEWPORT_STYLE = `
html, body { width: 100%; height: 100%; height: 100dvh; margin: 0; padding: 0; overflow: hidden; background: #080e18; }
#GameDiv { position: fixed; inset: 0; width: 100% !important; height: 100% !important; height: 100dvh !important; margin: 0 !important; }
`;

export class DzpkBrowserPresentation {
  private readonly document: FullscreenDocument | null;
  private style: HTMLStyleElement | null = null;
  private requestNativeFullscreen: (() => void | Promise<void>) | null = null;
  private attempted = false;
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
      const webkitRequest = root.webkitRequestFullscreen ?? root.webkitRequestFullScreen;
      if (typeof webkitRequest === 'function' && this.document.webkitFullscreenEnabled !== false) {
        this.requestNativeFullscreen = () => webkitRequest.call(root);
      }
    }
    if (!this.requestNativeFullscreen) return;
    for (const event of FULLSCREEN_EVENTS) this.document.addEventListener(event, this.handleFullscreenChange);
    const navigator = browserWindow?.navigator;
    const touchPage = (navigator?.maxTouchPoints ?? 0) > 0 ||
      browserWindow?.matchMedia?.('(pointer: coarse)').matches === true ||
      /Android|iPhone|iPad|iPod/i.test(navigator?.userAgent ?? '');
    if (!touchPage || this.nativeFullscreenActive) { this.attempted = this.nativeFullscreenActive; return; }
    if (navigator?.userActivation?.isActive) this.attemptFullscreen();
    else for (const event of GESTURE_EVENTS) this.document.addEventListener(event, this.handleTrustedGesture, true);
  }

  /** API 可用性与真正进入状态分开；成功状态只读浏览器的 fullscreenElement。 */
  public get fullscreenSupported(): boolean { return this.requestNativeFullscreen !== null; }
  public get fullscreenAttempted(): boolean { return this.attempted; }
  public get nativeFullscreenActive(): boolean {
    return Boolean(this.document?.fullscreenElement || this.document?.webkitFullscreenElement);
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.removeGestureListeners();
    for (const event of FULLSCREEN_EVENTS) this.document?.removeEventListener(event, this.handleFullscreenChange);
    this.style?.remove();
    this.style = null;
  }

  private readonly handleTrustedGesture = (event: Event): void => {
    if (event.isTrusted) this.attemptFullscreen();
  };

  private readonly handleFullscreenChange = (): void => {
    if (this.disposed) return;
    if (this.nativeFullscreenActive) { this.attempted = true; this.removeGestureListeners(); }
    this.viewportChanged();
  };

  private attemptFullscreen(): void {
    if (this.disposed || this.attempted || !this.requestNativeFullscreen) return;
    this.attempted = true;
    this.removeGestureListeners();
    if (this.nativeFullscreenActive) return;
    try { Promise.resolve(this.requestNativeFullscreen()).catch(() => undefined); }
    catch { /* 用户拒绝或浏览器不允许时，继续使用已铺满的普通视口。 */ }
  }

  private removeGestureListeners(): void {
    for (const event of GESTURE_EVENTS) this.document?.removeEventListener(event, this.handleTrustedGesture, true);
  }
}
