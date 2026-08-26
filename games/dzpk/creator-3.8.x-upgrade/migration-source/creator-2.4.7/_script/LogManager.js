var n;
var cc__spreadArrays = __spreadArrays;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LogManager = undefined;
(function (t) {
  t[t.INFO = 3] = "INFO";
  t[t.WARN = 2] = "WARN";
  t[t.ERROR = 1] = "ERROR";
})(n || (n = {}));
var exp_LogManager = function () {
  function _ctor() {}
  _ctor.prototype.i = function (t) {
    var e = [];
    for (var o = 1; o < arguments.length; o++) {
      e[o - 1] = arguments[o];
    }
    wConstant.nLevel >= n.INFO && cc.log.apply(cc, cc__spreadArrays([t], e));
  };
  _ctor.prototype.w = function (t) {
    var e = [];
    for (var o = 1; o < arguments.length; o++) {
      e[o - 1] = arguments[o];
    }
    wConstant.nLevel >= n.WARN && cc.warn.apply(cc, cc__spreadArrays([t], e));
  };
  _ctor.prototype.e = function (t) {
    var e = [];
    for (var o = 1; o < arguments.length; o++) {
      e[o - 1] = arguments[o];
    }
    wConstant.nLevel >= n.ERROR && cc.error.apply(cc, cc__spreadArrays([t], e));
  };
  return _ctor;
}();
exports.LogManager = exp_LogManager;