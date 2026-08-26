import { Button, Event, Node, PageView, _decorator } from 'cc';
import { requireDzpkRuntimeServices } from '../Standalone/DzpkRuntimeServices';
import { PopupBase } from './PopupBase';

const { ccclass, property } = _decorator;

/** Original rules popup migrated to Creator 3.8 PageView APIs. */
@ccclass('Rule')
export class Rule extends PopupBase {
  @property(Node) public pageNode: Node | null = null;
  @property(Node) public butLeft: Node | null = null;
  @property(Node) public butRight: Node | null = null;

  private pageView: PageView | null = null;
  private currentPageIndex = 0;
  private lastPageIndex = 0;

  protected onLoad(): void {
    if (!this.pageNode) return;
    this.pageView = this.pageNode.getComponent(PageView);
    if (!this.pageView) throw new Error('Rule.pageNode is missing PageView');
    this.lastPageIndex = Math.max(0, (this.pageView.content?.children.length ?? 1) - 1);
    this.pageNode.on(PageView.EventType.PAGE_TURNING, this.PageTurning, this);
    this.initButton();
  }

  protected onDestroy(): void {
    this.pageNode?.off(PageView.EventType.PAGE_TURNING, this.PageTurning, this);
  }

  public initButton(): void {
    const leftButton = this.butLeft?.getComponent(Button);
    const rightButton = this.butRight?.getComponent(Button);
    if (leftButton) leftButton.interactable = this.currentPageIndex !== 0;
    if (rightButton) rightButton.interactable = this.currentPageIndex !== this.lastPageIndex;
  }

  public PageTurning(): void {
    this.currentPageIndex = this.pageView?.getCurrentPageIndex() ?? 0;
    this.initButton();
  }

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
