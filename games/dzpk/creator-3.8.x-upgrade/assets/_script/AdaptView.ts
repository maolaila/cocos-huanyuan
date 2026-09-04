/**
 * 学习导读：这个组件只负责“超宽横屏时贴边”，不参与德州牌局逻辑。
 *
 * 本文件用到的 Cocos 3.8 API：
 * - `Component`：可挂到 Prefab 节点上的脚本基类；`onLoad` 是节点加载时的生命周期回调。
 * - `_decorator.ccclass/property`：把类和字段注册给 Creator。带 `property` 的字段会保存在 Prefab 中，
 *   所以字段名不能随意修改，否则原 Prefab 的序列化值会丢失。
 * - `view.getVisibleSize()`：读取当前真正可见的屏幕尺寸，不是设计稿尺寸。
 * - `Widget`：让 UI 节点贴住父节点的左、右、上或下边缘；`updateAlignment()` 会立即重算位置。
 * - `Enum`：把普通 TypeScript 枚举注册给 Inspector，使 `type` 能显示成下拉选项。
 */
import { Component, Enum, Widget, _decorator, view } from 'cc';

const { ccclass, property } = _decorator;

enum AdaptEdge {
  Left = 1,
  Right = 2,
  Top = 3,
  Down = 4,
}
// 仅声明 TS enum 还不够；调用 Enum 后 Creator Inspector 才认识这些选项。
Enum(AdaptEdge);

/** 保留原版在超宽、低高度设备上的 Widget 贴边行为。 */
@ccclass('AdaptView')
export class AdaptView extends Component {
  // 下面四个字段来自原 Prefab 序列化绑定：选择边缘，并保存该边缘的像素间距。
  @property({ type: AdaptEdge }) public type = AdaptEdge.Left;
  @property public spacingRight = 0;
  @property public spacingLeft = 0;
  @property public spacing = 0;

  protected onLoad(): void {
    const visibleSize = view.getVisibleSize();
    // 原节点可能已经有 Widget；没有时才动态补一个，避免重复组件。
    const widget = this.getComponent(Widget) ?? this.addComponent(Widget);
    // 宽高比大于 2 时属于超宽屏，只修正左右边距。
    if (visibleSize.width / visibleSize.height > 2) {
      if (this.type === AdaptEdge.Left) widget.left = this.spacingLeft;
      else if (this.type === AdaptEdge.Right) widget.right = this.spacingRight;
      widget.updateAlignment();
      return;
    }
    // 这里沿用原代码的判断和上下贴边语义，不改变正常 1334×750 布局。
    if (visibleSize.height / visibleSize.width < 2) {
      if (this.type === AdaptEdge.Top) widget.top = this.spacing;
      else if (this.type === AdaptEdge.Down) widget.bottom = this.spacing;
      widget.updateAlignment();
    }
  }
}
