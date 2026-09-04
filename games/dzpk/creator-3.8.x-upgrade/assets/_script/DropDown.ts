/**
 * 学习导读：牌桌左上角的下拉菜单控制器。它只开关原版菜单、规则和设置，不重新创建 UI。
 *
 * Cocos API 速查：
 * - `Button/Event`：按钮组件及点击事件对象；Prefab 会把点击回调连到 `onClickBtn`。
 * - `Node.active`：控制节点树是否参与渲染和交互；隐藏菜单后必须同时关闭遮罩按钮。
 * - `Sprite/SpriteFrame`：菜单展开/收起时替换原版箭头图片。
 * - `UIOpacity`：控制整个面板透明度，范围是 0（透明）到 255（不透明）。
 * - `Vec3`：Creator 3.x 节点位置是三维向量，即使这是 2D 游戏也保留 z 值。
 * - `find(path, root)`：从指定根节点按相对路径查找原 Prefab 节点。
 * - `tween()`：Creator 3.x 补间动画；`.to().call().start()` 表示移动到目标、执行收尾、启动动画。
 */
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

/** Creator 3.8 版原牌桌下拉菜单。节点、图片和点击名字继续来自原 Prefab。 */
@ccclass('DropDown')
export class DropDown extends Component {
  // 这些 `@property` 由 Creator Inspector 从原 Prefab 绑定，不能只看代码以为它们会自动查找。
  @property(Sprite) public switchBtn: Sprite | null = null;
  @property([SpriteFrame]) public switchImg: SpriteFrame[] = [];
  @property(Node) public panel: Node | null = null;
  @property(Node) public closeBtn: Node | null = null;

  private bottomY = 490;
  private isShown = false;
  private readonly moveSeconds = 0.3;
  private isAnimating = false;
  private bankSubscription: EventSubscription | null = null;

  /**
   * `start` 在所有节点完成 `onLoad` 后执行，适合读取已经绑定好的面板初始位置。
   * 同时监听旧版 `local_Event/setGameBankBtn`，让原菜单上的银行按钮保持原事件兼容。
   */
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
    // 组件销毁时退订，防止下一次打开牌桌后旧实例仍收到事件。
    requireDzpkRuntimeServices().eventBus.unsubscribeSourceEvent(this.bankSubscription);
    this.bankSubscription = null;
  }

  /** Prefab 按钮共用的序列化入口，`actionName` 决定打开哪个原版功能。 */
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

  /**
   * 展开/收起菜单。`isAnimating` 是动画锁，防止快速连点生成两组方向相反的 Tween。
   * 位置 Tween 和透明度 Tween 分开，是因为位置作用在 Node，透明度作用在 UIOpacity 组件。
   */
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

  /** 收起菜单后，通过统一导航服务实例化原 Rule/Set Prefab。 */
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
  // 对必需序列化绑定采用“尽早报错”，比后面出现模糊的 null 属性错误更容易定位 Prefab 问题。
  if (!node) throw new Error(`DropDown.${propertyName} is not bound`);
  return node;
}

function opacityOf(node: Node): UIOpacity {
  // UIOpacity 是 3.x 对整棵 UI 子树做透明度动画的标准组件。
  return node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
}
