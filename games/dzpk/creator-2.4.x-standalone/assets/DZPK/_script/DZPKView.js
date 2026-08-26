var i;
var cc__extends = __extends;
var cc__decorate = __decorate;
var cc__awaiter = __awaiter;
var cc__generator = __generator;
Object.defineProperty(exports, "__esModule", {
  value: true
});
var $Config = require("Config");
var $NodePool = require("NodePool");
var cc__decorator = cc._decorator;
var ccp_ccclass = cc__decorator.ccclass;
var ccp_property = cc__decorator.property;
var def_DZPKView = function (e) {
  function _ctor() {
    var t = null !== e && e.apply(this, arguments) || this;
    t.othTips = null;
    t.players = null;
    t.allBet = null;
    t.currentBet = null;
    t.pokerImg = null;
    t.typeImg = null;
    t.myGold = 0;
    t.zdBet = 0;
    t.pokerPool = null;
    t.chipPool = null;
    return t;
  }
  cc__extends(_ctor, e);
  _ctor.prototype.initShow = function () {
    wUIHelp.hideSonNode(this.players);
    var e = ["体验场", "新手场", "初级场", "中级场", "高级场"][wGameData.roomLevel - 1] + "  小/大盲注:" + ["1万/2万  前注:20万", "1千/2千  前注:2万", "5千/1万  前注:10万"][wGameData.roomLevel - 1];
    this.node.getChildByName("gameType").getComponent(cc.Label).string = e;
    var t = this.node.getChildByName("s_pos").getChildByName("item");
    this.pokerPool = new $NodePool.default(t, 10);
    this.pokerPool.put(t);
    t = this.node.getChildByName("chip").getChildByName("item");
    this.chipPool = new $NodePool.default(t, 10);
    this.chipPool.put(t);
    this.initAllPoker();
    this.setPubliccards([]);
    this.playBGAnim(wUtils.random(1, 4));
    this.node.getChildByName("allBet").scaleY = cc.winSize.width / 1334;
  };
  _ctor.prototype.playBGAnim = function (e) {
    var t = this;
    var o = this.node.getChildByName("spine");
    wUIHelp.playSpine(o, "suiji" + e, function () {
      t.playBGAnim(wUtils.random(1, 4));
    });
  };
  _ctor.prototype.add_Delete_Player = function (e, t) {
    var o = this.players.children[e];
    !o.spos && (o.spos = o.getPosition());
    var i = o.getChildByName("info");
    if (t) {
      if (e < 2) {
        i.y = -360;
      } else {
        i.x = e < 4 ? -360 : 360;
      }
      a = cc.moveTo(.25, cc.v2(0, 0));
      i.stopAllActions();
      i.runAction(a);
      o.active = true;
      this.setPlayerInfo(e, t);
      this.initPlayer(e);
    } else if (o.active) {
      var n;
      n = e < 2 ? cc.v2(0, -360) : e < 4 ? cc.v2(-360, 0) : cc.v2(360, 0);
      var a = cc.moveTo(.25, n);
      var r = cc.callFunc(function () {
        o.active = false;
      });
      i.stopAllActions();
      i.runAction(cc.sequence(a, r));
    }
  };
  _ctor.prototype.setPlayerInfo = function (e, t) {
    var o = this.players.children[e].getChildByName("info");
    wUIHelp.setHead(o.getChildByName("head"), t.headimgurl, true);
    var i = t.nickname;
    i = wUtils.handleNameLen(i, 3, false);
    o.getChildByName("name").getComponent(cc.Label).string = i;
    this.setPlayerGold(e, t.gold);
  };
  _ctor.prototype.setPlayerGold = function (e, t) {
    this.players.children[e].getChildByName("info").getChildByName("gold").getComponent(cc.Label).string = wUtils.goldFormat(t, 2);
  };
  _ctor.prototype.initPlayer = function (e) {
    this.setPlayerTips(e);
    this.setPlayerTime(e, null);
    this.setPlayerBet(e, null);
    this.setPlayerPoker(e, null, null);
    this.setPlayerOpacity(e, true);
  };
  _ctor.prototype.setPlayerTips = function (e, t, o) {
    var i = this.players.children[e].getChildByName("info");
    var n = i.getChildByName("tips");
    var a = -1;
    switch (t = String(t)) {
      case "6":
        a = 4;
        break;
      case "4":
        a = 1;
        break;
      case "5":
        a = 2;
        break;
      case "3":
        a = 0;
        break;
      case "3_0":
        a = 3;
    }
    n.active = -1 != a;
    i.getChildByName("name").active = -1 == a;
    i.getChildByName("allBet").active = 4 == a;
    if (-1 != a) {
      var r = this.typeImg.getSpriteFrame("t" + a + ".png");
      n.getComponent(cc.Sprite).spriteFrame = r;
      if (4 == a && o) {
        var l = this.node.getChildByName("allBet");
        l.active = true;
        l.stopAllActions();
        var s = cc.delayTime(3);
        var c = cc.callFunc(function () {
          l.active = false;
        });
        var d = cc.sequence(s, c);
        l.runAction(d);
      }
    }
  };
  _ctor.prototype.setPlayerTime = function (e, t) {
    var o = this.players.children[e].getChildByName("info").getChildByName("prog");
    o.active = Boolean(t);
    if (t && (o.getComponent(cc.Animation).play().speed = 1 / t, o.stopAllActions(), t > 3 && !e)) {
      var i = cc.delayTime(t - 3);
      var n = cc.callFunc(function () {
        wAudioMgr.playSound("sound/half_time", "DZPK");
      });
      var a = cc.sequence(i, n);
      o.runAction(a);
    }
  };
  _ctor.prototype.setPlayerBet = function (e, t, o) {
    undefined === o && (o = true);
    return cc__awaiter(this, undefined, undefined, function () {
      var i;
      var n;
      var a;
      var r;
      var s;
      var c;
      var d;
      var h;
      var u;
      var p = this;
      return cc__generator(this, function (y) {
        switch (y.label) {
          case 0:
            i = this.players.children[e];
            n = i.getChildByName("bet");
            if (!t) {
              n.active = false;
              return [2];
            }
            if (!o) {
              n.active = true;
              n.getChildByName("label").getComponent(cc.Label).string = wUtils.goldFormat(t, 2);
              return [2];
            }
            wAudioMgr.playSound("sound/hechip", "DZPK");
            a = this.node.getChildByName("chip");
            r = i.getPosition();
            s = wUtils.local_world__POS(cc.find("bet/img", i));
            s = wUtils.world_local_POS(a, s);
            c = [];
            d = function (e) {
              var o;
              var i;
              var d;
              var u;
              return cc__generator(this, function (l) {
                switch (l.label) {
                  case 0:
                    (o = h.chipPool.getNode).parent = a;
                    o.setPosition(r);
                    o.active = true;
                    c.push(o);
                    i = cc.moveTo(.15, s);
                    d = cc.callFunc(function () {
                      if (2 == e) {
                        var o = 0;
                        for (var i = c; o < i.length; o++) {
                          var a = i[o];
                          p.chipPool.put(a);
                        }
                        n.active = true;
                        n.getChildByName("label").getComponent(cc.Label).string = wUtils.goldFormat(t, 2);
                      }
                    });
                    u = cc.sequence(i, d);
                    o.stopAllActions();
                    o.runAction(u);
                    return [4, wUtils.syncDelayed(.075, h)];
                  case 1:
                    l.sent();
                    return [2];
                }
              });
            };
            h = this;
            u = 0;
            y.label = 1;
          case 1:
            if (u < 3) {
              return [5, d(u)];
            } else {
              return [3, 4];
            }
          case 2:
            y.sent();
            y.label = 3;
          case 3:
            u++;
            return [3, 1];
          case 4:
            return [2];
        }
      });
    });
  };
  _ctor.prototype.setPlayerPoker = function (e, t, o) {
    var i = this.players.children[e].getChildByName("poker");
    i.active = Boolean(t);
    t || "0" != e || this.setPlayerPokerTips(null);
    if (5 != o || 0 == e) {
      if (t && t.length && "0" == i.parent.name) {
        for (var n = 0; n < t.length; n++) {
          var a = i.children[n];
          wUIHelp.hideSonNode(a);
          a.getComponent(cc.Sprite).spriteFrame = this.pokerImg.getSpriteFrame("plist_puke_front_big");
          this.setPokerNode(t[n], a);
          wUIHelp.setNodeColor(a, 5 == o ? $Config.Config.colorSet.ash : $Config.Config.colorSet.white);
        }
      }
    } else {
      i.active = false;
    }
  };
  _ctor.prototype.setPlayerOpacity = function (e, t) {
    var o = this.players.children[e].getChildByName("info");
    wUIHelp.setNodeColor(o, t ? $Config.Config.colorSet.white : $Config.Config.colorSet.ash);
  };
  _ctor.prototype.initAllPoker = function () {
    for (var e = 1; e < 6; e++) {
      var t = this.players.children[e].getChildByName("poker");
      t.active = false;
      wUIHelp.setNodeColor(t, $Config.Config.colorSet.white);
    }
  };
  _ctor.prototype.getPokerUrl = function (e) {
    var t = Math.floor(e / 100);
    var o = e % 100 - 1;
    t >= 14 && (t = 1);
    return {
      p: "plist_puke_value_" + o % 2 + "_" + t,
      xh: "plist_puke_color_big_" + o,
      dh: "plist_puke_color_small_" + o
    };
  };
  _ctor.prototype.setPokerNode = function (e, t) {
    var o = this.getPokerUrl(e);
    var i = 0;
    for (var n = t.children; i < n.length; i++) {
      var a = n[i];
      var r = this.pokerImg.getSpriteFrame(o[a.name]);
      a.getComponent(cc.Sprite).spriteFrame = r;
      if (!r) {
        wLog.w(o);
        wLog.e(o[a.name]);
      }
      a.active = true;
    }
  };
  _ctor.prototype.setPlayerBanker = function (e) {
    var t = this.players.children[e].getChildByName("D");
    var o = this.node.getChildByName("BankD");
    var i = wUtils.local_world__POS(t);
    i = wUtils.world_local_POS(this.node, i);
    if (o.active) {
      var n = cc.moveTo(.3, i);
      o.runAction(n);
    } else {
      o.active = true;
      o.setPosition(i);
    }
  };
  _ctor.prototype.setAllBet = function (e) {
    this.allBet.string = "底池:" + wUtils.goldFormat(e, 2);
  };
  _ctor.prototype.setCurrentBet = function (e, t) {
    var o = this;
    undefined === t && (t = true);
    this.currentBet.active = Boolean(e);
    if (e) {
      t && this.scheduleOnce(function () {
        var e = o.node.getChildByName("chip");
        o.chipPool.recoveryAll(e);
      }, .2);
      this.currentBet.getChildByName("label").getComponent(cc.Label).string = wUtils.goldFormat(e, 2);
    }
  };
  _ctor.prototype.setThbBet = function (e) {
    if (e) {
      var t = cc.find("label/cazhi", this.node);
      t.getChildByName("label").getComponent(cc.Label).string = wUtils.goldFormat(e, 2);
      t.active = false;
    }
  };
  _ctor.prototype.showTips = function (e, t) {
    var o = this.node.getChildByName("tips");
    wUIHelp.hideSonNode(o);
    var i = o.getChildByName(e);
    if (i) {
      i.active = t;
    } else {
      this.unscheduleAllCallbacks();
    }
  };
  _ctor.prototype.showBtn = function (e, t, o) {
    var i = this.node.getChildByName("btn");
    i.active = true;
    wUIHelp.hideSonNode(i);
    var n = i.getChildByName(e);
    if (n && (n.active = true, "bet" == e)) {
      if (o.publiccards.length > 0) {
        var a = n.getChildByName("dichi");
        a.active = true;
        n.getChildByName("dm").active = false;
        var r = o.getDCBet();
        var l = 0;
        for (var c = a.children; l < c.length; l++) {
          var d = r[(y = c[l]).name] >= t && r[y.name] <= o.my_data.gold;
          y.getComponent(cc.Button).interactable = d;
          wUIHelp.setNodeColor(y, d ? $Config.Config.colorSet.white : $Config.Config.colorSet.ash);
        }
      } else {
        var h = n.getChildByName("dm");
        n.getChildByName("dichi").active = false;
        h.active = true;
        r = o.getDMBet();
        var u = 0;
        for (var p = h.children; u < p.length; u++) {
          var y;
          d = r[(y = p[u]).name] >= t && r[y.name] <= o.my_data.gold;
          y.getComponent(cc.Button).interactable = d;
          wUIHelp.setNodeColor(y, d ? $Config.Config.colorSet.white : $Config.Config.colorSet.ash);
        }
      }
      n.getChildByName("btn_yellow").getComponent(cc.Button).interactable = t + 2 * o.doublescore <= o.my_data.gold;
      n.getChildByName("btn_rang").active = t <= 0;
      n.getChildByName("btn_green").active = !(t <= 0);
      cc.find("btn_green/layout/label", n).getComponent(cc.Label).string = wUtils.goldFormat(t);
    }
  };
  _ctor.prototype.showAutoBtn = function (e) {
    var t = this.node.getChildByName("btn").getChildByName("auto");
    for (var o = 0; o < 3; o++) {
      e != o && t.children[o].getComponent(cc.Toggle).uncheck();
    }
  };
  _ctor.prototype.openSelectBet = function (e, t, o, i) {
    var n = this;
    this.myGold = o;
    var a = this.node.getChildByName("btn").getChildByName("jiabet");
    a.active = e;
    this.node.getChildByName("btn").getChildByName("bet").active = !e;
    if (e) {
      for (var r = 0; r < 5; r++) {
        var l = a.getChildByName("" + r);
        l.children[0].getComponent(cc.Label).string = wUtils.goldFormat(t[r], 2);
        l.getComponent(cc.Button).interactable = t[r] <= o;
        l.betGold = t[r];
      }
      var s = a.getChildByName("btn");
      s.betGold = t[5];
      this.zdBet = t[5];
      var c = cc.find("slider/slider/Handle/btn_add", a);
      var d = cc.find("slider/slider/Handle/btn_sub", a);
      c.off("click");
      d.off("click");
      var h = function (e) {
        var t = s.betGold + e * i;
        n.sliderEvevt({
          progress: t / n.myGold
        });
      };
      c.on("click", function () {
        h(1);
      });
      d.on("click", function () {
        h(-1);
      });
      this.sliderEvevt({
        progress: 0
      });
    }
  };
  _ctor.prototype.sliderEvevt = function (e) {
    var t = e.progress;
    var o = this.zdBet / this.myGold;
    t < o && (t = o);
    t > 1 && (t = 1);
    var i = cc.find("btn/jiabet/slider", this.node);
    i.getChildByName("slider").getComponent(cc.Slider).progress = t;
    i.getChildByName("slider").getComponent(cc.ProgressBar).progress = t;
    var n = this.myGold * t;
    n = Math.floor(n);
    cc.find("slider/Handle/label", i).getComponent(cc.Label).string = wUtils.goldFormat(n, 2);
    i.parent.getChildByName("btn").betGold = n;
    var a = cc.find("slider/spine", i);
    if (t < 1) {
      a.active = false;
    } else if (!a.active) {
      a.active = true;
      wUIHelp.playSpine(a, "start", function () {
        wUIHelp.playSpine(a, "idle", null, false);
      });
    }
    var r = cc.find("slider/bar/layout", i);
    var l = Math.floor(31 * t);
    l < 2 && (l = 2);
    for (var s = 1; s < 32; s++) {
      r.children[s - 1].active = l >= s;
    }
    var c = r.getChildByName("anim");
    c.active = true;
    c.setPosition(r.children[l - 1].getPosition());
    c.y += 12;
    c.children[0].getComponent(cc.Animation).play();
  };
  _ctor.prototype.showFaPai = function (e, t, o) {
    return cc__awaiter(this, undefined, undefined, function () {
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
      var _;
      var b;
      var P;
      var C = this;
      return cc__generator(this, function (l) {
        switch (l.label) {
          case 0:
            i = this.players.children[e].getChildByName("poker");
            if (!o) {
              i.active = true;
              wUIHelp.hideSonNode(i);
            }
            n = this.node.getChildByName("s_pos");
            (a = this.pokerPool.getNode).parent = n;
            a.setPosition(0, 3);
            a.scale = .4;
            a.angle = -180;
            a.active = true;
            r = i.children[Number(o)];
            if ("0" == e) {
              this.setPokerNode(t[Number(o)], r);
              wUIHelp.hideSonNode(r);
              r.getComponent(cc.Sprite).spriteFrame = this.pokerImg.getSpriteFrame("plist_puke_back_big_1");
            }
            s = wUtils.local_world__POS(r);
            s = wUtils.world_local_POS(n, s);
            c = cc.moveTo(.2, s);
            d = cc.rotateTo(.2, 0);
            h = cc.scaleTo(.2, r.scaleX, r.scaleY);
            u = cc.spawn(c, d, h);
            p = cc.callFunc(function () {
              r.active = true;
              C.pokerPool.put(a);
            });
            y = cc.sequence(u, p);
            a.runAction(y);
            return [4, wUtils.syncDelayed(.15, this)];
          case 1:
            l.sent();
            (g = this.pokerPool.getNode).parent = n;
            g.setPosition(0, 3);
            g.scale = .4;
            g.angle = -180;
            g.active = true;
            f = cc.moveTo(.2, s);
            w = cc.rotateTo(.2, 0);
            m = cc.scaleTo(.2, r.scaleX, r.scaleY);
            v = cc.fadeTo(.2, 80);
            _ = cc.spawn(f, w, m, v);
            b = cc.callFunc(function () {
              C.pokerPool.put(g);
              "0" == e && 1 == o && C.scheduleOnce(function () {
                var e = 0;
                for (var t = i.children; e < t.length; e++) {
                  var o = t[e];
                  wUIHelp.hideSonNode(o, true);
                  o.getComponent(cc.Sprite).spriteFrame = C.pokerImg.getSpriteFrame("plist_puke_front_big");
                }
              }, .25);
            });
            P = cc.sequence(_, b);
            g.runAction(P);
            return [2];
        }
      });
    });
  };
  _ctor.prototype.recoverBet = function (e) {
    return cc__awaiter(this, undefined, undefined, function () {
      var t;
      var o;
      var i;
      var n;
      var a;
      var r;
      var s;
      var c;
      return cc__generator(this, function (l) {
        switch (l.label) {
          case 0:
            t = this.players.children[e];
            if (!(o = t.getChildByName("bet").children[0]).parent.active) {
              return [2];
            }
            i = this.node.getChildByName("chip");
            n = wUtils.local_world__POS(o);
            n = wUtils.world_local_POS(i, n);
            (a = wUtils.local_world__POS(cc.find("label/allbet", this.node))).x += 10;
            a = wUtils.world_local_POS(i, a);
            r = 0;
            l.label = 1;
          case 1:
            if (r < 4) {
              (s = this.chipPool.getNode).parent = i;
              s.setPosition(n);
              s.act = true;
              c = cc.moveTo(.25, a);
              s.stopAllActions();
              s.runAction(c);
              return [4, wUtils.syncDelayed(.07, this)];
            } else {
              return [3, 4];
            }
          case 2:
            l.sent();
            l.label = 3;
          case 3:
            r++;
            return [3, 1];
          case 4:
            o.parent.active = false;
            return [2];
        }
      });
    });
  };
  _ctor.prototype.showGetPlayerBet = function (e) {
    return cc__awaiter(this, undefined, undefined, function () {
      var t;
      var o;
      var i;
      var n;
      var a;
      var r;
      var s;
      var c = this;
      return cc__generator(this, function (d) {
        switch (d.label) {
          case 0:
            t = this.node.getChildByName("chip");
            o = this.players.children[e];
            i = wUtils.local_world__POS(o);
            i = wUtils.world_local_POS(this.node, i);
            n = wUtils.local_world__POS(cc.find("label/allbet/img", this.node));
            n = wUtils.world_local_POS(t, n);
            a = function () {
              var e;
              var o;
              var a;
              var s;
              var d;
              return cc__generator(this, function (l) {
                switch (l.label) {
                  case 0:
                    (e = r.chipPool.getNode).opacity = 255;
                    e.parent = t;
                    e.setPosition(n);
                    e.act = true;
                    o = cc.moveTo(.25, i);
                    a = cc.fadeOut(.15);
                    s = cc.callFunc(function () {
                      e.opacity = 255;
                      c.chipPool.put(e);
                    });
                    d = cc.sequence(o, a, s);
                    e.stopAllActions();
                    e.runAction(d);
                    return [4, wUtils.syncDelayed(.08, r)];
                  case 1:
                    l.sent();
                    return [2];
                }
              });
            };
            r = this;
            s = 0;
            d.label = 1;
          case 1:
            if (s < 5) {
              return [5, a(s)];
            } else {
              return [3, 4];
            }
          case 2:
            d.sent();
            d.label = 3;
          case 3:
            s++;
            return [3, 1];
          case 4:
            return [4, wUtils.syncDelayed(1, this)];
          case 5:
            d.sent();
            this.setCurrentBet(null);
            return [2];
        }
      });
    });
  };
  _ctor.prototype.showWinGold = function (e, t) {
    var o = this.node.getChildByName("win");
    var i = o.getChildByName("winlabel");
    i.zIndex = 20;
    i.getComponent(cc.Label).string = "+" + wUtils.goldFormat(t);
    var n = this.players.children[e].getPosition();
    i.active = true;
    i.setPosition(n);
    var a = cc.moveBy(.2, 0, 100).easing(cc.easeOut(1));
    var r = cc.delayTime(2);
    var l = cc.callFunc(function () {
      i.active = false;
    });
    var s = cc.sequence(a, r, l);
    i.runAction(s);
    if ("0" == e) {
      var c = o.getChildByName("spine");
      c.active = true;
      wUIHelp.playSpine(c, "animation", function () {
        c.active = false;
      });
    }
    var d = o.getChildByName("" + e);
    if (d) {
      d.getChildByName("gold").getComponent(cc.Label).string = wUtils.goldFormat(t);
      var h = d.getChildByName("spine");
      h.active = true;
      wUIHelp.playSpine(h, "animation", function () {
        h.active = false;
      });
    } else {
      var u = o.getChildByName("winspine");
      u.active = true;
      u.setPosition(n);
      wUIHelp.playSpine(u, "animation", function () {
        u.active = false;
      });
    }
  };
  _ctor.prototype.playerBrightCard = function (e, t, o, i, n) {
    return cc__awaiter(this, undefined, undefined, function () {
      var a;
      var r;
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
      var _;
      var b;
      var P;
      var C;
      return cc__generator(this, function (l) {
        switch (l.label) {
          case 0:
            a = this.getPokerType(n);
            r = this.node.getChildByName("win");
            c = r.getChildByName(e == t ? "win" : "lose");
            a > 6 && e == t && (c = r.getChildByName("bigwin"));
            d = cc.instantiate(c);
            r.addChild(d, 10, "" + e);
            this.scheduleOnce(function () {
              d.destroy();
            }, 5);
            h = this.players.children[e].getPosition();
            d.setPosition(h);
            d.active = true;
            u = this.typeImg.getSpriteFrame((e == t ? "w" : "") + a + ".png");
            d.getChildByName("type").getComponent(cc.Sprite).spriteFrame = u;
            p = d.getChildByName("poker");
            y = function (e) {
              g.setPokerNode(o[e.name], e);
              e.setPosition(-24.5, 3);
              var t = cc.moveBy(.15, 0, 50);
              var i = cc.moveBy(.15, 0, -50);
              var n = cc.sequence(t, i).easing(cc.easeOut(1.5));
              var a = cc.callFunc(function () {
                if ("1" == e.name) {
                  var t = cc.moveTo(.15, cc.v2(28, 3));
                  e.runAction(t);
                }
              });
              e.runAction(cc.sequence(n, a));
            };
            g = this;
            f = 0;
            for (w = p.children; f < w.length; f++) {
              _ = w[f];
              y(_);
            }
            return [4, wUtils.syncDelayed(.5, this)];
          case 1:
            l.sent();
            m = 0;
            for (v = p.children; m < v.length; m++) {
              _ = v[m];
              if (e != t) {
                wUIHelp.setNodeColor(_, $Config.Config.colorSet.ash);
              } else {
                b = i.includes(o[_.name]) ? $Config.Config.colorSet.white : $Config.Config.colorSet.ash;
                wUIHelp.setNodeColor(_, b);
              }
            }
            if (a > 6) {
              P = this.node.getChildByName("dwin1");
              wUIHelp.hideSonNode(P);
              (C = P.getChildByName("" + a)).active = true;
              wUIHelp.playSpine(C, "animation", function () {
                C.active = false;
              });
            }
            return [2];
        }
      });
    });
  };
  _ctor.prototype.recoveryPoker = function (e) {
    return cc__awaiter(this, undefined, undefined, function () {
      var t;
      var o;
      var i;
      var n;
      var a;
      var r;
      var c;
      var d;
      var h;
      var u;
      var p;
      var y;
      var g;
      var f;
      var w = this;
      return cc__generator(this, function (m) {
        switch (m.label) {
          case 0:
            t = this.players.children[e].getChildByName("poker");
            o = wUtils.local_world__POS(this.node.getChildByName("s_pos"));
            o = wUtils.world_local_POS(t, o);
            if (0 == e) {
              return [3, 1];
            }
            i = function (e) {
              var i = e.getPosition();
              var n = cc.moveTo(.3, cc.v2(o));
              var a = cc.fadeOut(.3);
              var r = cc.callFunc(function () {
                w.scheduleOnce(function () {
                  t.active = false;
                  e.opacity = 255;
                  wUIHelp.setNodeColor(e, $Config.Config.colorSet.white);
                  e.setPosition(i);
                });
              });
              var l = cc.sequence(n, a, r);
              e.runAction(l);
            };
            n = 0;
            for (a = t.children; n < a.length; n++) {
              y = a[n];
              i(y);
            }
            return [3, 10];
          case 1:
            this.setPlayerPokerTips(null);
            r = function (e) {
              var t;
              var i;
              var n;
              var a;
              var r;
              var d;
              var h;
              var u;
              return cc__generator(this, function (l) {
                switch (l.label) {
                  case 0:
                    t = e.getPosition();
                    i = cc.moveTo(.35, cc.v2(o));
                    n = cc.fadeTo(.35, 80);
                    a = cc.scaleTo(.35, .4);
                    r = cc.rotateTo(.35, -180);
                    d = cc.callFunc(function () {
                      w.scheduleOnce(function () {
                        e.active = false;
                        e.opacity = 255;
                        e.scale = .58;
                        e.angle = 0;
                        wUIHelp.setNodeColor(e, $Config.Config.colorSet.white);
                        e.setPosition(t);
                      });
                    });
                    h = cc.spawn(i, n, a, r);
                    u = cc.sequence(h, d);
                    e.runAction(u);
                    return [4, wUtils.syncDelayed(.15, c)];
                  case 1:
                    l.sent();
                    return [2];
                }
              });
            };
            c = this;
            d = 0;
            h = t.children;
            m.label = 2;
          case 2:
            if (d < h.length) {
              y = h[d];
              return [5, r(y)];
            } else {
              return [3, 5];
            }
          case 3:
            m.sent();
            m.label = 4;
          case 4:
            d++;
            return [3, 2];
          case 5:
            return [4, wUtils.syncDelayed(.2, this)];
          case 6:
            m.sent();
            u = 0;
            p = t.children;
            m.label = 7;
          case 7:
            if (u < p.length) {
              (y = p[u]).active = true;
              g = y.getPosition();
              y.y -= 200;
              wUIHelp.setNodeColor(y, $Config.Config.colorSet.ash);
              f = cc.moveTo(.3, cc.v2(g));
              y.runAction(f);
              return [4, wUtils.syncDelayed(.06, this)];
            } else {
              return [3, 10];
            }
          case 8:
            m.sent();
            m.label = 9;
          case 9:
            u++;
            return [3, 7];
          case 10:
            return [2];
        }
      });
    });
  };
  _ctor.prototype.initPlayerBetTips = function (e) {
    this.players.children[e].getChildByName("info").getChildByName("tips").active = false;
  };
  _ctor.prototype.setPlayerPokerOpacity = function (e) {
    var t = 0;
    for (var o = this.players.children[e].getChildByName("poker").children; t < o.length; t++) {
      var i = o[t];
      wUIHelp.setNodeColor(i, $Config.Config.colorSet.white);
    }
  };
  _ctor.prototype.setPlayerPokerTips = function (e) {
    var t = this.players.children[0].getChildByName("type");
    t.active = Boolean(e);
    if (e) {
      var o = this.getPokerType(e);
      var i = this.typeImg.getSpriteFrame(o + ".png");
      t.getChildByName("img").getComponent(cc.Sprite).spriteFrame = i;
    }
  };
  _ctor.prototype.getPokerType = function (e) {
    var t = e.slice(-10);
    var o = e.length - t.length;
    return e.slice(0, o);
  };
  _ctor.prototype.setPubliccards = function (e) {
    var t = this.node.getChildByName("poker");
    wUIHelp.hideSonNode(t);
    if (e && 0 != e.length) {
      t.getChildByName("di").active = true;
      for (var o = 0; o < e.length; o++) {
        var i = t.children[o + 1];
        i.active = true;
        i.getComponent(cc.Sprite).spriteFrame = this.pokerImg.getSpriteFrame("plist_puke_front_big");
        wUIHelp.hideSonNode(i);
        this.setPokerNode(e[o], i);
      }
    }
  };
  _ctor.prototype.showPubliccards = function (e, t) {
    return cc__awaiter(this, undefined, undefined, function () {
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
      var p = this;
      return cc__generator(this, function (y) {
        switch (y.label) {
          case 0:
            o = this.node.getChildByName("poker");
            if (0 == e.length) {
              wUIHelp.hideSonNode(o);
              return [2];
            }
            o.active = true;
            if (3 != t && 5 != t) {
              return [3, 6];
            }
            wUIHelp.hideSonNode(o);
            o.getChildByName("di").active = true;
            u = 0;
            y.label = 1;
          case 1:
            if (u < e.length) {
              r = o.children[u + 1];
              wAudioMgr.playSound("sound/fapaia", "DZPK");
              wUIHelp.hideSonNode(r);
              r.getComponent(cc.Sprite).spriteFrame = this.pokerImg.getSpriteFrame("plist_puke_back_big_1");
              r.active = true;
              !r.spos && (r.spos = r.getPosition());
              r.scale = .2;
              r.setPosition(-6, 206);
              i = cc.scaleTo(.25, .66);
              n = cc.moveTo(.25, -246, 13.338);
              a = cc.spawn(i, n);
              r.runAction(a);
              return [4, wUtils.syncDelayed(.1, this)];
            } else {
              return [3, 4];
            }
          case 2:
            y.sent();
            y.label = 3;
          case 3:
            u++;
            return [3, 1];
          case 4:
            return [4, wUtils.syncDelayed(.2, this)];
          case 5:
            y.sent();
            for (u = 0; u < e.length; u++) {
              (r = o.children[u + 1]).getComponent(cc.Sprite).spriteFrame = this.pokerImg.getSpriteFrame("plist_puke_front_big");
              this.setPokerNode(e[u], r);
              if (u) {
                s = cc.moveTo(.15, r.spos);
                r.runAction(s);
              }
            }
            return [3, 10];
          case 6:
            c = o.children[4].active ? 4 : 3;
            d = function (t) {
              var i;
              var n;
              var a;
              var r;
              var s;
              var c;
              return cc__generator(this, function (l) {
                switch (l.label) {
                  case 0:
                    wAudioMgr.playSound("sound/fapaia", "DZPK");
                    i = o.children[t + 1];
                    wUIHelp.hideSonNode(i);
                    i.getComponent(cc.Sprite).spriteFrame = h.pokerImg.getSpriteFrame("plist_puke_back_big_1");
                    i.active = true;
                    !i.spos && (i.spos = i.getPosition());
                    i.scale = .2;
                    i.setPosition(-6, 206);
                    n = cc.scaleTo(.25, .66);
                    a = cc.moveTo(.25, i.spos);
                    r = cc.spawn(n, a);
                    s = cc.callFunc(function () {
                      i.getComponent(cc.Sprite).spriteFrame = p.pokerImg.getSpriteFrame("plist_puke_front_big");
                      p.setPokerNode(e[t], i);
                    });
                    c = cc.sequence(r, s);
                    i.runAction(c);
                    return [4, wUtils.syncDelayed(.2, h)];
                  case 1:
                    l.sent();
                    return [2];
                }
              });
            };
            h = this;
            u = c;
            y.label = 7;
          case 7:
            if (u < e.length) {
              return [5, d(u)];
            } else {
              return [3, 10];
            }
          case 8:
            y.sent();
            y.label = 9;
          case 9:
            u++;
            return [3, 7];
          case 10:
            return [2];
        }
      });
    });
  };
  _ctor.prototype.setPubLiccardColor = function (e, t) {
    var o = this.node.getChildByName("poker");
    if (!e) {
      wUIHelp.hideSonNode(o);
      return void wUIHelp.setNodeColor(o, $Config.Config.colorSet.white);
    }
    for (var i = 0; i < t.length; i++) {
      var n = o.children[i + 1];
      var a = e.includes(t[i]) ? $Config.Config.colorSet.white : $Config.Config.colorSet.ash;
      wUIHelp.setNodeColor(n, a);
    }
  };
  cc__decorate([ccp_property(cc.Node)], _ctor.prototype, "othTips", undefined);
  cc__decorate([ccp_property(cc.Node)], _ctor.prototype, "players", undefined);
  cc__decorate([ccp_property(cc.Label)], _ctor.prototype, "allBet", undefined);
  cc__decorate([ccp_property(cc.Node)], _ctor.prototype, "currentBet", undefined);
  cc__decorate([ccp_property(cc.SpriteAtlas)], _ctor.prototype, "pokerImg", undefined);
  cc__decorate([ccp_property(cc.SpriteAtlas)], _ctor.prototype, "typeImg", undefined);
  return cc__decorate([ccp_ccclass], _ctor);
}(cc.Component);
exports.default = def_DZPKView;