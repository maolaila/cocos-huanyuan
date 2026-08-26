var i;
var cc__extends = __extends;
var cc__decorate = __decorate;
Object.defineProperty(exports, "__esModule", {
  value: true
});
var $Config = require("Config");
var cc__decorator = cc._decorator;
var ccp_ccclass = cc__decorator.ccclass;
var ccp_property = cc__decorator.property;
var def_DZPKRoom = function (e) {
  function _ctor() {
    var t = null !== e && e.apply(this, arguments) || this;
    t.content = null;
    t.top = null;
    t.bottom = null;
    t.head = null;
    t.nickname = null;
    t.gold = null;
    t.bankGold = null;
    t.isEnterRoom = false;
    t.isExit = false;
    return t;
  }
  cc__extends(_ctor, e);
  _ctor.prototype.onLoad = function () {
    var e = this;
    wGEvent.on("local_Event", this.local_Event, this);
    wGEvent.on("Msg_" + wGameData.getGameName() + "_RoomInfo", function () {
      e.initShow();
    }, this);
    if (wGameData.isReconnect) {
      this.loadGame();
    } else {
      this.initRoom();
    }
  };
  _ctor.prototype.onEnable = function () {
    if (!wGameData.isReconnect) {
      this.gold && (this.gold.string = wUtils.numConvert(wGameData.getKey("gold")));
      this.enterAni();
    }
  };
  _ctor.prototype.local_Event = function (e) {
    switch (e) {
      case "up_Gold":
        this.gold && (this.gold.string = wUtils.numConvert(wGameData.getKey("gold")));
        this.bankGold && (this.bankGold.string = wUtils.numConvert(wGameData.getKey("bank")));
    }
  };
  _ctor.prototype.initRoom = function () {
    var e = wGameData.roomConfig;
    for (var t in e) {
      if (Object.prototype.hasOwnProperty.call(e, t)) {
        var o = Number(t) - 1;
        this.content.getChildByName("" + o).on("click", this.roomOnClick, this);
      }
    }
    this.head && wUIHelp.setHead(this.head, wGameData.getKey("headimgurl"));
    this.nickname && (this.nickname.string = wUtils.handleNameLen(wGameData.getKey("nickname"), 10));
    this.bankGold && (this.bankGold.string = wUtils.numConvert(wGameData.getKey("bank")));
  };
  _ctor.prototype.initShow = function () {
    this.isEnterRoom = false;
    this.node.parent.active = false;
    if (wGameData.isReconnect) {
      wGameData.isReconnect = false;
      this.node.parent.destroyAllChildren();
    }
  };
  _ctor.prototype.enterAni = function () {
    this.top.stopAllActions();
    this.top.y = 500;
    var e = cc.delayTime(.15);
    var t = cc.moveTo(.2, cc.v2(0, 375)).easing(cc.easeOut(1.5));
    this.top.runAction(cc.sequence(e, t));
    var o = cc.find("main/spine", this.node);
    o.x = -585;
    var i = cc.moveTo(.2, cc.v2(-435, -370.37)).easing(cc.easeOut(1.5));
    o.opacity = 0;
    var n = cc.fadeTo(.3, 255);
    var a = cc.spawn(i, n);
    o.runAction(a);
    var r = this.content;
    r.x = 265;
    i = cc.moveTo(.2, cc.v2(115, 0)).easing(cc.easeOut(1.5));
    r.opacity = 0;
    n = cc.fadeTo(.3, 255);
    a = cc.spawn(i, n);
    r.runAction(a);
  };
  _ctor.prototype.Msg_Hall_EnterRoom = function (e) {
    if (1 != e.status) {
      wLog.e("进入房间消息失败");
      wGameData.roomID = null;
      wGameData.isReconnect = false;
      return void wUIManager.hideLoadingUI();
    }
    wGameData.roomID = e.data.rid;
    this.loadGame();
  };
  _ctor.prototype.enterRoom = function (e) {
    var t = this;
    if (!this.isEnterRoom) {
      wGameData.roomLevel = e;
      var o = wGameData.roomConfig[e];
      if (o) {
        if (o.min_gold > wGameData.getKey("gold")) {
          wUIManager.enterRoomFailTips(o.min_gold);
        } else if (wGameData.gameRepair()) {
          wUIManager.showTips("游戏维护中");
        } else {
          this.isEnterRoom = true;
          var i = wGEvent.on("Msg_Hall_EnterRoom", function (e) {
            t.Msg_Hall_EnterRoom(e);
            wGEvent.off(i);
            t.unscheduleAllCallbacks();
            i = null;
          }, this);
          this.scheduleOnce(function () {
            if (i) {
              t.isEnterRoom = false;
              wGEvent.off(i);
            }
          }, 20);
          wNetWork.send("Msg_Hall_EnterRoom", {
            tableid: 0,
            gtype: Number(wGameData.gameID),
            level: e
          });
        }
      } else {
        wUIManager.showTips("游戏配置错误，请重新进入游戏！");
      }
    }
  };
  _ctor.prototype.faststart = function () {
    wAudioMgr.playBtnSound();
    var e = wGameData.getKey("gold");
    var t = wGameData.roomConfig;
    var o = 1;
    for (var i in t) {
      Object.prototype.hasOwnProperty.call(t, i) && t[i].min_gold <= e && (o = t[i].level);
    }
    this.enterRoom(o);
  };
  _ctor.prototype.roomOnClick = function (e) {
    wAudioMgr.playBtnSound();
    var t = e.node.name;
    this.enterRoom(Number(t) + 1);
  };
  _ctor.prototype.onClick = function (e) {
    if (!this.isExit) {
      switch (e.target.name) {
        case "exit":
          this.isExit = true;
          wAudioMgr.playCloseSound();
          return void wViewMgr.enterHall();
        case "rule":
          wViewMgr.openPage({
            path: "prefab/Rule",
            bundle: wGameData.getGameName()
          });
          break;
        case "bank":
          break;
        case "faststart":
          this.faststart();
      }
      wAudioMgr.playBtnSound();
    }
  };
  _ctor.prototype.loadGame = function () {
    var e = $Config.Config.GamePrefab[wGameData.gameID];
    wRes.loadRes(e.prefabUrl, function () {}, function (e, t) {
      if (e) {
        wLog.e(e);
      } else {
        wViewMgr.openGame(t);
      }
    }, e.enName);
  };
  cc__decorate([ccp_property(cc.Node)], _ctor.prototype, "content", undefined);
  cc__decorate([ccp_property(cc.Node)], _ctor.prototype, "top", undefined);
  cc__decorate([ccp_property(cc.Node)], _ctor.prototype, "bottom", undefined);
  cc__decorate([ccp_property(cc.Sprite)], _ctor.prototype, "head", undefined);
  cc__decorate([ccp_property(cc.Label)], _ctor.prototype, "nickname", undefined);
  cc__decorate([ccp_property(cc.Label)], _ctor.prototype, "gold", undefined);
  cc__decorate([ccp_property(cc.Label)], _ctor.prototype, "bankGold", undefined);
  return cc__decorate([ccp_ccclass], _ctor);
}(cc.Component);
exports.default = def_DZPKRoom;