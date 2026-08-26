var n;
var cc__extends = __extends;
var cc__decorate = __decorate;
Object.defineProperty(exports, "__esModule", {
  value: true
});
var cc__decorator = cc._decorator;
var ccp_ccclass = cc__decorator.ccclass;
cc__decorator.property;
var def_PokerBase = function (t) {
  function _ctor() {
    return null !== t && t.apply(this, arguments) || this;
  }
  cc__extends(_ctor, t);
  _ctor.prototype.m_quitGame = function () {
    var t = this;
    wUIManager.showGameOutTips({
      okCB: function () {
        wNetWork.send("Msg_" + t.m_game + "_Out", [], true);
      }
    });
  };
  _ctor.prototype.m_setBankBtn = function (t) {
    wGEvent.emit("local_Event", "setGameBankBtn", t);
  };
  _ctor.prototype.m_init = function () {
    var t = this;
    this.m_game = wGameData.getGameName();
    wGEvent.on("Msg_" + this.m_game + "_Out", this.m_msg_quitGame, this);
    wGEvent.on("Msg_Hall_FinishLoad", this.Msg_Hall_FinishLoad, this);
    wGEvent.on("Msg_" + this.m_game + "_RoomInfo", function (e) {
      wUIManager.hideLoadingUI();
      if (1 != e.status) {
        wLog.e("获取游戏场景信息失败");
        return void t.m_msg_quitGame({
          status: 1
        });
      }
      t.m_roomInfo(e.data);
    }, this);
    wGEvent.on("Msg_Hall_Connect", function (e) {
      if (1 == e.status) {
        if (wGameData.getKey("rid")) {
          var o = wGameData.getGame();
          wRes.loadRes(o.prefabUrl, function (e, o) {
            wUIManager.showLoadingUI();
            wAudioMgr.stopAllEffects();
            cc.instantiate(o).parent = t.node.parent;
            t.node.removeFromParent();
            t.node.destroy();
          }, o.enName);
        } else {
          wUIManager.showTips("房间以解散", wUIManager.TIPS_OK);
          t.m_msg_quitGame({
            status: 1,
            data: {
              uid: wGameData.getKey("uid")
            }
          });
        }
      } else {
        wLog.e("验证失败");
      }
    }, this);
    wGEvent.on("local_Event", this.local_Event, this);
    wGEvent.on("local_SocketState", this.m_NetWorkState, this);
    wNetWork.send("Msg_Hall_FinishLoad", {
      rid: wGameData.roomID
    });
  };
  _ctor.prototype.local_Event = function (t) {
    switch (t) {
      case "up_Gold":
        this.m_upGameGold();
    }
  };
  _ctor.prototype.Msg_Hall_FinishLoad = function (t) {
    if (1 != t.status) {
      wLog.e("进房加载消息失败");
      wNetWork.send("Msg_Hall_EnterRoom", {
        tableid: 0,
        gtype: wGameData.gameID,
        level: wGameData.roomLevel
      });
      return void this.m_msg_quitGame({
        status: 1,
        data: {
          uid: wGameData.getKey("uid")
        }
      });
    }
  };
  _ctor.prototype.m_msg_quitGame = function (t) {
    wUIManager.hideLoadingUI();
    if (1 == t.status) {
      if (t.data.uid == wGameData.getKey("uid")) {
        var e = t.data.gold;
        wViewMgr.quitGame(e);
      }
    } else {
      wLog.e("退出游戏失败");
    }
  };
  return cc__decorate([ccp_ccclass], _ctor);
}(cc.Component);
exports.default = def_PokerBase;