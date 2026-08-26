Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AudioManager = undefined;
var exp_AudioManager = function () {
  function _ctor() {
    this.musicVolume = 1;
    this.soundVolume = 1;
    this.currentBgMusicUrl = null;
    this.soundUrl = {};
    this.commonSoundPath = {
      button: "sound/effect/btn_click",
      close: "sound/effect/btn_close",
      selected: "sound/effect/BT_GET"
    };
    this.init();
  }
  _ctor.prototype.playBtnSound = function () {
    this.playSound(this.commonSoundPath.button);
  };
  _ctor.prototype.playCloseSound = function () {
    this.playSound(this.commonSoundPath.close);
  };
  _ctor.prototype.playSelectedSound = function () {
    this.playSound(this.commonSoundPath.selected);
  };
  _ctor.prototype.playBgMusic = function (t, e) {
    var o = this;
    if (this.currentBgMusicUrl != t) {
      this.currentBgMusicUrl = t;
      wRes.loadRes(t, null, null, function (n, i) {
        if (n) {
          console.warn("背景音乐加载失败：", t, e);
        } else if (o.currentBgMusicUrl == t) {
          cc.audioEngine.isMusicPlaying() && cc.audioEngine.stopMusic();
          cc.audioEngine.playMusic(i, true);
        }
      }, e);
    }
  };
  _ctor.prototype.playSound = function (t, e, o) {
    var n = this;
    undefined === e && (e = null);
    undefined === o && (o = false);
    wRes.loadRes(t, null, null, function (e, i) {
      if (e) {
        wLog.w("------------音效加载失败", t);
      } else {
        n.soundUrl[t] = cc.audioEngine.play(i, o, n.soundVolume);
        if (Object.values(n.commonSoundPath).includes(t)) {
          n.soundUrl[t] = null;
          delete n.soundUrl[t];
        } else {
          cc.audioEngine.setFinishCallback(n.soundUrl[t], function () {
            delete n.soundUrl[t];
          });
        }
      }
    }, e);
  };
  _ctor.prototype.stopEffects = function (t) {
    return !!this.soundUrl[t] && (cc.audioEngine.stop(this.soundUrl[t]), delete this.soundUrl[t], true);
  };
  _ctor.prototype.stopAllEffects = function () {
    for (var t in this.soundUrl) {
      this.stopEffects(t);
    }
  };
  _ctor.prototype.stopBgMusic = function () {
    this.currentBgMusicUrl = null;
    cc.audioEngine.isMusicPlaying() && cc.audioEngine.stopMusic();
  };
  _ctor.prototype.pauseMusic = function () {
    cc.audioEngine.isMusicPlaying() && cc.audioEngine.pauseMusic();
  };
  _ctor.prototype.resumeMusic = function () {
    cc.audioEngine.resumeMusic();
  };
  _ctor.prototype.init = function () {
    if (null === cc.sys.localStorage.getItem("MusicVolume")) {
      cc.sys.localStorage.setItem("MusicVolume", this.musicVolume);
      cc.sys.localStorage.setItem("SoundVolume", this.soundVolume);
    } else {
      this.musicVolume = parseFloat(cc.sys.localStorage.getItem("MusicVolume"));
      this.soundVolume = parseFloat(cc.sys.localStorage.getItem("SoundVolume"));
    }
    cc.audioEngine.setMusicVolume(this.musicVolume);
    cc.audioEngine.setEffectsVolume(this.soundVolume);
  };
  _ctor.prototype.setMusicVolume = function (t) {
    this.musicVolume = parseFloat(t.toFixed(1));
    this.musicVolume === parseFloat(cc.sys.localStorage.getItem("MusicVolume")) || cc.sys.localStorage.setItem("MusicVolume", this.musicVolume);
    cc.audioEngine.setMusicVolume(this.musicVolume);
  };
  _ctor.prototype.getMusicVolume = function () {
    return this.musicVolume;
  };
  _ctor.prototype.setSoundVolume = function (t) {
    this.soundVolume = parseFloat(t.toFixed(1));
    this.soundVolume === parseFloat(cc.sys.localStorage.getItem("SoundVolume")) || cc.sys.localStorage.setItem("SoundVolume", this.soundVolume);
    cc.audioEngine.setEffectsVolume(this.soundVolume);
    for (var e in this.soundUrl) {
      if (Object.prototype.hasOwnProperty.call(this.soundUrl, e)) {
        var o = this.soundUrl[e];
        cc.audioEngine.setVolume(o, this.soundVolume);
      }
    }
  };
  _ctor.prototype.getSoundVolume = function () {
    return this.soundVolume;
  };
  return _ctor;
}();
exports.AudioManager = exp_AudioManager;