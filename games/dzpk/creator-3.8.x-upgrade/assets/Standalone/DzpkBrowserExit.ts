/**
 * 大厅退出后的浏览器收尾。调用方必须先取得 GameAPI 退出确认。
 * iframe 使用现有 GameHub lifecycle 消息通知可信宿主；独立 TAB 尝试关闭自身。
 * window.close 的权限取决于窗口是否由网页打开，与等待退出响应无关；手动打开的页可能被浏览器保留。
 */
import { DZPK_GAME_CODE } from './GameContext';

interface BrowserExitOptions {
  sessionId: string;
  parentOrigin: string;
  closePage: boolean;
  showMessage: (message: string) => void;
}

type ExitWindow = Pick<Window, 'parent' | 'opener' | 'close' | 'closed' | 'setTimeout'>;
const EXIT_NAMESPACE = 'gamehub.cocos.iframe.v1';
const CLOSE_FALLBACK_DELAY_MS = 250;

export function finishDzpkBrowserExit(options: BrowserExitOptions, browser: ExitWindow = window): void {
  const message = { namespace: EXIT_NAMESPACE, type: 'exit', timestamp: Date.now(),
    sessionId: options.sessionId, gameCode: DZPK_GAME_CODE, payload: { reason: 'user_exit' } };
  const origin = exactOrigin(options.parentOrigin);
  if (browser.parent !== browser) {
    if (origin && options.sessionId) browser.parent.postMessage(message, origin);
    else options.showMessage('已退出游戏，请关闭当前游戏窗口');
    return;
  }
  if (!options.closePage) {
    options.showMessage('已退出德州扑克，可关闭当前页面');
    return;
  }
  // COOP/noopener 可能移除 opener；通知失败不应阻止关闭当前 TAB，也绝不导航其他窗口。
  try { if (origin && browser.opener && options.sessionId) browser.opener.postMessage(message, origin); } catch { /* 宿主可能已关闭 */ }
  try { browser.close(); } catch { /* 浏览器可能禁止脚本关闭手动打开的页 */ }
  browser.setTimeout(() => {
    if (!browser.closed) options.showMessage('已退出游戏，浏览器未允许自动关闭，请手动关闭此页');
  }, CLOSE_FALLBACK_DELAY_MS);
}

function exactOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && url.origin === value ? value : null;
  } catch { return null; }
}
