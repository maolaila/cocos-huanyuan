import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { readFileSync } from 'node:fs';

class Events {
  listeners: Array<{ type: string; callback: (...args: any[]) => void; target?: unknown; capture?: boolean }> = [];
  on(type: string, callback: (...args: any[]) => void, target?: unknown, capture?: boolean): void {
    this.listeners.push({ type, callback, target, capture });
  }
  off(type: string, callback: (...args: any[]) => void, target?: unknown, capture?: boolean): void {
    this.listeners = this.listeners.filter((item) => item.type !== type || item.callback !== callback || item.target !== target || item.capture !== capture);
  }
  emit(type: string, value?: unknown): void {
    this.listeners.filter((item) => item.type === type).forEach((item) => item.callback.call(item.target, value));
  }
  addEventListener(type: string, callback: (...args: any[]) => void): void { this.on(type, callback); }
  removeEventListener(type: string, callback: (...args: any[]) => void): void { this.off(type, callback); }
}

class TestNode extends Events {
  static EventType = {
    TOUCH_START: 'touch-start', TOUCH_MOVE: 'touch-move', TOUCH_END: 'touch-end',
    MOUSE_DOWN: 'mouse-down', MOUSE_MOVE: 'mouse-move', MOUSE_UP: 'mouse-up', MOUSE_WHEEL: 'mouse-wheel',
  };
  active = false;
  valid = true;
}
class TestLabel {
  static Overflow = { SHRINK: 2 };
  node = new TestNode();
  string = '';
  font = null;
  fontFamily = 'Arial';
  fontSize = 44;
  lineHeight = 56;
  overflow = 0;
  enableWrapText = true;
}
const view = new Events();
const engineScreen = { windowSize: { width: 390, height: 219 } };
mock.module('cc', () => ({
  Node: TestNode, Label: TestLabel, Event: class {}, Color: class { constructor(..._args: unknown[]) {} },
  Sprite: class {}, SpriteAtlas: class {}, UIOpacity: class {}, Vec3: class {},
  assetManager: {}, sp: {}, view, screen: engineScreen,
  isValid: (value: { valid?: boolean } | undefined) => !!value && value.valid !== false,
}));
const { DzpkViewportGuidance } = await import('../creator-3.8.x-upgrade/assets/Standalone/DzpkViewportGuidance');
const { DzpkUiMessageService } = await import('../creator-3.8.x-upgrade/assets/Standalone/DzpkUiMessageService');
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const disposables: Array<{ dispose(): void }> = [];
afterEach(() => {
  for (const service of disposables.splice(0)) service.dispose();
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
  mock.restore();
});

const assetPath = new URL('../creator-3.8.x-upgrade/assets/', import.meta.url);
const scene = JSON.parse(readFileSync(new URL('Scene/DzpkStandaloneBoot.scene', assetPath), 'utf8'));
const boot = scene.find((item: any) => Object.hasOwn(item, 'messageLabel'));
const component = (node: any, type: string) => node._components.map((ref: any) => scene[ref.__id__]).find((item: any) => item.__type__ === type);

describe('Boot message and portrait guidance serialization', () => {
  test('binds the existing MessageOverlay to an enabled, readable native Label', () => {
    const message = scene[boot.messageLabel.__id__];
    const node = scene[message.node.__id__];
    expect(message.__type__).toBe('cc.Label');
    expect(message._enabled).toBe(true);
    expect(message._isSystemFontUsed).toBe(true);
    expect(message._font).toBeNull();
    expect(message._fontSize).toBeGreaterThanOrEqual(40);
    expect(message._enableOutline).toBe(true);
    expect(node._name).toBe('MessageOverlay');
    expect(node._active).toBe(false);
    expect(component(node, 'cc.Label')).toBe(message);
    expect(component(node, 'cc.UITransform')._contentSize.width).toBeLessThan(1334);
    expect(node._components.some((ref: any) => scene[ref.__id__].__type__ === 'cc.BlockInputEvents')).toBe(false);
  });

  test('uses a separate full-canvas blocker and large guidance text without new texture assets', () => {
    const guidance = scene[boot.portraitGuidance.__id__];
    const canvas = scene[boot.node.__id__];
    const messageNode = scene[scene[boot.messageLabel.__id__].node.__id__];
    const textNode = scene[guidance._children[0].__id__];
    const label = component(textNode, 'cc.Label');
    expect(guidance).not.toBe(messageNode);
    expect(canvas._children.at(-1).__id__).toBe(boot.portraitGuidance.__id__);
    expect(component(guidance, 'cc.UITransform')._contentSize).toMatchObject({ width: 1334, height: 750 });
    expect(component(guidance, 'cc.BlockInputEvents')._enabled).toBe(true);
    expect(label._string).toContain('旋转至横屏');
    expect(label._fontSize * 390 / 1334).toBeGreaterThan(20);
    expect(label._isSystemFontUsed).toBe(true);
    const existingSprite = scene.find((item: any) => item.__type__ === 'cc.Sprite' && item.node.__id__ !== boot.portraitGuidance.__id__);
    expect(component(guidance, 'cc.Sprite')._spriteFrame).toEqual(existingSprite._spriteFrame);
    expect(component(guidance, 'cc.Sprite')._color.a).toBe(255);
  });

  test('retains valid scene references and wires lifecycle cleanup without changing landscape resolution', () => {
    const check = (value: any): void => {
      if (!value || typeof value !== 'object') return;
      if (Object.hasOwn(value, '__id__')) expect(scene[value.__id__]).toBeDefined();
      Object.values(value).forEach(check);
    };
    check(scene);
    const ids = scene.map((item: any) => item._id).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
    const source = readFileSync(new URL('Standalone/StandaloneBoot.ts', assetPath), 'utf8');
    expect(source).toContain('new DzpkViewportGuidance(this.node, this.portraitGuidance)');
    expect(source).toContain('this.viewportGuidance?.dispose()');
    expect(source).toContain('this.viewportGuidance?.refresh()');
    expect(source).toContain('view.setDesignResolutionSize(1334, 750, ResolutionPolicy.SHOW_ALL)');
    const metadata = JSON.parse(readFileSync(new URL('Standalone/DzpkViewportGuidance.ts.meta', assetPath), 'utf8'));
    expect(metadata.importer).toBe('typescript');
    expect(metadata.uuid).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('Cocos portrait and low-balance behavior', () => {
  test('reads the document viewport rather than the adapted landscape canvas and restores input after rotation', () => {
    const { browser, canvas, guidance } = fixture();
    expect(engineScreen.windowSize).toEqual({ width: 390, height: 219 });
    expect(guidance.active).toBe(true);
    const portraitTouch = { propagationStopped: false };
    canvas.emit(TestNode.EventType.TOUCH_END, portraitTouch);
    expect(portraitTouch.propagationStopped).toBe(true);
    browser.innerWidth = 844;
    browser.innerHeight = 390;
    browser.emit('resize');
    expect(guidance.active).toBe(false);
    const landscapeTouch = { propagationStopped: false };
    canvas.emit(TestNode.EventType.TOUCH_END, landscapeTouch);
    expect(landscapeTouch.propagationStopped).toBe(false);
    browser.innerWidth = 390;
    browser.innerHeight = 844;
    view.emit('canvas-resize');
    expect(guidance.active).toBe(true);
    expect(canvas.listeners.every((item) => item.capture === true)).toBe(true);
    browser.innerWidth = 844;
    browser.innerHeight = 390;
    browser.visualViewport.emit('resize');
    expect(guidance.active).toBe(false);
  });

  test('removes every viewport and capture listener and ignores late resize callbacks after disposal', () => {
    const { browser, canvas, guidance, service } = fixture();
    expect(view.listeners).toHaveLength(1);
    expect(browser.listeners).toHaveLength(1);
    expect(browser.visualViewport.listeners).toHaveLength(1);
    expect(canvas.listeners).toHaveLength(7);
    service.dispose();
    service.dispose();
    expect(view.listeners).toHaveLength(0);
    expect(browser.listeners).toHaveLength(0);
    expect(browser.visualViewport.listeners).toHaveLength(0);
    expect(canvas.listeners).toHaveLength(0);
    expect(guidance.active).toBe(false);
    service.refresh();
    expect(guidance.active).toBe(false);
  });

  test('shows the real low-balance message for 2.5 seconds without hiding or replacing portrait guidance', () => {
    const { guidance } = fixture();
    const label = new TestLabel();
    const context = { currency: 'USD' };
    const before = JSON.stringify(context);
    const callbacks: Array<() => void> = [];
    const setTimer = spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void) => {
      callbacks.push(callback);
      return callbacks.length;
    }) as typeof setTimeout);
    const clearTimer = spyOn(globalThis, 'clearTimeout').mockImplementation(() => {});
    const ui = new DzpkUiMessageService(context as never, label as never, null);
    ui.enterRoomFailTips(1000);
    expect(label.node.active).toBe(true);
    expect(label.string).toBe('进入该房间至少需要 $1K 筹码');
    expect(label.overflow).toBe(TestLabel.Overflow.SHRINK);
    expect(label.enableWrapText).toBe(false);
    expect(setTimer.mock.calls[0]?.[1]).toBe(2500);
    expect(guidance.active).toBe(true);
    ui.enterRoomFailTips(2000);
    expect(clearTimer).toHaveBeenCalledTimes(1);
    callbacks.at(-1)!();
    expect(label.node.active).toBe(false);
    expect(guidance.active).toBe(true);
    expect(JSON.stringify(context)).toBe(before);
  });
});

function fixture() {
  const browser = Object.assign(new Events(), { innerWidth: 390, innerHeight: 844, visualViewport: new Events() });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
  const canvas = new TestNode();
  const guidance = new TestNode();
  const service = new DzpkViewportGuidance(canvas as never, guidance as never);
  disposables.push(service);
  return { browser, canvas, guidance, service };
}
