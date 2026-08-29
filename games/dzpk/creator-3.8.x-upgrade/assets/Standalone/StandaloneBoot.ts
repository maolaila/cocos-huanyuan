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

/** Creator 3.8 entry component; visible UI remains original DZPK Prefabs. */
@ccclass('DzpkStandaloneBoot')
export class DzpkStandaloneBoot extends Component {
  @property(Label)
  public messageLabel: Label | null = null;

  private audioService: DzpkAudioService | null = null;
  private uiMessageService: DzpkUiMessageService | null = null;
  private authenticatedTransport: GameHubAuthenticatedTransport | null = null;

  protected onLoad(): void {
    this.configureOriginalLandscapeCanvas();
    game.on(Game.EVENT_HIDE, this.handleApplicationEnteredBackground, this);
    game.on(Game.EVENT_SHOW, this.handleApplicationReturnedToForeground, this);
    void this.initializeStandaloneGameContext();
  }

  protected onDestroy(): void {
    game.off(Game.EVENT_HIDE, this.handleApplicationEnteredBackground, this);
    game.off(Game.EVENT_SHOW, this.handleApplicationReturnedToForeground, this);
    this.authenticatedTransport?.closeAuthenticatedConnection();
    clearDzpkRuntimeServices();
  }

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

  private readonly handleApplicationEnteredBackground = (): void => {
    this.audioService?.pauseForBackground();
  };

  private readonly handleApplicationReturnedToForeground = (): void => {
    this.audioService?.resumeAfterForeground();
    this.authenticatedTransport?.restoreAuthenticatedConnection().catch((reconnectError) => {
      this.uiMessageService?.showTransientMessage(normalizeErrorMessage(reconnectError));
    });
  };
}

function normalizeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
