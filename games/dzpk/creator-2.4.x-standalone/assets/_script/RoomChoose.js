var n;
var cc__extends = __extends;
var cc__decorate = __decorate;
Object.defineProperty(exports, "__esModule", {
  value: true
});
var a = cc.Enum({
  img1: 1,
  img2: 2
});
var cc__decorator = cc._decorator;
var ccp_ccclass = cc__decorator.ccclass;
var ccp_property = cc__decorator.property;
var def_RoomChoose = function (t) {
  function _ctor() {
    var e = null !== t && t.apply(this, arguments) || this;
    e.img1 = [];
    e.img2 = [];
    e.type = a.img1;
    e.img = null;
    return e;
  }
  cc__extends(_ctor, t);
  _ctor.prototype.start = function () {
    var t = this;
    this.img = this["img" + this.type];
    this.random();
    this.schedule(function () {
      t.random();
    }, 10);
  };
  _ctor.prototype.random = function () {
    var t = wUtils.random(1, 100);
    t = t < 70 ? 0 : t < 90 ? 1 : 2;
    this.node.getComponent(cc.Sprite).spriteFrame = this.img[t];
  };
  cc__decorate([ccp_property(cc.SpriteFrame)], _ctor.prototype, "img1", undefined);
  cc__decorate([ccp_property(cc.SpriteFrame)], _ctor.prototype, "img2", undefined);
  cc__decorate([ccp_property({
    type: a,
    tooltip: "选择使用img1的资源还是img2的资源"
  })], _ctor.prototype, "type", undefined);
  return cc__decorate([ccp_ccclass], _ctor);
}(cc.Component);
exports.default = def_RoomChoose;