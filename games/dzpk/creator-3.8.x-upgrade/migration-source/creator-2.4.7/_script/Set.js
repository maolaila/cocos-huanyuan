var n;
var cc__extends = __extends;
var cc__decorate = __decorate;
Object.defineProperty(exports, "__esModule", {
  value: true
});
var $PopupBase = require("PopupBase");
var cc__decorator = cc._decorator;
var ccp_ccclass = cc__decorator.ccclass;
cc__decorator.property;
var def_Set = function (t) {
  function _ctor() {
    return null !== t && t.apply(this, arguments) || this;
  }
  cc__extends(_ctor, t);
  _ctor.prototype.start = function () {
    this.initVolume();
    this.initNight();
    var t = "v1.0." + wConstant.platform + ".8-0.1." + (wGameData.allVersion.Main || "0.0.1");
    var e = this.main.getChildByName("vs");
    e && (e.getComponent(cc.Label).string = t);
  };
  _ctor.prototype.initVolume = function () {
    var t = cc.sys.localStorage.getItem("SoundVolume");
    var e = cc.sys.localStorage.getItem("MusicVolume");
    if (0 == t && 0 == e) {
      cc.find("m/jy", this.main).getComponent(cc.Toggle).check();
      cc.find("m/yl", this.main).getComponent(cc.Toggle).isChecked = false;
      cc.find("m/yx", this.main).getComponent(cc.Toggle).isChecked = false;
    } else {
      cc.find("m/yl", this.main).getComponent(cc.Toggle).isChecked = 0 != e;
      cc.find("m/yx", this.main).getComponent(cc.Toggle).isChecked = 0 != t;
      cc.find("m/jy", this.main).getComponent(cc.Toggle).isChecked = false;
    }
    var o = 0;
    for (var n = this.main.getChildByName("m").children; o < n.length; o++) {
      var i = n[o];
      var r = i.getComponent(cc.Toggle).isChecked;
      i.children[0].active = !r;
    }
  };
  _ctor.prototype.initNight = function () {
    var t = Number(cc.sys.localStorage.getItem("Night"));
    var e = wGameData.get_day_night();
    var o = "";
    if (t) {
      if (1 == t) {
        o = "bt";
        wUIManager.show_day_night(false);
      } else if (2 == t) {
        o = "yj";
        wUIManager.show_day_night(true);
      }
    } else {
      o = "zd";
      wUIManager.show_day_night(e);
    }
    var n = 0;
    for (var i = this.main.getChildByName("scene").children; n < i.length; n++) {
      var r = i[n];
      r.getComponent(cc.Toggle).isChecked = r.name == o;
      r.children[0].active = !(r.name == o);
    }
  };
  _ctor.prototype.YXonClick = function (t, e) {
    switch (e) {
      case "jy":
        if (t.isChecked) {
          wAudioMgr.setSoundVolume(0);
          wAudioMgr.setMusicVolume(0);
        } else {
          wAudioMgr.setSoundVolume(1);
          wAudioMgr.setMusicVolume(1);
        }
        this.initVolume();
        break;
      case "yl":
        if (t.isChecked) {
          wAudioMgr.setMusicVolume(1);
        } else {
          wAudioMgr.setMusicVolume(0);
        }
        this.initVolume();
        break;
      case "yx":
        if (t.isChecked) {
          wAudioMgr.setSoundVolume(1);
        } else {
          wAudioMgr.setSoundVolume(0);
        }
        this.initVolume();
    }
    wAudioMgr.playBtnSound();
  };
  _ctor.prototype.CJonClick = function (t, e) {
    switch (e) {
      case "zd":
        if (t.isChecked) {
          cc.sys.localStorage.setItem("Night", 0);
        } else {
          cc.sys.localStorage.setItem("Night", wGameData.get_day_night() + 1);
        }
        break;
      case "bt":
        if (t.isChecked) {
          cc.sys.localStorage.setItem("Night", 1);
        } else {
          cc.sys.localStorage.setItem("Night", 2);
        }
        break;
      case "yj":
        if (t.isChecked) {
          cc.sys.localStorage.setItem("Night", 2);
        } else {
          cc.sys.localStorage.setItem("Night", 1);
        }
    }
    this.initNight();
    wAudioMgr.playBtnSound();
  };
  _ctor.prototype.onXF = function () {
    wViewMgr.openPage({
      path: "Prefab/GameRepair"
    });
  };
  return cc__decorate([ccp_ccclass], _ctor);
}($PopupBase.default);
exports.default = def_Set;