Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DZPKModel = exports.DZPKConfig = undefined;
exports.DZPKConfig = {
  betTime: 15,
  pokerColor: {
    4: "black",
    3: "red",
    2: "black",
    1: "red"
  },
  pokerID: {
    2: "2",
    3: "3",
    4: "4",
    5: "5",
    6: "6",
    7: "7",
    8: "8",
    9: "9",
    10: "10",
    11: "11",
    12: "12",
    13: "13",
    14: "1"
  },
  pokerShape: {
    4: "shape_spade",
    3: "shape_heart",
    2: "shape_club",
    1: "shape_diamond"
  }
};
var i = function (e) {
  this.betGold = 0;
  Object.assign(this, e);
};
var exp_DZPKModel = function () {
  function _ctor() {
    this.playerList = [];
    this.currentBet = 0;
    this.my_l_seat = 0;
    this.autoList = [0, 0, 0];
    this.genGold = 0;
  }
  _ctor.prototype.initRoom = function (e) {
    this.publiccards = e.publiccards || [];
    this.allBet = e.allbet;
    this.notice = e.notice;
    var t = e.players.find(function (e) {
      return e.uid == wGameData.getKey("uid");
    });
    this.my_s_seat = t.seat;
    for (var o = 0; o < e.players.length; o++) {
      var i = this.addPlayer(e.players[o]);
      i.uid == wGameData.getKey("uid") && (this.my_data = i);
    }
    this.level = e.level;
    this.doublescore = e.doublescore;
    this.curbet = e.curbet;
    this.allbets = e.allbets;
    this.bankeruid = e.bankeruid;
    this.stage = e.stage;
  };
  _ctor.prototype.addPlayer = function (e) {
    var t = e.seat - this.my_s_seat;
    t < 0 && (t += 6);
    e.l_seat = t;
    var o = wUtils.creatorProxy(new i(e));
    this.playerList.push(o);
    return o;
  };
  _ctor.prototype.getPlayer = function (e, t) {
    for (var o = 0; o < this.playerList.length; o++) {
      var i = this.playerList[o];
      if (i[e] == t) {
        return i;
      }
    }
    wLog.w("没有找到该玩家", e, t);
  };
  _ctor.prototype.getDCBet = function () {
    var e = [];
    e.push(Math.ceil(.5 * this.allBet));
    e.push(Math.ceil(this.allBet * (2 / 3)));
    e.push(this.allBet);
    return e;
  };
  _ctor.prototype.getDMBet = function () {
    var e = [];
    e.push(6 * this.doublescore);
    e.push(8 * this.doublescore);
    e.push(this.allBet);
    return e;
  };
  _ctor.prototype.getSelectBet = function () {
    var e = this.doublescore;
    var t = [];
    t.push(20 * e);
    t.push(40 * e);
    t.push(100 * e);
    t.push(200 * e);
    t.push(400 * e);
    var o = 2 * e + this.genGold;
    o = Math.ceil(o);
    t.push(o > this.my_data.gold ? this.my_data.gold : o);
    return t;
  };
  _ctor.prototype.getMaxObj = function (e) {
    var t = 0;
    for (var o in e) {
      e[o] > t && (t = e[o]);
    }
    return t;
  };
  return _ctor;
}();
exports.DZPKModel = exp_DZPKModel;