/**
 * 学习导读：原 2.4 客户端依赖一包全局 `w*` 对象；3.8 版在 Boot 中明确创建服务，再通过这里提供
 * 给 Prefab 组件。它类似一个极小的“服务容器”，目的只是消除不可追踪的全局变量。
 *
 * 本文件没有导入 `cc`，因为它不直接操作 Cocos 节点。各字段的具体职责分别由对应 Service 类说明。
 * `interface` 只描述形状，运行时真正保存的是 `activeRuntimeServices` 这一份对象。
 */
import { DzpkAudioService } from './DzpkAudioService';
import { DzpkEventBus } from './DzpkEventBus';
import { GameContext } from './GameContext';
import { GameHubAuthenticatedTransport } from './GameHubAuthenticatedTransport';
import { DzpkResourceLoader } from './DzpkResourceLoader';
import { SourceProtocolAdapter } from './SourceProtocolAdapter';
import { DzpkUiMessageService } from './DzpkUiMessageService';
import { DzpkViewNavigator } from './DzpkViewNavigator';

export interface DzpkRuntimeServices {
  // 游戏上下文、消息总线、资源、音频、提示、协议、网络、导航共同组成一局客户端运行环境。
  readonly gameContext: GameContext;
  readonly eventBus: DzpkEventBus;
  readonly resourceLoader: DzpkResourceLoader;
  readonly audioService: DzpkAudioService;
  readonly uiMessageService: DzpkUiMessageService;
  readonly protocolAdapter: SourceProtocolAdapter;
  readonly authenticatedTransport: GameHubAuthenticatedTransport;
  readonly viewNavigator: DzpkViewNavigator;
}

let activeRuntimeServices: DzpkRuntimeServices | null = null;

/** 安装唯一运行环境。重复安装通常意味着 Scene/Boot 被错误创建了两次，因此直接报错。 */
export function installDzpkRuntimeServices(services: DzpkRuntimeServices): void {
  if (activeRuntimeServices) throw new Error('DZPK runtime services are already installed');
  activeRuntimeServices = services;
}

export function requireDzpkRuntimeServices(): DzpkRuntimeServices {
  // 用 require 命名强调“调用时必须已经完成 Boot”，缺失时立即得到明确错误。
  if (!activeRuntimeServices) throw new Error('DZPK runtime services are not installed');
  return activeRuntimeServices;
}

export function clearDzpkRuntimeServices(): void {
  // Boot 销毁时清空，让下一次重新加载 Scene 可以重新安装，也避免旧服务引用泄漏。
  activeRuntimeServices = null;
}
