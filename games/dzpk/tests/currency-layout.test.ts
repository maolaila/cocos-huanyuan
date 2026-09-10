import { expect, mock, test } from 'bun:test';
import type { GameHubMoneyDisplayContract } from '../creator-3.8.x-upgrade/assets/Standalone/GameHubMoneyDisplay';

class Color { constructor(..._values: unknown[]) {} }
class Label {
  static Overflow = { NONE: 0, SHRINK: 2 };
  font: unknown = {};
  fontFamily = 'source-bitmap';
  fontSize = 32;
  lineHeight = 64;
  overflow = Label.Overflow.NONE;
  enableWrapText = true;
  isBold = false;
  isItalic = false;
  enableOutline = false;
  outlineColor = new Color();
  outlineWidth = 0;
  color = new Color();
  string = '1千';
  node = {
    position: { x: 7, y: -18, z: 0 },
    setPosition(x: number, y: number, z: number) { this.position = { x, y, z }; },
  };
}
mock.module('cc', () => ({ Color, Label, Node: class {}, Sprite: class {}, SpriteAtlas: class {},
  UIOpacity: class {}, Vec3: class {}, assetManager: {}, isValid: () => true, sp: {} }));
const { formatDzpkCurrencyAmount, applyDzpkAmountLabel, DZPK_ROOM_SYSTEM_FONT_STYLE } =
  await import('../creator-3.8.x-upgrade/assets/Standalone/DzpkUiHelpers');
const money: GameHubMoneyDisplayContract = {
  schema: 'gamehub-money-contract-v1', contractId: 'test-only', currency: 'USDT', baseUnit: 1, displayScale: 2,
};

test('money contracts retain short room labels and select the largest suitable currency unit', () => {
  for (const [amount, expected] of [[1000, '1K'], [10000, '10K'], [20000, '20K'], [1000000, '1M'], [5000000, '5M']] as const) {
    expect(formatDzpkCurrencyAmount(amount, 'USDT', { moneyContract: money, maxCharacters: 7 })).toBe(expected);
  }
  expect(formatDzpkCurrencyAmount('1', 'VND', { moneyContract: { ...money, currency: 'VND', baseUnit: 1000, displayScale: 3 } })).toBe('0,001');
  expect(formatDzpkCurrencyAmount('0.123456', 'CNY', { groupedWallet: true, maxCharacters: 9, moneyContract: { ...money, currency: 'CNY', displayScale: 6 } })).toBe('0.123456');
});

test('money snapshots do not override the wallet auto-size choice or room row alignment', () => {
  const wallet = new Label();
  applyDzpkAmountLabel(wallet as never, 9000000, 'USDT', {
    moneyContract: money, bitmapFontProfile: 'DIGITS_AND_COMMA', shrinkToFit: false,
  });
  expect(wallet.string).toBe('9M');
  expect(wallet.overflow).toBe(Label.Overflow.NONE);
  const blind = new Label();
  const font = blind.font;
  const options = { moneyContract: money, bitmapFontProfile: 'CNY_INTEGER_UNITS' as const,
    roomSystemFontStyle: DZPK_ROOM_SYSTEM_FONT_STYLE.limit, roomSystemFontRowY: 8 };
  applyDzpkAmountLabel(blind as never, 10000, 'USDT', options);
  expect(blind.string).toBe('10K');
  expect(blind.fontFamily).toBe('Arial');
  expect(blind.fontSize).toBe(32);
  expect(blind.lineHeight).toBe(32);
  expect(blind.node.position).toEqual({ x: 7, y: 8, z: 0 });
  applyDzpkAmountLabel(blind as never, 10000, 'CNY', { ...options, moneyContract: { ...money, currency: 'CNY' } });
  expect(blind.string).toBe('1万');
  expect(blind.font).toBe(font);
  expect(blind.node.position.y).toBe(-18);
});
