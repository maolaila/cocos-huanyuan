'use strict';

var OriginalGameConfig = require('Config').Config;

var SOURCE_ROOM_CONFIGURATION_EVENT = 'Msg_Hall_GameSessions';
var ORIGINAL_ROOM_PREFAB_PATH = 'prefab/Room';
var ORIGINAL_LOADING_INTRO_SECONDS = 0.7;
var ROOM_CONFIGURATION_TIMEOUT_SECONDS = 10;

/**
 * Semantic equivalent of the recovered DZPKLoad component.
 *
 * Hall-named messages remain unchanged because they are source protocol names,
 * not permission to restore the visible Hall.
 */
module.exports = cc.Class({
  name: 'DzpkLoadingScreenController',
  extends: cc.Component,

  // Cocos owns this lifecycle name; all game work is delegated semantically.
  onLoad: function () { return this.initializeOriginalLoadingFlow(); },

  initializeOriginalLoadingFlow: function () {
    var loadingScreenController = this;
    this.startOriginalBackgroundMusic();
    this.preloadOriginalEntryResources();
    return this.playOriginalLoadingIntroduction().then(function () {
      loadingScreenController.continueAfterLoadingIntroduction();
    });
  },

  startOriginalBackgroundMusic: function () {
    var originalGameDefinition = wGameData.getGame();
    wAudioMgr.stopBgMusic();
    wAudioMgr.playBgMusic(originalGameDefinition.music, wGameData.getGameName());
  },

  preloadOriginalEntryResources: function () {
    var sourceClientGameId = wGameData.gameID;
    var originalGameDefinition = OriginalGameConfig.GamePrefab[sourceClientGameId];

    // preloadDir is the recovered bundle API; keep its original path and bundle order.
    wRes.preloadDir(originalGameDefinition.prefabUrl, originalGameDefinition.enName);
    wRes.preloadDir(ORIGINAL_ROOM_PREFAB_PATH, originalGameDefinition.enName);
  },

  playOriginalLoadingIntroduction: function () {
    var loadingScreenController = this;
    return new Promise(function (resolveIntroduction) {
      var loadingMainNode = loadingScreenController.node.getChildByName('main');
      var loadingSpineNode = loadingMainNode.getChildByName('spine');

      // Spine callbacks preserve the source start -> idle(loop) sequence.
      wUIHelp.playSpine(loadingSpineNode, 'start', function () {
        wUIHelp.playSpine(loadingSpineNode, 'idle', null, true);
      });

      // scheduleOnce is lifecycle-bound, unlike a free setTimeout after node destruction.
      loadingScreenController.scheduleOnce(
        resolveIntroduction,
        ORIGINAL_LOADING_INTRO_SECONDS
      );
    });
  },

  continueAfterLoadingIntroduction: function () {
    if (wGameData.isReconnect) {
      this.instantiateOriginalRoomSelection();
      return;
    }
    this.requestOriginalRoomConfigurations();
  },

  requestOriginalRoomConfigurations: function () {
    var loadingScreenController = this;
    var roomConfigurationSubscription = wGEvent.on(
      SOURCE_ROOM_CONFIGURATION_EVENT,
      function (roomConfigurationEnvelope) {
        loadingScreenController.handleOriginalRoomConfigurationEnvelope(
          roomConfigurationEnvelope
        );
        wGEvent.off(roomConfigurationSubscription);
        loadingScreenController.unscheduleAllCallbacks();
        roomConfigurationSubscription = null;
      },
      this
    );

    this.scheduleOnce(function () {
      if (!roomConfigurationSubscription) return;
      wUIManager.showTips('请求游戏配置失败');
      wGEvent.off(roomConfigurationSubscription);
      wViewMgr.enterHall();
    }, ROOM_CONFIGURATION_TIMEOUT_SECONDS);

    // This Hall event name is the original room-configuration protocol contract.
    wNetWork.send(SOURCE_ROOM_CONFIGURATION_EVENT, {
      gtype: wGameData.gameID
    });
  },

  handleOriginalRoomConfigurationEnvelope: function (roomConfigurationEnvelope) {
    if (roomConfigurationEnvelope.status !== 1 || !roomConfigurationEnvelope.data) {
      wLog.e('请求游戏配置失败');
      wViewMgr.enterHall();
      return;
    }

    wGameData.roomConfig = roomConfigurationEnvelope.data;
    this.instantiateOriginalRoomSelection();
  },

  instantiateOriginalRoomSelection: function () {
    var loadingScreenController = this;
    var sourceClientGameId = wGameData.gameID;
    var originalGameDefinition = OriginalGameConfig.GamePrefab[sourceClientGameId];
    var roomContainerNode = cc.Canvas.instance.node.getChildByName('Room');
    roomContainerNode.active = true;

    wRes.loadRes(
      ORIGINAL_ROOM_PREFAB_PATH,
      function (roomResourceError, originalRoomPrefab) {
        if (roomResourceError) {
          wViewMgr.enterHall();
          return;
        }

        // cc.instantiate is required so the copied prefab keeps its serialized components.
        var originalRoomNode = cc.instantiate(originalRoomPrefab);
        originalRoomNode.parent = roomContainerNode;

        if (wGameData.isReconnect) {
          loadingScreenController.node.zIndex = 100;
        } else {
          loadingScreenController.node.destroy();
        }
      },
      originalGameDefinition.enName
    );
  }
});
