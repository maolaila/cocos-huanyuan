'use strict';

/**
 * Replaces Hall-only loading/tip services. It never draws the poker table and
 * remains hidden during normal play.
 */
function DzpkUiMessageService(messageOverlayNode, gameContext) {
  this.messageOverlayNode = messageOverlayNode;
  this.gameContext = gameContext;
  this.nightModeOverlayNode = messageOverlayNode.parent.getChildByName('Night');
  this.messageLabelNode = null;
  this.hideMessageSchedule = null;
  this.TIPS_OK = 1;
  this.initializeMessageOverlay();
}

DzpkUiMessageService.prototype.initializeMessageOverlay = function () {
  var messageLabelNode = new cc.Node('HallCompatibilityMessage');
  var messageLabel = messageLabelNode.addComponent(cc.Label);
  messageLabel.fontSize = 28;
  messageLabel.lineHeight = 36;
  messageLabel.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
  messageLabel.verticalAlign = cc.Label.VerticalAlign.CENTER;
  messageLabelNode.color = cc.Color.WHITE;
  messageLabelNode.setContentSize(900, 100);
  messageLabelNode.opacity = 0;
  messageLabelNode.zIndex = 1000;
  messageLabelNode.parent = this.messageOverlayNode;
  this.messageLabelNode = messageLabelNode;
};

DzpkUiMessageService.prototype.showTransientMessage = function (messageText) {
  var messageLabel = this.messageLabelNode.getComponent(cc.Label);
  messageLabel.string = String(messageText || '未知提示');
  this.messageLabelNode.opacity = 255;
  if (this.hideMessageSchedule) clearTimeout(this.hideMessageSchedule);
  var messageLabelNode = this.messageLabelNode;
  this.hideMessageSchedule = setTimeout(function () {
    if (cc.isValid(messageLabelNode, true)) messageLabelNode.opacity = 0;
  }, 2500);
};

DzpkUiMessageService.prototype.showLoadingIndicator = function () {
  this.messageLabelNode.getComponent(cc.Label).string = '正在连接 GameHub…';
  this.messageLabelNode.opacity = 255;
};

DzpkUiMessageService.prototype.hideLoadingIndicator = function () {
  this.messageLabelNode.opacity = 0;
};

DzpkUiMessageService.prototype.applyDayNightAppearance = function (isNightMode) {
  this.gameContext.setDayNightMode(isNightMode === true);
  if (this.nightModeOverlayNode) {
    this.nightModeOverlayNode.opacity = isNightMode === true ? 255 : 0;
  }
};

// Thin Hall compatibility methods consumed by the original components.
DzpkUiMessageService.prototype.showTips = function (messageText) {
  this.showTransientMessage(messageText);
};
DzpkUiMessageService.prototype.showLoadingUI = function () {
  this.showLoadingIndicator();
};
DzpkUiMessageService.prototype.hideLoadingUI = function () {
  this.hideLoadingIndicator();
};
DzpkUiMessageService.prototype.enterRoomFailTips = function (minimumGoldAmount) {
  this.showTransientMessage('进入该房间至少需要 ' + minimumGoldAmount + ' 筹码');
};
DzpkUiMessageService.prototype.showGameOutTips = function (confirmationRequest) {
  // In the standalone restoration this source callback means “leave table”.
  // The server response returns to the original Room Prefab; it is not a
  // browser-level game exit and must not open an added native confirm dialog.
  if (confirmationRequest && typeof confirmationRequest.okCB === 'function') {
    confirmationRequest.okCB();
  }
};
DzpkUiMessageService.prototype.show_day_night = function (isNightMode) {
  this.applyDayNightAppearance(isNightMode);
};

module.exports = { DzpkUiMessageService: DzpkUiMessageService };
