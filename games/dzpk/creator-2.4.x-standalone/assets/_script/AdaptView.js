var o = cc.Enum({
  LEFT: 1,
  RIGHT: 2,
  TOP: 3,
  DOWN: 4
});
cc.Class({
  extends: cc.Component,
  properties: {
    type: {
      default: o.LEFT,
      type: o,
      tooltip: "1.LEFT:靠左\n2.RIGHT：靠右\n3.TOP：靠上\n4.down：靠下"
    },
    spacingRight: {
      default: 0,
      type: cc.Integer,
      tooltip: "本节点与父节点的距离",
      visible: function () {
        return this.type == o.RIGHT;
      }
    },
    spacingLeft: {
      default: 0,
      type: cc.Integer,
      tooltip: "本节点与父节点的距离",
      visible: function () {
        return this.type == o.LEFT;
      }
    },
    spacing: {
      default: 0,
      type: cc.Integer,
      tooltip: "本节点与父节点的距离",
      visible: function () {
        return this.type == o.TOP || this.type == o.DOWN;
      }
    }
  },
  onLoad: function () {
    if (cc.winSize.width / cc.winSize.height > 2) {
      var t = this.node.getComponent(cc.Widget);
      t || (t = this.node.addComponent(cc.Widget));
      if (this.type == o.LEFT) {
        t.left = this.spacingLeft;
      } else {
        this.type == o.RIGHT && (t.right = this.spacingRight);
      }
      t.updateAlignment();
    } else if (cc.winSize.height / cc.winSize.width < 2) {
      var e = this.node.getComponent(cc.Widget);
      e || (e = this.node.addComponent(cc.Widget));
      if (this.type == o.TOP) {
        e.top = this.spacing;
      } else {
        this.type == o.DOWN && (e.bottom = this.spacing);
      }
      e.updateAlignment();
    }
  }
});