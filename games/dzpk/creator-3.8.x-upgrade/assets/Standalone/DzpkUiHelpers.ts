import { Node, Sprite, SpriteAtlas, UIOpacity, assetManager, isValid, sp } from 'cc';

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
