/**
 * 学习导读：把原版背景音乐和音效统一放在两个 AudioSource 上管理。业务代码只传原资源路径，
 * 不需要知道浏览器自动播放限制、音量存储或“一次播放/循环播放”的差别。
 *
 * Cocos API 速查：
 * - `AudioSource`：挂在 Node 上的声音播放器；`clip` 是音频资源，`loop` 控制循环，`volume` 为 0–1。
 * - `playOneShot`：临时播放一段音效，不替换当前循环 clip，适合按钮声、筹码声等短音频。
 * - `Node.addComponent(AudioSource)`：运行时为专用音频节点安装播放器组件。
 * - `sys.isBrowser/localStorage`：判断是否为浏览器并跨平台保存音量偏好。
 * 浏览器还要求用户先点击/触摸/按键才能播放声音，所以本文件会暂存第一条背景音乐请求。
 */
import { AudioSource, Node, sys } from 'cc';
import { DzpkResourceLoader } from './DzpkResourceLoader';

interface PendingMusicRequest {
  readonly musicPath: string;
  readonly shouldLoop: boolean;
}

/** Creator 3.8 音频服务；继续使用原 DZPK 音频路径和播放场景。 */
export class DzpkAudioService {
  private readonly musicSource: AudioSource;
  private readonly effectSource: AudioSource;
  private browserAudioUnlocked = !sys.isBrowser;
  private pendingMusicRequest: PendingMusicRequest | null = null;

  /** 在 Boot 节点下创建音乐、音效两个子节点，二者可独立调音量和暂停。 */
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

  /** 异步加载并播放背景音乐；在浏览器尚未解锁音频时先记住请求。 */
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

  /**
   * 播放音效。循环音效占用 effectSource 的主 clip；普通短音效使用 `playOneShot`，互不抢 clip。
   */
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

  /** 页面切换/结算清理时停止当前效果声，背景音乐继续。 */
  public stopAllEffects(): void {
    this.effectSource.stop();
  }

  /** 写入 0–1 音效音量，并保存到本机供下次启动使用。 */
  public setSoundVolume(volume: number): void {
    this.effectSource.volume = clampVolume(volume);
    sys.localStorage.setItem('SoundVolume', String(this.effectSource.volume));
  }

  /** 写入 0–1 音乐音量，并保存到本机供下次启动使用。 */
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

  /** 浏览器页/应用进入后台时暂停，避免后台继续发声。 */
  public pauseForBackground(): void {
    this.musicSource.pause();
    this.effectSource.pause();
  }

  /** 回到前台后只恢复此前应当播放的音乐和循环音效。 */
  public resumeAfterForeground(): void {
    if (!this.browserAudioUnlocked) return;
    this.musicSource.play();
    if (this.effectSource.loop) this.effectSource.play();
  }

  /**
   * 安装一次性的浏览器手势门。捕获阶段（第三个参数 true）尽早收到用户第一次操作；解锁后马上
   * 移除三个 DOM 监听，避免每次点击都重复执行，并补播启动阶段被暂存的背景音乐。
   */
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
  // 没有合法存储值时默认满音量；所有入口最终都经过 clampVolume。
  const storedValue = Number(sys.localStorage.getItem(storageKey));
  if (!Number.isFinite(storedValue)) return 1;
  return clampVolume(storedValue);
}

function clampVolume(volume: number): number {
  // AudioSource.volume 允许的业务范围是 0–1，异常或 NaN 按 0 处理。
  return Math.max(0, Math.min(1, Number(volume) || 0));
}
