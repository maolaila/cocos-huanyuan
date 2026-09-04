/**
 * 学习导读：原 Load Prefab 的入口控制器。它先播放原 Spine 开场、预加载 Room/Table，再向服务端请求
 * 三房间配置，最后实例化原 Room Prefab。重连时跳过配置请求，因为会话上下文已经保存房间位置。
 *
 * Cocos API 速查：
 * - `Component.onLoad/onDestroy`：Load 实例出现/销毁时建立和清理事件监听。
 * - `instantiate(prefab)`：把已经加载的 Prefab 资源克隆成场景中的 Node。
 * - `scheduleOnce`：跟随组件生命周期延时；这里用于等待原开场动画的固定 0.7 秒和请求超时。
 * - `Node.parent/setSiblingIndex/destroy`：挂入 Room 容器、调整遮挡顺序、正常进入时移除 Load。
 */
import { Component, Node, _decorator, instantiate } from 'cc';
import { EventSubscription } from '../../Standalone/DzpkEventBus';
import { requireDzpkRuntimeServices } from '../../Standalone/DzpkRuntimeServices';
import { SourceEnvelope } from '../../Standalone/SourceProtocolAdapter';
import { playOriginalSpine } from '../../Standalone/DzpkUiHelpers';

const { ccclass } = _decorator;
const SOURCE_ROOM_CONFIGURATION_EVENT = 'Msg_Hall_GameSessions';
const ORIGINAL_ROOM_PREFAB_PATH = 'prefab/Room';
const ORIGINAL_LOADING_INTRO_SECONDS = 0.7;
const ROOM_CONFIGURATION_TIMEOUT_SECONDS = 10;

/** 原 DZPKLoad 组件在 Creator 3.8 中的语义恢复版。 */
@ccclass('DzpkLoadingScreenController')
export class DzpkLoadingScreenController extends Component {
  private roomConfigurationSubscription: EventSubscription | null = null;

  /** Load 节点一进入场景就启动异步流程；用 void 表明生命周期本身不等待 Promise。 */
  protected onLoad(): void {
    void this.initializeOriginalLoadingFlow();
  }

  /** 无论正常进入还是提前退出，都退订并清空引用，避免迟到配置回调访问已销毁节点。 */
  protected onDestroy(): void {
    const { eventBus } = requireDzpkRuntimeServices();
    eventBus.unsubscribeSourceEvent(this.roomConfigurationSubscription);
    this.roomConfigurationSubscription = null;
  }

  /** 严格保持“音乐/预加载 -> 开场 -> 配置或重连”的原入口顺序。 */
  private async initializeOriginalLoadingFlow(): Promise<void> {
    const { audioService, gameContext } = requireDzpkRuntimeServices();
    audioService.playBackgroundMusic(gameContext.getGame().music);
    this.preloadOriginalEntryResources();
    await this.playOriginalLoadingIntroduction();
    this.continueAfterLoadingIntroduction();
  }

  /** 提前发起 Prefab IO，但不阻塞 Spine 开场；真正使用时资源加载器会复用缓存。 */
  private preloadOriginalEntryResources(): void {
    const { resourceLoader } = requireDzpkRuntimeServices();
    void resourceLoader.loadOriginalPrefab('prefab/DZPKMain');
    void resourceLoader.loadOriginalPrefab(ORIGINAL_ROOM_PREFAB_PATH);
  }

  /** 播放 `start` 一次后切到循环 `idle`，并把原固定时长转换成可 await 的 Promise。 */
  private playOriginalLoadingIntroduction(): Promise<void> {
    const loadingMainNode = requireChild(this.node, 'main');
    const loadingSpineNode = requireChild(loadingMainNode, 'spine');
    playOriginalSpine(loadingSpineNode, 'start', false, () => {
      playOriginalSpine(loadingSpineNode, 'idle', true);
    });
    return new Promise((resolve) => this.scheduleOnce(() => resolve(), ORIGINAL_LOADING_INTRO_SECONDS));
  }

  /** 重连已有房间上下文时直接恢复 Room/Table 路径；新启动才请求可用房间配置。 */
  private continueAfterLoadingIntroduction(): void {
    const { gameContext } = requireDzpkRuntimeServices();
    if (gameContext.isReconnect) {
      void this.instantiateOriginalRoomSelection();
      return;
    }
    this.requestOriginalRoomConfigurations();
  }

  /**
   * 先订阅响应，再发送 `Msg_Hall_GameSessions`，避免极快响应先于监听注册。
   * 成功和 10 秒超时都会清理 subscription；超时后退出，不能拿自造默认房间继续真钱游戏。
   */
  private requestOriginalRoomConfigurations(): void {
    const { eventBus, authenticatedTransport, gameContext, uiMessageService, viewNavigator } =
      requireDzpkRuntimeServices();
    this.roomConfigurationSubscription = eventBus.subscribeSourceEvent(
      SOURCE_ROOM_CONFIGURATION_EVENT,
      (envelopeValue) => {
        eventBus.unsubscribeSourceEvent(this.roomConfigurationSubscription);
        this.roomConfigurationSubscription = null;
        this.unscheduleAllCallbacks();
        this.handleOriginalRoomConfigurationEnvelope(envelopeValue as SourceEnvelope);
      },
      this,
    );
    this.scheduleOnce(() => {
      if (!this.roomConfigurationSubscription) return;
      eventBus.unsubscribeSourceEvent(this.roomConfigurationSubscription);
      this.roomConfigurationSubscription = null;
      uiMessageService.showTips('请求游戏配置失败');
      viewNavigator.requestStandaloneExit();
    }, ROOM_CONFIGURATION_TIMEOUT_SECONDS);
    authenticatedTransport.sendSourceEvent(SOURCE_ROOM_CONFIGURATION_EVENT, {
      gtype: gameContext.gameID,
    });
  }

  /** 只有 status=1 且 data 存在才进入 Room；失败显示原流程可理解的提示并结束会话。 */
  private handleOriginalRoomConfigurationEnvelope(roomEnvelope: SourceEnvelope): void {
    const { gameContext, uiMessageService, viewNavigator } = requireDzpkRuntimeServices();
    if (roomEnvelope.status !== 1 || !roomEnvelope.data) {
      uiMessageService.showTips('请求游戏配置失败');
      viewNavigator.requestStandaloneExit();
      return;
    }
    gameContext.applyRoomConfiguration(roomEnvelope.data as Record<string, unknown>);
    void this.instantiateOriginalRoomSelection();
  }

  /**
   * 把原 Room Prefab 放进 Load 所在的容器。普通进入销毁 Load；重连暂时保留 Load 并把它调到后面，
   * 等 RoomInfo/Table 完整恢复后由导航逻辑精确管理，避免出现灰 Canvas。
   */
  private async instantiateOriginalRoomSelection(): Promise<void> {
    const { gameContext, resourceLoader } = requireDzpkRuntimeServices();
    const roomContainerNode = this.node.parent;
    if (!roomContainerNode) throw new Error('Load Prefab is not inside the Room container');
    const originalRoomNode = instantiate(
      await resourceLoader.loadOriginalPrefab(ORIGINAL_ROOM_PREFAB_PATH),
    );
    originalRoomNode.parent = roomContainerNode;
    roomContainerNode.active = true;
    if (gameContext.isReconnect) this.node.setSiblingIndex(roomContainerNode.children.length - 1);
    else this.node.destroy();
  }
}

function requireChild(parentNode: Node, childName: string): Node {
  // 原 Prefab 固定节点缺失属于恢复错误，应直接报出完整父/子名字。
  const childNode = parentNode.getChildByName(childName);
  if (!childNode) throw new Error(`${parentNode.name} is missing child ${childName}`);
  return childNode;
}
