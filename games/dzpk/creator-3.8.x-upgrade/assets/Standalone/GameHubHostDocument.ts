/**
 * GameHub 独立运行域名承载文档的浏览器协议。这里只校验承载信息，不接触牌局或钱包。
 * getAttribute 读取服务端写入的标记；URL/URLSearchParams 负责校验和清除地址栏凭证。
 * 返回绝对同源地址，避免原版文档的 S3 <base> 把 history.replaceState 解析到跨域地址。
 */
import type { AuthenticatedGameContext } from './GameContext';

type HostBody = Pick<HTMLElement, 'getAttribute'> | null;
const LAUNCH_SURFACE_ATTRIBUTE = 'data-gamehub-launch-surface';
const LAUNCH_SURFACE_HEADER = 'x-gamehub-launch-surface';
const IFRAME_SURFACE = 'IFRAME';
const RUNTIME_PATH_ATTRIBUTE = 'data-gamehub-standalone-runtime-path';
const BUILD_ID_ATTRIBUTE = 'data-gamehub-cocos-build-id';
const ASSET_BASE_ATTRIBUTE = 'data-gamehub-cocos-asset-base-url';
const RUNTIME_GAME_QUERY = 'runtimeGame';
const RUNTIME_BUILD_QUERY = 'runtimeBuild';
const RUNTIME_SESSION_QUERY = 'runtimeSession';
const RUNTIME_QUERY_KEYS = [RUNTIME_GAME_QUERY, RUNTIME_BUILD_QUERY, RUNTIME_SESSION_QUERY];
const CREDENTIAL_QUERY_KEYS = ['launchCode', 'launchToken', 'token', 'sessionToken'];

/** 正式承载页只连接自己的 API；地址栏或旧缓存不能把凭证改送到其它服务器。 */
export function gameHubHostedBackendOrigin(currentUrl: URL, body: HostBody): string | null {
  if (!body?.getAttribute(RUNTIME_PATH_ATTRIBUTE)) return null;
  if (currentUrl.protocol !== 'https:') throw new Error('GameHub 独立运行页必须使用 HTTPS');
  return currentUrl.origin;
}

export function gameHubContextInitHeaders(body: HostBody): Record<string, string> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (body?.getAttribute(LAUNCH_SURFACE_ATTRIBUTE) === IFRAME_SURFACE) {
    headers[LAUNCH_SURFACE_HEADER] = IFRAME_SURFACE;
  }
  return headers;
}

export function assertGameHubHostBuild(body: HostBody, context: AuthenticatedGameContext): void {
  const buildId = body?.getAttribute(BUILD_ID_ATTRIBUTE);
  const assetBase = body?.getAttribute(ASSET_BASE_ATTRIBUTE);
  if (!body?.getAttribute(RUNTIME_PATH_ATTRIBUTE) && !buildId && !assetBase) return; // 原 Creator 预览没有 GameHub 承载标记。
  if (!buildId || !assetBase || context.cocosResource?.buildId !== buildId || context.cocosResource?.assetBaseUrl !== assetBase) {
    throw new Error('游戏资源版本已更新，请从官网重新进入');
  }
}

export function credentialFreeGameHubUrl(
  currentUrl: URL,
  context: Pick<AuthenticatedGameContext, 'gameCode' | 'sessionId'>,
  body: HostBody,
): string {
  const cleanUrl = new URL(currentUrl.href);
  CREDENTIAL_QUERY_KEYS.forEach((key) => cleanUrl.searchParams.delete(key));
  const runtimePath = body?.getAttribute(RUNTIME_PATH_ATTRIBUTE);
  if (!runtimePath) return cleanUrl.href;
  const runtimeUrl = new URL(runtimePath, currentUrl.origin);
  const keys = Array.from(runtimeUrl.searchParams.keys());
  if (!runtimePath.startsWith('/launch?') || runtimeUrl.pathname !== '/launch'
    || runtimeUrl.origin !== currentUrl.origin || runtimeUrl.hash || keys.length !== 3
    || keys.some((key) => !RUNTIME_QUERY_KEYS.includes(key))
    || runtimeUrl.searchParams.get(RUNTIME_GAME_QUERY) !== context.gameCode
    || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(runtimeUrl.searchParams.get(RUNTIME_BUILD_QUERY) ?? '')
    || runtimeUrl.searchParams.get(RUNTIME_SESSION_QUERY) !== context.sessionId) {
    throw new Error('GameHub 独立 Cocos 刷新路径与当前会话不匹配');
  }
  return runtimeUrl.href;
}
