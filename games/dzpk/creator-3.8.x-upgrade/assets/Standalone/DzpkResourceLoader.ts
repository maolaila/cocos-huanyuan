/**
 * 学习导读：所有原版 DZPK 动态资源都从同一个 Asset Bundle 加载。调用者得到带类型的 Promise，
 * 不必在每个画面重复写 Cocos 回调和错误判断。
 *
 * Cocos API 速查：
 * - `assetManager`：Creator 全局资源管理入口。
 * - `loadBundle(name, callback)`：加载一个资源包及其索引；完成后才能按包内路径取 Prefab/音频。
 * - `AssetManager.Bundle`：已加载资源包对象；`bundle.load(path, Type, callback)` 会校验资源类型。
 * - `Prefab`：可实例化的节点模板；`AudioClip`：AudioSource 可以播放的音频资源。
 * Cocos 这些 API 原生是回调形式，本类包成 Promise，方便 Boot 用 `await` 表达严格加载顺序。
 */
import { AssetManager, AudioClip, Prefab, assetManager } from 'cc';
import { DZPK_BUNDLE_NAME } from './GameContext';

/** 迁移后 DZPK Asset Bundle 的唯一加载入口。 */
export class DzpkResourceLoader {
  private dzpkBundle: AssetManager.Bundle | null = null;

  /** 加载并缓存原资源包；第二次调用直接复用，避免重复请求和重复解析。 */
  public loadOriginalDzpkBundle(): Promise<AssetManager.Bundle> {
    if (this.dzpkBundle) return Promise.resolve(this.dzpkBundle);
    return new Promise((resolve, reject) => {
      assetManager.loadBundle(DZPK_BUNDLE_NAME, (bundleError, dzpkBundle) => {
        if (bundleError || !dzpkBundle) {
          reject(bundleError ?? new Error('Original DZPK bundle did not load'));
          return;
        }
        this.dzpkBundle = dzpkBundle;
        resolve(dzpkBundle);
      });
    });
  }

  /** 按包内相对路径加载原 Prefab，例如 `prefab/Room`。 */
  public loadOriginalPrefab(prefabPath: string): Promise<Prefab> {
    const dzpkBundle = this.dzpkBundle ?? assetManager.getBundle(DZPK_BUNDLE_NAME);
    if (!dzpkBundle) return Promise.reject(new Error('Original DZPK bundle is not initialized'));
    return new Promise((resolve, reject) => {
      dzpkBundle.load(prefabPath, Prefab, (prefabError, originalPrefab) => {
        if (prefabError || !originalPrefab) {
          reject(prefabError ?? new Error(`Original prefab did not load: ${prefabPath}`));
          return;
        }
        resolve(originalPrefab);
      });
    });
  }

  /** 按包内相对路径加载原音频，例如 `sound/button`。 */
  public loadOriginalAudioClip(audioPath: string): Promise<AudioClip> {
    const dzpkBundle = this.dzpkBundle ?? assetManager.getBundle(DZPK_BUNDLE_NAME);
    if (!dzpkBundle) return Promise.reject(new Error('Original DZPK bundle is not initialized'));
    return new Promise((resolve, reject) => {
      dzpkBundle.load(audioPath, AudioClip, (audioError, audioClip) => {
        if (audioError || !audioClip) {
          reject(audioError ?? new Error(`Original audio did not load: ${audioPath}`));
          return;
        }
        resolve(audioClip);
      });
    });
  }
}
