import { AudioSource, Node, sys } from 'cc';
import { DzpkResourceLoader } from './DzpkResourceLoader';

interface PendingMusicRequest {
  readonly musicPath: string;
  readonly shouldLoop: boolean;
}

/** Creator 3.8 AudioSource owner retaining original DZPK audio paths. */
export class DzpkAudioService {
  private readonly musicSource: AudioSource;
  private readonly effectSource: AudioSource;
  private browserAudioUnlocked = !sys.isBrowser;
  private pendingMusicRequest: PendingMusicRequest | null = null;

  public constructor(hostNode: Node, private readonly resourceLoader: DzpkResourceLoader) {
    const musicNode = new Node('DzpkBackgroundMusic');
    musicNode.parent = hostNode;
    this.musicSource = musicNode.addComponent(AudioSource);
    this.musicSource.volume = readStoredVolume('MusicVolume');

    const effectNode = new Node('DzpkSoundEffects');
    effectNode.parent = hostNode;
    this.effectSource = effectNode.addComponent(AudioSource);
    this.effectSource.volume = readStoredVolume('SoundVolume');
    this.installBrowserAudioGestureGate();
  }

  public playBackgroundMusic(musicPath: string, shouldLoop = true): void {
    if (!this.browserAudioUnlocked) {
      this.pendingMusicRequest = { musicPath, shouldLoop };
      return;
    }
    this.resourceLoader.loadOriginalAudioClip(musicPath).then((clip) => {
      this.musicSource.stop();
      this.musicSource.clip = clip;
      this.musicSource.loop = shouldLoop;
      this.musicSource.play();
    }).catch((audioError) => console.warn('[DZPK audio]', audioError));
  }

  public playSound(soundPath: string, shouldLoop = false): void {
    if (!this.browserAudioUnlocked) return;
    this.resourceLoader.loadOriginalAudioClip(soundPath).then((clip) => {
      if (shouldLoop) {
        this.effectSource.stop();
        this.effectSource.clip = clip;
        this.effectSource.loop = true;
        this.effectSource.play();
        return;
      }
      this.effectSource.playOneShot(clip, this.effectSource.volume);
    }).catch((audioError) => console.warn('[DZPK audio]', audioError));
  }

  public playButtonSound(): void {
    this.playSound('sound/button');
  }

  public playCloseSound(): void {
    this.playSound('sound/button');
  }

  public stopAllEffects(): void {
    this.effectSource.stop();
  }

  public setSoundVolume(volume: number): void {
    this.effectSource.volume = clampVolume(volume);
    sys.localStorage.setItem('SoundVolume', String(this.effectSource.volume));
  }

  public setMusicVolume(volume: number): void {
    this.musicSource.volume = clampVolume(volume);
    sys.localStorage.setItem('MusicVolume', String(this.musicSource.volume));
  }

  public getSoundVolume(): number {
    return this.effectSource.volume;
  }

  public getMusicVolume(): number {
    return this.musicSource.volume;
  }

  public pauseForBackground(): void {
    this.musicSource.pause();
    this.effectSource.pause();
  }

  public resumeAfterForeground(): void {
    if (!this.browserAudioUnlocked) return;
    this.musicSource.play();
    if (this.effectSource.loop) this.effectSource.play();
  }

  private installBrowserAudioGestureGate(): void {
    if (!sys.isBrowser) return;
    const unlockAudio = (): void => {
      if (this.browserAudioUnlocked) return;
      this.browserAudioUnlocked = true;
      window.removeEventListener('pointerdown', unlockAudio, true);
      window.removeEventListener('touchend', unlockAudio, true);
      window.removeEventListener('keydown', unlockAudio, true);
      const pendingMusicRequest = this.pendingMusicRequest;
      this.pendingMusicRequest = null;
      if (pendingMusicRequest) {
        this.playBackgroundMusic(pendingMusicRequest.musicPath, pendingMusicRequest.shouldLoop);
      }
    };
    window.addEventListener('pointerdown', unlockAudio, true);
    window.addEventListener('touchend', unlockAudio, true);
    window.addEventListener('keydown', unlockAudio, true);
  }
}

function readStoredVolume(storageKey: string): number {
  const storedValue = Number(sys.localStorage.getItem(storageKey));
  if (!Number.isFinite(storedValue)) return 1;
  return clampVolume(storedValue);
}

function clampVolume(volume: number): number {
  return Math.max(0, Math.min(1, Number(volume) || 0));
}
