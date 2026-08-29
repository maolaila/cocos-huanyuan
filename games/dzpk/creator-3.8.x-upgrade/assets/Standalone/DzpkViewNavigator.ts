import { Node, Prefab, instantiate } from 'cc';
import { DzpkAudioService } from './DzpkAudioService';
import { DzpkEventBus } from './DzpkEventBus';
import { GameContext } from './GameContext';
import { GameHubAuthenticatedTransport } from './GameHubAuthenticatedTransport';
import { DzpkResourceLoader } from './DzpkResourceLoader';
import { DzpkUiMessageService } from './DzpkUiMessageService';

export interface PopupRequest {
  path: 'prefab/Rule' | 'prefab/Set';
}

/** Hall-free navigation that still instantiates only original DZPK Prefabs. */
export class DzpkViewNavigator {
  private readonly roomRootNode: Node;
  private readonly gameRootNode: Node;
  private readonly popupRootNode: Node;
  private authenticatedTransport: GameHubAuthenticatedTransport | null = null;

  public constructor(
    private readonly canvasNode: Node,
    private readonly resourceLoader: DzpkResourceLoader,
    private readonly gameContext: GameContext,
    private readonly eventBus: DzpkEventBus,
    private readonly audioService: DzpkAudioService,
    private readonly uiMessageService: DzpkUiMessageService,
  ) {
    this.roomRootNode = requireChild(canvasNode, 'Room');
    this.gameRootNode = requireChild(canvasNode, 'Game');
    this.popupRootNode = requireChild(canvasNode, 'UIShow');
  }

  public setAuthenticatedTransport(transport: GameHubAuthenticatedTransport): void {
    this.authenticatedTransport = transport;
  }

  public async initializeOriginalDzpkPrefabs(): Promise<void> {
    const loadPrefab = await this.resourceLoader.loadOriginalPrefab('prefab/Load');
    this.roomRootNode.destroyAllChildren();
    const loadPrefabNode = instantiate(loadPrefab);
    loadPrefabNode.parent = this.roomRootNode;
    this.roomRootNode.active = true;
    this.gameRootNode.active = false;
  }

  public displayOriginalTablePrefab(tablePrefab: Prefab): void {
    this.gameRootNode.destroyAllChildren();
    instantiate(tablePrefab).parent = this.gameRootNode;
    this.gameRootNode.active = true;
  }

  public async displayOriginalPopupPrefab(popupRequest: PopupRequest): Promise<void> {
    if (!popupRequest || !/^prefab\/(Rule|Set)$/.test(popupRequest.path)) {
      throw new Error('Only the original Rule and Set prefabs are available');
    }
    try {
      instantiate(await this.resourceLoader.loadOriginalPrefab(popupRequest.path)).parent =
        this.popupRootNode;
    } catch (popupError) {
      this.uiMessageService.showTips(normalizeErrorMessage(popupError));
    }
  }

  public returnToRoomFromTable(viewerGoldAmount?: string): void {
    this.audioService.stopAllEffects();
    this.popupRootNode.destroyAllChildren();
    if (viewerGoldAmount !== undefined) this.gameContext.setKey('gold', viewerGoldAmount);
    this.gameRootNode.destroyAllChildren();
    this.gameRootNode.active = false;
    this.roomRootNode.active = true;
    // RoomInfo hides the original Room prefab while the table is visible.
    // Reactivating only the container leaves an empty gray canvas.
    this.roomRootNode.children.forEach((roomChildNode) => {
      roomChildNode.active = true;
    });
    this.eventBus.publishSourceEvent('local_Event', 'up_Gold');
  }

  public requestStandaloneExit(): void {
    this.authenticatedTransport?.endAuthenticatedSession();
    const targetOrigin = this.gameContext.postMessageTargetOrigin;
    if (window.parent !== window && targetOrigin) {
      window.parent.postMessage({ type: 'GAMEHUB_GAME_EXIT', gameCode: 'dzpk-955' }, targetOrigin);
      return;
    }
    this.uiMessageService.showTips('已退出德州扑克，可关闭当前页面');
  }
}

function requireChild(parentNode: Node, childName: string): Node {
  const childNode = parentNode.getChildByName(childName);
  if (!childNode) throw new Error(`Boot scene is missing required node: ${childName}`);
  return childNode;
}

function normalizeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
