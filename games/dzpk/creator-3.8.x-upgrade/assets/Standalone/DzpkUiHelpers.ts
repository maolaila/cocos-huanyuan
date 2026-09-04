/**
 * 学习导读：这是 DZPK 表现层共用的“小工具箱”，集中解决金额、昵称、字体、颜色、坐标、Spine、
 * 头像资源等重复问题。它只改变显示，不参与发牌、下注合法性或钱包结算。
 *
 * Cocos API 速查：
 * - `Color`：RGBA 颜色值；Sprite、Label、Spine 都能用 color 做正常/灰化表现。
 * - `Label`：文本组件；`font=null` 表示使用系统字体，`Overflow.SHRINK` 会在原框内自动缩字号。
 * - `Sprite/SpriteFrame/SpriteAtlas`：图片组件、具体图片帧及打包图集。
 * - `UIOpacity`：整棵节点树透明度，0–255；适合 Tween 淡入淡出。
 * - `Vec3`：节点位置和坐标转换结果。
 * - `assetManager.resources.load`：从全局 `resources` Bundle 按路径异步加载资源。
 * - `sp.Skeleton`：Creator 对 Spine 骨骼动画的组件类型。
 * - `isValid`：异步资源加载完成时确认目标组件还没被销毁。
 *
 * 重点：`WeakMap` 以 Label/Node 为键保存运行态信息，不会把临时字段写进原 Prefab 节点；节点销毁后
 * WeakMap 不会阻止垃圾回收。这是替代旧版“随手给 node 增加属性”的安全做法。
 */
import {
  Color,
  Label,
  Node,
  Sprite,
  SpriteAtlas,
  UIOpacity,
  Vec3,
  assetManager,
  isValid,
  sp,
} from 'cc';

export const ORIGINAL_WHITE_COLOR = new Color(255, 255, 255, 255);
export const ORIGINAL_ASH_COLOR = new Color(140, 140, 140, 255);

export type DzpkBitmapFontProfile =
  | 'DIGITS_AND_COMMA'
  | 'CNY_INTEGER_UNITS'
  | 'CNY_DECIMAL_UNITS'
  | 'NONE';

export interface DzpkAmountFormatOptions {
  maxCharacters?: number;
  sourceTenThousandDecimals?: number;
  sourceHundredMillionDecimals?: number;
  groupedWallet?: boolean;
  includeCurrencySymbol?: boolean;
}

export interface DzpkAmountLabelOptions extends DzpkAmountFormatOptions {
  bitmapFontProfile?: DzpkBitmapFontProfile;
  prefix?: string;
  suffix?: string;
  shrinkToFit?: boolean;
  systemFontScale?: number;
}

interface OriginalLabelState {
  font: Label['font'];
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  overflow: Label['overflow'];
  enableWrapText: boolean;
}

interface CompactUnit {
  scale: number;
  suffix: string;
}

const originalLabelStateByLabel = new WeakMap<Label, OriginalLabelState>();
// 单位从大到小排列，格式化时选择第一个不大于金额的单位。
const CNY_COMPACT_UNITS: readonly CompactUnit[] = [
  { scale: 1_000_000_000_000, suffix: '万亿' },
  { scale: 100_000_000, suffix: '亿' },
  { scale: 10_000, suffix: '万' },
];
// 越南常见缩写：N=nghìn(千)、Tr=triệu(百万)、T=tỷ(十亿)、NT=nghìn tỷ(万亿)。
const VND_COMPACT_UNITS: readonly CompactUnit[] = [
  { scale: 1_000_000_000_000, suffix: 'NT' },
  { scale: 1_000_000_000, suffix: 'T' },
  { scale: 1_000_000, suffix: 'Tr' },
  { scale: 1_000, suffix: 'N' },
];
const INTERNATIONAL_COMPACT_UNITS: readonly CompactUnit[] = [
  { scale: 1_000_000_000_000, suffix: 'T' },
  { scale: 1_000_000_000, suffix: 'B' },
  { scale: 1_000_000, suffix: 'M' },
  { scale: 1_000, suffix: 'K' },
];

export function formatSourceInteger(value: unknown): string {
  // 原 Lobby 只显示整数筹码：显示层向下取整，并加千分位逗号。
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '0';
  return Math.floor(numericValue).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 原 KG Lobby 风格：客户端显示整筹码；GameHub 服务端仍保留六位小数真钱。 */
export function formatSourceWalletBalance(value: unknown): string {
  return formatSourceInteger(value);
}

/**
 * 原 `handleNameLen` 语义：ASCII/半角算 1 格，中文等宽字符算 2 格。
 * 牌桌按原 DZPKView.setPlayerInfo 传 appendEllipsis=false，避免窄座位名被省略号挤出。
 */
export function truncateSourceDisplayName(
  value: unknown,
  maxDisplayUnits: number,
  appendEllipsis = true,
): string {
  const sourceText = String(value ?? '');
  if (displayUnitLength(sourceText) <= maxDisplayUnits) return sourceText;
  let truncatedText = '';
  let consumedUnits = 0;
  for (const character of sourceText) {
    if (consumedUnits >= maxDisplayUnits) break;
    truncatedText += character;
    consumedUnits += displayUnitLength(character);
  }
  return appendEllipsis ? `${truncatedText}...` : truncatedText;
}

/** Room 昵称专用：把 `...` 也算进总宽度预算，避免截断后反而多出三格。 */
export function fitSourceDisplayName(value: unknown, maxDisplayUnits: number): string {
  const sourceText = String(value ?? '');
  if (displayUnitLength(sourceText) <= maxDisplayUnits) return sourceText;
  const ellipsis = '...';
  const contentBudget = Math.max(0, maxDisplayUnits - displayUnitLength(ellipsis));
  let fittedText = '';
  let consumedUnits = 0;
  for (const character of sourceText) {
    const characterUnits = displayUnitLength(character);
    if (consumedUnits + characterUnits > contentBudget) break;
    fittedText += character;
    consumedUnits += characterUnits;
  }
  return `${fittedText}${ellipsis}`;
}

/** 精确保留 2.4 `Utils.goldFormat` 的 CNY 万/亿显示语义。 */
export function formatOriginalGold(
  value: unknown,
  tenThousandDecimals = 1,
  hundredMillionDecimals = 3,
): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '0';
  if (amount < 10_000) return String(amount);
  if (amount < 100_000_000) {
    return `${roundFixed(amount / 10_000, tenThousandDecimals)}万`;
  }
  return `${roundFixed(amount / 100_000_000, hundredMillionDecimals)}亿`;
}

/**
 * 多币种显示入口。先把值规范成非负整数，再按 CNY/VND/国际单位缩短到 `maxCharacters`。
 * 返回值只能写进 Label，绝不能重新作为 wallet、bet 或 settlement 输入。
 */
export function formatDzpkCurrencyAmount(
  value: unknown,
  currencyCode: unknown,
  options: DzpkAmountFormatOptions = {},
): string {
  const amount = normalizeDisplayAmount(value);
  const currency = normalizeCurrencyCode(currencyCode);
  const maxCharacters = Math.max(3, Math.floor(options.maxCharacters ?? 8));
  const sourceTenThousandDecimals = options.sourceTenThousandDecimals ?? 1;
  const sourceHundredMillionDecimals = options.sourceHundredMillionDecimals ?? 3;

  if (isChineseCurrency(currency)) {
    if (options.groupedWallet) {
      const groupedAmount = formatSourceInteger(amount);
      if (textCharacterLength(groupedAmount) <= maxCharacters) return groupedAmount;
      return formatScaledAmount(amount, CNY_COMPACT_UNITS, maxCharacters, '', '', '.');
    }
    const sourceAmount = formatOriginalGold(
      amount,
      sourceTenThousandDecimals,
      sourceHundredMillionDecimals,
    );
    if (textCharacterLength(sourceAmount) <= maxCharacters) return sourceAmount;
    return formatScaledAmount(amount, CNY_COMPACT_UNITS, maxCharacters, '', '', '.');
  }

  if (currency === 'VND') {
    return formatScaledAmount(
      amount,
      VND_COMPACT_UNITS,
      maxCharacters,
      '',
      options.includeCurrencySymbol ? '₫' : '',
      ',',
    );
  }

  return formatScaledAmount(
    amount,
    INTERNATIONAL_COMPACT_UNITS,
    maxCharacters,
    options.includeCurrencySymbol && currency === 'USD' ? '$' : '',
    '',
    '.',
  );
}

/**
 * 把金额安全写入原 Label：
 * 1. 给前后缀预留字符预算；2. 生成短金额；3. 检查原 BMFont 是否具备所有字形；
 * 4. 仅在缺字时让这一个 Label 回退 Arial；5. 在原 UITransform 宽度内 SHRINK，禁止撑开布局。
 */
export function applyDzpkAmountLabel(
  label: Label,
  value: unknown,
  currencyCode: unknown,
  options: DzpkAmountLabelOptions = {},
): string {
  const prefix = options.prefix ?? '';
  const suffix = options.suffix ?? '';
  const maxCharacters = Math.max(3, Math.floor(options.maxCharacters ?? 8));
  const amountCharacterBudget = Math.max(
    3,
    maxCharacters - textCharacterLength(prefix) - textCharacterLength(suffix),
  );
  const amountText = formatDzpkCurrencyAmount(value, currencyCode, {
    ...options,
    maxCharacters: amountCharacterBudget,
  });
  const displayText = `${prefix}${amountText}${suffix}`;
  const originalState = rememberOriginalLabelState(label);
  const needsSystemFont = Boolean(originalState.font)
    && !bitmapFontSupports(displayText, options.bitmapFontProfile ?? 'NONE');

  if (needsSystemFont) {
    label.font = null;
    label.fontFamily = 'Arial';
    const systemFontScale = Math.max(0.5, Math.min(1, options.systemFontScale ?? 0.9));
    label.fontSize = Math.max(12, originalState.fontSize * systemFontScale);
    label.lineHeight = Math.max(label.fontSize, originalState.lineHeight * systemFontScale);
  } else {
    label.font = originalState.font;
    if (!originalState.font) label.fontFamily = originalState.fontFamily;
    label.fontSize = originalState.fontSize;
    label.lineHeight = originalState.lineHeight;
  }

  if (options.shrinkToFit !== false) constrainSingleLineLabel(label);
  else {
    label.overflow = originalState.overflow;
    label.enableWrapText = false;
  }
  label.string = displayText;
  return displayText;
}

export function constrainSingleLineLabel(label: Label): void {
  // SHRINK 会自动减小字号直到放下；关闭 wrap 防止金额/提示突然变成两行。
  rememberOriginalLabelState(label);
  label.overflow = Label.Overflow.SHRINK;
  label.enableWrapText = false;
}

export function hideOriginalChildNodes(parentNode: Node | null): void {
  // 常用于牌面：先隐藏模板中所有点数/花色子节点，再只打开当前牌需要的三部分。
  parentNode?.children.forEach((childNode) => { childNode.active = false; });
}

export function setOriginalNodeColor(targetNode: Node, color: Readonly<Color>): void {
  // 递归同时处理 Sprite、Label、Spine，使弃牌灰化覆盖头像、文字和牌，而不改原资源。
  const sprite = targetNode.getComponent(Sprite);
  if (sprite) sprite.color = new Color(color);
  const label = targetNode.getComponent(Label);
  if (label) label.color = new Color(color);
  const skeleton = targetNode.getComponent(sp.Skeleton);
  if (skeleton) skeleton.color = new Color(color);
  targetNode.children.forEach((childNode) => setOriginalNodeColor(childNode, color));
}

/**
 * 把 sourceNode 锚点的世界坐标转换成 targetNode 的局部坐标。
 * 飞牌/飞筹码的起点和终点通常位于不同父节点，不能直接拿二者 `position` 相减。
 */
export function convertNodeOriginToLocal(sourceNode: Node, targetNode: Node): Vec3 {
  const sourceWorldPosition = sourceNode.worldPosition;
  return targetNode.inverseTransformPoint(
    new Vec3(),
    new Vec3(sourceWorldPosition.x, sourceWorldPosition.y, sourceWorldPosition.z),
  );
}

export function applyNodeOpacity(targetNode: Node, opacity: number): void {
  // 节点没有 UIOpacity 时才补；随后同一个组件可交给 tween 做淡入淡出。
  const uiOpacity = targetNode.getComponent(UIOpacity) ?? targetNode.addComponent(UIOpacity);
  uiOpacity.opacity = opacity;
}

/**
 * 播放原 Spine 动画。先清旧完成监听，避免重复打开页面后一次结束触发多个回调；非循环动画完成后
 * 再清一次监听。`setAnimation(0, name, loop)` 的 0 表示 Spine 第 0 条轨道。
 */
export function playOriginalSpine(
  spineNode: Node,
  animationName: string,
  loop: boolean,
  completed?: () => void,
): void {
  const skeleton = spineNode.getComponent(sp.Skeleton);
  if (!skeleton) throw new Error(`Spine component missing on ${spineNode.name}`);
  skeleton.setCompleteListener(null);
  if (completed) {
    skeleton.setCompleteListener(() => {
      skeleton.setCompleteListener(null);
      completed();
    });
  }
  skeleton.setAnimation(0, animationName, loop);
}

/**
 * 从原 Hall 头像图集选择 12 张头像之一。加载异步完成后先 `isValid`，避免玩家已离桌仍写 Sprite。
 */
export async function setOriginalAvatar(avatarSprite: Sprite, avatarIndex: unknown): Promise<void> {
  const headAtlas = await loadResourcesAsset('Hall/Head/plist_head', SpriteAtlas);
  const normalizedIndex = Math.abs(Number(avatarIndex) || 0) % 12;
  const genderName = normalizedIndex <= 5 ? 'female' : 'male';
  const frameName = `plist_head_${genderName}_${normalizedIndex % 6 + 1}`;
  if (isValid(avatarSprite, true)) avatarSprite.spriteFrame = headAtlas.getSpriteFrame(frameName);
}

function loadResourcesAsset<T>(path: string, assetType: new (...args: never[]) => T): Promise<T> {
  // 把 Cocos callback 加载包装成 Promise；泛型 T 让调用者拿到 SpriteAtlas 等明确类型。
  return new Promise((resolve, reject) => {
    assetManager.resources.load(path, assetType as never, (loadError, asset) => {
      if (loadError || !asset) {
        reject(loadError ?? new Error(`Resources asset missing: ${path}`));
        return;
      }
      resolve(asset as T);
    });
  });
}

function displayUnitLength(sourceText: string): number {
  // 按旧版近似视觉宽度计数，而不是 JS string.length；for...of 能正确遍历 Unicode 字符。
  let displayUnits = 0;
  for (const character of sourceText) {
    const codePoint = character.codePointAt(0) ?? 0;
    displayUnits += (
      (codePoint >= 1 && codePoint <= 126)
      || (codePoint >= 65376 && codePoint <= 65439)
    ) ? 1 : 2;
  }
  return displayUnits;
}

function rememberOriginalLabelState(label: Label): OriginalLabelState {
  // 第一次改 Label 时冻结原字体/字号/overflow；后续币种切换可以可靠恢复原美术状态。
  const rememberedState = originalLabelStateByLabel.get(label);
  if (rememberedState) return rememberedState;
  const originalState: OriginalLabelState = {
    font: label.font,
    fontFamily: label.fontFamily,
    fontSize: label.fontSize,
    lineHeight: label.lineHeight,
    overflow: label.overflow,
    enableWrapText: label.enableWrapText,
  };
  originalLabelStateByLabel.set(label, originalState);
  return originalState;
}

function bitmapFontSupports(displayText: string, profile: DzpkBitmapFontProfile): boolean {
  // 这里只声明已盘点过的字形集合；匹配失败就局部回退系统字体，避免 BMFont 显示空方块。
  switch (profile) {
    case 'DIGITS_AND_COMMA': return /^[0-9,]+$/.test(displayText);
    case 'CNY_INTEGER_UNITS': return /^[0-9万亿千百]+$/.test(displayText);
    case 'CNY_DECIMAL_UNITS': return /^[+0-9.万亿千百]+$/.test(displayText);
    case 'NONE': return false;
  }
}

function normalizeDisplayAmount(value: unknown): number {
  // 金额格式化只接受有限正数；显示层统一向下取整以贴合原整数筹码。
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return 0;
  return Math.floor(numericValue);
}

function normalizeCurrencyCode(currencyCode: unknown): string {
  const normalizedCode = String(currencyCode ?? '').trim().toUpperCase();
  return normalizedCode || 'CNY';
}

function isChineseCurrency(currencyCode: string): boolean {
  return currencyCode === 'CNY' || currencyCode === 'CNH' || currencyCode === 'RMB';
}

function formatScaledAmount(
  amount: number,
  units: readonly CompactUnit[],
  maxCharacters: number,
  prefix: string,
  suffix: string,
  decimalSeparator: '.' | ',',
): string {
  // 先选单位，再从较精细小数逐步减少，直到前缀+数字+单位+后缀能放进字符预算。
  let selectedUnitIndex = units.findIndex((unit) => amount >= unit.scale);
  if (selectedUnitIndex < 0) {
    return `${prefix}${Math.floor(amount)}${suffix}`;
  }
  let selectedUnit = units[selectedUnitIndex];
  let scaledAmount = amount / selectedUnit.scale;
  if (scaledAmount >= 999.5 && selectedUnitIndex > 0) {
    // 例如 999.9M 四舍五入会像 1000M；提前升级到 1B，既短又符合阅读习惯。
    selectedUnitIndex -= 1;
    selectedUnit = units[selectedUnitIndex];
    scaledAmount = amount / selectedUnit.scale;
  }
  const preferredDecimals = scaledAmount < 10 ? 2 : scaledAmount < 100 ? 1 : 0;
  for (let decimalPlaces = preferredDecimals; decimalPlaces >= 0; decimalPlaces -= 1) {
    const numericText = localizeDecimalSeparator(
      trimFixed(scaledAmount, decimalPlaces),
      decimalSeparator,
    );
    const candidate = `${prefix}${numericText}${selectedUnit.suffix}${suffix}`;
    if (textCharacterLength(candidate) <= maxCharacters) return candidate;
  }
  return `${prefix}${Math.round(scaledAmount)}${selectedUnit.suffix}${suffix}`;
}

function trimFixed(value: number, decimalPlaces: number): string {
  // toFixed 保证四舍五入，再去掉无意义尾零；不会留下 `1.00M`。
  return value.toFixed(Math.max(0, decimalPlaces))
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1');
}

function localizeDecimalSeparator(value: string, decimalSeparator: '.' | ','): string {
  return decimalSeparator === ',' ? value.replace('.', ',') : value;
}

function textCharacterLength(value: string): number {
  // Array.from 按 Unicode code point 计数，避免代理对字符被算成两个。
  return Array.from(value).length;
}

function roundFixed(value: number, decimalPlaces: number): string {
  // 保留原 goldFormat 固定小数位行为，因此这里不会 trim 尾零。
  const safeDecimalPlaces = Math.max(0, Math.floor(decimalPlaces));
  const multiplier = 10 ** safeDecimalPlaces;
  return (Math.round(value * multiplier) / multiplier).toFixed(safeDecimalPlaces);
}
