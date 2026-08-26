'use strict';

/**
 * Recreates only the Hall container operations required by the original DZPK
 * prefabs. All visible poker UI still comes from the original prefabs.
 */
function DzpkViewNavigator(canvasNode, resourceLoader, gameContext, eventBus) {
  this.canvasNode = canvasNode;
  this.resourceLoader = resourceLoader;
  this.gameContext = gameContext;
  this.eventBus = eventBus;
  this.roomRootNode = canvasNode.getChildByName('Room');
  this.gameRootNode = canvasNode.getChildByName('Game');
  this.popupRootNode = canvasNode.getChildByName('UIShow');
  this.authenticatedTransport = null;
}

DzpkViewNavigator.prototype.setAuthenticatedTransport = function (authenticatedTransport) {
  this.authenticatedTransport = authenticatedTransport;
};

DzpkViewNavigator.prototype.initializeOriginalDzpkPrefabs = function () {
  var navigator = this;
  return this.resourceLoader.loadOriginalPrefab('prefab/Load').then(function (loadPrefab) {
    navigator.roomRootNode.destroyAllChildren();
    var loadPrefabNode = cc.instantiate(loadPrefab);
    loadPrefabNode.parent = navigator.roomRootNode;
    navigator.roomRootNode.active = true;
    navigator.gameRootNode.active = false;
  });
};

DzpkViewNavigator.prototype.displayOriginalTablePrefab = function (tablePrefab) {
  this.gameRootNode.destroyAllChildren();
  var tablePrefabNode = cc.instantiate(tablePrefab);
  tablePrefabNode.parent = this.gameRootNode;
  this.gameRootNode.active = true;
};

DzpkViewNavigator.prototype.displayOriginalPopupPrefab = function (popupRequest) {
  var navigator = this;
  if (!popupRequest || !/^prefab\/(Rule|Set)$/.test(popupRequest.path)) {
    throw new Error('Only the original Rule and Set prefabs are available');
  }
  this.resourceLoader.loadOriginalPrefab(popupRequest.path).then(function (popupPrefab) {
    var popupPrefabNode = cc.instantiate(popupPrefab);
    popupPrefabNode.parent = navigator.popupRootNode;
  }).catch(function (popupError) {
    window.wUIManager.showTips(popupError.message || '原版弹层加载失败');
  });
};

DzpkViewNavigator.prototype.returnToRoomFromTable = function (viewerGoldAmount) {
  window.wAudioMgr.stopAllEffects();
  this.popupRootNode.destroyAllChildren();
  if (typeof viewerGoldAmount === 'number') this.gameContext.setKey('gold', viewerGoldAmount);
  this.gameRootNode.destroyAllChildren();
  this.gameRootNode.active = false;
  this.roomRootNode.active = true;
  this.eventBus.publishSourceEvent('local_Event', 'up_Gold');
};

DzpkViewNavigator.prototype.requestStandaloneExit = function () {
  if (this.authenticatedTransport) this.authenticatedTransport.endAuthenticatedSession();
  var targetOrigin = this.gameContext.postMessageTargetOrigin;
  if (window.parent !== window && targetOrigin) {
    window.parent.postMessage({ type: 'GAMEHUB_GAME_EXIT', gameCode: 'dzpk-955' }, targetOrigin);
    return;
  }
  window.wUIManager.showTips('已退出德州扑克，可关闭当前页面');
};

// Thin compatibility methods referenced by original scripts and prefabs.
DzpkViewNavigator.prototype.openGame = DzpkViewNavigator.prototype.displayOriginalTablePrefab;
DzpkViewNavigator.prototype.openPage = DzpkViewNavigator.prototype.displayOriginalPopupPrefab;
DzpkViewNavigator.prototype.quitGame = DzpkViewNavigator.prototype.returnToRoomFromTable;
DzpkViewNavigator.prototype.enterHall = DzpkViewNavigator.prototype.requestStandaloneExit;

module.exports = { DzpkViewNavigator: DzpkViewNavigator };
