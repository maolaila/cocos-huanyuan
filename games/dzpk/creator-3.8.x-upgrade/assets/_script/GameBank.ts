/**
 * 学习导读：原版 Bank Prefab 的“序列化占位组件”。独立德州没有恢复大厅银行业务，因此界面和
 * 原字段仍保留，所有交互明确提示 NotApplicable，而不是删除脚本造成 Prefab Missing Script。
 *
 * Cocos API 速查：`EditBox` 是输入框，`Slider` 是滑杆，`ProgressBar` 是进度条，`Label` 是文字，
 * `Node` 是按钮/容器节点，`Event` 是 Prefab 点击回调传入的事件。这里声明这些类型是为了让原
 * Inspector 绑定可以正常反序列化，不代表银行资金逻辑在客户端实现。
 */
import { EditBox, Event, Label, Node, ProgressBar, Slider, _decorator } from 'cc';
import { PopupBase } from './PopupBase';

const { ccclass, property } = _decorator;

/** 仅承接原 Bank 组件身份；Standalone Runtime 中银行功能明确不适用。 */
@ccclass('GameBank')
export class GameBank extends PopupBase {
  // 字段名和类型必须与原 Prefab 保持一致，哪怕当前不读取，也不能随意删除或重命名。
  @property(Label) public gold: Label | null = null;
  @property(Label) public bankGold: Label | null = null;
  @property(EditBox) public inputGold: EditBox | null = null;
  @property(Slider) public slider: Slider | null = null;
  @property(ProgressBar) public prog: ProgressBar | null = null;
  @property(EditBox) public pwd: EditBox | null = null;
  @property(Node) public czBtn: Node | null = null;
  @property(Label) public progTips: Label | null = null;
  @property(Label) public dxLabel: Label | null = null;

  // 三个回调保留原按钮/输入框/滑杆的调用签名，统一走同一个不适用提示。
  public editboxEvent(_value: string): void { this.reportNotApplicable(); }
  public sliderEvevt(_slider: Slider): void { this.reportNotApplicable(); }
  public onClick(_event: Event, _actionName: string): void { this.reportNotApplicable(); }

  private reportNotApplicable(): void {
    // 只记录提示，不向 GameHub 发送任何银行或钱包修改请求。
    console.warn('[DZPK 3.8] Bank is source-present but standalone-runtime NotApplicable');
  }
}
