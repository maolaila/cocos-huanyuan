var cc__awaiter = __awaiter;
var cc__generator = __generator;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EventDispatcher = undefined;
var exp_EventDispatcher = function () {
  function _ctor() {
    this.events = new Map();
  }
  _ctor.prototype.on = function (t, e, o) {
    this.events.has(t) || this.events.set(t, {
      auto: 0,
      listeners: {}
    });
    var n = this.events.get(t);
    var i = ++n.auto;
    n.listeners[i] = {
      cb: e.bind(o),
      target: o
    };
    return {
      name: t,
      id: i,
      target: o
    };
  };
  _ctor.prototype.off = function (t) {
    var e = t.name;
    this.events.has(e) && delete this.events.get(e).listeners[t.id];
  };
  _ctor.prototype.emit = function (t) {
    var e = this;
    var o = [];
    for (var r = 1; r < arguments.length; r++) {
      o[r - 1] = arguments[r];
    }
    var a = this.events.has(t);
    if (a) {
      var c = this.events.get(t);
      Object.keys(c.listeners).forEach(function (t) {
        return cc__awaiter(e, undefined, undefined, function () {
          var e;
          return cc__generator(this, function () {
            e = c.listeners[t];
            if (cc.isValid(e.target, true)) {
              e.cb.apply(e, o);
            } else {
              delete c.listeners[t];
            }
            return [2];
          });
        });
      });
    }
  };
  _ctor.prototype.clear = function (t) {
    this.events.delete(t);
  };
  return _ctor;
}();
exports.EventDispatcher = exp_EventDispatcher;