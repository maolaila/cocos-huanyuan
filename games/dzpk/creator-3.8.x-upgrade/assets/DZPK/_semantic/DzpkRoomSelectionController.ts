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

/** Creator 3.8 equivalent of the original three-room selection component. */
@ccclass('DzpkRoomSelectionController')
export class DzpkRoomSelectionController extends Component {
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

  protected onLoad(): void {
    this.initializeOriginalRoomSelection();
  }

  protected onEnable(): void {
    this.refreshRoomSelectionWhenEnabled();
  }

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

  private handleLocalSourceEvent(sourceEventName: string): void {
    if (sourceEventName !== VIEWER_BALANCE_CHANGED_EVENT) return;
    this.renderViewerWalletLabels();
  }

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

  private hideRoomSelectionAfterTableSnapshot(): void {
    const { gameContext } = requireDzpkRuntimeServices();
    this.roomEntryPending = false;
    if (this.node.parent) this.node.parent.active = false;
    if (!gameContext.isReconnect) return;
    gameContext.isReconnect = false;
    // Keep the original Room prefab available for Msg_DZPK_Out navigation.
    // A reconnect snapshot hides the same room tree; destroying it leaves only
    // the gray boot Canvas when the player later returns from the table.
  }

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

  public handleRoomChoiceButtonPressed(clickedButton: Button): void {
    requireDzpkRuntimeServices().audioService.playButtonSound();
    const selectedRoomLevel = Number(clickedButton.node.name) + 1;
    this.requestOriginalRoomEntry(selectedRoomLevel);
  }

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
  if (!value) throw new Error(`DzpkRoomSelectionController.${propertyName} is not bound`);
  return value;
}

function requireUiOpacity(targetNode: Node): UIOpacity {
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
