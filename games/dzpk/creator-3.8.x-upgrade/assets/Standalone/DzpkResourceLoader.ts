import { AssetManager, AudioClip, Prefab, assetManager } from 'cc';
import { DZPK_BUNDLE_NAME } from './GameContext';

/** Typed owner of the migrated DZPK Asset Bundle. */
export class DzpkResourceLoader {
  private dzpkBundle: AssetManager.Bundle | null = null;

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
