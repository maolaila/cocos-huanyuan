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
const CNY_COMPACT_UNITS: readonly CompactUnit[] = [
  { scale: 1_000_000_000_000, suffix: '万亿' },
  { scale: 100_000_000, suffix: '亿' },
  { scale: 10_000, suffix: '万' },
];
// Unicode CLDR/Intl vi-VN compact forms: nghìn, triệu, tỷ and nghìn tỷ.
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
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '0';
  return Math.floor(numericValue).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Original KG lobby style: the client displays whole chips; GameHub keeps exact money server-side. */
export function formatSourceWalletBalance(value: unknown): string {
  return formatSourceInteger(value);
}

/**
 * Original handleNameLen semantics. CJK may consume the final two-unit slot;
 * table labels pass appendEllipsis=false exactly like DZPKView.setPlayerInfo.
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

/** Keeps the ellipsis inside a fixed-width lobby label instead of adding it after the budget. */
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

/** Exact 2.4 Utils.goldFormat semantics used by the original DZPK labels. */
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

/** Currency-aware display only. The returned text must never become a wallet or bet input. */
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
  rememberOriginalLabelState(label);
  label.overflow = Label.Overflow.SHRINK;
  label.enableWrapText = false;
}

export function hideOriginalChildNodes(parentNode: Node | null): void {
  parentNode?.children.forEach((childNode) => { childNode.active = false; });
}

export function setOriginalNodeColor(targetNode: Node, color: Readonly<Color>): void {
  const sprite = targetNode.getComponent(Sprite);
  if (sprite) sprite.color = new Color(color);
  const label = targetNode.getComponent(Label);
  if (label) label.color = new Color(color);
  const skeleton = targetNode.getComponent(sp.Skeleton);
  if (skeleton) skeleton.color = new Color(color);
  targetNode.children.forEach((childNode) => setOriginalNodeColor(childNode, color));
}

/** Converts the source node anchor position into the target node's local space. */
export function convertNodeOriginToLocal(sourceNode: Node, targetNode: Node): Vec3 {
  const sourceWorldPosition = sourceNode.worldPosition;
  return targetNode.inverseTransformPoint(
    new Vec3(),
    new Vec3(sourceWorldPosition.x, sourceWorldPosition.y, sourceWorldPosition.z),
  );
}

export function applyNodeOpacity(targetNode: Node, opacity: number): void {
  const uiOpacity = targetNode.getComponent(UIOpacity) ?? targetNode.addComponent(UIOpacity);
  uiOpacity.opacity = opacity;
}

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

export async function setOriginalAvatar(avatarSprite: Sprite, avatarIndex: unknown): Promise<void> {
  const headAtlas = await loadResourcesAsset('Hall/Head/plist_head', SpriteAtlas);
  const normalizedIndex = Math.abs(Number(avatarIndex) || 0) % 12;
  const genderName = normalizedIndex <= 5 ? 'female' : 'male';
  const frameName = `plist_head_${genderName}_${normalizedIndex % 6 + 1}`;
  if (isValid(avatarSprite, true)) avatarSprite.spriteFrame = headAtlas.getSpriteFrame(frameName);
}

function loadResourcesAsset<T>(path: string, assetType: new (...args: never[]) => T): Promise<T> {
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
  switch (profile) {
    case 'DIGITS_AND_COMMA': return /^[0-9,]+$/.test(displayText);
    case 'CNY_INTEGER_UNITS': return /^[0-9万亿千百]+$/.test(displayText);
    case 'CNY_DECIMAL_UNITS': return /^[+0-9.万亿千百]+$/.test(displayText);
    case 'NONE': return false;
  }
}

function normalizeDisplayAmount(value: unknown): number {
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
  let selectedUnitIndex = units.findIndex((unit) => amount >= unit.scale);
  if (selectedUnitIndex < 0) {
    return `${prefix}${Math.floor(amount)}${suffix}`;
  }
  let selectedUnit = units[selectedUnitIndex];
  let scaledAmount = amount / selectedUnit.scale;
  if (scaledAmount >= 999.5 && selectedUnitIndex > 0) {
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
  return value.toFixed(Math.max(0, decimalPlaces))
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1');
}

function localizeDecimalSeparator(value: string, decimalSeparator: '.' | ','): string {
  return decimalSeparator === ',' ? value.replace('.', ',') : value;
}

function textCharacterLength(value: string): number {
  return Array.from(value).length;
}

function roundFixed(value: number, decimalPlaces: number): string {
  const safeDecimalPlaces = Math.max(0, Math.floor(decimalPlaces));
  const multiplier = 10 ** safeDecimalPlaces;
  return (Math.round(value * multiplier) / multiplier).toFixed(safeDecimalPlaces);
}
