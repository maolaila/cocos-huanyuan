/**
 * 学习导读：原版“游戏规则”弹窗的翻页控制器。
 *
 * Cocos API 速查：`PageView` 是可左右翻页的 UI 容器；`PageView.EventType.PAGE_TURNING` 在页面切换时
 * 触发；`scrollToPage(index, seconds)` 以动画滚到目标页；`Button.interactable` 决定按钮能否点击。
 * `Node.on/off` 必须成对使用，否则弹窗销毁后旧监听可能继续执行。
 */
import { Button, Event, Node, PageView, _decorator } from 'cc';
import { requireDzpkRuntimeServices } from '../Standalone/DzpkRuntimeServices';
import { PopupBase } from './PopupBase';

const { ccclass, property } = _decorator;

/** 使用 Creator 3.8 PageView API 驱动原 Rule Prefab，不改规则图片和页面层级。 */
@ccclass('Rule')
export class Rule extends PopupBase {
  @property(Node) public pageNode: Node | null = null;
  @property(Node) public butLeft: Node | null = null;
  @property(Node) public butRight: Node | null = null;

  private pageView: PageView | null = null;
  private currentPageIndex = 0;
  private lastPageIndex = 0;

  /** 取得 PageView、计算最后一页并监听翻页事件。 */
  protected onLoad(): void {
    if (!this.pageNode) return;
    this.pageView = this.pageNode.getComponent(PageView);
    if (!this.pageView) throw new Error('Rule.pageNode is missing PageView');
    this.lastPageIndex = Math.max(0, (this.pageView.content?.children.length ?? 1) - 1);
    this.pageNode.on(PageView.EventType.PAGE_TURNING, this.PageTurning, this);
    this.initButton();
  }

  protected onDestroy(): void {
    // `off` 传入与 `on` 完全相同的事件、函数和 target，才能准确移除监听。
    this.pageNode?.off(PageView.EventType.PAGE_TURNING, this.PageTurning, this);
  }

  /** 根据当前页禁用不可能继续翻动的左/右按钮。 */
  public initButton(): void {
    const leftButton = this.butLeft?.getComponent(Button);
    const rightButton = this.butRight?.getComponent(Button);
    if (leftButton) leftButton.interactable = this.currentPageIndex !== 0;
    if (rightButton) rightButton.interactable = this.currentPageIndex !== this.lastPageIndex;
  }

  /** PageView 自己完成拖动后，把组件中的页码与它同步。 */
  public PageTurning(): void {
    this.currentPageIndex = this.pageView?.getCurrentPageIndex() ?? 0;
    this.initButton();
  }

  /** 原 Prefab 左右按钮共用的点击入口；先夹紧页码，再调用 PageView 动画。 */
  public onClickBut(_event: Event, direction: string): void {
    if (!this.pageView) return;
    requireDzpkRuntimeServices().audioService.playButtonSound();
    if (direction === 'left') this.currentPageIndex -= 1;
    else if (direction === 'right') this.currentPageIndex += 1;
    else return;
    this.currentPageIndex = Math.max(0, Math.min(this.lastPageIndex, this.currentPageIndex));
    this.pageView.scrollToPage(this.currentPageIndex, this.pageView.pageTurningSpeed);
  }
}
