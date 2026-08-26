import { EditBox, Event, Label, Node, ProgressBar, Slider, _decorator } from 'cc';
import { PopupBase } from './PopupBase';

const { ccclass, property } = _decorator;

/** Source-presence bridge only; Bank remains NotApplicable in the standalone game. */
@ccclass('GameBank')
export class GameBank extends PopupBase {
  @property(Label) public gold: Label | null = null;
  @property(Label) public bankGold: Label | null = null;
  @property(EditBox) public inputGold: EditBox | null = null;
  @property(Slider) public slider: Slider | null = null;
  @property(ProgressBar) public prog: ProgressBar | null = null;
  @property(EditBox) public pwd: EditBox | null = null;
  @property(Node) public czBtn: Node | null = null;
  @property(Label) public progTips: Label | null = null;
  @property(Label) public dxLabel: Label | null = null;

  public editboxEvent(_value: string): void { this.reportNotApplicable(); }
  public sliderEvevt(_slider: Slider): void { this.reportNotApplicable(); }
  public onClick(_event: Event, _actionName: string): void { this.reportNotApplicable(); }

  private reportNotApplicable(): void {
    console.warn('[DZPK 3.8] Bank is source-present but standalone-runtime NotApplicable');
  }
}
