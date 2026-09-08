import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { readFileSync } from 'node:fs';

class Events {
  listeners: Array<{ type: string; callback: (...args: any[]) => void; target?: unknown; capture?: boolean }> = [];
  on(type: string, callback: (...args: any[]) => void, target?: unknown, capture?: boolean): void {
    this.listeners.push({ type, callback, target, capture });
  }
  off(type: string, callback?: (...args: any[]) => void, target?: unknown, capture?: boolean): void {
    this.listeners = this.listeners.filter((item) => item.type !== type || (callback !== undefined &&
      (item.callback !== callback || item.target !== target || item.capture !== capture)));
  }
  emit(type: string, value?: unknown): void {
    this.listeners.filter((item) => item.type === type).forEach((item) => item.callback.call(item.target, value));
  }
  addEventListener(type: string, callback: (...args: any[]) => void): void { this.on(type, callback); }
  removeEventListener(type: string, callback: (...args: any[]) => void): void { this.off(type, callback); }
}

class TestVec3 {
  constructor(public x = 0, public y = 0, public z = 0) {}
  clone() { return new TestVec3(this.x, this.y, this.z); }
}
class TestColor {
  r: number; g: number; b: number; a: number;
  constructor(r: number | TestColor = 255, g = 255, b = 255, a = 255) {
    if (typeof r === 'object') Object.assign(this, r);
    else Object.assign(this, { r, g, b, a });
  }
}

class TestNode extends Events {
  static EventType = {
    TOUCH_START: 'touch-start', TOUCH_MOVE: 'touch-move', TOUCH_END: 'touch-end',
    MOUSE_DOWN: 'mouse-down', MOUSE_MOVE: 'mouse-move', MOUSE_UP: 'mouse-up', MOUSE_WHEEL: 'mouse-wheel',
  };
  active = false;
  valid = true;
  parent: TestNode | null = null;
  children: TestNode[] = [];
  position = new TestVec3();
  components = new Map<any, any>();
  constructor(public name = '') { super(); }
  getChildByName(name: string) { return this.children.find((child) => child.name === name) ?? null; }
  add(name: string) { const child = new TestNode(name); child.parent = this; child.active = true; this.children.push(child); return child; }
  setPosition(x: number, y: number, z: number) { this.position = new TestVec3(x, y, z); }
  getComponent(type: any) { return this.components.get(type) ?? null; }
  addComponent(type: any) { const component = new type(); component.node = this; this.components.set(type, component); return component; }
  getComponentsInChildren(type: any): any[] {
    return [this.getComponent(type), ...this.children.flatMap((child) => child.getComponentsInChildren(type))].filter(Boolean);
  }
  click() { if (this.getComponent(TestButton)?.interactable && this.active) this.emit('click', { target: this }); }
}
class TestComponent { node = new TestNode(); }
class TestButton extends TestComponent { static EventType = { CLICK: 'click' }; interactable = true; }
class TestToggle extends TestComponent { interactable = true; isChecked = false; }
class TestSlider extends TestComponent { progress = 0; }
class TestProgressBar extends TestComponent { progress = 0; }
class TestSkeleton extends TestComponent { setCompleteListener(_callback: unknown) {} setAnimation(..._args: unknown[]) {} }
class TestLabel {
  static Overflow = { SHRINK: 2 };
  node = new TestNode();
  string = '';
  font: unknown = null;
  fontFamily = 'Arial';
  fontSize = 44;
  lineHeight = 56;
  overflow = 0;
  enableWrapText = true;
  isBold = false;
  isItalic = false;
  enableOutline = false;
  outlineWidth = 1;
  outlineColor = new TestColor(11, 22, 33, 255);
  color = new TestColor(240, 240, 240, 255);
}
const view = new Events();
const engineScreen = { windowSize: { width: 390, height: 219 } };
mock.module('cc', () => ({
  Node: TestNode, Label: TestLabel, Event: class {}, Color: TestColor, Component: TestComponent,
  Button: TestButton, Toggle: TestToggle, Slider: TestSlider, ProgressBar: TestProgressBar,
  Sprite: class {}, SpriteAtlas: class {}, UIOpacity: class {}, Vec3: TestVec3, Animation: class {}, Tween: class {},
  NodePool: class {},
  instantiate: () => { throw new Error('Prefab instantiation is outside this focused test'); },
  tween: () => { throw new Error('Animation is outside this focused test'); },
  find: (path: string, root: TestNode) => path.split('/').reduce((node, name) => node?.getChildByName(name), root),
  _decorator: { ccclass: () => (value: unknown) => value, property: () => () => undefined },
  assetManager: {}, sp: { Skeleton: TestSkeleton }, view, screen: engineScreen,
  isValid: (value: { valid?: boolean } | undefined) => !!value && value.valid !== false,
}));
const { DzpkViewportGuidance } = await import('../creator-3.8.x-upgrade/assets/Standalone/DzpkViewportGuidance');
const { DzpkUiMessageService } = await import('../creator-3.8.x-upgrade/assets/Standalone/DzpkUiMessageService');
const { applyDzpkAmountLabel, restoreDzpkAmountLabel, DZPK_ROOM_SYSTEM_FONT_STYLE } = await import('../creator-3.8.x-upgrade/assets/Standalone/DzpkUiHelpers');
const { installDzpkRuntimeServices, clearDzpkRuntimeServices } = await import('../creator-3.8.x-upgrade/assets/Standalone/DzpkRuntimeServices');
const { DzpkTablePresentation } = await import('../creator-3.8.x-upgrade/assets/DZPK/_semantic/DzpkTablePresentation');
const { DzpkTableGameController } = await import('../creator-3.8.x-upgrade/assets/DZPK/_semantic/DzpkTableGameController');
const { DzpkRoomSelectionController } = await import('../creator-3.8.x-upgrade/assets/DZPK/_semantic/DzpkRoomSelectionController');
const { DzpkTableStateModel, DzpkParticipantState } = await import('../creator-3.8.x-upgrade/assets/DZPK/_semantic/DzpkTableStateModel');
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const disposables: Array<{ dispose(): void }> = [];
afterEach(() => {
  for (const service of disposables.splice(0)) service.dispose();
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
  mock.restore();
  clearDzpkRuntimeServices();
});

describe('Room fallback style and raise panel regression', () => {
  test('Room fallback uses font-size line height and restores the original CNY line height and style', () => {
    const label = new TestLabel();
    const originalFont = { name: 'room_xz.fnt' };
    label.font = originalFont;
    label.fontSize = 30; label.lineHeight = 40; label.node.position.y = 39.634;
    const initial = { color: { ...label.color }, outline: { ...label.outlineColor } };
    const options = { maxCharacters: 5, sourceTenThousandDecimals: 0, sourceHundredMillionDecimals: 0,
      bitmapFontProfile: 'CNY_INTEGER_UNITS' as const,
      roomSystemFontStyle: DZPK_ROOM_SYSTEM_FONT_STYLE.limit };
    for (let repeat = 0; repeat < 3; repeat++) {
      expect(applyDzpkAmountLabel(label as never, 500000, 'USD', options)).toBe('500K');
      expect(label.fontSize).toBe(30); expect(label.lineHeight).toBe(30);
      expect(label.isItalic).toBe(true); expect(label.isBold).toBe(false); expect(label.enableOutline).toBe(true);
      expect(label.outlineColor).toMatchObject({ r: 35, g: 31, b: 23 });
      expect(label.node.position.y).toBe(39.634);
    }
    expect(applyDzpkAmountLabel(label as never, 500000, 'VND', options)).toBe('500N');
    expect(label.string.length).toBeLessThanOrEqual(5);
    expect(applyDzpkAmountLabel(label as never, 500000, 'CNY', options)).toBe('50万');
    expect(label.font).toBe(originalFont); expect(label.isItalic).toBe(false); expect(label.isBold).toBe(false);
    expect(label.lineHeight).toBe(40);
    expect(label.enableOutline).toBe(false); expect(label.outlineColor).toEqual(initial.outline);
    expect(label.color).toEqual(initial.color); expect(label.node.position.y).toBe(39.634);
  });

  test('Room restores original maximum-carry CNY art text/font/style/Y after USD and VND', () => {
    const room = new TestNode('rooms');
    const card = room.add('1');
    const label = card.add('3').addComponent(TestLabel) as TestLabel;
    const originalFont = { name: '3.fnt' };
    label.font = originalFont; label.string = '1bw'; label.fontSize = 50; label.lineHeight = 40;
    label.node.position.y = 10.396;
    const gameContext = { currency: 'USD', roomConfig: { '2': { level: 2, min_gold: 200000, max_gold: 1000000, doublescore: 1000 } } };
    installDzpkRuntimeServices({ gameContext } as never);
    const controller = new DzpkRoomSelectionController();
    controller.roomChoiceContainer = room as never;
    const render = () => (controller as unknown as { renderRoomConfigurationLabels(): void }).renderRoomConfigurationLabels();
    render(); render();
    expect(label.string).toBe('1M'); expect(label.fontSize).toBe(50); expect(label.lineHeight).toBe(50);
    expect(label.isBold).toBe(true); expect(label.isItalic).toBe(true); expect(label.enableOutline).toBe(true);
    expect(label.outlineColor).toMatchObject({ r: 91, g: 49, b: 17 }); expect(label.node.position.y).toBe(10.396);
    gameContext.currency = 'VND'; render();
    expect(label.string).toBe('1Tr'); expect(label.string.length).toBeLessThanOrEqual(5); expect(label.node.position.y).toBe(10.396);
    gameContext.currency = 'CNY'; render();
    expect(label.string).toBe('1bw'); expect(label.font).toBe(originalFont); expect(label.node.position.y).toBe(10.396);
    expect(label.fontSize).toBe(50); expect(label.lineHeight).toBe(40); expect(label.isBold).toBe(false); expect(label.isItalic).toBe(false);
    expect(label.enableOutline).toBe(false);
    restoreDzpkAmountLabel(label as never);
    expect(label.string).toBe('1bw');
  });

  test('opening a previously disabled raise tree restores submit/add/sub but retains the preset stack filter', () => {
    const fixture = raiseFixture();
    fixture.presentation.showPlayerActionControls('bet', 200000, fixture.model);
    expect(fixture.submit.getComponent(TestButton).interactable).toBe(false);
    fixture.open();
    for (const node of [fixture.submit, fixture.add, fixture.sub]) expect(node.getComponent(TestButton).interactable).toBe(true);
    const belowMinimum = fixture.raise.getChildByName('0')!;
    expect(belowMinimum.getComponent(TestButton).interactable).toBe(false);
    expect(fixture.raise.getChildByName('1')!.getComponent(TestButton).interactable).toBe(true);
    expect(fixture.raise.getChildByName('4')!.getComponent(TestButton).interactable).toBe(false);
    belowMinimum.click();
    expect(fixture.sent).toEqual([]);
    for (let repeat = 0; repeat < 3; repeat++) {
      fixture.presentation.setRaiseSelectionVisible(false, [], 0, 0);
      expect(fixture.submit.getComponent(TestButton).interactable).toBe(false);
      fixture.open();
    }
    expect(fixture.add.listeners.filter(({ type }) => type === 'click')).toHaveLength(1);
    expect(fixture.sub.listeners.filter(({ type }) => type === 'click')).toHaveLength(1);
    fixture.add.click();
    expect(fixture.presentation.readContributionFromButtonTarget(fixture.submit)).toBe(400000);
    fixture.sub.click();
    expect(fixture.presentation.readContributionFromButtonTarget(fixture.submit)).toBe(300000);
    fixture.presentation.handleRaiseSliderChanged({ progress: 0.98 });
    expect(fixture.presentation.readContributionFromButtonTarget(fixture.submit)).toBe(9800000);
    fixture.submit.click(); fixture.submit.click();
    expect(fixture.sent).toEqual([{ event: 'Msg_DZPK_ActBet', data: { gold: 9800000 } }]);
  });

  test('a short stack can still submit its legal all-in while smaller fixed presets remain disabled', () => {
    const fixture = raiseFixture();
    fixture.model.viewerParticipant!.stackChips = 200000;
    fixture.presentation.setRaiseSelectionVisible(true, [100000, 200000, 400000, 800000, 12000000, 300000], 200000, 100000);
    expect(fixture.raise.getChildByName('0')!.getComponent(TestButton).interactable).toBe(false);
    expect(fixture.submit.getComponent(TestButton).interactable).toBe(true);
    expect(fixture.presentation.readContributionFromButtonTarget(fixture.submit)).toBe(200000);
    fixture.submit.click();
    expect(fixture.sent).toEqual([{ event: 'Msg_DZPK_ActBet', data: { gold: 200000 } }]);
  });
});

function raiseFixture() {
  const root = new TestNode('table'); root.active = true;
  const controls = root.add('btn');
  const bet = controls.add('bet');
  for (const group of ['dm', 'dichi']) for (let index = 0, node = bet.add(group); index < 3; index++) node.add(String(index)).addComponent(TestButton);
  for (const name of ['btn_yellow', 'btn_rang', 'btn_green']) bet.add(name).addComponent(TestButton);
  bet.getChildByName('btn_green')!.add('layout').add('label').addComponent(TestLabel);
  const raise = controls.add('jiabet');
  for (let index = 0; index < 5; index++) { const node = raise.add(String(index)); node.addComponent(TestButton); node.add('label').addComponent(TestLabel); }
  const submit = raise.add('btn'); submit.addComponent(TestButton);
  const sliderRoot = raise.add('slider'); const slider = sliderRoot.add('slider');
  slider.addComponent(TestSlider); slider.addComponent(TestProgressBar);
  const handle = slider.add('Handle'); handle.add('label').addComponent(TestLabel);
  const add = handle.add('btn_add'); add.addComponent(TestButton); const sub = handle.add('btn_sub'); sub.addComponent(TestButton);
  const spine = slider.add('spine'); spine.active = false; spine.addComponent(TestSkeleton);
  const layout = slider.add('bar').add('layout');
  for (let index = 0; index < 31; index++) layout.add(String(index));
  layout.add('anim');
  const presentation = new DzpkTablePresentation(); presentation.node = root as never;
  const model = new DzpkTableStateModel();
  model.viewerParticipant = new DzpkParticipantState({ uid: 7001, gold: 10000000, join: true });
  model.currentActionNotice = { uid: 7001, minbet: 200000 };
  model.smallBlindChips = 100000;
  const controller = new DzpkTableGameController(); controller.node = root as never;
  Reflect.set(controller, 'tablePresentation', presentation); Reflect.set(controller, 'tableStateModel', model);
  const sent: Array<{ event: string; data: unknown }> = [];
  installDzpkRuntimeServices({ gameContext: { currency: 'USD' }, audioService: { playButtonSound() {} },
    authenticatedTransport: { sendSourceEvent(event: string, data: unknown) { sent.push({ event, data }); } } } as never);
  submit.on('click', (event) => controller.submitRaiseSelectionFromButton(event as never));
  for (let index = 0; index < 5; index++) raise.getChildByName(String(index))!.on('click',
    (event) => controller.submitRaiseSelectionFromButton(event as never));
  return { presentation, model, raise, submit, add, sub, sent,
    open: () => presentation.setRaiseSelectionVisible(true, [200000, 400000, 800000, 1000000, 12000000, 300000], 10000000, 100000) };
}

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
