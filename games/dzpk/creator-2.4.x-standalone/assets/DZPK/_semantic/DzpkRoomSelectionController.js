'use strict';

var OriginalGameConfig = require('Config').Config;

var LOCAL_SOURCE_EVENT = 'local_Event';
var VIEWER_BALANCE_CHANGED_EVENT = 'up_Gold';
var SOURCE_ENTER_ROOM_EVENT = 'Msg_Hall_EnterRoom';
var ORIGINAL_RULE_PREFAB_PATH = 'prefab/Rule';
var ROOM_ENTRY_TIMEOUT_SECONDS = 20;

/**
 * Semantic equivalent of the recovered DZPKRoom component.
 * Original prefab nodes, animation coordinates and protocol event ordering stay intact.
 */
module.exports = cc.Class({
  name: 'DzpkRoomSelectionController',
  extends: cc.Component,

  properties: {
    roomChoiceContainer: { default: null, type: cc.Node },
    topToolbarNode: { default: null, type: cc.Node },
    bottomPlayerPanelNode: { default: null, type: cc.Node },
    viewerAvatarSprite: { default: null, type: cc.Sprite },
    viewerNicknameLabel: { default: null, type: cc.Label },
    viewerGoldLabel: { default: null, type: cc.Label },
    viewerBankGoldLabel: { default: null, type: cc.Label }
  },

  // Cocos owns this lifecycle name; all source behavior is delegated semantically.
  onLoad: function () { return this.initializeOriginalRoomSelection(); },

  // Cocos owns this lifecycle name; the semantic method preserves source ordering.
  onEnable: function () { return this.refreshRoomSelectionWhenEnabled(); },

  initializeOriginalRoomSelection: function () {
    var roomSelectionController = this;
    this.roomEntryPending = false;
    this.exitRequested = false;

    wGEvent.on(
      LOCAL_SOURCE_EVENT,
      this.handleLegacyLocalEvent,
      this
    );

    var sourceRoomInformationEvent =
      'Msg_' + wGameData.getGameName() + '_RoomInfo';
    wGEvent.on(sourceRoomInformationEvent, function () {
      roomSelectionController.hideRoomSelectionAfterTableSnapshot();
    }, this);

    if (wGameData.isReconnect) {
      this.instantiateOriginalMainTable();
    } else {
      this.initializeOriginalRoomCardsAndViewerPanel();
    }
  },

  refreshRoomSelectionWhenEnabled: function () {
    if (wGameData.isReconnect) return;
    if (this.viewerGoldLabel) {
      this.viewerGoldLabel.string = wUtils.numConvert(wGameData.getKey('gold'));
    }
    this.playOriginalRoomEntranceAnimation();
  },

  handleLegacyLocalEvent: function (sourceEventName) {
    if (sourceEventName !== VIEWER_BALANCE_CHANGED_EVENT) return;
    if (this.viewerGoldLabel) {
      this.viewerGoldLabel.string = wUtils.numConvert(wGameData.getKey('gold'));
    }
    if (this.viewerBankGoldLabel) {
      this.viewerBankGoldLabel.string = wUtils.numConvert(wGameData.getKey('bank'));
    }
  },

  initializeOriginalRoomCardsAndViewerPanel: function () {
    var originalRoomConfigurations = wGameData.roomConfig;
    var roomLevelKey;

    for (roomLevelKey in originalRoomConfigurations) {
      if (!Object.prototype.hasOwnProperty.call(originalRoomConfigurations, roomLevelKey)) {
        continue;
      }
      var roomChoiceIndex = Number(roomLevelKey) - 1;
      var roomChoiceNode = this.roomChoiceContainer.getChildByName(
        String(roomChoiceIndex)
      );
      // Node.on preserves the recovered dynamic binding; these buttons have no ClickEvent.
      roomChoiceNode.on('click', this.handleRoomChoiceButtonPressed, this);
    }

    if (this.viewerAvatarSprite) {
      wUIHelp.setHead(this.viewerAvatarSprite, wGameData.getKey('headimgurl'));
    }
    if (this.viewerNicknameLabel) {
      this.viewerNicknameLabel.string = wUtils.handleNameLen(
        wGameData.getKey('nickname'),
        10
      );
    }
    if (this.viewerBankGoldLabel) {
      this.viewerBankGoldLabel.string = wUtils.numConvert(wGameData.getKey('bank'));
    }
  },

  hideRoomSelectionAfterTableSnapshot: function () {
    this.roomEntryPending = false;
    this.node.parent.active = false;

    if (!wGameData.isReconnect) return;
    wGameData.isReconnect = false;
    this.node.parent.destroyAllChildren();
  },

  playOriginalRoomEntranceAnimation: function () {
    this.topToolbarNode.stopAllActions();
    this.topToolbarNode.y = 500;
    var toolbarDelayAction = cc.delayTime(0.15);
    var toolbarMoveAction = cc.moveTo(0.2, cc.v2(0, 375)).easing(
      cc.easeOut(1.5)
    );
    this.topToolbarNode.runAction(
      cc.sequence(toolbarDelayAction, toolbarMoveAction)
    );

    // cc.find keeps the original prefab-relative path instead of inventing a new node.
    var roomCharacterSpineNode = cc.find('main/spine', this.node);
    roomCharacterSpineNode.x = -585;
    roomCharacterSpineNode.opacity = 0;
    var characterMoveAction = cc.moveTo(
      0.2,
      cc.v2(-435, -370.37)
    ).easing(cc.easeOut(1.5));
    var characterFadeAction = cc.fadeTo(0.3, 255);
    roomCharacterSpineNode.runAction(
      cc.spawn(characterMoveAction, characterFadeAction)
    );

    this.roomChoiceContainer.x = 265;
    this.roomChoiceContainer.opacity = 0;
    var roomChoicesMoveAction = cc.moveTo(0.2, cc.v2(115, 0)).easing(
      cc.easeOut(1.5)
    );
    var roomChoicesFadeAction = cc.fadeTo(0.3, 255);
    this.roomChoiceContainer.runAction(
      cc.spawn(roomChoicesMoveAction, roomChoicesFadeAction)
    );
  },

  handleOriginalEnterRoomEnvelope: function (enterRoomEnvelope) {
    if (enterRoomEnvelope.status !== 1) {
      wLog.e('进入房间消息失败');
      wGameData.roomID = null;
      wGameData.isReconnect = false;
      wUIManager.hideLoadingUI();
      return;
    }

    wGameData.roomID = enterRoomEnvelope.data.rid;
    this.instantiateOriginalMainTable();
  },

  requestOriginalRoomEntry: function (selectedRoomLevel) {
    var roomSelectionController = this;
    if (this.roomEntryPending) return;

    wGameData.roomLevel = selectedRoomLevel;
    var selectedRoomConfiguration = wGameData.roomConfig[selectedRoomLevel];

    if (!selectedRoomConfiguration) {
      wUIManager.showTips('游戏配置错误，请重新进入游戏！');
      return;
    }
    if (selectedRoomConfiguration.min_gold > wGameData.getKey('gold')) {
      wUIManager.enterRoomFailTips(selectedRoomConfiguration.min_gold);
      return;
    }
    if (wGameData.gameRepair()) {
      wUIManager.showTips('游戏维护中');
      return;
    }

    this.roomEntryPending = true;
    var enterRoomSubscription = wGEvent.on(
      SOURCE_ENTER_ROOM_EVENT,
      function (enterRoomEnvelope) {
        roomSelectionController.handleOriginalEnterRoomEnvelope(enterRoomEnvelope);
        wGEvent.off(enterRoomSubscription);
        roomSelectionController.unscheduleAllCallbacks();
        enterRoomSubscription = null;
      },
      this
    );

    this.scheduleOnce(function () {
      if (!enterRoomSubscription) return;
      roomSelectionController.roomEntryPending = false;
      wGEvent.off(enterRoomSubscription);
    }, ROOM_ENTRY_TIMEOUT_SECONDS);

    // This Hall event name is the recovered table-entry protocol, not visible Hall UI.
    wNetWork.send(SOURCE_ENTER_ROOM_EVENT, {
      tableid: 0,
      gtype: Number(wGameData.gameID),
      level: selectedRoomLevel
    });
  },

  startFastRoomEntry: function () {
    wAudioMgr.playBtnSound();
    var viewerGoldAmount = wGameData.getKey('gold');
    var originalRoomConfigurations = wGameData.roomConfig;
    var highestAffordableRoomLevel = 1;
    var roomLevelKey;

    for (roomLevelKey in originalRoomConfigurations) {
      if (!Object.prototype.hasOwnProperty.call(originalRoomConfigurations, roomLevelKey)) {
        continue;
      }
      var roomConfiguration = originalRoomConfigurations[roomLevelKey];
      if (roomConfiguration.min_gold <= viewerGoldAmount) {
        highestAffordableRoomLevel = roomConfiguration.level;
      }
    }

    this.requestOriginalRoomEntry(highestAffordableRoomLevel);
  },

  handleRoomChoiceButtonPressed: function (buttonEvent) {
    wAudioMgr.playBtnSound();
    var serializedRoomChoiceName = buttonEvent.node.name;
    var selectedRoomLevel = Number(serializedRoomChoiceName) + 1;
    this.requestOriginalRoomEntry(selectedRoomLevel);
  },

  handleSerializedMenuAction: function (buttonEvent, sourceActionName) {
    if (this.exitRequested) return;

    switch (sourceActionName) {
      case 'exit':
        this.exitRequested = true;
        wAudioMgr.playCloseSound();
        wViewMgr.enterHall();
        return;
      case 'rule':
        wViewMgr.openPage({
          path: ORIGINAL_RULE_PREFAB_PATH,
          bundle: wGameData.getGameName()
        });
        break;
      case 'bank':
        // Source-proven NotApplicable: preserve the no-op branch.
        break;
      case 'faststart':
        this.startFastRoomEntry();
        break;
      default:
        break;
    }

    // The original fast-start route intentionally reaches this second button cue.
    wAudioMgr.playBtnSound();
  },

  instantiateOriginalMainTable: function () {
    var originalGameDefinition = OriginalGameConfig.GamePrefab[wGameData.gameID];
    wRes.loadRes(
      originalGameDefinition.prefabUrl,
      preserveOriginalUnusedMainLoadProgress,
      function (mainResourceError, originalMainTablePrefab) {
        if (mainResourceError) {
          wLog.e(mainResourceError);
          return;
        }
        // The navigator instantiates the copied 321-node source table prefab.
        wViewMgr.openGame(originalMainTablePrefab);
      },
      originalGameDefinition.enName
    );
  },

  // Serialized prefab ClickEvents require this old method name; keep only a thin proxy.
  onClick: function (buttonEvent, sourceActionName) { return this.handleSerializedMenuAction(buttonEvent, sourceActionName); }
});

// The recovered bundle load signature includes a progress callback but does not consume it.
function preserveOriginalUnusedMainLoadProgress() {}
