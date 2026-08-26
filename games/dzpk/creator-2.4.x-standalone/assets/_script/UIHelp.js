var cc__awaiter = __awaiter;
var cc__generator = __generator;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.UIHelp = undefined;
var $CountUp = require("CountUp");
var exp_UIHelp = function () {
  function _ctor() {}
  _ctor.prototype.easeBackOut = function (t, e) {
    t.scale = .5;
    t.active = true;
    cc.tween(t).to(.2, {
      scale: 1
    }, {
      easing: "backOut"
    }).call(function () {
      e && e();
    }).start();
  };
  _ctor.prototype.easeIn = function (t, e) {
    t.scale = 1;
    t.active = true;
    cc.tween(t).to(.1, {
      scale: 0
    }).call(function () {
      e && e();
    }).start();
  };
  _ctor.prototype.CountUp = function (t, e, o, n, i, a, c) {
    undefined === n && (n = 2);
    undefined === i && (i = "");
    undefined === c && (c = true);
    var s = {
      startVal: e || 1,
      decimalPlaces: 0,
      duration: n,
      useGrouping: c,
      useEasing: false,
      prefix: i
    };
    t instanceof cc.Node && (t = t.getComponent(cc.Label));
    if (0 != o) {
      var l = new $CountUp.CountUp(t, o, s);
      if (l.error) {
        wLog.e(l.error);
      } else {
        l.start(function () {
          a && a();
          l = undefined;
        });
      }
      return l;
    }
    t.string = "0";
  };
  _ctor.prototype.CountUp_ = function (t, e, o, n, i, r) {
    undefined === r && (r = "");
    if (0 == o) {
      t.getComponent(cc.Label).string = "0";
      return void (i && i());
    }
    var a = Math.ceil((o - e) / (60 * n));
    var c = cc.delayTime(.01);
    var s = null;
    var l = cc.callFunc(function () {
      if ((e += a) > o) {
        if (s) {
          t.stopAction(s);
          t.getComponent(cc.Label).string = r + wUtils.numConvert(o);
          i && i();
          s = null;
        }
      } else {
        t.getComponent(cc.Label).string = r + wUtils.numConvert(e);
      }
    });
    t.getComponent(cc.Label).string = r + wUtils.numConvert(e);
    s = cc.repeatForever(cc.sequence(c, l));
    t.runAction(s);
  };
  _ctor.prototype.hideSonNode = function (t, e) {
    undefined === e && (e = false);
    var o = 0;
    for (var n = t.children; o < n.length; o++) {
      n[o].active = e;
    }
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
  _ctor.prototype.a_loadRes = function (t, e, o) {
    undefined === e && (e = cc.SpriteFrame);
    return new Promise(function (n) {
      wRes.loadRes(t, e, function (e, o) {
        e && wLog.e("资源加载错误：", +t);
        n({
          err: e,
          res: o
        });
      }, o);
    });
  };
  _ctor.prototype.setSpriteFrame = function (t, e) {
    wRes.loadRes(t, cc.SpriteFrame, function (o, n) {
      if (o) {
        wLog.e("图片资源加载错误：", +t);
      } else if (cc.isValid(e)) {
        e instanceof cc.Node && (e = e.getComponent(cc.Sprite));
        e.spriteFrame = n;
      }
    });
  };
  _ctor.prototype.setHead = function (t, e, o) {
    undefined === o && (o = false);
    e = Number(e) % 12;
    wRes.loadRes("Hall/Head/plist_head", cc.SpriteAtlas, function (o, n) {
      if (o) {
        wLog.e("图片资源加载错误：", NaN);
      } else {
        var i = e <= 5 ? "female" : "male";
        i = "plist_head_" + i + "_" + (e % 6 + 1);
        if (cc.isValid(t)) {
          t instanceof cc.Node && (t = t.getComponent(cc.Sprite));
          t.spriteFrame = n._spriteFrames[i];
        }
      }
    });
  };
  _ctor.prototype.loadHead = function (t, e) {
    return cc__awaiter(this, undefined, undefined, function () {
      return cc__generator(this, function () {
        if (wConstant.isCheckHotUp) {
          t instanceof cc.Node && (t = t.getComponent(cc.Sprite));
          t.spriteFrame = null;
          cc.assetManager.loadRemote(e, function (e, o) {
            if (e) {
              wLog.e(e);
            } else {
              var n = new cc.SpriteFrame(o);
              if (n) {
                cc.isValid(t) && (t.spriteFrame = n);
              } else {
                cc.assetManager.releaseAsset(o);
              }
            }
          });
          return [2];
        } else {
          return [2];
        }
      });
    });
  };
  _ctor.prototype.setHeadFrame = function (t, e) {
    e = Number(e) || 0;
    e %= 11;
    this.setSpriteFrame("Hall/HeadFrame/" + e, t);
  };
  _ctor.prototype.shake = function (t) {
    var e = t.x;
    var o = t.y;
    var n = cc.repeatForever(cc.sequence(cc.moveTo(.032, cc.v2(e + 5, o + 7)), cc.moveTo(.032, cc.v2(e - 6, o + 7)), cc.moveTo(.032, cc.v2(e - 13, o + 3)), cc.moveTo(.032, cc.v2(e + 3, o - 6)), cc.moveTo(.032, cc.v2(e - 5, o + 5)), cc.moveTo(.032, cc.v2(e + 2, o - 8)), cc.moveTo(.032, cc.v2(e - 8, o - 10)), cc.moveTo(.032, cc.v2(e + 3, o + 10)), cc.moveTo(.032, cc.v2(e + 0, o + 0))));
    t.stopActionByTag(111);
    n.setTag(111);
    t.runAction(n);
    setTimeout(function () {
      if (cc.isValid(t, true)) {
        t.stopActionByTag(111);
        t.x = e;
        t.y = o;
      }
    }, 1e3);
  };
  _ctor.prototype.setNodeColor = function (t, e) {
    t.color = e;
    var o = 0;
    for (var n = t.children; o < n.length; o++) {
      var i = n[o];
      this.setNodeColor(i, e);
    }
  };
  _ctor.prototype.setOrientation = function (t) {
    if (cc.sys.os == cc.sys.OS_ANDROID && cc.sys.isNative) {
      jsb.reflection.callStaticMethod("org/cocos2dx/javascript/AppActivity", "setOrientation", "(Ljava/lang/String;)V", t);
    } else {
      cc.sys.os == cc.sys.OS_IOS && cc.sys.isNative && jsb.reflection.callStaticMethod("AppController", "setOrientation:", t);
    }
    var e = cc.view.getFrameSize();
    if ("V" == t) {
      cc.view.setOrientation(cc.macro.ORIENTATION_PORTRAIT);
      e.width > e.height && cc.view.setFrameSize(e.height, e.width);
      cc.Canvas.instance.designResolution = cc.size(750, 1334);
    } else {
      cc.view.setOrientation(cc.macro.ORIENTATION_LANDSCAPE);
      if (e.height > e.width) {
        cc.view.setFrameSize(e.height, e.width);
        cc.Canvas.instance.designResolution = cc.size(1334, 750);
      }
    }
  };
  _ctor.prototype.playSpine = function (t, e, o, n) {
    undefined === o && (o = null);
    undefined === n && (n = false);
    t instanceof cc.Node && (t = t.getComponent(sp.Skeleton));
    t.clearTracks();
    t.setToSetupPose();
    var i = t.setAnimation(0, e, n);
    n || t.setTrackCompleteListener(i, function () {
      o && o();
    });
  };
  return _ctor;
}();
exports.UIHelp = exp_UIHelp;