import { Event, Label, Node, Toggle, _decorator, find, sys } from 'cc';
import { requireDzpkRuntimeServices } from '../Standalone/DzpkRuntimeServices';
import { constrainSingleLineLabel } from '../Standalone/DzpkUiHelpers';
import { PopupBase } from './PopupBase';

const { ccclass } = _decorator;

/** Original settings popup migrated to Creator 3.8 Toggle and storage APIs. */
@ccclass('Set')
export class Set extends PopupBase {
  protected start(): void {
    this.initVolume();
    this.initNight();
    const versionLabel = this.main?.getChildByName('vs')?.getComponent(Label);
    if (versionLabel) {
      constrainSingleLineLabel(versionLabel);
      versionLabel.string = 'v3.8.8';
    }
  }

  public initVolume(): void {
    const main = requireMain(this.main);
    const { audioService } = requireDzpkRuntimeServices();
    const musicEnabled = audioService.getMusicVolume() !== 0;
    const soundEnabled = audioService.getSoundVolume() !== 0;
    setToggle(main, 'm/yl', musicEnabled);
    setToggle(main, 'm/yx', soundEnabled);
    setToggle(main, 'm/jy', !musicEnabled && !soundEnabled);
    main.getChildByName('m')?.children.forEach((toggleNode) => {
      const toggle = toggleNode.getComponent(Toggle);
      if (toggleNode.children[0] && toggle) toggleNode.children[0].active = !toggle.isChecked;
    });
  }

  public initNight(): void {
    const main = requireMain(this.main);
    const { gameContext, uiMessageService } = requireDzpkRuntimeServices();
    const storedNightMode = Number(sys.localStorage.getItem('Night'));
    const automaticNightMode = gameContext.getDayNightRecommendation();
    const selectedMode = storedNightMode === 1 ? 'bt' : storedNightMode === 2 ? 'yj' : 'zd';
    uiMessageService.applyDayNightAppearance(
      storedNightMode === 2 || (storedNightMode === 0 && automaticNightMode === 1),
    );
    main.getChildByName('scene')?.children.forEach((toggleNode) => {
      const selected = toggleNode.name === selectedMode;
      const toggle = toggleNode.getComponent(Toggle);
      if (toggle) toggle.isChecked = selected;
      if (toggleNode.children[0]) toggleNode.children[0].active = !selected;
    });
  }

  public YXonClick(toggle: Toggle, actionName: string): void {
    const { audioService } = requireDzpkRuntimeServices();
    switch (actionName) {
      case 'jy':
        audioService.setSoundVolume(toggle.isChecked ? 0 : 1);
        audioService.setMusicVolume(toggle.isChecked ? 0 : 1);
        break;
      case 'yl':
        audioService.setMusicVolume(toggle.isChecked ? 1 : 0);
        break;
      case 'yx':
        audioService.setSoundVolume(toggle.isChecked ? 1 : 0);
        break;
      default:
        return;
    }
    this.initVolume();
    audioService.playButtonSound();
  }

  public CJonClick(toggle: Toggle, actionName: string): void {
    const { gameContext, audioService } = requireDzpkRuntimeServices();
    switch (actionName) {
      case 'zd':
        sys.localStorage.setItem('Night', toggle.isChecked
          ? '0'
          : String(gameContext.getDayNightRecommendation() + 1));
        break;
      case 'bt':
        sys.localStorage.setItem('Night', toggle.isChecked ? '1' : '2');
        break;
      case 'yj':
        sys.localStorage.setItem('Night', toggle.isChecked ? '2' : '1');
        break;
      default:
        return;
    }
    this.initNight();
    audioService.playButtonSound();
  }

  public onXF(_event?: Event): void {
    requireDzpkRuntimeServices().uiMessageService.showTips('独立还原工程不提供修复下载入口');
  }
}

function requireMain(main: Node | null): Node {
  if (!main) throw new Error('Set.main is not bound');
  return main;
}

function setToggle(main: Node, path: string, checked: boolean): void {
  const toggle = find(path, main)?.getComponent(Toggle);
  if (toggle) toggle.isChecked = checked;
}
