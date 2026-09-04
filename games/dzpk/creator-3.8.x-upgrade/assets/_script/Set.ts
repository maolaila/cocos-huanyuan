/**
 * 学习导读：原设置弹窗，负责音乐、音效、静音以及日/夜画面偏好。
 *
 * Cocos API 速查：
 * - `Toggle.isChecked`：复选/单选按钮当前是否选中；本 Prefab 用子节点显隐呈现选中图。
 * - `sys.localStorage`：Cocos 对浏览器 localStorage 的跨平台包装；这里仅保存本设备显示偏好。
 * - `find(path, root)`：在原 Prefab 内按相对路径取 Toggle。
 * - `Label`：设置版本文字；`constrainSingleLineLabel` 让它在原宽度内缩小而不换行。
 */
import { Event, Label, Node, Toggle, _decorator, find, sys } from 'cc';
import { requireDzpkRuntimeServices } from '../Standalone/DzpkRuntimeServices';
import { constrainSingleLineLabel } from '../Standalone/DzpkUiHelpers';
import { PopupBase } from './PopupBase';

const { ccclass } = _decorator;

/** 使用 Creator 3.8 Toggle 和本地存储 API 驱动原 Set Prefab。 */
@ccclass('Set')
export class Set extends PopupBase {
  /** `start` 时运行服务已经安装完成，因此可以安全读取音量和昼夜偏好。 */
  protected start(): void {
    this.initVolume();
    this.initNight();
    const versionLabel = this.main?.getChildByName('vs')?.getComponent(Label);
    if (versionLabel) {
      constrainSingleLineLabel(versionLabel);
      versionLabel.string = 'v3.8.8';
    }
  }

  /** 从 AudioService 的真实音量反推三个 Toggle，保证按钮状态和播放状态一致。 */
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

  /** 读取 `Night`：0=自动、1=白天、2=夜间；再统一显示或隐藏夜间遮罩。 */
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

  /** 原音量按钮入口。业务只操作 AudioSource 音量，不影响 GameHub 会话。 */
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

  /** 原场景模式按钮入口；把选择写入本机，随后重新计算显示状态。 */
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

  /** 原“修复”入口在独立学习工程中没有下载器，因此只给出明确提示。 */
  public onXF(_event?: Event): void {
    requireDzpkRuntimeServices().uiMessageService.showTips('独立还原工程不提供修复下载入口');
  }
}

function requireMain(main: Node | null): Node {
  // 设置主体是必需 Prefab 绑定，缺失时尽早报出字段名。
  if (!main) throw new Error('Set.main is not bound');
  return main;
}

function setToggle(main: Node, path: string, checked: boolean): void {
  // 路径以 `main` 为根，避免全场景同名节点互相干扰。
  const toggle = find(path, main)?.getComponent(Toggle);
  if (toggle) toggle.isChecked = checked;
}
