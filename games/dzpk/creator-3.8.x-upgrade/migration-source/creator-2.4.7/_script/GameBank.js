var n;
var cc__extends = __extends;
var cc__decorate = __decorate;
Object.defineProperty(exports, "__esModule", {
  value: true
});
var $PopupBase = require("PopupBase");
var cc__decorator = cc._decorator;
var ccp_ccclass = cc__decorator.ccclass;
var ccp_property = cc__decorator.property;
var def_GameBank = function (t) {
  function _ctor() {
    var e = null !== t && t.apply(this, arguments) || this;
    e.gold = null;
    e.bankGold = null;
    e.inputGold = null;
    e.slider = null;
    e.prog = null;
    e.pwd = null;
    e.czBtn = null;
    e.progTips = null;
    e.dxLabel = null;
    e.depositNum = 0;
    e.bankStatus = true;
    return e;
  }
  cc__extends(_ctor, t);
  _ctor.prototype.onLoad = function () {
    wGEvent.on("local_Event", this.local_Event, this);
    wGEvent.on("Msg_Hall_BankAccess", this.Msg_Hall_BankAccess, this);
    this.init();
    wNetWork.send("Msg_Hall_ChangeGolds", []);
    var t = this.main.getChildByName("Slider");
    t = t ? t.getChildByName("Handle") : cc.find("layout/Slider/Handle", this.main);
    var e = cc.find("prog", t);
    e.opacity = 0;
    t.on("touchstart", function () {
      e.stopAllActions();
      var t = cc.fadeTo(.1, 255);
      e.runAction(t);
    });
    t.on("touchend", function () {
      e.stopAllActions();
      var t = cc.fadeTo(.1, 0);
      e.runAction(t);
    });
    t.on("touchcancel", function () {
      e.stopAllActions();
      var t = cc.fadeTo(.1, 0);
      e.runAction(t);
    });
    wGameData.bankPow == wGameData.getKey("bankpass") && (cc.find("layout/pwd", this.main).active = false);
  };
  _ctor.prototype.Msg_Hall_BankAccess = function (t) {
    if (1 == t.status) {
      var e = t.data;
      wGameData.setKey("bank", e.bank);
      wGameData.setKey("gold", e.gold);
      this.setInputGold(0);
      wUIManager.showTips("取款成功", wUIManager.TIPS_OK);
      this.hide(false);
    }
  };
  _ctor.prototype.init = function () {
    this.gold.string = wUtils.numConvert(wGameData.getKey("gold"));
    this.bankGold.string = wUtils.numConvert(wGameData.getKey("bank"));
  };
  _ctor.prototype.editboxEvent = function (t) {
    if (wGameData.getKey("bank") <= 0) {
      this.inputGold.string = "";
      return void this.inputGold.blur();
    }
    if (t > wGameData.getKey("bank")) {
      this.inputGold.blur();
      t = wGameData.getKey("bank");
    }
    this.setInputGold(t);
  };
  _ctor.prototype.sliderEvevt = function (t) {
    if (wGameData.getKey("bank") <= 0) {
      t.progress = 0;
      return void (this.prog.progress = 0);
    }
    var e = t.progress;
    var o = Math.ceil(wGameData.getKey("bank") * e);
    o > wGameData.getKey("bank") && (o = wGameData.getKey("bank"));
    this.setInputGold(o);
    this.progTips.string = Math.floor(100 * t.progress) + "%";
  };
  _ctor.prototype.setInputGold = function (t) {
    this.inputGold.string = "" + (t ? wUtils.numConvert(t) : "");
    var e = t / wGameData.getKey("bank") || 0;
    this.slider.progress = e;
    this.prog.progress = e;
    this.depositNum = t;
    this.dxLabel.string = wUtils.smalltoBIG(t);
    this.czBtn.active = Boolean(t);
  };
  _ctor.prototype.onClick = function (t, e) {
    wAudioMgr.playBtnSound();
    switch (e) {
      case "all":
        if (wGameData.getKey("bank") <= 0) {
          return;
        }
        this.setInputGold(wGameData.getKey("bank"));
        break;
      case "deposit":
        if (!this.depositNum || this.depositNum < 1e3) {
          return void wUIManager.showTips("取款不能少于1000");
        }
        if (wGameData.bankPow != wGameData.getKey("bankpass")) {
          if (!this.pwd.string) {
            return void wUIManager.showTips("密码不能为空");
          }
          if (this.pwd.string != wGameData.getKey("bankpass")) {
            wUIManager.showTips("密码不正确！");
            this.setInputGold(0);
            return void (this.pwd.string = "");
          }
          wGameData.bankPow = wGameData.getKey("bankpass");
        }
        wNetWork.send("Msg_Hall_BankAccess", {
          gold: Number(this.depositNum)
        }, true);
        break;
      case "purge":
        this.setInputGold(0);
    }
  };
  _ctor.prototype.local_Event = function (t, e) {
    switch (t) {
      case "up_Gold":
        this.init();
        break;
      case "setGameBankBtn":
        cc.find("btn/ok", this.main).getComponent(cc.Button).interactable = e;
    }
  };
  cc__decorate([ccp_property(cc.Label)], _ctor.prototype, "gold", undefined);
  cc__decorate([ccp_property(cc.Label)], _ctor.prototype, "bankGold", undefined);
  cc__decorate([ccp_property(cc.EditBox)], _ctor.prototype, "inputGold", undefined);
  cc__decorate([ccp_property(cc.Slider)], _ctor.prototype, "slider", undefined);
  cc__decorate([ccp_property(cc.ProgressBar)], _ctor.prototype, "prog", undefined);
  cc__decorate([ccp_property(cc.EditBox)], _ctor.prototype, "pwd", undefined);
  cc__decorate([ccp_property(cc.Node)], _ctor.prototype, "czBtn", undefined);
  cc__decorate([ccp_property(cc.Label)], _ctor.prototype, "progTips", undefined);
  cc__decorate([ccp_property(cc.Label)], _ctor.prototype, "dxLabel", undefined);
  return cc__decorate([ccp_ccclass], _ctor);
}($PopupBase.default);
exports.default = def_GameBank;