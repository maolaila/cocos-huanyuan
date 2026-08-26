var n;
var cc__extends = __extends;
var cc__decorate = __decorate;
Object.defineProperty(exports, "__esModule", {
  value: true
});
var cc__decorator = cc._decorator;
var ccp_ccclass = cc__decorator.ccclass;
var ccp_property = cc__decorator.property;
var def_DropDown = function (t) {
  function _ctor() {
    var e = null !== t && t.apply(this, arguments) || this;
    e.switchBtn = null;
    e.switchImg = [];
    e.panel = null;
    e.closeBtn = null;
    e.bottomY = 490;
    e.isShow = false;
    e.showY = 0;
    e.moveTime = .3;
    e.isAction = false;
    return e;
  }
  cc__extends(_ctor, t);
  _ctor.prototype.start = function () {
    var t = this;
    this.bottomY = this.panel.y;
    this.panel.active = false;
    this.panel.opacity = 0;
    this.closeBtn.active = false;
    wGEvent.on("local_Event", function (e, o) {
      switch (e) {
        case "setGameBankBtn":
          cc.find("bank", t.panel).getComponent(cc.Button).interactable = o;
      }
    }, this);
  };
  _ctor.prototype.showCloseBtn = function () {
    this.switchBtn.spriteFrame = this.switchImg[0];
    this.closeBtn.active = true;
  };
  _ctor.prototype.hideCloseBtn = function () {
    this.switchBtn.spriteFrame = this.switchImg[1];
    this.closeBtn.active = false;
  };
  _ctor.prototype.onClickBtn = function (t, e) {
    switch (e) {
      case "switch":
        this.onClickSwitchBtn();
        break;
      case "rule":
        this.onClickRuleBtn();
        break;
      case "close":
        return void this.onClickCloseBtn();
      case "bank":
        return void this.onClickBankBtn();
      case "set":
        this.onClickSetBtn();
    }
    wAudioMgr.playBtnSound();
  };
  _ctor.prototype.onClickSwitchBtn = function () {
    var t = this;
    if (!this.isAction) {
      this.isAction = true;
      this.isShow = !this.isShow;
      var e = null;
      var o = null;
      if (this.isShow) {
        this.panel.y += 100;
        e = cc.v2(this.panel.x, this.bottomY);
        o = 255;
      } else {
        e = cc.v2(this.panel.x, this.bottomY + 100);
        o = 0;
      }
      var n = cc.moveTo(this.moveTime, e).easing(cc.easeBackOut());
      var i = cc.fadeTo(.25, o);
      var r = cc.spawn(n, i);
      var a = cc.callFunc(function () {
        t.isAction = false;
        t.panel.active = o;
      });
      this.panel.active = true;
      if (this.isShow) {
        this.panel.runAction(cc.sequence(cc.callFunc(this.showCloseBtn.bind(this)), r, a));
      } else {
        this.panel.runAction(cc.sequence(cc.callFunc(this.hideCloseBtn.bind(this)), r, a));
      }
    }
  };
  _ctor.prototype.onClickRuleBtn = function () {
    wViewMgr.openPage({
      path: "prefab/Rule",
      bundle: wGameData.getGameName()
    });
    this.onClickSwitchBtn();
  };
  _ctor.prototype.onClickCloseBtn = function () {
    this.onClickSwitchBtn();
  };
  _ctor.prototype.onClickBankBtn = function () {
    this.onClickSwitchBtn();
  };
  _ctor.prototype.onClickSetBtn = function () {
    this.onClickSwitchBtn();
    wViewMgr.openPage({
      path: "prefab/Set",
      bundle: wGameData.getGameName()
    });
  };
  cc__decorate([ccp_property(cc.Sprite)], _ctor.prototype, "switchBtn", undefined);
  cc__decorate([ccp_property([cc.SpriteFrame])], _ctor.prototype, "switchImg", undefined);
  cc__decorate([ccp_property(cc.Node)], _ctor.prototype, "panel", undefined);
  cc__decorate([ccp_property(cc.Node)], _ctor.prototype, "closeBtn", undefined);
  return cc__decorate([ccp_ccclass], _ctor);
}(cc.Component);
exports.default = def_DropDown;