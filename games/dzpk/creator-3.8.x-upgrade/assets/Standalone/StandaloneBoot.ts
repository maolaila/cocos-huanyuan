/**
 * 学习导读：这是 Creator 3.8.8 Scene 的总入口组件。它不绘制牌桌，而是完成四件事：
 * 1. 把画布和相机固定为原版 1334×750 横屏；
 * 2. 创建上下文、事件、资源、音频、协议、网络、导航等服务；
 * 3. 按“认证 -> WebSocket -> DZPK Bundle -> 原 Load Prefab”的顺序启动；
 * 4. 在应用前后台切换时暂停声音并恢复连接。
 *
 * Cocos API 速查：
 * - `Component` 与 `onLoad/onDestroy`：组件进入/离开 Scene 时的生命周期。
 * - `_decorator.ccclass/property`：注册脚本组件和 Inspector 序列化字段。
 * - `Camera`：把 3D 世界投影到屏幕；2D UI 必须用 ORTHO 正交投影，否则可能“看得见但点不到”。
 * - `Layers`：相机可见层位掩码；这里让 DEFAULT、IGNORE_RAYCAST、UI_2D 都能被启动相机看到。
 * - `view/ResolutionPolicy`：设置设计稿分辨率和适配策略；SHOW_ALL 保证完整画面可见。
 * - `game.on/off`：监听整个应用隐藏/显示，不是某个 Node 的点击事件。
 * - `macro.ENABLE_MULTI_TOUCH`：关闭多点触控，避免牌桌按钮同时触发多次。
 * - `profiler.hideStats()`：隐藏 FPS/DrawCall 调试浮层，不影响渲染本身。
 */
import {
  Camera,
  Component,
  Game,
  Label,
  Layers,
  ResolutionPolicy,
  _decorator,
  game,
  macro,
  profiler,
  view,
} from 'cc';
import { DzpkAudioService } from './DzpkAudioService';
import { DzpkEventBus } from './DzpkEventBus';
import { GameContext } from './GameContext';
import { GameHubAuthenticatedTransport } from './GameHubAuthenticatedTransport';
import { DzpkResourceLoader } from './DzpkResourceLoader';
import { clearDzpkRuntimeServices, installDzpkRuntimeServices } from './DzpkRuntimeServices';
import { SourceProtocolAdapter } from './SourceProtocolAdapter';
import { DzpkUiMessageService } from './DzpkUiMessageService';
import { DzpkViewNavigator } from './DzpkViewNavigator';

const { ccclass, property } = _decorator;

/** Creator 3.8 Scene 入口；用户能看到的画面仍全部来自原 DZPK Prefab。 */
@ccclass('DzpkStandaloneBoot')
export class DzpkStandaloneBoot extends Component {
  // 由 Boot Scene 绑定的通用提示 Label；不要改名，否则 Inspector 序列化引用会失效。
  @property(Label)
  public messageLabel: Label | null = null;

  private audioService: DzpkAudioService | null = null;
  private uiMessageService: DzpkUiMessageService | null = null;
  private authenticatedTransport: GameHubAuthenticatedTransport | null = null;

  /** Scene 加载即完成画布配置、前后台监听和异步启动。 */
  protected onLoad(): void {
    this.configureOriginalLandscapeCanvas();
    game.on(Game.EVENT_HIDE, this.handleApplicationEnteredBackground, this);
    game.on(Game.EVENT_SHOW, this.handleApplicationReturnedToForeground, this);
    void this.initializeStandaloneGameContext();
  }

  /**
   * Scene 销毁时必须成对移除全局监听、关闭 WebSocket、清空服务容器，避免重新进游戏后出现双连接。
   */
  protected onDestroy(): void {
    game.off(Game.EVENT_HIDE, this.handleApplicationEnteredBackground, this);
    game.off(Game.EVENT_SHOW, this.handleApplicationReturnedToForeground, this);
    this.authenticatedTransport?.closeAuthenticatedConnection();
    clearDzpkRuntimeServices();
  }

  /**
   * 组装运行环境并按依赖顺序启动。
   *
   * 为什么要先 install services 再加载 Prefab：Load/Room 组件一进入 `onLoad` 就会调用这些服务；
   * 如果晚安装，Prefab 能实例化但马上报“runtime services are not installed”。
   * 为什么先连 WS 再显示 Load：原版 Load 随后会请求 `Msg_Hall_GameSessions`，需要已经可用的连接。
   */
  private async initializeStandaloneGameContext(): Promise<void> {
    const gameContext = new GameContext();
    const eventBus = new DzpkEventBus();
    const resourceLoader = new DzpkResourceLoader();
    const audioService = new DzpkAudioService(this.node, resourceLoader);
    const nightOverlayNode = this.node.getChildByName('Night');
    const uiMessageService = new DzpkUiMessageService(
      gameContext,
      this.messageLabel,
      nightOverlayNode,
    );
    const protocolAdapter = new SourceProtocolAdapter(gameContext, eventBus, uiMessageService);
    const authenticatedTransport = new GameHubAuthenticatedTransport(
      gameContext,
      eventBus,
      protocolAdapter,
      uiMessageService,
    );
    const viewNavigator = new DzpkViewNavigator(
      this.node,
      resourceLoader,
      gameContext,
      eventBus,
      audioService,
      uiMessageService,
    );
    viewNavigator.setAuthenticatedTransport(authenticatedTransport);
    installDzpkRuntimeServices({
      gameContext,
      eventBus,
      resourceLoader,
      audioService,
      uiMessageService,
      protocolAdapter,
      authenticatedTransport,
      viewNavigator,
    });

    this.audioService = audioService;
    this.uiMessageService = uiMessageService;
    this.authenticatedTransport = authenticatedTransport;
    uiMessageService.showLoadingIndicator();

    try {
      await authenticatedTransport.initializeAuthenticatedSession();
      await authenticatedTransport.connectAuthenticatedWebSocket();
      await resourceLoader.loadOriginalDzpkBundle();
      await viewNavigator.initializeOriginalDzpkPrefabs();
      uiMessageService.hideLoadingIndicator();
    } catch (bootError) {
      uiMessageService.showTransientMessage(normalizeErrorMessage(bootError));
      console.error('[DZPK boot]', bootError);
    }
  }

  /**
   * 恢复原横屏相机合同。`orthoHeight=375` 正好对应 750 高设计稿的一半；正交相机没有透视缩放，
   * UI 的视觉坐标和点击射线才一致。
   */
  private configureOriginalLandscapeCanvas(): void {
    const camera = this.node.getChildByName('Main Camera')?.getComponent(Camera);
    if (!camera) throw new Error('Boot scene is missing the original 2D Camera');
    // Official Creator 3.8 empty-2d visibility: DEFAULT + IGNORE_RAYCAST + UI_2D.
    camera.visibility = Layers.makeMaskInclude([
      Layers.Enum.DEFAULT,
      Layers.Enum.IGNORE_RAYCAST,
      Layers.Enum.UI_2D,
    ]);
    camera.projection = Camera.ProjectionType.ORTHO;
    camera.orthoHeight = 375;
    view.setDesignResolutionSize(1334, 750, ResolutionPolicy.SHOW_ALL);
    game.frameRate = 60;
    macro.ENABLE_MULTI_TOUCH = false;
    profiler.hideStats();
  }

  /** 箭头函数固定 this，作为 game.on/off 的同一个函数引用。 */
  private readonly handleApplicationEnteredBackground = (): void => {
    this.audioService?.pauseForBackground();
  };

  /** 回到前台时恢复音频，并在连接已断的情况下走带 Room 快照恢复的重连。 */
  private readonly handleApplicationReturnedToForeground = (): void => {
    this.audioService?.resumeAfterForeground();
    this.authenticatedTransport?.restoreAuthenticatedConnection().catch((reconnectError) => {
      this.uiMessageService?.showTransientMessage(normalizeErrorMessage(reconnectError));
    });
  };
}

function normalizeErrorMessage(error: unknown): string {
  // catch 的值在 TS 中可能不是 Error；统一转成可显示文字。
  return error instanceof Error ? error.message : String(error);
}
