/**
 * 学习导读：在同一个 Boot Scene 内切换原 Load、Room、DZPKMain、Rule、Set Prefab。这里是导航，
 * 不是 UI 重绘：每次显示的仍是官方导入后的原版 Prefab。
 *
 * Cocos API 速查：`instantiate(prefab)` 把 Prefab 资源变成可显示的 Node 实例；给 `node.parent` 赋值
 * 会把它挂进场景树；`destroyAllChildren()` 在页面切换时销毁旧实例；`active` 控制容器显隐。
 */
import { Node, Prefab, instantiate } from 'cc';
import { DzpkAudioService } from './DzpkAudioService';
import { DzpkEventBus } from './DzpkEventBus';
import { GameContext } from './GameContext';
import { GameHubAuthenticatedTransport } from './GameHubAuthenticatedTransport';
import { DzpkResourceLoader } from './DzpkResourceLoader';
import { DzpkUiMessageService } from './DzpkUiMessageService';
import { finishDzpkBrowserExit } from './DzpkBrowserExit';

export interface PopupRequest {
  path: 'prefab/Rule' | 'prefab/Set';
}

/** 不依赖旧大厅、但只实例化原 DZPK Prefab 的导航服务。 */
export class DzpkViewNavigator {
  private readonly roomRootNode: Node;
  private readonly gameRootNode: Node;
  private readonly popupRootNode: Node;
  private authenticatedTransport: GameHubAuthenticatedTransport | null = null;
  private exitPromise: Promise<boolean> | null = null;

  /** 从 Boot Canvas 取得三个固定容器；缺任何一个都说明 Scene 结构不完整。 */
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

  /** Boot 创建 transport 后回填，用于真正退出游戏时结束连接。 */
  public setAuthenticatedTransport(transport: GameHubAuthenticatedTransport): void {
    this.authenticatedTransport = transport;
  }

  /** 启动时先显示原 Load Prefab；它自己继续加载 Room 和房间配置。 */
  public async initializeOriginalDzpkPrefabs(): Promise<void> {
    const loadPrefab = await this.resourceLoader.loadOriginalPrefab('prefab/Load');
    this.roomRootNode.destroyAllChildren();
    const loadPrefabNode = instantiate(loadPrefab);
    loadPrefabNode.parent = this.roomRootNode;
    this.roomRootNode.active = true;
    this.gameRootNode.active = false;
  }

  /** 清掉旧桌面实例并挂入新的原 DZPKMain；Room 容器由 RoomInfo 事件负责隐藏。 */
  public displayOriginalTablePrefab(tablePrefab: Prefab): void {
    this.gameRootNode.destroyAllChildren();
    instantiate(tablePrefab).parent = this.gameRootNode;
    this.gameRootNode.active = true;
  }

  /**
   * 只允许白名单中的 Rule/Set，防止任意字符串变成资源加载路径；加载失败转成玩家能看到的提示。
   */
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

  /**
   * 收到服务端成功 Out 后回 Room。先停止桌面音效、清弹窗/桌面，再恢复 Room 子节点并刷新余额。
   * 重连时 Room 和 Load 可能同时留在容器内，只能激活名为 Room 的原 Prefab；激活 Load 会用启动图
   * 永久盖住房间。这也是为什么这里不能简单写 `roomRootNode.active = true` 就结束。
   */
  public returnToRoomFromTable(viewerGoldAmount?: string): void {
    this.audioService.stopAllEffects();
    this.popupRootNode.destroyAllChildren();
    if (viewerGoldAmount !== undefined) this.gameContext.setKey('gold', viewerGoldAmount);
    this.gameRootNode.destroyAllChildren();
    this.gameRootNode.active = false;
    this.roomRootNode.active = true;
    this.roomRootNode.children.forEach((roomChildNode) => {
      roomChildNode.active = roomChildNode.name === 'Room';
    });
    this.eventBus.publishSourceEvent('local_Event', 'up_Gold');
  }

  /**
   * Room 返回先等待服务端退出确认，然后关闭当前 TAB 或通知 iframe 宿主。
   * 加载失败等自动退出仍保留提示页；只有用户点击后退传 closePage，不因加载超时静默关页。
   */
  public requestStandaloneExit(options: { closePage?: boolean } = {}): Promise<boolean> {
    if (!this.exitPromise) {
      this.exitPromise = this.finishStandaloneExit(options.closePage === true).then((exited) => {
        if (!exited) this.exitPromise = null;
        return exited;
      });
    }
    return this.exitPromise;
  }

  private async finishStandaloneExit(closePage: boolean): Promise<boolean> {
    try {
      if (!this.authenticatedTransport) throw new Error('Authenticated transport is missing');
      const sessionId = await this.authenticatedTransport.endAuthenticatedSession();
      finishDzpkBrowserExit({ sessionId, parentOrigin: this.gameContext.postMessageTargetOrigin,
        closePage, showMessage: (message) => this.uiMessageService.showTips(message) });
      return true;
    } catch {
      this.uiMessageService.showTips('暂时无法退出，请重试');
      return false;
    }
  }
}

function requireChild(parentNode: Node, childName: string): Node {
  // 固定容器是 Scene 合同，找不到应立即指出名字，而不是创建一个相似替代节点。
  const childNode = parentNode.getChildByName(childName);
  if (!childNode) throw new Error(`Boot scene is missing required node: ${childName}`);
  return childNode;
}

function normalizeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
