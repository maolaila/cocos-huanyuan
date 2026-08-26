'use strict';

var OriginalUtils = require('Utils').Utils;
var OriginalUiHelp = require('UIHelp').UIHelp;
var OriginalLogManager = require('LogManager').LogManager;

/**
 * Exposes the exact w* names required by serialized source scripts. New code
 * owns semantic services and must not add more logic to these compatibility
 * aliases.
 */
function LegacyGlobalBridge(options) {
  this.gameContext = options.gameContext;
  this.eventBus = options.eventBus;
  this.resourceLoader = options.resourceLoader;
  this.audioService = options.audioService;
  this.uiMessageService = options.uiMessageService;
  this.authenticatedTransport = options.authenticatedTransport;
  this.viewNavigator = options.viewNavigator;
}

LegacyGlobalBridge.prototype.exposeOriginalScriptDependencies = function () {
  window.wConstant = {
    isCheckHotUp: false,
    nLevel: 3,
    platform: 'web',
    mode: 'standalone-original-client',
    urlParam: { browser: 'web' }
  };
  window.wGameData = this.gameContext;
  window.wGEvent = this.eventBus;
  window.wRes = this.resourceLoader.toLegacyResourceAdapter();
  window.wLog = new OriginalLogManager();
  window.wUtils = new OriginalUtils();
  window.wUIHelp = new OriginalUiHelp();
  window.wAudioMgr = this.audioService.toLegacyAudioAdapter();
  window.wUIManager = this.uiMessageService;
  window.wNetWork = this.authenticatedTransport;
  window.wViewMgr = this.viewNavigator;
};

module.exports = { LegacyGlobalBridge: LegacyGlobalBridge };

