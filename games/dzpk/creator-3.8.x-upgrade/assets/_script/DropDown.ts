import {
  Button,
  Component,
  Event,
  Node,
  Sprite,
  SpriteFrame,
  UIOpacity,
  Vec3,
  _decorator,
  find,
  tween,
} from 'cc';
import { EventSubscription } from '../Standalone/DzpkEventBus';
import { requireDzpkRuntimeServices } from '../Standalone/DzpkRuntimeServices';

const { ccclass, property } = _decorator;

/** Creator 3.8 version of the original table drop-down menu. */
@ccclass('DropDown')
export class DropDown extends Component {
  @property(Sprite) public switchBtn: Sprite | null = null;
  @property([SpriteFrame]) public switchImg: SpriteFrame[] = [];
  @property(Node) public panel: Node | null = null;
  @property(Node) public closeBtn: Node | null = null;

  private bottomY = 490;
  private isShown = false;
  private readonly moveSeconds = 0.3;
  private isAnimating = false;
  private bankSubscription: EventSubscription | null = null;

  protected start(): void {
    const panel = requireNode(this.panel, 'panel');
    const closeButton = requireNode(this.closeBtn, 'closeBtn');
    this.bottomY = panel.position.y;
    panel.active = false;
    opacityOf(panel).opacity = 0;
    closeButton.active = false;
    const { eventBus } = requireDzpkRuntimeServices();
    this.bankSubscription = eventBus.subscribeSourceEvent(
      'local_Event',
      (eventName, interactable) => {
        if (eventName !== 'setGameBankBtn') return;
        const bankButton = find('bank', panel)?.getComponent(Button);
        if (bankButton) bankButton.interactable = Boolean(interactable);
      },
      this,
    );
  }

  protected onDestroy(): void {
    requireDzpkRuntimeServices().eventBus.unsubscribeSourceEvent(this.bankSubscription);
    this.bankSubscription = null;
  }

  public onClickBtn(_buttonEvent: Event, actionName: string): void {
    switch (actionName) {
      case 'switch': this.onClickSwitchBtn(); break;
      case 'rule': this.openOriginalPopup('prefab/Rule'); break;
      case 'close': this.onClickSwitchBtn(); return;
      case 'bank': this.onClickSwitchBtn(); return;
      case 'set': this.openOriginalPopup('prefab/Set'); break;
      default: return;
    }
    requireDzpkRuntimeServices().audioService.playButtonSound();
  }

  private onClickSwitchBtn(): void {
    if (this.isAnimating) return;
    const panel = requireNode(this.panel, 'panel');
    this.isAnimating = true;
    this.isShown = !this.isShown;
    panel.active = true;
    if (this.isShown) {
      panel.setPosition(panel.position.x, this.bottomY + 100);
      this.showCloseButton();
    } else {
      this.hideCloseButton();
    }
    const targetY = this.isShown ? this.bottomY : this.bottomY + 100;
    const targetOpacity = this.isShown ? 255 : 0;
    tween(panel)
      .to(this.moveSeconds, {
        position: new Vec3(panel.position.x, targetY, panel.position.z),
      }, { easing: 'backOut' })
      .call(() => {
        this.isAnimating = false;
        panel.active = this.isShown;
      })
      .start();
    tween(opacityOf(panel)).to(0.25, { opacity: targetOpacity }).start();
  }

  private openOriginalPopup(path: 'prefab/Rule' | 'prefab/Set'): void {
    this.onClickSwitchBtn();
    void requireDzpkRuntimeServices().viewNavigator.displayOriginalPopupPrefab({ path });
  }

  private showCloseButton(): void {
    if (this.switchBtn) this.switchBtn.spriteFrame = this.switchImg[0] ?? null;
    if (this.closeBtn) this.closeBtn.active = true;
  }

  private hideCloseButton(): void {
    if (this.switchBtn) this.switchBtn.spriteFrame = this.switchImg[1] ?? null;
    if (this.closeBtn) this.closeBtn.active = false;
  }
}

function requireNode(node: Node | null, propertyName: string): Node {
  if (!node) throw new Error(`DropDown.${propertyName} is not bound`);
  return node;
}

function opacityOf(node: Node): UIOpacity {
  return node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
}
