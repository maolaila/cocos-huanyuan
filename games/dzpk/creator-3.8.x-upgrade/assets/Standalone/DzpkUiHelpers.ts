import {
  Color,
  Label,
  Node,
  Sprite,
  SpriteAtlas,
  UIOpacity,
  UITransform,
  Vec3,
  assetManager,
  isValid,
  sp,
} from 'cc';

export const ORIGINAL_WHITE_COLOR = new Color(255, 255, 255, 255);
export const ORIGINAL_ASH_COLOR = new Color(140, 140, 140, 255);

export function formatSourceInteger(value: unknown): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '0';
  return Math.floor(numericValue).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function truncateSourceDisplayName(value: unknown, maxDisplayUnits: number): string {
  const sourceText = String(value ?? '');
  if (displayUnitLength(sourceText) <= maxDisplayUnits) return sourceText;
  let truncatedText = '';
  let consumedUnits = 0;
  for (const character of sourceText) {
    const characterUnits = displayUnitLength(character);
    if (consumedUnits + characterUnits > maxDisplayUnits) break;
    truncatedText += character;
    consumedUnits += characterUnits;
  }
  return `${truncatedText}...`;
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
  const sourceTransform = sourceNode.getComponent(UITransform);
  const targetTransform = targetNode.getComponent(UITransform);
  if (!sourceTransform || !targetTransform) {
    throw new Error(`UITransform missing for coordinate conversion: ${sourceNode.name} -> ${targetNode.name}`);
  }
  return targetTransform.convertToNodeSpaceAR(sourceTransform.convertToWorldSpaceAR(Vec3.ZERO));
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

function roundFixed(value: number, decimalPlaces: number): string {
  const safeDecimalPlaces = Math.max(0, Math.floor(decimalPlaces));
  const multiplier = 10 ** safeDecimalPlaces;
  return (Math.round(value * multiplier) / multiplier).toFixed(safeDecimalPlaces);
}
