var n;
var cc__extends = __extends;
var cc__decorate = __decorate;
Object.defineProperty(exports, "__esModule", {
  value: true
});
var $PopupBase = require("PopupBase");
var cc__decorator = cc._decorator;
var ccp_ccclass = cc__decorator.ccclass;
var ccp_property = cc__decorator.property;
var def_Rule = function (t) {
  function _ctor() {
    var e = null !== t && t.apply(this, arguments) || this;
    e.pageNode = null;
    e.butLeft = null;
    e.butRight = null;
    e.pageView = null;
    e.idx = 0;
    e.len = 0;
    return e;
  }
  cc__extends(_ctor, t);
  _ctor.prototype.onLoad = function () {
    if (this.pageNode) {
      this.pageNode.on("page-turning", this.PageTurning, this);
      this.pageView = this.pageNode.getComponent(cc.PageView);
      this.len = this.pageView.content.childrenCount - 1;
      this.initButton();
    }
  };
  _ctor.prototype.initButton = function () {
    this.butLeft.getComponent(cc.Button).interactable = 0 != this.idx;
    this.butRight.getComponent(cc.Button).interactable = this.idx != this.len;
  };
  _ctor.prototype.PageTurning = function () {
    this.idx = this.pageView.getCurrentPageIndex();
    this.initButton();
  };
  _ctor.prototype.onClickBut = function (t, e) {
    wAudioMgr.playBtnSound();
    switch (e) {
      case "left":
        this.idx--;
        this.pageView.scrollToPage(this.idx, this.pageView.pageTurningSpeed);
        break;
      case "right":
        this.idx++;
        this.pageView.scrollToPage(this.idx, this.pageView.pageTurningSpeed);
    }
  };
  cc__decorate([ccp_property(cc.Node)], _ctor.prototype, "pageNode", undefined);
  cc__decorate([ccp_property(cc.Node)], _ctor.prototype, "butLeft", undefined);
  cc__decorate([ccp_property(cc.Node)], _ctor.prototype, "butRight", undefined);
  return cc__decorate([ccp_ccclass], _ctor);
}($PopupBase.default);
exports.default = def_Rule;