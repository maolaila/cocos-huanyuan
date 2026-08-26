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

/** Creator 3.8 equivalent of the recovered DZPKLoad component. */
@ccclass('DzpkLoadingScreenController')
export class DzpkLoadingScreenController extends Component {
  private roomConfigurationSubscription: EventSubscription | null = null;

  protected onLoad(): void {
    void this.initializeOriginalLoadingFlow();
  }

  protected onDestroy(): void {
    const { eventBus } = requireDzpkRuntimeServices();
    eventBus.unsubscribeSourceEvent(this.roomConfigurationSubscription);
    this.roomConfigurationSubscription = null;
  }

  private async initializeOriginalLoadingFlow(): Promise<void> {
    const { audioService, gameContext } = requireDzpkRuntimeServices();
    audioService.playBackgroundMusic(gameContext.getGame().music);
    this.preloadOriginalEntryResources();
    await this.playOriginalLoadingIntroduction();
    this.continueAfterLoadingIntroduction();
  }

  private preloadOriginalEntryResources(): void {
    const { resourceLoader } = requireDzpkRuntimeServices();
    void resourceLoader.loadOriginalPrefab('prefab/DZPKMain');
    void resourceLoader.loadOriginalPrefab(ORIGINAL_ROOM_PREFAB_PATH);
  }

  private playOriginalLoadingIntroduction(): Promise<void> {
    const loadingMainNode = requireChild(this.node, 'main');
    const loadingSpineNode = requireChild(loadingMainNode, 'spine');
    playOriginalSpine(loadingSpineNode, 'start', false, () => {
      playOriginalSpine(loadingSpineNode, 'idle', true);
    });
    return new Promise((resolve) => this.scheduleOnce(() => resolve(), ORIGINAL_LOADING_INTRO_SECONDS));
  }

  private continueAfterLoadingIntroduction(): void {
    const { gameContext } = requireDzpkRuntimeServices();
    if (gameContext.isReconnect) {
      void this.instantiateOriginalRoomSelection();
      return;
    }
    this.requestOriginalRoomConfigurations();
  }

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

  private handleOriginalRoomConfigurationEnvelope(roomEnvelope: SourceEnvelope): void {
    const { gameContext, uiMessageService, viewNavigator } = requireDzpkRuntimeServices();
    if (roomEnvelope.status !== 1 || !roomEnvelope.data) {
      uiMessageService.showTips('请求游戏配置失败');
      viewNavigator.requestStandaloneExit();
      return;
    }
    gameContext.roomConfig = roomEnvelope.data as Record<string, unknown>;
    void this.instantiateOriginalRoomSelection();
  }

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
  const childNode = parentNode.getChildByName(childName);
  if (!childNode) throw new Error(`${parentNode.name} is missing child ${childName}`);
  return childNode;
}
