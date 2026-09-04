/**
 * 学习导读：这是原三房间大厅的控制器，负责显示玩家资料/钱包、渲染服务端房间档位、快速开始、
 * 进入牌桌以及 Room 层的退出。它不创建新房间卡，也不决定筹码和牌局。
 *
 * Cocos API 速查：
 * - `@property(Node/Sprite/Label)`：原 Room Prefab 在 Inspector 中绑定的节点/组件，字段名不可随意改。
 * - `Button.EventType.CLICK` 与 `node.on/off`：代码方式绑定/解绑三张动态房间卡点击。
 * - `find(path, root)`：按原 Prefab 相对路径查人物节点。
 * - `tween/Vec3`：播放工具栏、人物和卡片的原入场位移动画。
 * - `UIOpacity`：配合位置 Tween 做淡入；`active=false` 则完全停止显示和交互。
 * - `onEnable`：同一个 Room 节点从牌桌返回后重新 active 时再次执行，适合刷新余额和入场动画。
 */
import {
  Button,
  Component,
  Event,
  Label,
  Node,
  Sprite,
  UIOpacity,
  Vec3,
  _decorator,
  find,
  tween,
} from 'cc';
import { EventSubscription } from '../../Standalone/DzpkEventBus';
import { requireDzpkRuntimeServices } from '../../Standalone/DzpkRuntimeServices';
import { SourceEnvelope } from '../../Standalone/SourceProtocolAdapter';
import {
  applyDzpkAmountLabel,
  applyNodeOpacity,
  constrainSingleLineLabel,
  fitSourceDisplayName,
  setOriginalAvatar,
} from '../../Standalone/DzpkUiHelpers';

const { ccclass, property } = _decorator;
const LOCAL_SOURCE_EVENT = 'local_Event';
const VIEWER_BALANCE_CHANGED_EVENT = 'up_Gold';
const SOURCE_ENTER_ROOM_EVENT = 'Msg_Hall_EnterRoom';
const SOURCE_FINISH_LOAD_EVENT = 'Msg_Hall_FinishLoad';
const SOURCE_ROOM_INFORMATION_EVENT = 'Msg_DZPK_RoomInfo';
const ORIGINAL_RULE_PREFAB_PATH = 'prefab/Rule';
const ROOM_ENTRY_TIMEOUT_SECONDS = 20;

interface RoomConfiguration {
  level: number;
  min_gold: number;
  max_gold?: number;
  doublescore?: number;
  vals?: { ante?: number };
}

/** Creator 3.8 版原三房间选择组件。 */
@ccclass('DzpkRoomSelectionController')
export class DzpkRoomSelectionController extends Component {
  // 下面字段均由官方导入后的原 Room Prefab 序列化绑定；不要改名或换成运行时重绘节点。
  @property(Node) public roomChoiceContainer: Node | null = null;
  @property(Node) public topToolbarNode: Node | null = null;
  @property(Node) public bottomPlayerPanelNode: Node | null = null;
  @property(Sprite) public viewerAvatarSprite: Sprite | null = null;
  @property(Label) public viewerNicknameLabel: Label | null = null;
  @property(Label) public viewerGoldLabel: Label | null = null;
  @property(Label) public viewerBankGoldLabel: Label | null = null;

  private roomEntryPending = false;
  private exitRequested = false;
  private readonly sourceSubscriptions: EventSubscription[] = [];

  /** 首次实例化时订阅事件、绑定房间卡，并根据是否重连选择入口。 */
  protected onLoad(): void {
    this.initializeOriginalRoomSelection();
  }

  /** 每次 Room 重新显示时刷新可能已结算变化的钱包，并重播原入场动画。 */
  protected onEnable(): void {
    this.refreshRoomSelectionWhenEnabled();
  }

  /** 成对清理 EventBus 和 Button 监听，避免再次实例化 Room 时一次点击发送多次进房请求。 */
  protected onDestroy(): void {
    const { eventBus } = requireDzpkRuntimeServices();
    this.sourceSubscriptions.forEach((subscription) => {
      eventBus.unsubscribeSourceEvent(subscription);
    });
    this.sourceSubscriptions.length = 0;
    this.roomChoiceContainer?.children?.forEach((roomChoiceNode) => {
      roomChoiceNode.off(Button.EventType.CLICK, this.handleRoomChoiceButtonPressed, this);
    });
  }

  /** 建立 Room 的 source 事件桥；重连时先创建牌桌，等待 RoomInfo 快照恢复画面。 */
  private initializeOriginalRoomSelection(): void {
    const { eventBus, gameContext } = requireDzpkRuntimeServices();
    this.roomEntryPending = false;
    this.exitRequested = false;
    this.sourceSubscriptions.push(eventBus.subscribeSourceEvent(
      LOCAL_SOURCE_EVENT,
      (eventName) => this.handleLocalSourceEvent(String(eventName)),
      this,
    ));
    this.sourceSubscriptions.push(eventBus.subscribeSourceEvent(
      SOURCE_ROOM_INFORMATION_EVENT,
      () => this.hideRoomSelectionAfterTableSnapshot(),
      this,
    ));
    if (gameContext.isReconnect) void this.instantiateOriginalMainTable();
    else this.initializeOriginalRoomCardsAndViewerPanel();
  }

  private refreshRoomSelectionWhenEnabled(): void {
    const { gameContext } = requireDzpkRuntimeServices();
    if (gameContext.isReconnect) return;
    this.renderViewerWalletLabels();
    this.playOriginalRoomEntranceAnimation();
  }

  /** 处理旧 `local_Event/up_Gold`，让返回 Room 后仍沿用原余额刷新调用链。 */
  private handleLocalSourceEvent(sourceEventName: string): void {
    if (sourceEventName !== VIEWER_BALANCE_CHANGED_EVENT) return;
    this.renderViewerWalletLabels();
  }

  /**
   * 按服务端真正返回的 roomConfig 绑定现有房间卡；头像从原 Hall 图集加载，昵称/钱包写回原 Label。
   */
  private initializeOriginalRoomCardsAndViewerPanel(): void {
    const { gameContext } = requireDzpkRuntimeServices();
    const roomChoiceContainer = requireProperty(this.roomChoiceContainer, 'roomChoiceContainer');
    Object.keys(gameContext.roomConfig).forEach((roomLevelKey) => {
      const roomChoiceNode = roomChoiceContainer.getChildByName(String(Number(roomLevelKey) - 1));
      roomChoiceNode?.on(Button.EventType.CLICK, this.handleRoomChoiceButtonPressed, this);
    });
    this.renderRoomConfigurationLabels();
    if (this.viewerAvatarSprite) {
      void setOriginalAvatar(this.viewerAvatarSprite, gameContext.getKey('headimgurl'));
    }
    if (this.viewerNicknameLabel) {
      constrainSingleLineLabel(this.viewerNicknameLabel);
      this.viewerNicknameLabel.string = fitSourceDisplayName(
        gameContext.getKey('nickname'),
        14,
      );
    }
    this.renderViewerWalletLabels();
  }

  /**
   * 钱包只做显示格式化：CNY 保留原数字风格，USD/VND 在过长时用单位和符号；原始值不被修改。
   */
  private renderViewerWalletLabels(): void {
    const { gameContext } = requireDzpkRuntimeServices();
    if (this.viewerGoldLabel) {
      applyDzpkAmountLabel(
        this.viewerGoldLabel,
        gameContext.getKey('gold'),
        gameContext.currency,
        {
          maxCharacters: 9,
          groupedWallet: true,
          includeCurrencySymbol: true,
          bitmapFontProfile: 'DIGITS_AND_COMMA',
          shrinkToFit: false,
          systemFontScale: 0.9,
        },
      );
    }
    if (this.viewerBankGoldLabel) {
      applyDzpkAmountLabel(
        this.viewerBankGoldLabel,
        gameContext.getKey('bank'),
        gameContext.currency,
        {
          maxCharacters: 9,
          groupedWallet: true,
          includeCurrencySymbol: true,
          bitmapFontProfile: 'DIGITS_AND_COMMA',
          shrinkToFit: false,
          systemFontScale: 0.9,
        },
      );
    }
  }

  /**
   * 把已发布 roomConfig 投影到三张原房间卡的盲注、准入和最大携带 Label。
   * 对原 CNY 图片字已经正确表达的两个最大携带值保持不动，避免系统字体覆盖原美术字。
   */
  private renderRoomConfigurationLabels(): void {
    const { gameContext } = requireDzpkRuntimeServices();
    const roomChoiceContainer = requireProperty(this.roomChoiceContainer, 'roomChoiceContainer');
    Object.values(gameContext.roomConfig).forEach((configurationValue) => {
      const configuration = configurationValue as RoomConfiguration;
      const roomChoiceNode = roomChoiceContainer.getChildByName(String(configuration.level - 1));
      if (!roomChoiceNode) return;
      const smallBlindAmount = Number(configuration.doublescore) || 0;
      this.renderRoomCardAmount(roomChoiceNode, 'room_xz', smallBlindAmount, 5);
      this.renderRoomCardAmount(roomChoiceNode, 'room_xz copy', smallBlindAmount * 2, 5);

      const minimumEntryLabel = roomChoiceNode.getChildByName('room_zr')?.getComponent(Label);
      if (minimumEntryLabel) {
        applyDzpkAmountLabel(minimumEntryLabel, configuration.min_gold, gameContext.currency, {
          maxCharacters: 5,
          sourceTenThousandDecimals: 0,
          sourceHundredMillionDecimals: 0,
          bitmapFontProfile: 'CNY_INTEGER_UNITS',
          systemFontScale: 0.88,
        });
      }

      const maximumCarryLabel = roomChoiceNode.getChildByName('3')?.getComponent(Label);
      if (!maximumCarryLabel || !configuration.max_gold) return;
      if (shouldKeepOriginalMaximumCarryLabel(
        gameContext.currency,
        configuration.level,
        Number(configuration.max_gold),
      )) {
        return;
      }
      applyDzpkAmountLabel(maximumCarryLabel, configuration.max_gold, gameContext.currency, {
        maxCharacters: 5,
        sourceTenThousandDecimals: 0,
        sourceHundredMillionDecimals: 0,
        bitmapFontProfile: 'NONE',
        systemFontScale: 0.76,
      });
    });
  }

  /** 在指定房间卡的原 Label 中显示一个档位金额；找不到节点或金额无效时不伪造替代 UI。 */
  private renderRoomCardAmount(
    roomChoiceNode: Node,
    labelNodeName: string,
    amount: number,
    maxCharacters: number,
  ): void {
    const label = roomChoiceNode.getChildByName(labelNodeName)?.getComponent(Label);
    if (!label || amount <= 0) return;
    applyDzpkAmountLabel(
      label,
      amount,
      requireDzpkRuntimeServices().gameContext.currency,
      {
        maxCharacters,
        sourceTenThousandDecimals: 0,
        sourceHundredMillionDecimals: 0,
        bitmapFontProfile: 'CNY_INTEGER_UNITS',
        systemFontScale: 0.88,
      },
    );
  }

  /**
   * 只有收到权威 RoomInfo 后才隐藏 Room。重连路径必须保留原 Room 实例供之后 Out 返回，不能销毁。
   */
  private hideRoomSelectionAfterTableSnapshot(): void {
    const { gameContext } = requireDzpkRuntimeServices();
    this.roomEntryPending = false;
    if (this.node.parent) this.node.parent.active = false;
    if (!gameContext.isReconnect) return;
    gameContext.isReconnect = false;
    // 此处刻意没有 destroy：若销毁，稍后 Msg_DZPK_Out 只能回到灰色 Boot Canvas。
  }

  /** 使用三个并行 Tween 恢复顶部栏、荷官人物和房间卡从屏幕外滑入并淡入的原效果。 */
  private playOriginalRoomEntranceAnimation(): void {
    const topToolbarNode = requireProperty(this.topToolbarNode, 'topToolbarNode');
    const roomChoiceContainer = requireProperty(this.roomChoiceContainer, 'roomChoiceContainer');
    topToolbarNode.setPosition(0, 500);
    tween(topToolbarNode)
      .delay(0.15)
      .to(0.2, { position: new Vec3(0, 375, 0) }, { easing: 'quadOut' })
      .start();

    const roomCharacterNode = find('main/spine', this.node);
    if (roomCharacterNode) {
      roomCharacterNode.setPosition(-585, roomCharacterNode.position.y);
      applyNodeOpacity(roomCharacterNode, 0);
      tween(roomCharacterNode)
        .to(0.2, { position: new Vec3(-435, -370.37, 0) }, { easing: 'quadOut' })
        .start();
      tween(requireUiOpacity(roomCharacterNode)).to(0.3, { opacity: 255 }).start();
    }

    roomChoiceContainer.setPosition(265, roomChoiceContainer.position.y);
    applyNodeOpacity(roomChoiceContainer, 0);
    tween(roomChoiceContainer)
      .to(0.2, { position: new Vec3(115, 0, 0) }, { easing: 'quadOut' })
      .start();
    tween(requireUiOpacity(roomChoiceContainer)).to(0.3, { opacity: 255 }).start();
  }

  /** EnterRoom 成功后保存 rid 并实例化桌面；失败则释放请求锁并留在 Room。 */
  private handleOriginalEnterRoomEnvelope(enterRoomEnvelope: SourceEnvelope): void {
    const { gameContext, uiMessageService } = requireDzpkRuntimeServices();
    if (enterRoomEnvelope.status !== 1 || !enterRoomEnvelope.data) {
      this.roomEntryPending = false;
      gameContext.applyRoomIdentifier(null);
      gameContext.isReconnect = false;
      uiMessageService.hideLoadingUI();
      return;
    }
    const payload = enterRoomEnvelope.data as { rid: string | number };
    gameContext.applyRoomIdentifier(payload.rid);
    void this.instantiateOriginalMainTable();
  }

  /**
   * 进房主入口：检查防重复锁、配置、最低筹码、维护状态，再按“先订阅响应、后发送请求”执行。
   * 20 秒超时只释放前端锁，不伪造进房成功；最终能否进入仍由 GameHub/source authority 决定。
   */
  public requestOriginalRoomEntry(selectedRoomLevel: number): void {
    const { authenticatedTransport, eventBus, gameContext, uiMessageService } =
      requireDzpkRuntimeServices();
    if (this.roomEntryPending) return;
    gameContext.roomLevel = selectedRoomLevel;
    const selectedRoomConfiguration = gameContext.roomConfig[
      String(selectedRoomLevel)
    ] as RoomConfiguration | undefined;
    if (!selectedRoomConfiguration) {
      uiMessageService.showTips('游戏配置错误，请重新进入游戏！');
      return;
    }
    const viewerGoldAmount = Number(gameContext.getKey('gold')) || 0;
    if (selectedRoomConfiguration.min_gold > viewerGoldAmount) {
      uiMessageService.enterRoomFailTips(selectedRoomConfiguration.min_gold);
      return;
    }
    if (gameContext.gameRepair()) {
      uiMessageService.showTips('游戏维护中');
      return;
    }

    this.roomEntryPending = true;
    let enterRoomSubscription: EventSubscription | null = null;
    enterRoomSubscription = eventBus.subscribeSourceEvent(
      SOURCE_ENTER_ROOM_EVENT,
      (envelopeValue) => {
        eventBus.unsubscribeSourceEvent(enterRoomSubscription);
        enterRoomSubscription = null;
        this.unscheduleAllCallbacks();
        this.handleOriginalEnterRoomEnvelope(envelopeValue as SourceEnvelope);
      },
      this,
    );
    this.scheduleOnce(() => {
      if (!enterRoomSubscription) return;
      this.roomEntryPending = false;
      eventBus.unsubscribeSourceEvent(enterRoomSubscription);
      enterRoomSubscription = null;
    }, ROOM_ENTRY_TIMEOUT_SECONDS);
    authenticatedTransport.sendSourceEvent(SOURCE_ENTER_ROOM_EVENT, {
      tableid: 0,
      gtype: gameContext.gameID,
      level: selectedRoomLevel,
    });
  }

  /** 快速开始选择玩家当前能负担的最高房间等级，再复用同一个进房主入口。 */
  public startFastRoomEntry(): void {
    const { audioService, gameContext } = requireDzpkRuntimeServices();
    audioService.playButtonSound();
    const viewerGoldAmount = Number(gameContext.getKey('gold')) || 0;
    let highestAffordableRoomLevel = 1;
    Object.values(gameContext.roomConfig).forEach((configurationValue) => {
      const configuration = configurationValue as RoomConfiguration;
      if (configuration.min_gold <= viewerGoldAmount) {
        highestAffordableRoomLevel = configuration.level;
      }
    });
    this.requestOriginalRoomEntry(highestAffordableRoomLevel);
  }

  /** 原房间卡节点名为 0/1/2，转换成 source 房间等级 1/2/3。 */
  public handleRoomChoiceButtonPressed(clickedButton: Button): void {
    requireDzpkRuntimeServices().audioService.playButtonSound();
    const selectedRoomLevel = Number(clickedButton.node.name) + 1;
    this.requestOriginalRoomEntry(selectedRoomLevel);
  }

  /** 原 Prefab 顶部/底部按钮共用回调；桌外 exit 才真正结束独立游戏。 */
  public handleSerializedMenuAction(_buttonEvent: Event, sourceActionName: string): void {
    const { audioService, viewNavigator } = requireDzpkRuntimeServices();
    if (this.exitRequested) return;
    switch (sourceActionName) {
      case 'exit':
        this.exitRequested = true;
        audioService.playCloseSound();
        viewNavigator.requestStandaloneExit();
        return;
      case 'rule':
        void viewNavigator.displayOriginalPopupPrefab({ path: ORIGINAL_RULE_PREFAB_PATH });
        break;
      case 'bank':
        break;
      case 'faststart':
        this.startFastRoomEntry();
        break;
      default:
        return;
    }
    // Source fast-start intentionally plays once inside startFastRoomEntry and
    // once after the serialized menu action.
    audioService.playButtonSound();
  }

  /**
   * 先实例化原 DZPKMain，再发送 FinishLoad。这样服务端回 RoomInfo 时 Table 组件已经订阅好消息，
   * 不会因响应过快丢掉第一份权威快照。
   */
  private async instantiateOriginalMainTable(): Promise<void> {
    const { authenticatedTransport, gameContext, resourceLoader, viewNavigator } =
      requireDzpkRuntimeServices();
    viewNavigator.displayOriginalTablePrefab(
      await resourceLoader.loadOriginalPrefab(gameContext.getGame().prefabUrl),
    );
    // Original PokerBase.onLoad notifies Hall only after DZPKMain exists.
    authenticatedTransport.sendSourceEvent(SOURCE_FINISH_LOAD_EVENT, {
      rid: gameContext.roomID,
    });
  }
}

function requireProperty<T>(value: T | null, propertyName: string): T {
  // 把 Inspector 漏绑转换成带组件/字段名的明确错误。
  if (!value) throw new Error(`DzpkRoomSelectionController.${propertyName} is not bound`);
  return value;
}

function requireUiOpacity(targetNode: Node): UIOpacity {
  // 只在缺少时补 UIOpacity；已有组件可能保存了原 Prefab 参数，应优先复用。
  return targetNode.getComponent(UIOpacity) ?? targetNode.addComponent(UIOpacity);
}

function shouldKeepOriginalMaximumCarryLabel(
  currencyCode: string,
  roomLevel: number,
  maximumCarryAmount: number,
): boolean {
  const normalizedCurrency = currencyCode.toUpperCase();
  if (!['CNY', 'CNH', 'RMB'].includes(normalizedCurrency)) return false;
  return (roomLevel === 2 && maximumCarryAmount === 1_000_000)
    || (roomLevel === 3 && maximumCarryAmount === 5_000_000);
}
