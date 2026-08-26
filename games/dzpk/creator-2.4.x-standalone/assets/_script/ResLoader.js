var cc__spreadArrays = __spreadArrays;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ResLoader = undefined;
var exp_ResLoader = function () {
  function _ctor() {}
  _ctor.prototype.loadRes = function () {
    var t = cc__spreadArrays(arguments);
    t[t.length - 1] || t.pop();
    if (t.length > 1 && "string" == typeof t[t.length - 1]) {
      this.loadBundleRes(t.pop(), t);
    } else {
      cc.resources.load.apply(cc.resources, t);
    }
  };
  _ctor.prototype.loadResDir = function () {
    var t = cc__spreadArrays(arguments);
    t[t.length - 1] || t.pop();
    if (t.length > 1 && "string" == typeof t[t.length - 1]) {
      this.loadBundleDir(t.pop(), t);
    } else {
      cc.resources.loadDir.apply(cc.resources, t);
    }
  };
  _ctor.prototype.preloadDir = function () {
    var t = cc__spreadArrays(arguments);
    t[t.length - 1] || t.pop();
    if (t.length > 1 && "string" == typeof t[t.length - 1]) {
      this.preloadBundle(t.pop(), t);
    } else {
      cc.resources.preloadDir.apply(cc.resources, t);
    }
  };
  _ctor.prototype.loadRemoteRes = function () {
    cc.assetManager.loadRemote.apply(cc.assetManager, arguments);
  };
  _ctor.prototype.releaseArray = function (t) {
    for (var e = 0; e < t.length; ++e) {
      this.releaseAsset(t[e]);
    }
  };
  _ctor.prototype.releaseAsset = function (t) {
    t.decRef();
  };
  _ctor.prototype.releaseBundle = function (t) {
    var e = cc.assetManager.getBundle(t);
    if (e) {
      e.releaseAll();
      cc.assetManager.removeBundle(e);
    }
  };
  _ctor.prototype.loadBundle = function (t, e) {
    t = wConstant.isCheckHotUp ? jsb.fileUtils.getWritablePath() + "/" + t : t;
    cc.assetManager.loadBundle(t, function (t, o) {
      if (t) {
        console.error(t);
      } else {
        e(t, o);
      }
    });
  };
  _ctor.prototype.preloadBundle = function (t, e) {
    this.loadBundle(t, function (t, o) {
      o.preload.apply(o, e);
    });
  };
  _ctor.prototype.loadBundleRes = function (t, e) {
    this.loadBundle(t, function (t, o) {
      o.load.apply(o, e);
    });
  };
  _ctor.prototype.loadBundleDir = function (t, e) {
    this.loadBundle(t, function (t, o) {
      o.loadDir.apply(o, e);
    });
  };
  return _ctor;
}();
exports.ResLoader = exp_ResLoader;