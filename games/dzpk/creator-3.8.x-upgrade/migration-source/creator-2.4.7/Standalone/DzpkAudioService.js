'use strict';

var OriginalAudioManager = require('AudioManager').AudioManager;

/** Keeps original audio paths/timing while giving the new Boot a semantic owner. */
function DzpkAudioService() {
  this.legacyAudioManager = null;
  this.isBrowserAudioPlaybackUnlocked = !cc.sys.isBrowser;
  this.pendingBackgroundMusicRequest = null;
}

DzpkAudioService.prototype.initializeAudioSettings = function () {
  if (this.legacyAudioManager) return;
  this.legacyAudioManager = new OriginalAudioManager();
  this.installBrowserAudioGestureGate();
};

DzpkAudioService.prototype.installBrowserAudioGestureGate = function () {
  if (!cc.sys.isBrowser) return;
  var audioService = this;
  var originalPlayBackgroundMusic = this.legacyAudioManager.playBgMusic.bind(
    this.legacyAudioManager
  );
  var originalPlaySound = this.legacyAudioManager.playSound.bind(this.legacyAudioManager);
  this.legacyAudioManager.playBgMusic = function (musicPath, bundleName) {
    if (!audioService.isBrowserAudioPlaybackUnlocked) {
      audioService.pendingBackgroundMusicRequest = {
        musicPath: musicPath,
        bundleName: bundleName
      };
      return;
    }
    originalPlayBackgroundMusic(musicPath, bundleName);
  };
  this.legacyAudioManager.playSound = function (soundPath, bundleName, shouldLoop) {
    if (!audioService.isBrowserAudioPlaybackUnlocked) return;
    originalPlaySound(soundPath, bundleName, shouldLoop);
  };

  function unlockAudioFromPlayerGesture() {
    if (audioService.isBrowserAudioPlaybackUnlocked) return;
    audioService.isBrowserAudioPlaybackUnlocked = true;
    removeAudioUnlockListeners(unlockAudioFromPlayerGesture);
    var pendingBackgroundMusicRequest = audioService.pendingBackgroundMusicRequest;
    audioService.pendingBackgroundMusicRequest = null;
    if (pendingBackgroundMusicRequest) {
      originalPlayBackgroundMusic(
        pendingBackgroundMusicRequest.musicPath,
        pendingBackgroundMusicRequest.bundleName
      );
    }
  }

  window.addEventListener('pointerdown', unlockAudioFromPlayerGesture, true);
  window.addEventListener('touchend', unlockAudioFromPlayerGesture, true);
  window.addEventListener('keydown', unlockAudioFromPlayerGesture, true);
};

DzpkAudioService.prototype.pauseForBackground = function () {
  this.legacyAudioManager.pauseMusic();
};

DzpkAudioService.prototype.resumeAfterForeground = function () {
  if (!this.isBrowserAudioPlaybackUnlocked) return;
  this.legacyAudioManager.resumeMusic();
};

DzpkAudioService.prototype.toLegacyAudioAdapter = function () {
  this.initializeAudioSettings();
  return this.legacyAudioManager;
};

module.exports = { DzpkAudioService: DzpkAudioService };

function removeAudioUnlockListeners(unlockAudioFromPlayerGesture) {
  window.removeEventListener('pointerdown', unlockAudioFromPlayerGesture, true);
  window.removeEventListener('touchend', unlockAudioFromPlayerGesture, true);
  window.removeEventListener('keydown', unlockAudioFromPlayerGesture, true);
}
