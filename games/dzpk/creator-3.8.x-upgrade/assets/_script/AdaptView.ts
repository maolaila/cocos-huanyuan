import { Component, Enum, Widget, _decorator, view } from 'cc';

const { ccclass, property } = _decorator;

enum AdaptEdge {
  Left = 1,
  Right = 2,
  Top = 3,
  Down = 4,
}
Enum(AdaptEdge);

/** Original extra-wide/short viewport Widget alignment behavior. */
@ccclass('AdaptView')
export class AdaptView extends Component {
  @property({ type: AdaptEdge }) public type = AdaptEdge.Left;
  @property public spacingRight = 0;
  @property public spacingLeft = 0;
  @property public spacing = 0;

  protected onLoad(): void {
    const visibleSize = view.getVisibleSize();
    const widget = this.getComponent(Widget) ?? this.addComponent(Widget);
    if (visibleSize.width / visibleSize.height > 2) {
      if (this.type === AdaptEdge.Left) widget.left = this.spacingLeft;
      else if (this.type === AdaptEdge.Right) widget.right = this.spacingRight;
      widget.updateAlignment();
      return;
    }
    if (visibleSize.height / visibleSize.width < 2) {
      if (this.type === AdaptEdge.Top) widget.top = this.spacing;
      else if (this.type === AdaptEdge.Down) widget.bottom = this.spacing;
      widget.updateAlignment();
    }
  }
}
