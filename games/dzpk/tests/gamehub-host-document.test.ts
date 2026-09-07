import { describe, expect, test } from 'bun:test';
import {
  assertGameHubHostBuild,
  credentialFreeGameHubUrl,
  gameHubContextInitHeaders,
  gameHubHostedBackendOrigin,
} from '../creator-3.8.x-upgrade/assets/Standalone/GameHubHostDocument';
import type { AuthenticatedGameContext } from '../creator-3.8.x-upgrade/assets/Standalone/GameContext';

const origin = 'https://gamehub.example';
const context = { gameCode: 'dzpk-955', sessionId: 'sid_test' };
const runtimePath = '/launch?runtimeGame=dzpk-955&runtimeBuild=build-002&runtimeSession=sid_test';
const body = (attributes: Record<string, string> = {}) => ({
  getAttribute: (name: string) => attributes[name] ?? null,
});

describe('GameHub standalone host document', () => {
  test('binds hosted API requests to the isolated HTTPS origin despite a decorated backend URL', () => {
    const host = body({ 'data-gamehub-standalone-runtime-path': runtimePath });
    expect(gameHubHostedBackendOrigin(new URL('https://runtime.example/launch?backendUrl=https://evil.example'), host))
      .toBe('https://runtime.example');
    expect(gameHubHostedBackendOrigin(new URL('http://localhost:7456/preview'), body())).toBeNull();
    expect(() => gameHubHostedBackendOrigin(new URL('http://runtime.example/launch'), host)).toThrow();
  });

  test('sends iframe proof only from the exact host marker', () => {
    for (const value of ['', 'TAB', 'iframe']) {
      expect(gameHubContextInitHeaders(body({ 'data-gamehub-launch-surface': value })))
        .toEqual({ 'content-type': 'application/json' });
    }
    expect(gameHubContextInitHeaders(body({ 'data-gamehub-launch-surface': 'IFRAME' })))
      .toEqual({ 'content-type': 'application/json', 'x-gamehub-launch-surface': 'IFRAME' });
  });

  test('rejects a context that silently switched the host package', () => {
    const host = body({ 'data-gamehub-cocos-build-id': 'build-002', 'data-gamehub-cocos-asset-base-url': 'https://assets.example/build-002/' });
    const response = { ...context, cocosResource: { buildId: 'build-002', assetBaseUrl: 'https://assets.example/build-002/' } } as AuthenticatedGameContext;
    expect(() => assertGameHubHostBuild(host, response)).not.toThrow();
    expect(() => assertGameHubHostBuild(body(), response)).not.toThrow();
    for (const attributes of [{}, { 'data-gamehub-cocos-build-id': 'build-002' },
      { 'data-gamehub-cocos-asset-base-url': response.cocosResource!.assetBaseUrl! }]) {
      expect(() => assertGameHubHostBuild(body({ 'data-gamehub-standalone-runtime-path': runtimePath, ...attributes }), response))
        .toThrow();
    }
    for (const cocosResource of [undefined, { ...response.cocosResource, buildId: 'old' }, { ...response.cocosResource, assetBaseUrl: 'https://other.example/' }]) {
      expect(() => assertGameHubHostBuild(host, { ...response, cocosResource })).toThrow();
    }
  });

  test('clears credentials and returns an absolute same-origin refresh URL despite the S3 base tag', () => {
    const original = new URL(`${origin}/launch?launchCode=lc_test&token=legacy&sessionToken=st_test`);
    const result = credentialFreeGameHubUrl(original, context, body({ 'data-gamehub-standalone-runtime-path': runtimePath }));
    expect(result).toBe(origin + runtimePath);
    expect(new URL(result, 'https://assets.example/package/').origin).toBe(origin);
    expect(original.searchParams.has('launchCode')).toBe(true);
    expect(credentialFreeGameHubUrl(new URL(`${origin}/preview?token=old&backendUrl=local#room`), context, null))
      .toBe(`${origin}/preview?backendUrl=local#room`);
  });

  test('rejects cross-origin, cross-session, cross-game, malformed or decorated runtime markers', () => {
    const invalid = [
      'https://evil.example' + runtimePath, '//evil.example' + runtimePath,
      runtimePath.replace('/launch?', '/other?'), runtimePath.replace('sid_test', 'sid_other'),
      runtimePath.replace('dzpk-955', 'other-game'), runtimePath.replace('build-002', '..'),
      runtimePath + '&runtimeGame=dzpk-955', runtimePath + '&token=secret', runtimePath + '#extra',
    ];
    for (const marker of invalid) {
      expect(() => credentialFreeGameHubUrl(new URL(origin + '/launch?launchCode=lc_test'), context,
        body({ 'data-gamehub-standalone-runtime-path': marker }))).toThrow();
    }
  });
});
