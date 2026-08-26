var i;
var cc__extends = __extends;
var cc__decorate = __decorate;
var cc__awaiter = __awaiter;
var cc__generator = __generator;
Object.defineProperty(exports, "__esModule", {
  value: true
});
var $Config = require("Config");
var cc__decorator = cc._decorator;
var ccp_ccclass = cc__decorator.ccclass;
cc__decorator.property;
var def_DZPKLoad = function (e) {
  function _ctor() {
    return null !== e && e.apply(this, arguments) || this;
  }
  cc__extends(_ctor, e);
  _ctor.prototype.onLoad = function () {
    return cc__awaiter(this, undefined, undefined, function () {
      var e;
      var t = this;
      return cc__generator(this, function (o) {
        switch (o.label) {
          case 0:
            wAudioMgr.stopBgMusic();
            wAudioMgr.playBgMusic(wGameData.getGame().music, wGameData.getGameName());
            this.preloadGameRes();
            return [4, new Promise(function (e) {
              var o = t.node.getChildByName("main").getChildByName("spine");
              wUIHelp.playSpine(o, "start", function () {
                wUIHelp.playSpine(o, "idle", null, true);
              });
              t.scheduleOnce(function () {
                e();
              }, .7);
            })];
          case 1:
            o.sent();
            if (wGameData.isReconnect) {
              this.loadRoom();
            } else {
              e = wGEvent.on("Msg_Hall_GameSessions", function (o) {
                t.Msg_Hall_GameSessions(o);
                wGEvent.off(e);
                t.unscheduleAllCallbacks();
                e = null;
              }, this);
              this.scheduleOnce(function () {
                if (e) {
                  wUIManager.showTips("请求游戏配置失败");
                  wGEvent.off(e);
                  wViewMgr.enterHall();
                }
              }, 10);
              wNetWork.send("Msg_Hall_GameSessions", {
                gtype: wGameData.gameID
              });
            }
            return [2];
        }
      });
    });
  };
  _ctor.prototype.Msg_Hall_GameSessions = function (e) {
    if (1 != e.status || !e.data) {
      wLog.e("请求游戏配置失败");
      return void wViewMgr.enterHall();
    }
    wGameData.roomConfig = e.data;
    this.loadRoom();
  };
  _ctor.prototype.preloadGameRes = function () {
    var e = $Config.Config.GamePrefab[wGameData.gameID];
    wRes.preloadDir(e.prefabUrl, e.enName);
    wRes.preloadDir("prefab/Room", e.enName);
  };
  _ctor.prototype.loadRoom = function () {
    var e = this;
    var t = wGameData.gameID;
    var o = cc.Canvas.instance.node.getChildByName("Room");
    o.active = true;
    var i = $Config.Config.GamePrefab[t];
    wRes.loadRes("prefab/Room", function (t, i) {
      return cc__awaiter(e, undefined, undefined, function () {
        return cc__generator(this, function () {
          if (t) {
            wViewMgr.enterHall();
            return [2];
          } else {
            cc.instantiate(i).parent = o;
            if (wGameData.isReconnect) {
              this.node.zIndex = 100;
            } else {
              this.node.destroy();
            }
            return [2];
          }
        });
      });
    }, i.enName);
  };
  return cc__decorate([ccp_ccclass], _ctor);
}(cc.Component);
exports.default = def_DZPKLoad;