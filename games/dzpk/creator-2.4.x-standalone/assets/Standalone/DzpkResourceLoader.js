'use strict';

var OriginalResLoader = require('ResLoader').ResLoader;

/** Loads the original DZPK Asset Bundle while preserving legacy load signatures. */
function DzpkResourceLoader() {
  this.legacyResourceLoader = new OriginalResLoader();
}

DzpkResourceLoader.prototype.loadOriginalDzpkBundle = function () {
  return new Promise(function (resolve, reject) {
    cc.assetManager.loadBundle('DZPK', function (bundleError, dzpkBundle) {
      if (bundleError || !dzpkBundle) {
        reject(bundleError || new Error('Original DZPK bundle did not load'));
        return;
      }
      resolve(dzpkBundle);
    });
  });
};

DzpkResourceLoader.prototype.loadOriginalPrefab = function (prefabPath) {
  return new Promise(function (resolve, reject) {
    var dzpkBundle = cc.assetManager.getBundle('DZPK');
    if (!dzpkBundle) {
      reject(new Error('Original DZPK bundle is not initialized'));
      return;
    }
    dzpkBundle.load(prefabPath, cc.Prefab, function (prefabError, originalPrefab) {
      if (prefabError || !originalPrefab) {
        reject(prefabError || new Error('Original prefab did not load: ' + prefabPath));
        return;
      }
      resolve(originalPrefab);
    });
  });
};

DzpkResourceLoader.prototype.toLegacyResourceAdapter = function () {
  return this.legacyResourceLoader;
};

module.exports = { DzpkResourceLoader: DzpkResourceLoader };

