/**
 * 学习导读：把原版背景音乐和音效统一放在两个 AudioSource 上管理。业务代码只传原资源路径，
 * 不需要知道浏览器自动播放限制、音量存储或“一次播放/循环播放”的差别。
 *
 * Cocos API 速查：
 * - `AudioSource`：挂在 Node 上的声音播放器；`clip` 是音频资源，`loop` 控制循环，`volume` 为 0–1。
 * - `playOneShot`：临时播放一段音效，不替换当前循环 clip，适合按钮声、筹码声等短音频。
 * - `Node.addComponent(AudioSource)`：运行时为专用音频节点安装播放器组件。
 * - `sys.isBrowser/localStorage`：判断是否为浏览器并跨平台保存音量偏好。
 * 浏览器还要求用户先点击/触摸/按键才能播放声音，所以本文件提前加载音乐并等待真实手势。
 */
import { AudioSource, Node, sys } from 'cc';
import type { DzpkResourceLoader } from './DzpkResourceLoader';

const AUDIO_GESTURES = ['touchend', 'pointerup', 'mousedown', 'keydown'] as const;

/** Creator 3.8 音频服务；继续使用原 DZPK 音频路径和播放场景。 */
export class DzpkAudioService {
  private readonly musicSource: AudioSource;
  private readonly effectSource: AudioSource;
  private browserAudioUnlocked = !sys.isBrowser;
  private musicRequestVersion = 0;
  private requestedMusic: { path: string; loop: boolean } | null = null;
  private musicLoading = false;
  private effectRequestVersion = 0;
  private musicEnded = false;
  private inBackground = false;
  private disposed = false;
  private readonly browserWindow = sys.isBrowser && typeof window !== 'undefined' ? window : null;

  /** 在 Boot 节点下创建音乐、音效两个子节点，二者可独立调音量和暂停。 */
  public constructor(hostNode: Node, private readonly resourceLoader: DzpkResourceLoader) {
    const musicNode = new Node('DzpkBackgroundMusic');
    musicNode.parent = hostNode;
    this.musicSource = musicNode.addComponent(AudioSource);
    this.musicSource.playOnAwake = false;
    this.musicSource.volume = readStoredVolume('MusicVolume');
    musicNode.on(AudioSource.EventType.STARTED, this.handleMusicStarted, this);
    musicNode.on(AudioSource.EventType.ENDED, this.handleMusicEnded, this);

    const effectNode = new Node('DzpkSoundEffects');
    effectNode.parent = hostNode;
    this.effectSource = effectNode.addComponent(AudioSource);
    this.effectSource.playOnAwake = false;
    this.effectSource.volume = readStoredVolume('SoundVolume');
    for (const event of AUDIO_GESTURES) this.browserWindow?.addEventListener(event, this.handleAudioGesture, true);
  }

  /** 先加载并绑定原音乐；真实手势到来时直接 play，避免把首次播放拖到下载完成之后。 */
  public playBackgroundMusic(musicPath: string, shouldLoop = true): void {
    if (this.disposed) return;
    this.musicRequestVersion++;
    this.requestedMusic = { path: musicPath, loop: shouldLoop };
    this.musicLoading = false;
    this.musicEnded = false;
    this.musicSource.stop();
    this.musicSource.clip = null;
    this.loadRequestedMusic();
  }

  /** 下载失败只影响声音；下一次手势可重试，同一音乐尚在下载时不叠加请求。 */
  private loadRequestedMusic(): void {
    if (this.disposed || this.musicLoading || !this.requestedMusic) return;
    const version = this.musicRequestVersion;
    const request = this.requestedMusic;
    this.musicLoading = true;
    this.resourceLoader.loadOriginalAudioClip(request.path).then((clip) => {
      // 较早请求后到达、或 Scene 已销毁时，不能覆盖/补播新场景的音乐。
      if (this.disposed || version !== this.musicRequestVersion) return;
      this.musicLoading = false;
      this.musicSource.clip = clip;
      this.musicSource.loop = request.loop;
      if (this.browserAudioUnlocked) this.tryPlayMusic();
    }).catch((audioError) => {
      if (this.disposed || version !== this.musicRequestVersion) return;
      this.musicLoading = false;
      console.warn('[DZPK audio]', audioError);
    });
  }

  /**
   * 播放音效。循环音效占用 effectSource 的主 clip；普通短音效使用 `playOneShot`，互不抢 clip。
   */
  public playSound(soundPath: string, shouldLoop = false): void {
    if (this.disposed || this.inBackground || !this.browserAudioUnlocked) return;
    const version = shouldLoop ? ++this.effectRequestVersion : this.effectRequestVersion;
    this.resourceLoader.loadOriginalAudioClip(soundPath).then((clip) => {
      if (this.disposed || this.inBackground || version !== this.effectRequestVersion) return;
      if (shouldLoop) {
        this.effectSource.stop();
        this.effectSource.clip = clip;
        this.effectSource.loop = true;
        this.effectSource.play();
        return;
      }
      this.effectSource.playOneShot(clip, this.effectSource.volume);
    }).catch((audioError) => { if (!this.disposed && version === this.effectRequestVersion) console.warn('[DZPK audio]', audioError); });
  }

  public playButtonSound(): void {
    this.playSound('sound/button');
  }

  public playCloseSound(): void {
    this.playSound('sound/button');
  }

  /** 页面切换/结算清理时停止当前效果声，背景音乐继续。 */
  public stopAllEffects(): void {
    this.effectRequestVersion++;
    this.effectSource.stop();
    this.effectSource.clip = null;
    this.effectSource.loop = false;
  }

  /** 写入 0–1 音效音量，并保存到本机供下次启动使用。 */
  public setSoundVolume(volume: number): void {
    this.effectSource.volume = clampVolume(volume);
    storeVolume('SoundVolume', this.effectSource.volume);
  }

  /** 写入 0–1 音乐音量，并保存到本机供下次启动使用。 */
  public setMusicVolume(volume: number): void {
    this.musicSource.volume = clampVolume(volume);
    storeVolume('MusicVolume', this.musicSource.volume);
  }

  public getSoundVolume(): number {
    return this.effectSource.volume;
  }

  public getMusicVolume(): number {
    return this.musicSource.volume;
  }

  /** 浏览器页/应用进入后台时暂停，避免后台继续发声。 */
  public pauseForBackground(): void {
    if (this.disposed) return;
    this.inBackground = true;
    this.effectRequestVersion++;
    this.musicSource.pause();
    this.effectSource.pause();
  }

  /** 回到前台后只恢复此前应当播放的音乐和循环音效。 */
  public resumeAfterForeground(): void {
    if (this.disposed) return;
    this.inBackground = false;
    if (!this.browserAudioUnlocked) return;
    this.tryPlayMusic();
    if (this.effectSource.loop) this.effectSource.play();
  }

  /**
   * Scene 销毁时移除自有监听并清空 clip，让引擎取消未完成的播放器创建/恢复；迟到资源请求也会失效。
   */
  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.requestedMusic = null;
    this.musicRequestVersion++;
    for (const event of AUDIO_GESTURES) this.browserWindow?.removeEventListener(event, this.handleAudioGesture, true);
    this.musicSource.node.off(AudioSource.EventType.STARTED, this.handleMusicStarted, this);
    this.musicSource.node.off(AudioSource.EventType.ENDED, this.handleMusicEnded, this);
    this.musicSource.stop();
    this.musicSource.clip = null;
    this.stopAllEffects();
  }

  /** window 捕获先于全屏的 canvas 冒泡；触摸在抬起时解锁，拒绝脚本事件和修饰键。 */
  private readonly handleAudioGesture = (event: Event): void => {
    if (!event.isTrusted || this.disposed || this.inBackground) return;
    if (event.type === 'pointerup' && !['touch', 'pen'].includes((event as PointerEvent).pointerType)) return;
    if (event.type === 'mousedown' && (event as MouseEvent).button !== 0) return;
    if (event.type === 'keydown') {
      const key = event as KeyboardEvent;
      if (key.repeat || key.ctrlKey || key.altKey || key.metaKey || ['Escape', 'Shift', 'Control', 'Alt', 'Meta'].includes(key.key)) return;
    }
    if (!this.musicSource.clip) this.loadRequestedMusic();
    this.tryPlayMusic();
    if (this.browserAudioUnlocked && this.effectSource.loop && !this.effectSource.playing) this.effectSource.play();
  };

  /** play 返回 void 不代表浏览器已运行音频；保留手势监听，失败或被系统中断后还可重试。 */
  private tryPlayMusic(): void {
    if (this.disposed || this.inBackground || this.musicEnded || !this.musicSource.clip || this.musicSource.playing) return;
    try { this.musicSource.play(); }
    catch { /* 浏览器拒绝时留给下一次真实手势重试。 */ }
  }

  private readonly handleMusicStarted = (): void => {
    if (this.disposed || this.inBackground) { this.musicSource.pause(); return; }
    if (this.musicSource.playing) this.browserAudioUnlocked = true;
  };

  private readonly handleMusicEnded = (): void => { this.musicEnded = true; };
}

function readStoredVolume(storageKey: string): number {
  // null/空白不是用户主动静音；只有 0–1 的明确数值作为音量偏好。
  try {
    const raw = sys.localStorage.getItem(storageKey);
    if (raw === null || raw.trim() === '') return 1;
    const storedValue = Number(raw);
    return Number.isFinite(storedValue) && storedValue >= 0 && storedValue <= 1 ? storedValue : 1;
  } catch { return 1; }
}

function storeVolume(storageKey: string, volume: number): void {
  try { sys.localStorage.setItem(storageKey, String(volume)); }
  catch { /* 隐私模式或存储被禁用不影响本次游戏的音量。 */ }
}

function clampVolume(volume: number): number {
  // AudioSource.volume 允许的业务范围是 0–1，异常或 NaN 按 0 处理。
  return Math.max(0, Math.min(1, Number(volume) || 0));
}
