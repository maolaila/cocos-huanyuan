Object.defineProperty(exports, "__esModule", {
  value: true
});
var def_NodePool = function () {
  function _ctor(t, e) {
    undefined === e && (e = 0);
    this.copy = t;
    this.count = e;
    this.enemyPool = new cc.NodePool();
    for (var o = 0; o < this.count; ++o) {
      var n = cc.instantiate(this.copy);
      this.enemyPool.put(n);
    }
  }
  Object.defineProperty(_ctor.prototype, "getNode", {
    get: function () {
      if (this.enemyPool.size() > 0) {
        return this.enemyPool.get();
      } else {
        return cc.instantiate(this.copy);
      }
    },
    enumerable: false,
    configurable: true
  });
  _ctor.prototype.put = function (t) {
    cc.isValid(t) && this.enemyPool.put(t);
  };
  _ctor.prototype.clear = function () {
    this.enemyPool.clear();
  };
  _ctor.prototype.recoveryAll = function (t) {
    if (cc.isValid(t)) {
      for (; t.childrenCount > 0;) {
        this.put(t.children[0]);
      }
    }
  };
  return _ctor;
}();
exports.default = def_NodePool;