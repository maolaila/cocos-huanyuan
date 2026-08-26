var cc__awaiter = __awaiter;
var cc__generator = __generator;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Utils = undefined;
var exp_Utils = function () {
  function _ctor() {
    this.world_local_POS = function (t, e) {
      return t.convertToNodeSpaceAR(e);
    };
    this.clone = function (t) {
      if (t) {
        return JSON.parse(JSON.stringify(t));
      }
    };
    this.random = function (t, e) {
      t = Math.floor(t);
      e = Math.floor(e);
      return Math.floor(Math.random() * (e - t + 1) + t);
    };
  }
  _ctor.prototype.strlen = function (t) {
    var e = 0;
    for (var o = 0; o < t.length; o++) {
      var n = t.charCodeAt(o);
      if (n >= 1 && n <= 126 || 65376 <= n && n <= 65439) {
        e++;
      } else {
        e += 2;
      }
    }
    return e;
  };
  _ctor.prototype.handleNameLen = function (t, e, o) {
    undefined === o && (o = true);
    var n = "";
    var i = 0;
    if (this.strlen(t) > e) {
      for (var r = 0; r < e; r) {
        var a = t.charCodeAt(i);
        if (a >= 1 && a <= 126 || 65376 <= a && a <= 65439) {
          r++;
        } else {
          r += 2;
        }
        n += t[i++];
        if (t.length <= i) {
          break;
        }
      }
      o && (n += "...");
    } else {
      n = t;
    }
    return n;
  };
  _ctor.prototype.local_world__POS = function (t, e) {
    var o = t.convertToWorldSpaceAR(cc.v2(0, 0));
    if (e) {
      return this.world_local_POS(e, o);
    } else {
      return o;
    }
  };
  _ctor.prototype.checkPwd = function (t) {
    return !!/^(\w){6,10}$/.exec(t);
  };
  _ctor.prototype.checkUser = function (t) {
    return !!/^[a-zA-z0-9]\w{3,15}$/.test(t);
  };
  _ctor.prototype.checkMobile = function (t) {
    return !!/^1\d{10}$/.test(t);
  };
  _ctor.prototype.checkSpecialChar = function (t) {
    return !!new RegExp("[`~!@#$^&*()=|{}':;',\\[\\].<>\u300a\u300b/?~\uff01@#\uffe5\u2026\u2026&*\uff08\uff09\u2014\u2014|{}\u3010\u3011\u2018\uff1b\uff1a\u201d\u201c'\u3002\uff0c\u3001\uff1f ]").test(t);
  };
  _ctor.prototype.checkStrLen = function (t) {
    var e = 0;
    for (var o = 0; o < t.length; o++) {
      if (t.charCodeAt(o) > 127 || 94 == t.charCodeAt(o)) {
        e += 2;
      } else {
        e++;
      }
    }
    return e;
  };
  _ctor.prototype.smalltoBIG = function (t) {
    var e = ["角", "分"];
    var o = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
    var n = [["", "万", "亿"], ["", "拾", "佰", "仟"]];
    t = Math.abs(t);
    var i = "";
    for (var r = 0; r < e.length; r++) {
      i += (o[Math.floor(10 * t * Math.pow(10, r)) % 10] + e[r]).replace(/\u96f6./, "");
    }
    i = i || "";
    t = Math.floor(t);
    for (r = 0; r < n[0].length && t > 0; r++) {
      var a = "";
      for (var c = 0; c < n[1].length && t > 0; c++) {
        a = o[t % 10] + n[1][c] + a;
        t = Math.floor(t / 10);
      }
      i = a.replace(/(\u96f6.)*\u96f6$/, "").replace(/^$/, "零") + n[0][r] + i;
    }
    return "" + i.replace(/(\u96f6.)*\u96f6/, "").replace(/(\u96f6.)+/g, "零").replace(/^$/, "零");
  };
  _ctor.prototype.getAngle = function (t, e) {
    var o = e.x - t.x;
    var n = e.y - t.y;
    return -cc.v2(o, n).signAngle(cc.v2(1, 0)) / Math.PI * 180;
  };
  _ctor.prototype.GetAngleByVector = function (t, e) {
    var o = e.y - t.y;
    var n = e.x - t.x;
    if (0 == n && t.y < e.y) {
      return 0;
    }
    if (0 == n && t.y > e.y) {
      return 180;
    }
    if (0 == o && t.x > e.x) {
      return -90;
    }
    if (0 == o && t.x < e.x) {
      return 90;
    }
    var i = Math.abs(o) / Math.abs(n);
    var r = 0;
    if (o > 0 && n < 0) {
      r = -(90 - 180 * Math.atan(i) / Math.PI);
    } else if (o > 0 && n > 0) {
      r = 90 - 180 * Math.atan(i) / Math.PI;
    } else if (o < 0 && n < 0) {
      r = -180 * Math.atan(i) / Math.PI - 90;
    } else {
      o < 0 && n > 0 && (r = 180 * Math.atan(i) / Math.PI + 90);
    }
    return r;
  };
  _ctor.prototype.Normalize = function (t, e) {
    return this.VectorSub(t, e).normalize();
  };
  _ctor.prototype.VectorSub = function (t, e) {
    return t.sub(e);
  };
  _ctor.prototype.VectorLen = function (t, e) {
    return this.VectorSub(t, e).mag();
  };
  _ctor.prototype.timestampToTime = function (t) {
    var e = new Date(1e3 * t);
    return e.getFullYear() + "-" + (e.getMonth() + 1 < 10 ? "0" + (e.getMonth() + 1) : e.getMonth() + 1) + "-" + (e.getDate() < 10 ? "0" + e.getDate() : e.getDate()) + " " + (e.getHours() < 10 ? "0" + e.getHours() : e.getHours()) + ":" + (e.getMinutes() < 10 ? "0" + e.getMinutes() : e.getMinutes()) + ":" + (e.getSeconds() < 10 ? "0" + e.getSeconds() : e.getSeconds());
  };
  _ctor.prototype.getFormatDuringTime = function (t) {
    var e = Math.floor(t / 1) % 60;
    var o = (t = Math.floor(t / 60)) % 60;
    var n = (t = Math.floor(t / 60)) % 24;
    n < 10 && (n = "0" + n);
    o < 10 && (o = "0" + o);
    e < 10 && (e = "0" + e);
    return n + ":" + o + ":" + e;
  };
  _ctor.prototype.syncDelayed = function (t, e) {
    return new Promise(function (o) {
      setTimeout(function () {
        cc.isValid(e, true) && o(true);
      }, 1e3 * t);
    });
  };
  _ctor.prototype.randomString = function (t) {
    undefined === t && (t = 16);
    var e = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678";
    var o = e.length;
    var n = "";
    for (var i = 0; i < t; i++) {
      n += e.charAt(Math.floor(Math.random() * o));
    }
    return n;
  };
  _ctor.prototype.numConvert = function (t) {
    var e = t.toString();
    var o = e.indexOf(".") > -1 ? /(\d)(?=(\d{3})+\.)/g : /(\d)(?=(?:\d{3})+$)/g;
    return e.replace(o, "$1,");
  };
  _ctor.prototype.creatorProxy = function (t, e) {
    undefined === e && (e = false);
    var o = new Proxy(t, {
      get: function (t, e) {
        return t[e];
      },
      set: function (t, n, i) {
        t[n] = i;
        if (e) {
          for (var r in o.keyCb) {
            if (Object.prototype.hasOwnProperty.call(o.keyCb, r)) {
              var a = o.keyCb[r];
              a && a.forEach(function (t) {
                t && t(i);
              });
            }
          }
        } else {
          o.keyCb[n] && o.keyCb[n].forEach(function (t) {
            t && t(i);
          });
        }
        return true;
      }
    });
    o.keyCb = {};
    o.onEvevt = function (t, e) {
      if ("function" == typeof e) {
        !this.keyCb[t] && (this.keyCb[t] = []);
        this.keyCb[t].push(e);
      } else {
        wLog.e("对象绑定错误");
      }
    };
    return o;
  };
  _ctor.prototype.goldFormat = function (t, e, o) {
    undefined === e && (e = 1);
    undefined === o && (o = 3);
    var n = 0;
    if (!((t = Number(t)) < 1e4)) {
      if (t < 1e8) {
        var i = Math.pow(10, e);
        n = t / 1e4;
        return (n = (parseInt(String(Math.round(n * i))) / i).toFixed(e)) + "万";
      }
      i = Math.pow(10, o);
      n = t / 1e8;
      return (n = (parseInt(String(Math.round(n * i))) / i).toFixed(o)) + "亿";
    }
    return t;
  };
  _ctor.prototype.getLerpPoints = function (t, e) {
    if (null != t && t.length > 0 && e > 0) {
      var o = [];
      o.push([t[0][0], t[0][1]]);
      for (var n = 0; n < e; ++n) {
        o.push(this.getLerpPoint(t, e, n + 1));
      }
      return o;
    }
    return null;
  };
  _ctor.prototype.getLerpPoint = function (t, e, o) {
    if (t.length > 1) {
      var n = [];
      for (var i = 0; i < t.length - 1; ++i) {
        var r = t[i];
        var a = t[i + 1];
        var c = (r[0] + (a[0] - r[0]) * o / e).toFixed(2);
        var s = (r[1] + (a[1] - r[1]) * o / e).toFixed(2);
        n.push([Number(c), Number(s)]);
      }
      return this.getLerpPoint(n, e, o);
    }
    return t[0];
  };
  _ctor.prototype.convertToChinaNum = function (t) {
    var e = new Array("零", "一", "二", "三", "四", "五", "六", "七", "八", "九");
    var o = new Array("", "十", "百", "千", "万", "十", "百", "千", "亿", "十", "百", "千", "万", "十", "百", "千", "亿");
    if (!t || isNaN(t)) {
      return "零";
    }
    var n = t.toString().split("");
    var i = "";
    for (var r = 0; r < n.length; r++) {
      var a = n.length - 1 - r;
      i = o[r] + i;
      i = e[n[a]] + i;
    }
    return (i = (i = (i = (i = (i = i.replace(/\u96f6(\u5343|\u767e|\u5341)/g, "零").replace(/\u5341\u96f6/g, "十")).replace(/\u96f6+/g, "零")).replace(/\u96f6\u4ebf/g, "亿").replace(/\u96f6\u4e07/g, "万")).replace(/\u4ebf\u4e07/g, "亿")).replace(/\u96f6+$/, "")).replace(/^\u4e00\u5341/g, "十");
  };
  _ctor.prototype.splitBet = function (t, e) {
    var o = wUtils.clone(t);
    var n = [];
    var i = [];
    for (var r = (o = o.sort(function (t, e) {
      return t - e;
    })).length - 1; r >= 0; --r) {
      var a = o[r];
      if (e >= a) {
        e -= a;
        n.push(a);
        i.push(r);
        r += 1;
      }
    }
    return [n, i];
  };
  _ctor.prototype.runActionSync = function (t, e) {
    return cc__awaiter(this, undefined, undefined, function () {
      return cc__generator(this, function () {
        return [2, new Promise(function (o) {
          e.clone(t).then(cc.callFunc(function () {
            o(true);
          })).start();
        })];
      });
    });
  };
  _ctor.prototype.sendMsg = function (t, e, o, n) {
    var i = this;
    undefined === n && (n = false);
    return new Promise(function (r, a) {
      var c = wGEvent.on(t, function (t) {
        wGEvent.off(c);
        if (1 == t.status && cc.isValid(o, true)) {
          r(t.data);
        } else {
          a();
        }
      }, i);
      wNetWork.send(t, e, n);
    });
  };
  _ctor.prototype.saveForWebBrowser = function (t, e) {
    var o = JSON.stringify(t);
    if (cc.sys.isBrowser) {
      var n = new Blob([o]);
      var i = document.createElement("a");
      i.download = e;
      i.innerHTML = "Download File";
      if (null != window.URL) {
        i.href = window.URL.createObjectURL(n);
      } else {
        i.href = window.URL.createObjectURL(n);
        i.onclick = function () {
          document.body.removeChild(i);
        };
        i.style.display = "none";
        document.body.appendChild(i);
      }
      i.click();
    }
  };
  _ctor.prototype.md5 = function (t) {
    var e = function (t, e) {
      return t << e | t >>> 32 - e;
    };
    var o = function (t, e) {
      var o;
      var n;
      var i;
      var r;
      var a;
      i = 2147483648 & t;
      r = 2147483648 & e;
      a = (1073741823 & t) + (1073741823 & e);
      if ((o = 1073741824 & t) & (n = 1073741824 & e)) {
        return 2147483648 ^ a ^ i ^ r;
      } else if (o | n) {
        if (1073741824 & a) {
          return 3221225472 ^ a ^ i ^ r;
        } else {
          return 1073741824 ^ a ^ i ^ r;
        }
      } else {
        return a ^ i ^ r;
      }
    };
    var n = function (t, e, o) {
      return t & e | ~t & o;
    };
    var i = function (t, e, o) {
      return t & o | e & ~o;
    };
    var r = function (t, e, o) {
      return t ^ e ^ o;
    };
    var a = function (t, e, o) {
      return e ^ (t | ~o);
    };
    var c = function (t, i, r, a, c, s, l) {
      t = o(t, o(o(n(i, r, a), c), l));
      return o(e(t, s), i);
    };
    var s = function (t, n, r, a, c, s, l) {
      t = o(t, o(o(i(n, r, a), c), l));
      return o(e(t, s), n);
    };
    var l = function (t, n, i, a, c, s, l) {
      t = o(t, o(o(r(n, i, a), c), l));
      return o(e(t, s), n);
    };
    var p = function (t, n, i, r, c, s, l) {
      t = o(t, o(o(a(n, i, r), c), l));
      return o(e(t, s), n);
    };
    var u = function (t) {
      var e;
      var o = t.length;
      var n = o + 8;
      var i = 16 * ((n - n % 64) / 64 + 1);
      var r = Array(i - 1);
      var a = 0;
      for (var c = 0; c < o;) {
        a = c % 4 * 8;
        r[e = (c - c % 4) / 4] = r[e] | t.charCodeAt(c) << a;
        c++;
      }
      a = c % 4 * 8;
      r[e = (c - c % 4) / 4] = r[e] | 128 << a;
      r[i - 2] = o << 3;
      r[i - 1] = o >>> 29;
      return r;
    };
    var h = function (t) {
      var e;
      var o = "";
      var n = "";
      for (e = 0; e <= 3; e++) {
        o += (n = "0" + (t >>> 8 * e & 255).toString(16)).substr(n.length - 2, 2);
      }
      return o;
    };
    var d = function (t) {
      t = t.toString().replace(/\x0d\x0a/g, "\n");
      var e = "";
      for (var o = 0; o < t.length; o++) {
        var n = t.charCodeAt(o);
        if (n < 128) {
          e += String.fromCharCode(n);
        } else if (n > 127 && n < 2048) {
          e += String.fromCharCode(n >> 6 | 192);
          e += String.fromCharCode(63 & n | 128);
        } else {
          e += String.fromCharCode(n >> 12 | 224);
          e += String.fromCharCode(n >> 6 & 63 | 128);
          e += String.fromCharCode(63 & n | 128);
        }
      }
      return e;
    };
    return function (t) {
      var e;
      var n;
      var i;
      var r;
      var a;
      var f;
      var g;
      var y;
      var m;
      var v = Array();
      t = d(t);
      v = u(t);
      f = 1732584193;
      g = 4023233417;
      y = 2562383102;
      m = 271733878;
      for (e = 0; e < v.length; e += 16) {
        n = f;
        i = g;
        r = y;
        a = m;
        f = c(f, g, y, m, v[e + 0], 7, 3614090360);
        m = c(m, f, g, y, v[e + 1], 12, 3905402710);
        y = c(y, m, f, g, v[e + 2], 17, 606105819);
        g = c(g, y, m, f, v[e + 3], 22, 3250441966);
        f = c(f, g, y, m, v[e + 4], 7, 4118548399);
        m = c(m, f, g, y, v[e + 5], 12, 1200080426);
        y = c(y, m, f, g, v[e + 6], 17, 2821735955);
        g = c(g, y, m, f, v[e + 7], 22, 4249261313);
        f = c(f, g, y, m, v[e + 8], 7, 1770035416);
        m = c(m, f, g, y, v[e + 9], 12, 2336552879);
        y = c(y, m, f, g, v[e + 10], 17, 4294925233);
        g = c(g, y, m, f, v[e + 11], 22, 2304563134);
        f = c(f, g, y, m, v[e + 12], 7, 1804603682);
        m = c(m, f, g, y, v[e + 13], 12, 4254626195);
        y = c(y, m, f, g, v[e + 14], 17, 2792965006);
        g = c(g, y, m, f, v[e + 15], 22, 1236535329);
        f = s(f, g, y, m, v[e + 1], 5, 4129170786);
        m = s(m, f, g, y, v[e + 6], 9, 3225465664);
        y = s(y, m, f, g, v[e + 11], 14, 643717713);
        g = s(g, y, m, f, v[e + 0], 20, 3921069994);
        f = s(f, g, y, m, v[e + 5], 5, 3593408605);
        m = s(m, f, g, y, v[e + 10], 9, 38016083);
        y = s(y, m, f, g, v[e + 15], 14, 3634488961);
        g = s(g, y, m, f, v[e + 4], 20, 3889429448);
        f = s(f, g, y, m, v[e + 9], 5, 568446438);
        m = s(m, f, g, y, v[e + 14], 9, 3275163606);
        y = s(y, m, f, g, v[e + 3], 14, 4107603335);
        g = s(g, y, m, f, v[e + 8], 20, 1163531501);
        f = s(f, g, y, m, v[e + 13], 5, 2850285829);
        m = s(m, f, g, y, v[e + 2], 9, 4243563512);
        y = s(y, m, f, g, v[e + 7], 14, 1735328473);
        g = s(g, y, m, f, v[e + 12], 20, 2368359562);
        f = l(f, g, y, m, v[e + 5], 4, 4294588738);
        m = l(m, f, g, y, v[e + 8], 11, 2272392833);
        y = l(y, m, f, g, v[e + 11], 16, 1839030562);
        g = l(g, y, m, f, v[e + 14], 23, 4259657740);
        f = l(f, g, y, m, v[e + 1], 4, 2763975236);
        m = l(m, f, g, y, v[e + 4], 11, 1272893353);
        y = l(y, m, f, g, v[e + 7], 16, 4139469664);
        g = l(g, y, m, f, v[e + 10], 23, 3200236656);
        f = l(f, g, y, m, v[e + 13], 4, 681279174);
        m = l(m, f, g, y, v[e + 0], 11, 3936430074);
        y = l(y, m, f, g, v[e + 3], 16, 3572445317);
        g = l(g, y, m, f, v[e + 6], 23, 76029189);
        f = l(f, g, y, m, v[e + 9], 4, 3654602809);
        m = l(m, f, g, y, v[e + 12], 11, 3873151461);
        y = l(y, m, f, g, v[e + 15], 16, 530742520);
        g = l(g, y, m, f, v[e + 2], 23, 3299628645);
        f = p(f, g, y, m, v[e + 0], 6, 4096336452);
        m = p(m, f, g, y, v[e + 7], 10, 1126891415);
        y = p(y, m, f, g, v[e + 14], 15, 2878612391);
        g = p(g, y, m, f, v[e + 5], 21, 4237533241);
        f = p(f, g, y, m, v[e + 12], 6, 1700485571);
        m = p(m, f, g, y, v[e + 3], 10, 2399980690);
        y = p(y, m, f, g, v[e + 10], 15, 4293915773);
        g = p(g, y, m, f, v[e + 1], 21, 2240044497);
        f = p(f, g, y, m, v[e + 8], 6, 1873313359);
        m = p(m, f, g, y, v[e + 15], 10, 4264355552);
        y = p(y, m, f, g, v[e + 6], 15, 2734768916);
        g = p(g, y, m, f, v[e + 13], 21, 1309151649);
        f = p(f, g, y, m, v[e + 4], 6, 4149444226);
        m = p(m, f, g, y, v[e + 11], 10, 3174756917);
        y = p(y, m, f, g, v[e + 2], 15, 718787259);
        g = p(g, y, m, f, v[e + 9], 21, 3951481745);
        f = o(f, n);
        g = o(g, i);
        y = o(y, r);
        m = o(m, a);
      }
      return (h(f) + h(g) + h(y) + h(m)).toLowerCase();
    }(t);
  };
  return _ctor;
}();
exports.Utils = exp_Utils;