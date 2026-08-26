'use strict';

var GameContext = require('GameContext').GameContext;
var DzpkEventBus = require('DzpkEventBus').DzpkEventBus;
var DzpkResourceLoader = require('DzpkResourceLoader').DzpkResourceLoader;
var DzpkAudioService = require('DzpkAudioService').DzpkAudioService;
var DzpkViewNavigator = require('DzpkViewNavigator').DzpkViewNavigator;
var DzpkUiMessageService = require('DzpkUiMessageService').DzpkUiMessageService;
var SourceProtocolAdapter = require('SourceProtocolAdapter').SourceProtocolAdapter;
var GameHubAuthenticatedTransport = require('GameHubAuthenticatedTransport').GameHubAuthenticatedTransport;
var LegacyGlobalBridge = require('LegacyGlobalBridge').LegacyGlobalBridge;

module.exports = cc.Class({
  extends: cc.Component,

  onLoad: function () {
    this.configureOriginalLandscapeCanvas();
    this.initializeStandaloneGameContext();
    cc.game.on(cc.game.EVENT_HIDE, this.handleApplicationEnteredBackground, this);
    cc.game.on(cc.game.EVENT_SHOW, this.handleApplicationReturnedToForeground, this);
  },

  onDestroy: function () {
    cc.game.off(cc.game.EVENT_HIDE, this.handleApplicationEnteredBackground, this);
    cc.game.off(cc.game.EVENT_SHOW, this.handleApplicationReturnedToForeground, this);
    if (this.authenticatedTransport) this.authenticatedTransport.closeAuthenticatedConnection();
  },

  /**
   * Initializes only the Hall replacement boundary. The visible loading,
   * room and poker table remain the original prefabs and components.
   */
  initializeStandaloneGameContext: function () {
    var canvasNode = this.node;
    var gameContext = new GameContext();
    var eventBus = new DzpkEventBus();
    var resourceLoader = new DzpkResourceLoader();
    var audioService = new DzpkAudioService();
    var uiMessageService = new DzpkUiMessageService(
      canvasNode.getChildByName('MessageOverlay'),
      gameContext
    );
    var protocolAdapter = new SourceProtocolAdapter(gameContext, eventBus, uiMessageService);
    var authenticatedTransport = new GameHubAuthenticatedTransport(
      gameContext,
      eventBus,
      protocolAdapter,
      uiMessageService
    );
    var viewNavigator = new DzpkViewNavigator(canvasNode, resourceLoader, gameContext, eventBus);
    viewNavigator.setAuthenticatedTransport(authenticatedTransport);
    var legacyGlobalBridge = new LegacyGlobalBridge({
      gameContext: gameContext,
      eventBus: eventBus,
      resourceLoader: resourceLoader,
      audioService: audioService,
      uiMessageService: uiMessageService,
      authenticatedTransport: authenticatedTransport,
      viewNavigator: viewNavigator
    });
    legacyGlobalBridge.exposeOriginalScriptDependencies();

    this.audioService = audioService;
    this.uiMessageService = uiMessageService;
    this.authenticatedTransport = authenticatedTransport;
    this.resourceLoader = resourceLoader;
    this.viewNavigator = viewNavigator;
    this.uiMessageService.showLoadingIndicator();

    var bootComponent = this;
    authenticatedTransport.initializeAuthenticatedSession()
      .then(function () {
        return authenticatedTransport.connectAuthenticatedWebSocket();
      })
      .then(function () {
        return resourceLoader.loadOriginalDzpkBundle();
      })
      .then(function () {
        return viewNavigator.initializeOriginalDzpkPrefabs();
      })
      .then(function () {
        bootComponent.uiMessageService.hideLoadingIndicator();
      })
      .catch(function (bootError) {
        bootComponent.uiMessageService.showTransientMessage(bootError.message || '德州扑克启动失败');
        cc.error(bootError);
      });
  },

  configureOriginalLandscapeCanvas: function () {
    cc.view.setDesignResolutionSize(1334, 750, cc.ResolutionPolicy.SHOW_ALL);
    cc.game.setFrameRate(60);
    cc.macro.ENABLE_MULTI_TOUCH = false;
    cc.debug.setDisplayStats(false);
    // Creator 2.4.7 exposes this flag specifically for projects that preserve
    // the source cc.Action timeline instead of rewriting it as cc.Tween.
    cc.director.getActionManager()._suppressDeprecation = true;
  },

  handleApplicationEnteredBackground: function () {
    if (this.audioService) this.audioService.pauseForBackground();
  },

  handleApplicationReturnedToForeground: function () {
    if (this.audioService) this.audioService.resumeAfterForeground();
    if (!this.authenticatedTransport) return;
    var uiMessageService = this.uiMessageService;
    this.authenticatedTransport.restoreAuthenticatedConnection().catch(function (reconnectError) {
      uiMessageService.showTransientMessage(reconnectError.message || '重连失败');
    });
  }
});
