/** GameHub 实际金额仅在 Label 边界缩放；原版牌桌筹码、动作和底池仍为实际金额。 */
export interface GameHubMoneyDisplayContract {
  schema: 'gamehub-money-contract-v1';
  contractId: string;
  currency: string;
  baseUnit: 1 | 1000;
  displayScale: number;
}

export function requireMoneyDisplayContract(value: GameHubMoneyDisplayContract, currency: string): GameHubMoneyDisplayContract {
  if (!value || value.schema !== 'gamehub-money-contract-v1' || !value.contractId || value.currency !== currency ||
      ![1, 1000].includes(value.baseUnit) || !Number.isInteger(value.displayScale) || value.displayScale < 0 || value.displayScale > 6) {
    throw new Error('GameHub 会话缺少有效的币种单位快照');
  }
  return Object.freeze({ ...value });
}

/** 字符串移动小数点再截断；不通过浮点数决定显示尾数。 */
export function gameUnitDisplay(value: unknown, contract: GameHubMoneyDisplayContract, extraScale = 0): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(String(value));
  if (!match) throw new Error('无效的实际金额');
  const shift = (contract.baseUnit === 1000 ? 3 : 0) + extraScale;
  const integer = match[2].padStart(shift + 1, '0');
  const whole = integer.slice(0, integer.length - shift).replace(/^0+(?=\d)/, '');
  const fraction = (integer.slice(integer.length - shift) + (match[3] ?? '')).padEnd(contract.displayScale, '0').slice(0, contract.displayScale);
  const result = whole + (fraction ? `.${fraction}` : '');
  return `${match[1] && /[1-9]/.test(result) ? '-' : ''}${result}`;
}

/** 精确钱包只按用户展开时刷新；不将钱包刷新覆盖正在进行的原版牌桌状态。 */
export function installMoneyDetails(contract: GameHubMoneyDisplayContract, trial: boolean, readBalance: () => Promise<string>): void {
  document.getElementById('gamehub-money-details')?.remove();
  const details = document.createElement('details');
  details.id = 'gamehub-money-details';
  details.style.cssText = 'position:fixed;right:8px;top:8px;z-index:1000;max-width:90vw;padding:6px 10px;border-radius:5px;background:#111d;color:#fff;font:12px Arial;overflow-wrap:anywhere';
  const summary = document.createElement('summary');
  summary.textContent = `${trial ? '试玩 · ' : ''}${contract.currency} · 1 游戏单位 = ${contract.baseUnit} ${contract.currency}`;
  const text = document.createElement('p');
  details.append(summary, text);
  details.addEventListener('toggle', async () => {
    if (!details.open) return;
    text.textContent = '正在读取精确余额…';
    try { text.textContent = `实际钱包余额：${await readBalance()} ${contract.currency}。牌桌显示缩放不改变实际筹码。`; }
    catch (error) { text.textContent = error instanceof Error ? error.message : '读取失败，请重新展开'; }
  });
  document.body.append(details);
}
