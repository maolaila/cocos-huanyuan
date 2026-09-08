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
  addEventListener(type: string, callback: (...args: any[]) => void, capture?: boolean): void { this.on(type, callback, undefined, capture); }
  removeEventListener(type: string, callback: (...args: any[]) => void, capture?: boolean): void { this.off(type, callback, undefined, capture); }
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
    CHILD_ADDED: 'child-added',
  };
  active = false;
  valid = true;
  parent: TestNode | null = null;
  children: TestNode[] = [];
  position = new TestVec3();
  scale = new TestVec3(1, 1, 1);
  components = new Map<any, any>();
  constructor(public name = '') { super(); }
  getChildByName(name: string) { return this.children.find((child) => child.name === name) ?? null; }
  add(name: string) { const child = new TestNode(name); child.parent = this; child.active = true; this.children.push(child); return child; }
  setPosition(x: number, y: number, z: number) { this.position = new TestVec3(x, y, z); }
  setScale(x: number, y: number, z: number) { this.scale = new TestVec3(x, y, z); }
  getComponent(type: any) { return this.components.get(type) ?? null; }
  addComponent(type: any) { const component = new type(); component.node = this; this.components.set(type, component); return component; }
  getComponentsInChildren(type: any): any[] {
    return [this.getComponent(type), ...this.children.flatMap((child) => child.getComponentsInChildren(type))].filter(Boolean);
  }
  click() { if (this.getComponent(TestButton)?.interactable && this.active) this.emit('click', { target: this }); }
}
class TestComponent { node = new TestNode(); }
class TestAudioSource extends TestComponent {
  static EventType = { STARTED: 'started', ENDED: 'ended' };
  volume = 1; loop = false; playOnAwake = true; clip: unknown = null;
  playing = false; playCalls = 0; pauseCalls = 0; oneShots: unknown[] = [];
  onPlay: (() => void) | null = null;
  play() { this.playCalls++; this.onPlay?.(); }
  start() { this.playing = true; this.node.emit(TestAudioSource.EventType.STARTED); }
  pause() { this.pauseCalls++; this.playing = false; }
  stop() { this.playing = false; }
  playOneShot(clip: unknown) { this.oneShots.push(clip); }
}
const audioStorage = new Map<string, string>();
let storageThrows = false;
const audioSys = { isBrowser: true, localStorage: {
  getItem(key: string) { if (storageThrows) throw new Error('storage unavailable'); return audioStorage.get(key) ?? null; },
  setItem(key: string, value: string) { if (storageThrows) throw new Error('storage unavailable'); audioStorage.set(key, value); },
} };
class TestButton extends TestComponent { static EventType = { CLICK: 'click' }; interactable = true; }
class TestToggle extends TestComponent { interactable = true; isChecked = false; }
class TestSlider extends TestComponent { progress = 0; }
class TestProgressBar extends TestComponent { progress = 0; }
class TestUITransform extends TestComponent { contentSize = { width: 1624, height: 750 }; }
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
const policies = { SHOW_ALL: 2, FIXED_HEIGHT: 3, FIXED_WIDTH: 4 };
const resolutionCalls: Array<{ width: number; height: number; policy: number }> = [];
let visibleSize = { width: 1334, height: 750 };
const view = Object.assign(new Events(), {
  getVisibleSize: () => ({ ...visibleSize }),
  setDesignResolutionSize(width: number, height: number, policy: number) {
    resolutionCalls.push({ width, height, policy });
    const browser = globalThis.window;
    const frameWidth = browser?.visualViewport?.width || browser?.innerWidth || 1334;
    const frameHeight = browser?.visualViewport?.height || browser?.innerHeight || 750;
    visibleSize = policy === policies.FIXED_HEIGHT ? { width: height * frameWidth / frameHeight, height }
      : policy === policies.FIXED_WIDTH ? { width, height: width * frameHeight / frameWidth } : { width, height };
    view.emit('canvas-resize'); // Deliberately exercise the synchronous recursion guard.
  },
});
const engineScreen = { windowSize: { width: 390, height: 219 } };
mock.module('cc', () => ({
  Node: TestNode, Label: TestLabel, Event: class {}, Color: TestColor, Component: TestComponent,
  Button: TestButton, Toggle: TestToggle, Slider: TestSlider, ProgressBar: TestProgressBar,
  UITransform: TestUITransform, ResolutionPolicy: policies,
  AudioSource: TestAudioSource, sys: audioSys,
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
const { DzpkBrowserPresentation } = await import('../creator-3.8.x-upgrade/assets/Standalone/DzpkBrowserPresentation');
const { DzpkAudioService } = await import('../creator-3.8.x-upgrade/assets/Standalone/DzpkAudioService');
const { DzpkUiMessageService } = await import('../creator-3.8.x-upgrade/assets/Standalone/DzpkUiMessageService');
const { applyDzpkAmountLabel, restoreDzpkAmountLabel, DZPK_ROOM_SYSTEM_FONT_STYLE } = await import('../creator-3.8.x-upgrade/assets/Standalone/DzpkUiHelpers');
const { installDzpkRuntimeServices, clearDzpkRuntimeServices } = await import('../creator-3.8.x-upgrade/assets/Standalone/DzpkRuntimeServices');
const { DzpkTablePresentation } = await import('../creator-3.8.x-upgrade/assets/DZPK/_semantic/DzpkTablePresentation');
const { DzpkTableGameController } = await import('../creator-3.8.x-upgrade/assets/DZPK/_semantic/DzpkTableGameController');
const { DzpkRoomSelectionController } = await import('../creator-3.8.x-upgrade/assets/DZPK/_semantic/DzpkRoomSelectionController');
const { DzpkViewNavigator } = await import('../creator-3.8.x-upgrade/assets/Standalone/DzpkViewNavigator');
const { DzpkTableStateModel, DzpkParticipantState } = await import('../creator-3.8.x-upgrade/assets/DZPK/_semantic/DzpkTableStateModel');
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const disposables: Array<{ dispose(): void }> = [];
afterEach(() => {
  for (const service of disposables.splice(0)) service.dispose();
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
  mock.restore();
  clearDzpkRuntimeServices();
  resolutionCalls.length = 0;
  visibleSize = { width: 1334, height: 750 };
  audioStorage.clear(); storageThrows = false;
});

describe('Room fallback style and raise panel regression', () => {
  test('navigator missing transport fails without closing, then can retry and waits for server acknowledgment', async () => {
    const canvas = new TestNode(); canvas.add('Room'); canvas.add('Game'); canvas.add('UIShow');
    const tips: string[] = [];
    let closed = 0;
    const browser: any = { parent: null, opener: null, closed: false,
      close() { closed++; this.closed = true; }, setTimeout() { return 1; } };
    browser.parent = browser;
    Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
    const navigator = new DzpkViewNavigator(canvas as never, {} as never,
      { postMessageTargetOrigin: '' } as never, {} as never, {} as never, { showTips: (text: string) => tips.push(text) } as never);
    expect(await navigator.requestStandaloneExit({ closePage: true })).toBe(false);
    expect(closed).toBe(0); expect(tips).toHaveLength(1);
    let acknowledge!: (sid: string) => void;
    navigator.setAuthenticatedTransport({ endAuthenticatedSession: () => new Promise<string>(resolve => { acknowledge = resolve; }) } as never);
    const one = navigator.requestStandaloneExit({ closePage: true });
    const two = navigator.requestStandaloneExit({ closePage: true });
    expect(one).toBe(two); expect(closed).toBe(0);
    acknowledge('sid_test');
    expect(await one).toBe(true); expect(closed).toBe(1);
  });

  test('Room fallback follows the existing caption rows without accumulating offsets or moving CNY', () => {
    const room = new TestNode('rooms');
    const card = room.add('1');
    card.add('dzpk_room_xiazhu').position.y = 49.213;
    card.add('image_free').position.y = -41.643;
    const amounts = ['room_xz', 'room_xz copy', 'room_zr'].map((name) => {
      const label = card.add(name).addComponent(TestLabel) as TestLabel;
      label.font = { name: 'original-room-font' };
      label.node.position.y = name === 'room_zr' ? -52.202 : 39.634;
      return label;
    });
    const context = { currency: 'USDT', roomConfig: { '2': { level: 2, min_gold: 200000, max_gold: 1000000, doublescore: 1000 } } };
    installDzpkRuntimeServices({ gameContext: context } as never);
    const controller = new DzpkRoomSelectionController();
    controller.roomChoiceContainer = room as never;
    const render = () => (controller as unknown as { renderRoomConfigurationLabels(): void }).renderRoomConfigurationLabels();
    for (const currency of ['USDT', 'USD', 'VND']) {
      context.currency = currency;
      render(); render();
      expect(amounts.map((label) => label.node.position.y)).toEqual([49.213, 49.213, -41.643]);
    }
    context.currency = 'CNY'; render();
    expect(amounts.map((label) => label.node.position.y)).toEqual([39.634, 39.634, -52.202]);
    context.currency = 'USDT'; render();
    expect(amounts.map((label) => label.node.position.y)).toEqual([49.213, 49.213, -41.643]);
  });

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
    expect(source).toContain('this.audioService?.dispose()');
    expect(source).toContain('this.viewportGuidance?.refresh()');
    expect(source).toContain('view.setDesignResolutionSize(1334, 750, ResolutionPolicy.SHOW_ALL)');
    const metadata = JSON.parse(readFileSync(new URL('Standalone/DzpkViewportGuidance.ts.meta', assetPath), 'utf8'));
    expect(metadata.importer).toBe('typescript');
    expect(metadata.uuid).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('Cocos portrait and low-balance behavior', () => {
  test('fills wide and narrow landscape frames proportionally without recursive policy churn', () => {
    const { browser, service, guidance } = fixture(2400, 750);
    expect(resolutionCalls).toEqual([{ width: 1334, height: 750, policy: policies.FIXED_HEIGHT }]);
    expect(guidance.active).toBe(false);
    expect(visibleSize).toEqual({ width: 2400, height: 750 });
    service.refresh(); view.emit('canvas-resize');
    expect(resolutionCalls).toHaveLength(1);
    browser.innerWidth = 1200; browser.innerHeight = 900; browser.emit('resize');
    expect(resolutionCalls.at(-1)?.policy).toBe(policies.FIXED_WIDTH);
    expect(visibleSize.width).toBe(1334); expect(visibleSize.height).toBeCloseTo(1000.5);
    browser.innerWidth = 390; browser.innerHeight = 844; browser.visualViewport.emit('resize');
    expect(resolutionCalls.at(-1)?.policy).toBe(policies.SHOW_ALL);
    expect(guidance.active).toBe(true);
  });

  test('covers only original Room/Table backgrounds on attachment and repeated resizing without scale drift', () => {
    const { browser, service, rooms, games } = fixture(2400, 750);
    const room = new TestNode('Room'); room.active = true;
    const background = room.add('bg'); background.addComponent(TestUITransform);
    const ui = room.add('roomChoice');
    room.parent = rooms; rooms.children.push(room); rooms.emit(TestNode.EventType.CHILD_ADDED, room);
    expect(background.scale.x).toBeCloseTo(2400 / 1624);
    expect(background.scale.y).toBeCloseTo(2400 / 1624);
    expect(ui.scale).toEqual(new TestVec3(1, 1, 1));
    const table = new TestNode('DZPKMain'); table.active = true;
    const tableBackground = table.add('bg'); tableBackground.addComponent(TestUITransform);
    table.parent = games; games.children.push(table); games.emit(TestNode.EventType.CHILD_ADDED, table);
    expect(tableBackground.scale.x).toBeCloseTo(2400 / 1624);
    service.refresh(); service.refresh();
    expect(background.scale.x).toBeCloseTo(2400 / 1624);
    browser.innerWidth = 1334; browser.innerHeight = 750; browser.emit('resize');
    expect(background.scale).toEqual(new TestVec3(1, 1, 1));
    expect(tableBackground.scale).toEqual(new TestVec3(1, 1, 1));
    service.dispose();
    expect(rooms.listeners).toHaveLength(0); expect(games.listeners).toHaveLength(0);
  });
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

function fixture(width = 390, height = 844) {
  const browser = Object.assign(new Events(), { innerWidth: width, innerHeight: height, visualViewport: new Events() });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
  const canvas = new TestNode();
  const rooms = canvas.add('Room'); const games = canvas.add('Game');
  const guidance = new TestNode();
  const service = new DzpkViewportGuidance(canvas as never, guidance as never);
  disposables.push(service);
  return { browser, canvas, guidance, service, rooms, games };
}

describe('browser fullscreen lifecycle', () => {
  test('does not overlap pending fullscreen requests and retries after a rejected request without overriding a later success', async () => {
    const fixture = browserFixture('standard');
    let requests = 0;
    let reject!: (error: Error) => void;
    fixture.root.requestFullscreen = () => { requests++; return new Promise<void>((_resolve, fail) => { reject = fail; }); };
    const service = new DzpkBrowserPresentation(fixture.browser as never, () => undefined); disposables.push(service);
    fixture.document.emit('touchend', { isTrusted: true, timeStamp: 1000 });
    fixture.document.emit('pointerup', { isTrusted: true, timeStamp: 2000 });
    expect(requests).toBe(1);
    reject(new Error('denied')); await Promise.resolve();
    fixture.document.emit('touchend', { isTrusted: true, timeStamp: 3000 });
    expect(requests).toBe(2);
    fixture.document.fullscreenElement = fixture.root; fixture.document.emit('fullscreenchange');
    fixture.document.fullscreenElement = null; fixture.document.emit('fullscreenchange');
    reject(new Error('late rejection')); await Promise.resolve();
    fixture.document.emit('touchend', { isTrusted: true, timeStamp: 5000 });
    expect(requests).toBe(2); expect(service.nativeFullscreenActive).toBe(false);
  });

  test('disabled permission does not request fullscreen or attach gesture listeners', () => {
    const fixture = browserFixture('standard'); fixture.document.fullscreenEnabled = false;
    const service = new DzpkBrowserPresentation(fixture.browser as never, () => undefined); disposables.push(service);
    fixture.document.emit('touchend', { isTrusted: true });
    expect(service.fullscreenSupported).toBe(false); expect(fixture.requests()).toBe(0);
    expect(fixture.document.listeners).toHaveLength(0); expect(fixture.styles[0].textContent).toContain('100dvh');
  });

  test('uses the first trusted gesture synchronously once and never claims fullscreen from a resolved promise', async () => {
    const fixture = browserFixture('standard');
    const service = new DzpkBrowserPresentation(fixture.browser as never, () => undefined);
    disposables.push(service);
    expect(service.fullscreenSupported).toBe(true); expect(service.fullscreenAttempted).toBe(false);
    expect(fixture.styles[0].textContent).toContain('100dvh');
    fixture.document.emit('pointerup', { isTrusted: false });
    expect(fixture.requests()).toBe(0);
    fixture.document.emit('touchend', { isTrusted: true });
    expect(fixture.requests()).toBe(1); // No async wait: the API was called inside the trusted event.
    await Promise.resolve();
    expect(service.nativeFullscreenActive).toBe(false);
    fixture.document.fullscreenElement = fixture.root;
    fixture.document.emit('fullscreenchange');
    expect(service.nativeFullscreenActive).toBe(true);
    fixture.document.fullscreenElement = null; fixture.document.emit('fullscreenchange');
    fixture.document.emit('pointerup', { isTrusted: true });
    expect(fixture.requests()).toBe(1);
    service.dispose();
    expect(fixture.document.listeners).toHaveLength(0); expect(fixture.styles).toHaveLength(0);
  });

  test('keeps unsupported browsers in viewport mode and bounds denied retries to distinct trusted gestures', async () => {
    for (const mode of ['unsupported', 'denied'] as const) {
      const fixture = browserFixture(mode);
      const service = new DzpkBrowserPresentation(fixture.browser as never, () => undefined);
      disposables.push(service);
      fixture.document.emit('pointerup', { isTrusted: true, timeStamp: 1000 });
      await Promise.resolve();
      expect(service.fullscreenSupported).toBe(mode !== 'unsupported');
      expect(service.nativeFullscreenActive).toBe(false);
      expect(fixture.requests()).toBe(mode === 'denied' ? 1 : 0);
      fixture.document.emit('touchend', { isTrusted: true, timeStamp: 1001 });
      expect(fixture.requests()).toBe(mode === 'denied' ? 1 : 0); // Paired pointer/touch events are one gesture.
      fixture.document.emit('touchend', { isTrusted: false, timeStamp: 2000 });
      expect(fixture.requests()).toBe(mode === 'denied' ? 1 : 0);
      fixture.document.emit('touchend', { isTrusted: true, timeStamp: 2000 });
      await Promise.resolve();
      fixture.document.emit('pointerup', { isTrusted: true, timeStamp: 3000 });
      await Promise.resolve();
      fixture.document.emit('touchend', { isTrusted: true, timeStamp: 4000 });
      expect(fixture.requests()).toBe(mode === 'denied' ? 3 : 0);
      service.dispose();
      expect(fixture.document.listeners).toHaveLength(0); expect(fixture.styles).toHaveLength(0);
    }
  });

  test('waits for audio-first event propagation even with activation, and supports WebKit/Mozilla/MS without claiming success', () => {
    for (const mode of ['webkit', 'moz', 'ms'] as const) {
    const active = browserFixture(mode); active.browser.navigator.userActivation.isActive = true;
    const activated = new DzpkBrowserPresentation(active.browser as never, () => undefined);
    disposables.push(activated);
    expect(active.requests()).toBe(0);
    active.document.emit('touchend', { isTrusted: true, timeStamp: 1000 });
    expect(active.requests()).toBe(1); expect(activated.nativeFullscreenActive).toBe(false);
    const elementKey = mode === 'webkit' ? 'webkitFullscreenElement' : mode === 'moz' ? 'mozFullScreenElement' : 'msFullscreenElement';
    const changeEvent = mode === 'webkit' ? 'webkitfullscreenchange' : mode === 'moz' ? 'mozfullscreenchange' : 'MSFullscreenChange';
    Reflect.set(active.document, elementKey, active.root); active.document.emit(changeEvent);
    expect(activated.nativeFullscreenActive).toBe(true);
    Reflect.set(active.document, elementKey, null); active.document.emit(changeEvent);
    active.document.emit('touchend', { isTrusted: true, timeStamp: 3000 });
    expect(active.requests()).toBe(1);
    }
    const pending = browserFixture('standard');
    const disposed = new DzpkBrowserPresentation(pending.browser as never, () => undefined);
    disposed.dispose();
    pending.document.emit('touchend', { isTrusted: true });
    expect(pending.requests()).toBe(0);
    expect(pending.document.listeners).toHaveLength(0);
  });
});

function browserFixture(mode: 'standard' | 'webkit' | 'moz' | 'ms' | 'unsupported' | 'denied') {
  let requests = 0;
  const styles: any[] = [];
  const root: Record<string, unknown> = {};
  const document = Object.assign(new Events(), { documentElement: root, fullscreenEnabled: true,
    fullscreenElement: null as Record<string, unknown> | null,
    head: { appendChild(style: unknown) { styles.push(style); } },
    createElement() { const style = { textContent: '', setAttribute() {}, remove() { const index = styles.indexOf(style); if (index >= 0) styles.splice(index, 1); } }; return style; },
  });
  if (mode === 'standard' || mode === 'denied') root.requestFullscreen = (options: unknown) => {
    requests += 1; expect(options).toEqual({ navigationUI: 'hide' });
    return mode === 'denied' ? Promise.reject(new Error('denied')) : Promise.resolve();
  };
  if (mode === 'webkit') root.webkitRequestFullscreen = () => { requests += 1; };
  if (mode === 'moz') root.mozRequestFullScreen = () => { requests += 1; };
  if (mode === 'ms') root.msRequestFullscreen = () => { requests += 1; };
  const browser = Object.assign(new Events(), { document, navigator: { maxTouchPoints: 1, userAgent: 'offline touch device', userActivation: { isActive: false } } });
  return { document, root, styles, browser, requests: () => requests };
}

describe('browser audio defaults, activation and asynchronous cleanup', () => {
  test('missing/empty/invalid storage defaults to one, explicit zero survives and storage failures do not interrupt play', () => {
    for (const value of [undefined, '', '  ', 'invalid', 'NaN', 'Infinity', '-1', '2', '0', '0.35']) {
      audioStorage.clear();
      if (value !== undefined) { audioStorage.set('MusicVolume', value); audioStorage.set('SoundVolume', value); }
      const { service } = audioFixture();
      const expected = value === '0' ? 0 : value === '0.35' ? 0.35 : 1;
      expect(service.getMusicVolume()).toBe(expected); expect(service.getSoundVolume()).toBe(expected);
      service.dispose();
    }
    storageThrows = true;
    const { service } = audioFixture();
    expect(service.getMusicVolume()).toBe(1); expect(service.getSoundVolume()).toBe(1);
    expect(() => { service.setMusicVolume(0); service.setSoundVolume(0.4); }).not.toThrow();
    expect(service.getMusicVolume()).toBe(0); expect(service.getSoundVolume()).toBe(0.4);
    storageThrows = false; service.setSoundVolume(0);
    expect(audioStorage.get('SoundVolume')).toBe('0');
  });

  test('preloads before gestures, ignores synthetic/early input, and unlocks effects only after a real STARTED state', async () => {
    const { service, browser, music, effect, loads, gesture } = audioFixture();
    service.playBackgroundMusic('sound/bgm'); expect(loads).toHaveLength(1);
    gesture('touchend'); gesture('pointerup', { pointerType: 'touch' });
    expect(music.playCalls).toBe(0); expect(loads).toHaveLength(1);
    loads[0].resolve({ name: 'bgm' }); await flushAudio();
    expect(music.clip).toEqual({ name: 'bgm' }); expect(music.playCalls).toBe(0);
    gesture('touchend', { isTrusted: false }); gesture('pointerdown');
    gesture('pointerup', { pointerType: 'mouse' }); gesture('mousedown', { button: 2 });
    gesture('keydown', { key: 'Escape' }); gesture('keydown', { key: 'a', ctrlKey: true });
    gesture('keydown', { key: 'a', repeat: true }); expect(music.playCalls).toBe(0);
    gesture('touchend'); expect(music.playCalls).toBe(1); // Synchronous, without waiting for a microtask.
    service.playButtonSound(); expect(loads).toHaveLength(1);
    music.node.emit(TestAudioSource.EventType.STARTED); // A stale event without playing cannot unlock.
    service.playButtonSound(); expect(loads).toHaveLength(1);
    gesture('pointerup', { pointerType: 'touch' }); expect(music.playCalls).toBe(2);
    music.start(); service.playButtonSound(); expect(loads[1].path).toBe('sound/button');
    loads[1].resolve({ name: 'button' }); await flushAudio();
    expect(effect.oneShots).toEqual([{ name: 'button' }]);
    gesture('touchend'); expect(music.playCalls).toBe(2);
    expect(browser.listeners.every(listener => listener.capture === true)).toBe(true);
  });

  test('retries failed loading/play on a later trusted gesture without starting an outdated BGM request', async () => {
    spyOn(console, 'warn').mockImplementation(() => {});
    const { service, music, loads, gesture } = audioFixture();
    service.playBackgroundMusic('old'); service.playBackgroundMusic('new', false);
    loads[0].resolve({ name: 'old' }); await flushAudio(); expect(music.clip).toBeNull();
    loads[1].reject(new Error('temporary loading failure')); await flushAudio();
    gesture('mousedown', { button: 0 }); expect(loads[2].path).toBe('new');
    gesture('keydown', { key: 'Enter' }); expect(loads).toHaveLength(3);
    loads[2].resolve({ name: 'new' }); await flushAudio();
    expect(music.loop).toBe(false); expect(music.playCalls).toBe(0);
    music.onPlay = () => { throw new Error('denied'); };
    expect(() => gesture('keydown', { key: 'Enter' })).not.toThrow();
    expect(music.playCalls).toBe(1);
    music.onPlay = () => music.start(); gesture('mousedown', { button: 0 });
    expect(music.playCalls).toBe(2); expect(music.playing).toBe(true);
    service.playBackgroundMusic('third'); service.playBackgroundMusic('fourth');
    loads[4].resolve({ name: 'fourth' }); await flushAudio();
    loads[3].resolve({ name: 'third' }); await flushAudio();
    expect(music.clip).toEqual({ name: 'fourth' }); expect(music.playCalls).toBe(3);
    music.playing = false; music.node.emit(TestAudioSource.EventType.ENDED);
    gesture('touchend'); expect(music.playCalls).toBe(3);
  });

  test('background pauses, late audio stays stopped, foreground can retry and stopped effects never reappear', async () => {
    const { service, music, effect, loads, gesture } = audioFixture();
    service.playBackgroundMusic('bgm'); loads[0].resolve({ name: 'bgm' }); await flushAudio();
    music.onPlay = () => music.start(); gesture('touchend');
    service.playSound('loop', true); loads[1].resolve({ name: 'loop' }); await flushAudio();
    service.playSound('late');
    service.pauseForBackground(); const before = music.playCalls;
    loads[2].resolve({ name: 'late' }); await flushAudio();
    gesture('touchend'); expect(music.playCalls).toBe(before); expect(effect.oneShots).toHaveLength(0);
    music.start(); expect(music.playing).toBe(false);
    music.onPlay = null; service.resumeAfterForeground();
    expect(music.playCalls).toBe(before + 1); expect(effect.playCalls).toBe(2);
    gesture('touchend'); expect(music.playCalls).toBe(before + 2);
    service.playSound('cancelled-loop', true); service.stopAllEffects();
    loads[3].resolve({ name: 'cancelled-loop' }); await flushAudio();
    expect(effect.clip).toBeNull(); expect(effect.loop).toBe(false);
    service.playBackgroundMusic('while-hidden'); service.pauseForBackground();
    loads[4].resolve({ name: 'hidden' }); await flushAudio();
    expect(music.playCalls).toBe(before + 2);
    service.resumeAfterForeground(); expect(music.playCalls).toBe(before + 3);
  });

  test('dispose cancels late music/effects and removes every owned listener without future playback', async () => {
    const { service, browser, music, effect, loads, gesture } = audioFixture();
    service.playBackgroundMusic('bgm'); loads[0].resolve({ name: 'bgm' }); await flushAudio();
    music.onPlay = () => music.start(); gesture('touchend');
    service.playSound('late-effect'); service.playBackgroundMusic('late-music');
    service.dispose(); service.dispose();
    const calls = music.playCalls;
    loads[1].resolve({ name: 'late-effect' }); loads[2].resolve({ name: 'late-music' }); await flushAudio();
    gesture('touchend'); service.resumeAfterForeground(); service.playBackgroundMusic('after-dispose'); service.playButtonSound();
    expect(music.playCalls).toBe(calls); expect(music.clip).toBeNull(); expect(effect.clip).toBeNull();
    expect(effect.oneShots).toHaveLength(0); expect(loads).toHaveLength(3);
    expect(browser.listeners).toHaveLength(0); expect(music.node.listeners).toHaveLength(0);
  });

  test('audio capture precedes fullscreen on the real canvas even when Cocos stops propagation to document', async () => {
    const fixture = browserFixture('standard');
    const canvas = new Events();
    Reflect.set(fixture.document, 'getElementById', (id: string) => id === 'GameCanvas' ? canvas : null);
    const fullscreen = new DzpkBrowserPresentation(fixture.browser as never, () => undefined); disposables.push(fullscreen);
    const audio = audioFixture(fixture.browser);
    audio.service.playBackgroundMusic('bgm'); audio.loads[0].resolve({ name: 'bgm' }); await flushAudio();
    const order: string[] = [];
    audio.music.onPlay = () => order.push('audio');
    fixture.root.requestFullscreen = () => { order.push('fullscreen'); return Promise.resolve(); };
    expect(canvas.listeners.filter(item => item.type === 'touchend').every(item => item.capture !== true)).toBe(true);
    expect(fixture.document.listeners.filter(item => item.type === 'touchend')).toHaveLength(0);
    const event = { type: 'touchend', isTrusted: true, timeStamp: 1000 };
    fixture.browser.emit('touchend', event); order.push('engine-canvas'); canvas.emit('touchend', event);
    expect(order).toEqual(['audio', 'engine-canvas', 'fullscreen']);
    fullscreen.dispose(); expect(canvas.listeners).toHaveLength(0);
  });
});

function audioFixture(browser = new Events()) {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
  const loads: Array<{ path: string; resolve(clip: unknown): void; reject(error: Error): void }> = [];
  const loader = { loadOriginalAudioClip: (path: string) => new Promise((resolve, reject) => loads.push({ path, resolve, reject })) };
  const service = new DzpkAudioService(new TestNode() as never, loader as never); disposables.push(service);
  const music = Reflect.get(service, 'musicSource') as TestAudioSource;
  const effect = Reflect.get(service, 'effectSource') as TestAudioSource;
  return { service, browser, music, effect, loads,
    gesture: (type: string, extra: Record<string, unknown> = {}) => browser.emit(type, { type, isTrusted: true, ...extra }) };
}

async function flushAudio() { await Promise.resolve(); await Promise.resolve(); }
