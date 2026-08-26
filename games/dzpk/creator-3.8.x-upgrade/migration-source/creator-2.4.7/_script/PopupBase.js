var n;
var cc__extends = __extends;
var cc__decorate = __decorate;
Object.defineProperty(exports, "__esModule", {
  value: true
});
var cc__decorator = cc._decorator;
var ccp_ccclass = cc__decorator.ccclass;
var ccp_property = cc__decorator.property;
var def_PopupBase = function (t) {
  function _ctor() {
    var e = null !== t && t.apply(this, arguments) || this;
    e.background = null;
    e.main = null;
    e.blocker = null;
    e.animTime = .2;
    e.options = null;
    e.finishCallback = null;
    return e;
  }
  cc__extends(_ctor, t);
  _ctor.prototype.show = function (t) {
    var e = this;
    this.options = t;
    this.background.opacity = 0;
    this.background.active = true;
    this.main.opacity = 0;
    this.main.active = true;
    this.node.active = true;
    this.main.scale = 1;
    this.init(this.options);
    this.updateDisplay(this.options);
    cc.tween(this.background).to(.8 * this.animTime, {
      opacity: 80
    }).start();
    var o = cc.fadeTo(.04, 255);
    var n = cc.scaleTo(.1, 1.1).easing(cc.easeIn(1));
    var i = cc.scaleTo(.1, 1).easing(cc.easeIn(1));
    var r = cc.spawn(o, n);
    var a = cc.callFunc(function () {
      e.onShow && e.onShow();
    });
    var c = cc.sequence(r, i, a);
    this.main.runAction(c);
  };
  _ctor.prototype.hide = function (t) {
    var e = this;
    undefined === t && (t = true);
    t && wAudioMgr.playCloseSound();
    if (!this.blocker) {
      this.blocker = new cc.Node("blocker");
      this.blocker.addComponent(cc.BlockInputEvents);
      this.blocker.setParent(this.node);
      this.blocker.setContentSize(this.node.getContentSize());
    }
    this.blocker.active = true;
    cc.tween(this.background).delay(.2 * this.animTime).to(.8 * this.animTime, {
      opacity: 0
    }).call(function () {
      e.background.active = false;
    }).start();
    wUIHelp.easeIn(this.main, function () {
      e.blocker.active = false;
      e.main.active = false;
      e.node.active = false;
      e.onHide && e.onHide();
      e.finishCallback && e.finishCallback();
    });
  };
  _ctor.prototype.init = function () {};
  _ctor.prototype.updateDisplay = function () {};
  _ctor.prototype.setFinishCallback = function (t) {
    this.finishCallback = t;
  };
  _ctor.prototype.onShow = function () {};
  _ctor.prototype.onHide = function () {};
  cc__decorate([ccp_property({
    type: cc.Node,
    // tooltip: false
  })], _ctor.prototype, "background", undefined);
  cc__decorate([ccp_property({
    type: cc.Node,
    // tooltip: false
  })], _ctor.prototype, "main", undefined);
  return cc__decorate([ccp_ccclass], _ctor);
}(cc.Component);
exports.default = def_PopupBase;