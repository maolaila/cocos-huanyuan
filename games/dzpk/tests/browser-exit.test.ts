import { afterEach, describe, expect, test } from 'bun:test';
import { finishDzpkBrowserExit } from '../creator-3.8.x-upgrade/assets/Standalone/DzpkBrowserExit';
import { GameHubAuthenticatedTransport } from '../creator-3.8.x-upgrade/assets/Standalone/GameHubAuthenticatedTransport';
import { GameContext } from '../creator-3.8.x-upgrade/assets/Standalone/GameContext';

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
afterEach(() => {
  for (const [key, descriptor] of [['window', originalWindow], ['document', originalDocument]] as const) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

function browserFixture() {
  const messages: unknown[] = [], tips: string[] = [], timers: Array<() => void> = [];
  const browser: any = { parent: null, opener: null, closed: false, closes: 0,
    close() { this.closes++; this.closed = true; }, setTimeout(callback: () => void) { timers.push(callback); return 1; } };
  browser.parent = browser;
  return { browser, messages, tips, timers, options: { sessionId: 'sid_test', parentOrigin: 'https://merchant.example', closePage: true,
    showMessage: (message: string) => tips.push(message) } };
}

describe('DZPK browser exit after server acknowledgment', () => {
  test('closes script-opened TAB without requiring an opener', () => {
    const f = browserFixture();
    finishDzpkBrowserExit(f.options, f.browser);
    expect(f.browser.closes).toBe(1);
    f.timers.forEach(t => t()); expect(f.tips).toEqual([]);
  });
  test('blocked TAB closure has a visible fallback without navigating or opening another page', () => {
    const f = browserFixture(); f.browser.close = () => { f.browser.closes++; };
    finishDzpkBrowserExit(f.options, f.browser);
    expect(f.tips).toEqual([]); f.timers.forEach(t => t());
    expect(f.tips[0]).toContain('手动关闭'); expect(f.browser.closes).toBe(1);
  });
  test('iframe sends the recognized lifecycle message only to its exact trusted origin', () => {
    const f = browserFixture(); f.browser.parent = { postMessage: (...args: unknown[]) => f.messages.push(args) };
    finishDzpkBrowserExit(f.options, f.browser);
    expect(f.browser.closes).toBe(0);
    expect(f.messages).toEqual([[expect.objectContaining({ namespace: 'gamehub.cocos.iframe.v1', type: 'exit',
      sessionId: 'sid_test', gameCode: 'dzpk-955', payload: { reason: 'user_exit' } }), 'https://merchant.example']]);
    f.options.parentOrigin = '*'; finishDzpkBrowserExit(f.options, f.browser);
    expect(f.messages).toHaveLength(1); expect(f.tips).toHaveLength(1);
  });
  test('automatic loading-error exit does not silently close a TAB', () => {
    const f = browserFixture(); finishDzpkBrowserExit({ ...f.options, closePage: false }, f.browser);
    expect(f.browser.closes).toBe(0); expect(f.tips).toHaveLength(1);
  });
});

async function transportFixture(exitResponse: () => Promise<Response>) {
  const requests: Array<{ url: string; options: RequestInit }> = [];
  const cache = new Map<string, string>();
  const browser = { location: { href: 'https://runtime.example/?launchCode=lc_fixture' },
    history: { state: null, replaceState() {} }, sessionStorage: {
      getItem: (key: string) => cache.get(key) ?? null,
      setItem: (key: string, value: string) => cache.set(key, value), removeItem: (key: string) => cache.delete(key),
    }, fetch: async (url: string, options: RequestInit) => {
      requests.push({ url, options });
      if (url.endsWith('/context/init')) return Response.json({ code: 0, data: { gameCode: 'dzpk-955', mode: 'TRIAL',
        sessionId: 'sid_test', sessionToken: 'st_fixture', currency: 'USDT', wallet: { mainBalance: '1.000007' }, sdkConfig: {} } });
      return exitResponse();
    } };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { body: { getAttribute: () => null } } });
  const transport = new GameHubAuthenticatedTransport(new GameContext(), { subscribeSourceEvent: () => ({}) } as never, {} as never, {} as never);
  await transport.initializeAuthenticatedSession();
  return { transport, requests, cache };
}

describe('DZPK authenticated session exit', () => {
  test('missing session identity, credential or backend cannot silently clear state', async () => {
    for (const key of ['sessionId', 'sessionCredential', 'backendBaseUrl']) {
      const f = await transportFixture(async () => Response.json({ code: 0, data: { sessionId: 'sid_test', status: 'EXITING' } }));
      const fields = f.transport as unknown as Record<string, unknown>;
      const original = fields[key]; fields[key] = '';
      let rejected = false;
      try { await f.transport.endAuthenticatedSession(); } catch { rejected = true; }
      expect(rejected).toBe(true); expect(f.requests).toHaveLength(1); expect(f.cache.size).toBe(1);
      fields[key] = original;
      expect(await f.transport.endAuthenticatedSession()).toBe('sid_test');
    }
  });
  test('deduplicates pending exit and retains reconnect data until the matching acknowledgment', async () => {
    let acknowledge!: (response: Response) => void;
    const f = await transportFixture(() => new Promise(resolve => { acknowledge = resolve; }));
    const one = f.transport.endAuthenticatedSession(), two = f.transport.endAuthenticatedSession();
    expect(one).toBe(two); expect(f.cache.size).toBe(1);
    expect(f.requests).toHaveLength(2);
    const exit = f.requests[1]; expect(exit.url).toEndWith('/gameapi/v1/sessions/exit');
    expect(exit.options.keepalive).toBe(true);
    expect(exit.options.headers).toMatchObject({ 'x-launch-token': 'st_fixture', 'content-type': 'application/json' });
    expect(JSON.parse(String(exit.options.body))).toEqual({ sessionId: 'sid_test', launchToken: 'st_fixture', reason: 'user_exit' });
    acknowledge(Response.json({ code: 0, data: { sessionId: 'sid_test', status: 'EXITING' } }));
    expect(await one).toBe('sid_test'); expect(f.cache.size).toBe(0);
    await f.transport.endAuthenticatedSession(); expect(f.requests).toHaveLength(2);
  });
  test('rejects mismatched or failed acknowledgments without deleting state and permits retry', async () => {
    let attempts = 0;
    const f = await transportFixture(async () => Response.json({ code: 0, data: {
      sessionId: ++attempts === 1 ? 'another_session' : 'sid_test', status: 'EXITING' } }));
    let error: unknown;
    try { await f.transport.endAuthenticatedSession(); } catch (caught) { error = caught; }
    expect(error).toBeInstanceOf(Error); expect(f.cache.size).toBe(1);
    expect(await f.transport.endAuthenticatedSession()).toBe('sid_test'); expect(f.cache.size).toBe(0);
  });
});
