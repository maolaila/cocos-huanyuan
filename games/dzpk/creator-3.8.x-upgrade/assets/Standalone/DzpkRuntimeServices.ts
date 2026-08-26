import { DzpkAudioService } from './DzpkAudioService';
import { DzpkEventBus } from './DzpkEventBus';
import { GameContext } from './GameContext';
import { GameHubAuthenticatedTransport } from './GameHubAuthenticatedTransport';
import { DzpkResourceLoader } from './DzpkResourceLoader';
import { SourceProtocolAdapter } from './SourceProtocolAdapter';
import { DzpkUiMessageService } from './DzpkUiMessageService';
import { DzpkViewNavigator } from './DzpkViewNavigator';

export interface DzpkRuntimeServices {
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

/** Explicit replacement for the 2.4 global w* service bag. */
export function installDzpkRuntimeServices(services: DzpkRuntimeServices): void {
  if (activeRuntimeServices) throw new Error('DZPK runtime services are already installed');
  activeRuntimeServices = services;
}

export function requireDzpkRuntimeServices(): DzpkRuntimeServices {
  if (!activeRuntimeServices) throw new Error('DZPK runtime services are not installed');
  return activeRuntimeServices;
}

export function clearDzpkRuntimeServices(): void {
  activeRuntimeServices = null;
}
