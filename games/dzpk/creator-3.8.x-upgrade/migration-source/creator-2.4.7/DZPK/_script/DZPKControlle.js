var i;
var cc__extends = __extends;
var cc__decorate = __decorate;
var cc__awaiter = __awaiter;
var cc__generator = __generator;
Object.defineProperty(exports, "__esModule", {
  value: true
});
var $PokerBase = require("PokerBase");
var $DZPKMode = require("DZPKMode");
var $DZPKView = require("DZPKView");
var cc__decorator = cc._decorator;
var ccp_ccclass = cc__decorator.ccclass;
cc__decorator.property;
var def_DZPKControlle = function (e) {
  function _ctor() {
    var t = null !== e && e.apply(this, arguments) || this;
    t.Model = null;
    t.View = null;
    return t;
  }
  cc__extends(_ctor, e);
  _ctor.prototype.onLoad = function () {
    this.initProxy();
    this.initEvevt();
    this.m_init();
  };
  _ctor.prototype.initProxy = function () {
    var e = this;
    this.Model = wUtils.creatorProxy(new $DZPKMode.DZPKModel());
    this.View = this.node.getComponent($DZPKView.default);
    this.View.initShow();
    this.Model.onEvevt("allBet", function (t) {
      e.View.setAllBet(t);
    });
    this.Model.onEvevt("stage", function () {});
    this.Model.onEvevt("bankeruid", function (t) {
      if (t) {
        var o = e.Model.getPlayer("uid", t);
        e.View.setPlayerBanker(o.l_seat);
      }
    });
  };
  _ctor.prototype.m_roomInfo = function (e) {
    if (!e.publiccards.length && 2 == e.stage) {
      for (var t in e.allbets) {
        !e.curbet[t] && (e.curbet[t] = {
          act: 0
        });
        e.curbet[t].gold = e.allbets[t];
      }
    }
    this.Model.initRoom(e);
    if (this.Model.stage > 0) {
      0 != this.Model.my_data.cards.length && 3 != this.Model.stage || this.View.showTips("wait", true);
    } else {
      this.Model.playerList.length < 3 && this.View.showTips("oth", true);
    }
    for (var o = 0; o < this.Model.playerList.length; o++) {
      var i = this.Model.playerList[o];
      this.addPlayer(i);
      if (0 != this.Model.stage && 3 != this.Model.stage) {
        var n = this.Model.curbet[i.uid];
        n && (i.betGold += n.gold);
        if (0 == i.cards.length) {
          this.View.setPlayerOpacity(i.l_seat, false);
        } else {
          i.join = true;
          n && (i.act = n.act);
          n && 5 == n.act && this.View.setPlayerOpacity(i.l_seat, false);
          this.View.setPlayerPoker(i.l_seat, i.cards, i.act);
          if (0 == i.l_seat) {
            var a = e.px[wGameData.getKey("uid")];
            a && this.Model.publiccards.length && 5 != i.act && this.View.setPlayerPokerTips(a);
          }
          if (n) {
            this.View.setPlayerBet(i.l_seat, n.gold, false);
            this.View.setPlayerTips(i.l_seat, 4 == n.act && 0 == n.gold ? "3_0" : n.act);
          }
        }
      }
    }
    if (3 != this.Model.stage) {
      this.View.setPubliccards(this.Model.publiccards);
      this.Model.notice instanceof Array || this.Msg_DZPK_CallUserAct(this.Model.notice);
      var r = {};
      var l = 0;
      for (var s in e.curbet) {
        var c = e.curbet[s];
        6 == c.act && (r[s] = c.gold);
        l += c.gold > 0 ? c.gold : 0;
      }
      this.Model.currentBet = this.Model.allBet - l;
      this.Model.publiccards && this.Model.publiccards.length && this.View.setCurrentBet(this.Model.currentBet, false);
    } else {
      this.Model.allBet = 0;
    }
  };
  _ctor.prototype.addPlayer = function (e) {
    var t = this;
    this.View.add_Delete_Player(e.l_seat, e);
    e.onEvevt("gold", function () {
      t.View.setPlayerGold(e.l_seat, e.gold);
    });
  };
  _ctor.prototype.Msg_DZPK_FaCards = function (e) {
    var t = this;
    this.View.setPlayerPokerTips(null);
    this.Model.publiccards = [];
    this.View.setPubliccards([]);
    this.Model.stage = 1;
    this.Model.bankeruid = e.bankeruid;
    var o = e.ingame;
    if (o.includes(wGameData.getKey("uid"))) {
      this.View.showTips(null, false);
    } else {
      this.View.showTips("wait", true);
    }
    this.Model.allBet = 0;
    for (var i = 0; i < this.Model.playerList.length; i++) {
      var n = this.Model.playerList[i];
      n.betGold = 0;
      this.View.initPlayer(n.l_seat);
      this.View.setPlayerOpacity(n.l_seat, o.includes(n.uid));
      n.join = o.includes(n.uid);
    }
    var a = 0;
    var r = this.Model.getPlayer("uid", this.Model.bankeruid).l_seat;
    var l = function (o) {
      r > 5 && (r = 0);
      var i = s.Model.getPlayer("l_seat", r++);
      if (!i || !i.join) {
        return "continue";
      }
      i.cards = e.cards;
      s.scheduleOnce(function () {
        wAudioMgr.playSound("sound/fapaib", "DZPK");
        t.View.showFaPai(i.l_seat, e.cards, o >= 6);
      }, .1 * a++);
    };
    var s = this;
    for (i = 0; i < 12; i++) {
      l(i);
    }
  };
  _ctor.prototype.Msg_DZPK_StageBet = function (e) {
    var t = e.bets;
    for (var o in t) {
      var i = this.Model.getPlayer("uid", o);
      var n = t[o];
      i.betGold += n;
      i.gold -= n;
      this.View.setPlayerBet(i.l_seat, t[o]);
      this.Model.allBet += n;
    }
  };
  _ctor.prototype.Msg_DZPK_CallUserAct = function (e) {
    return cc__awaiter(this, undefined, undefined, function () {
      var t;
      var o;
      var i;
      var n;
      var a;
      var r;
      var s = this;
      return cc__generator(this, function (l) {
        switch (l.label) {
          case 0:
            this.Model.genGold = e.minbet;
            this.Model.callUid = e.uid;
            t = this.Model.getPlayer("uid", e.uid);
            o = 0;
            for (i = this.Model.playerList; o < i.length; o++) {
              n = i[o];
              this.View.setPlayerTime(n.l_seat, 0);
            }
            return [4, wUtils.syncDelayed(.5, this)];
          case 1:
            l.sent();
            this.View.setPlayerTime(t.l_seat, e.time);
            this.View.setPlayerTips(t.l_seat, null);
            if (0 == t.l_seat) {
              if (this.Model.autoList.includes(1)) {
                for (a = 0; a < this.Model.autoList.length; a++) {
                  r = this.Model.autoList[a];
                  if (2 == a && r) {
                    this.scheduleOnce(function () {
                      s.sendMsgActBet(t.gold >= e.minbet ? e.minbet : t.gold);
                    }, 1);
                    break;
                  }
                  if (r) {
                    if (0 == e.minbet) {
                      this.scheduleOnce(function () {
                        s.sendMsgActBet(0);
                      }, 1);
                    } else {
                      this.scheduleOnce(function () {
                        s.sendMsgActBet(-1);
                      }, 1);
                    }
                    this.Model.autoList[a] = 0;
                    this.View.showAutoBtn(-1);
                    break;
                  }
                }
              } else {
                this.View.showBtn("bet", e.minbet, this.Model);
              }
            } else if (5 != this.Model.my_data.act && this.Model.my_data.join) {
              this.View.showBtn("auto");
            } else {
              this.View.showBtn("");
            }
            return [2];
        }
      });
    });
  };
  _ctor.prototype.Msg_DZPK_ActBet = function (e) {
    return cc__awaiter(this, undefined, undefined, function () {
      var t;
      var o;
      return cc__generator(this, function () {
        t = this.Model.getPlayer("uid", this.Model.callUid);
        o = "young_man";
        wGameData.getKey("headimgurl") % 12 < 6 && (o = "young_woman");
        switch (e.act) {
          case 3:
          case 4:
            break;
          case 5:
            wAudioMgr.playSound("sound/" + o + "/fold", "DZPK");
            this.View.setPlayerOpacity(t.l_seat, false);
            this.View.recoveryPoker(t.l_seat);
        }
        if (6 == e.act) {
          wAudioMgr.playSound("sound/" + o + "/allin", "DZPK");
          this.View.setPlayerTips(t.l_seat, 6, true);
        } else if (0 == e.gold && 5 != e.act) {
          wAudioMgr.playSound("sound/dongdong", "DZPK");
          this.View.playBGAnim(4);
          this.View.setPlayerTips(t.l_seat, "3_0");
        } else {
          if (4 == e.act) {
            wAudioMgr.playSound("sound/" + o + "/call", "DZPK");
          } else {
            3 == e.act && wAudioMgr.playSound("sound/" + o + "/raise", "DZPK");
          }
          this.View.setPlayerTips(t.l_seat, e.act);
        }
        t.act = e.act;
        if (e.gold <= 0) {
          return [2];
        } else {
          this.Model.allBet += e.gold;
          t.gold -= e.gold;
          t.betGold += e.gold;
          this.View.setPlayerBet(t.l_seat, t.betGold);
          return [2];
        }
      });
    });
  };
  _ctor.prototype.Msg_DZPK_PublicCards = function (e) {
    return cc__awaiter(this, undefined, undefined, function () {
      var t;
      var o;
      var i;
      var n;
      var a;
      var r;
      return cc__generator(this, function (l) {
        switch (l.label) {
          case 0:
            return [4, wUtils.syncDelayed(.5, this)];
          case 1:
            l.sent();
            (r = this.Model.publiccards).push.apply(r, e.cards);
            t = 0;
            o = 0;
            for (i = this.Model.playerList; o < i.length; o++) {
              if ((n = i[o]).join) {
                n.betGold && this.View.recoverBet(n.l_seat);
                if (n.act < 5) {
                  this.View.initPlayerBetTips(n.l_seat);
                  this.View.setPlayerTips(n.l_seat, null);
                }
                t += n.betGold;
                n.betGold = 0;
              }
            }
            if (t > 0) {
              wAudioMgr.playSound("sound/chipfly", "DZPK");
              return [4, wUtils.syncDelayed(.7, this)];
            } else {
              return [3, 3];
            }
          case 2:
            l.sent();
            this.View.setCurrentBet(this.Model.allBet);
            l.label = 3;
          case 3:
            this.View.showPubliccards(this.Model.publiccards, e.cards.length);
            return [4, wUtils.syncDelayed(.5, this)];
          case 4:
            l.sent();
            (a = e.px[wGameData.getKey("uid")]) && this.Model.my_data.join && 5 != this.Model.my_data.act && this.View.setPlayerPokerTips(a);
            return [2];
        }
      });
    });
  };
  _ctor.prototype.Msg_DZPK_Result = function (e) {
    return cc__awaiter(this, undefined, undefined, function () {
      var t;
      var o;
      var i;
      var n;
      var a;
      var r;
      var s;
      var c;
      var d;
      var h;
      var u;
      var p;
      var y;
      var g;
      var f;
      var w;
      var m;
      var v;
      return cc__generator(this, function (l) {
        switch (l.label) {
          case 0:
            this.View.showBtn("");
            t = 0;
            for (o = this.Model.playerList; t < o.length; t++) {
              i = o[t];
              this.View.setPlayerTime(i.l_seat, 0);
              i.betGold = 0;
              i.join = false;
              i.act = 0;
            }
            return [4, wUtils.syncDelayed(1.5, this)];
          case 1:
            l.sent();
            n = this.Model.getPlayer("uid", e.winner);
            a = false;
            r = 0;
            for (s = this.Model.playerList; r < s.length; r++) {
              c = s[r];
              this.View.recoverBet(c.l_seat);
              c.join && c.betGold && (a = true);
            }
            a && wAudioMgr.playSound("sound/chipfly", "DZPK");
            return [4, wUtils.syncDelayed(.7, this)];
          case 2:
            l.sent();
            this.View.setCurrentBet(this.Model.allBet);
            return [4, wUtils.syncDelayed(1, this)];
          case 3:
            l.sent();
            d = null;
            h = null;
            for (g in u = e.cards) {
              p = u[g];
              y = this.Model.getPlayer("uid", g);
              this.View.setPlayerPoker(y.l_seat, null, null);
              if (p.cards && p.cards.length) {
                this.View.playerBrightCard(y.l_seat, n.l_seat, p.hcards, p.cards, p.value);
                if (g == n.uid) {
                  d = p.cards;
                  h = p.value;
                }
              }
            }
            wAudioMgr.playSound("sound/jiesuantishi", "DZPK");
            return [4, wUtils.syncDelayed(.5, this)];
          case 4:
            l.sent();
            h && this.View.setPubLiccardColor(d, this.Model.publiccards);
            this.Model.my_data.cards = [];
            this.View.showGetPlayerBet(n.l_seat);
            return [4, wUtils.syncDelayed(.5, this)];
          case 5:
            l.sent();
            this.View.showWinGold(n.l_seat, e.wingold);
            if (e.wingold / this.Model.doublescore > 100) {
              wAudioMgr.playSound("sound/bigying", "DZPK");
            } else {
              wAudioMgr.playSound("sound/ying", "DZPK");
            }
            for (g in e.usergold) {
              f = this.Model.getPlayer("uid", g);
              if (f) {
                f.gold = e.usergold[g];
              }
            }
            this.Model.stage = 0;
            this.Model.allBet = 0;
            return [4, wUtils.syncDelayed(4, this)];
          case 6:
            l.sent();
            this.View.showTips("oth", true);
            this.View.setPubLiccardColor(null, null);
            this.View.initAllPoker();
            w = 0;
            for (m = this.Model.playerList; w < m.length; w++) {
              v = m[w];
              this.View.setPlayerOpacity(v.l_seat, true);
              this.View.setPlayerPokerOpacity(v.l_seat);
              this.View.setPlayerTips(v.l_seat);
            }
            return [2];
        }
      });
    });
  };
  _ctor.prototype.Msg_DZPK_PlayerAct = function (e) {
    var t = this.Model.addPlayer(e);
    this.addPlayer(t);
    if (0 != this.Model.stage) {
      this.View.setPlayerOpacity(t.l_seat, false);
    } else {
      this.View.setPlayerOpacity(t.l_seat, true);
    }
  };
  _ctor.prototype.Msg_DZPK_Out = function (e) {
    for (var t = 0; t < this.Model.playerList.length; t++) {
      var o = this.Model.playerList[t];
      if (o.uid == e.uid) {
        this.View.add_Delete_Player(o.l_seat, null);
        return void this.Model.playerList.splice(t, 1);
      }
    }
  };
  _ctor.prototype.onClick = function (e, t) {
    switch (t) {
      case "bank":
        if (1 == wGameData.roomLevel) {
          return void wUIManager.showTips("体验场不能打开银行", wUIManager.TIPS_OK);
        }
        break;
      case "hall":
        if (this.Model.my_data.join && 5 != this.Model.my_data.act) {
          return void wUIManager.showTips("游戏正在进行中！");
        } else {
          wAudioMgr.playCloseSound();
          return void this.m_quitGame();
        }
      case "qi":
        this.sendMsgActBet(-1);
        break;
      case "gen":
        this.sendMsgActBet(this.Model.genGold);
        break;
      case "rang":
        this.sendMsgActBet(0);
        break;
      case "jia":
        this.View.openSelectBet(true, this.Model.getSelectBet(), this.Model.my_data.gold, this.Model.doublescore);
        break;
      case "closeJz":
        this.View.openSelectBet(false);
    }
    wAudioMgr.playBtnSound();
  };
  _ctor.prototype.autoOnClick = function (e, t) {
    if (this.Model.autoList[t]) {
      this.Model.autoList[t] = 0;
    } else {
      this.Model.autoList = [0, 0, 0];
      this.Model.autoList[t] = 1;
      this.View.showAutoBtn(t);
      wAudioMgr.playBtnSound();
    }
  };
  _ctor.prototype.dmOnClick = function (e, t) {
    this.sendMsgActBet(this.Model.getDMBet()[t]);
    wAudioMgr.playBtnSound();
  };
  _ctor.prototype.dcOnClick = function (e, t) {
    this.sendMsgActBet(this.Model.getDCBet()[t]);
    wAudioMgr.playBtnSound();
  };
  _ctor.prototype.selectBet = function (e) {
    this.sendMsgActBet(e.target.betGold);
  };
  _ctor.prototype.sendMsgActBet = function (e) {
    this.node.getChildByName("btn").active = false;
    wNetWork.send("Msg_DZPK_ActBet", {
      gold: e
    });
  };
  _ctor.prototype.initEvevt = function () {
    var e = this;
    wGEvent.on("Msg_DZPK_PlayerAct", function (t) {
      if (1 == t.status) {
        e.Msg_DZPK_PlayerAct(t.data);
      } else {
        wLog.e("Msg_DZPK_PlayerAct");
      }
    }, this);
    wGEvent.on("Msg_DZPK_FaCards", function (t) {
      if (1 == t.status) {
        e.Msg_DZPK_FaCards(t.data);
      } else {
        wLog.e("Msg_DZPK_FaCards");
      }
    }, this);
    wGEvent.on("Msg_DZPK_PublicCards", function (t) {
      if (1 == t.status) {
        e.Msg_DZPK_PublicCards(t.data);
      } else {
        wLog.e("Msg_DZPK_PublicCards");
      }
    }, this);
    wGEvent.on("Msg_DZPK_StageBet", function (t) {
      if (1 == t.status) {
        e.Msg_DZPK_StageBet(t.data);
      } else {
        wLog.e("Msg_DZPK_StageBet");
      }
    }, this);
    wGEvent.on("Msg_DZPK_CallUserAct", function (t) {
      if (1 == t.status) {
        e.Msg_DZPK_CallUserAct(t.data);
      } else {
        wLog.e("Msg_DZPK_CallUserAct");
      }
    }, this);
    wGEvent.on("Msg_DZPK_ActBet", function (t) {
      if (1 == t.status) {
        e.Msg_DZPK_ActBet(t.data);
      } else {
        wLog.e("Msg_DZPK_ActBet");
      }
    }, this);
    wGEvent.on("Msg_DZPK_Result", function (t) {
      if (1 == t.status) {
        e.Msg_DZPK_Result(t.data);
      } else {
        wLog.e("Msg_DZPK_Result");
      }
    }, this);
    wGEvent.on("Msg_DZPK_ChangGold", function (t) {
      if (1 == t.status) {
        e.Msg_DZPK_ChangGold(t.data);
      } else {
        wLog.e("Msg_DZPK_ChangGold");
      }
    }, this);
    wGEvent.on("Msg_DZPK_Out", function (t) {
      if (1 == t.status) {
        e.Msg_DZPK_Out(t.data);
      } else {
        wLog.e("Msg_DZPK_ChangGold");
      }
    }, this);
  };
  _ctor.prototype.Msg_DZPK_ChangGold = function (e) {
    this.Model.getPlayer("uid", e.uid).gold = e.gold;
  };
  _ctor.prototype.m_upGameGold = function () {};
  _ctor.prototype.m_NetWorkState = function () {};
  return cc__decorate([ccp_ccclass], _ctor);
}($PokerBase.default);
exports.default = def_DZPKControlle;