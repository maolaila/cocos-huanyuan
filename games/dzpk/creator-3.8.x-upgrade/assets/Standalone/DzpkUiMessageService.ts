/**
 * 学习导读：把原大厅曾提供的“提示、加载中、昼夜遮罩、进房失败”收进 Cocos 内部，但不新画外壳。
 *
 * Cocos API 速查：`Label.string` 改文字；`Node.active` 控制提示/遮罩显隐；`isValid(..., true)` 用于
 * setTimeout 回调，确认等待 2.5 秒期间 Label 没有随页面一起销毁。
 * 这里的原生 `setTimeout` 只管理与某个 Component 无关的服务提示；牌桌组件动画优先使用 schedule。
 */
import { Label, Node, isValid } from 'cc';
import { GameContext } from './GameContext';
import { constrainSingleLineLabel, formatDzpkCurrencyAmount } from './DzpkUiHelpers';

export interface ConfirmationRequest {
  okCB?: () => void;
}

/** 无可见大厅外壳的 UI 兼容服务；提示仍落在 Boot Scene 预留的原生 Label 上。 */
export class DzpkUiMessageService {
  public readonly TIPS_OK = 1;
  private hideMessageTimer: ReturnType<typeof setTimeout> | null = null;

  public constructor(
    private readonly gameContext: GameContext,
    private readonly messageLabel: Label | null,
    private readonly nightModeOverlayNode: Node | null,
  ) {}

  /** 显示 2.5 秒短提示；连续提示会取消旧计时，从最新一条重新计时。 */
  public showTransientMessage(messageText: unknown): void {
    const normalizedMessage = String(messageText || '未知提示');
    if (!this.messageLabel || !isValid(this.messageLabel, true)) {
      console.warn(`[DZPK] ${normalizedMessage}`);
      return;
    }
    constrainSingleLineLabel(this.messageLabel);
    this.messageLabel.string = normalizedMessage;
    this.messageLabel.node.active = true;
    if (this.hideMessageTimer) clearTimeout(this.hideMessageTimer);
    this.hideMessageTimer = setTimeout(() => {
      if (this.messageLabel && isValid(this.messageLabel, true)) {
        this.messageLabel.node.active = false;
      }
    }, 2500);
  }

  /** 启动 GameHub 会话和资源加载期间显示连接提示。 */
  public showLoadingIndicator(): void {
    if (!this.messageLabel) return;
    constrainSingleLineLabel(this.messageLabel);
    this.messageLabel.string = '正在连接 GameHub…';
    this.messageLabel.node.active = true;
  }

  /** 初始化完成后隐藏加载提示节点。 */
  public hideLoadingIndicator(): void {
    if (this.messageLabel) this.messageLabel.node.active = false;
  }

  /** 同步上下文和 Night 遮罩节点；只是画面偏好，不修改系统时钟。 */
  public applyDayNightAppearance(isNightMode: boolean): void {
    this.gameContext.setDayNightMode(isNightMode);
    if (this.nightModeOverlayNode) this.nightModeOverlayNode.active = isNightMode;
  }

  public showTips(messageText: unknown): void {
    this.showTransientMessage(messageText);
  }

  public showLoadingUI(): void {
    this.showLoadingIndicator();
  }

  public hideLoadingUI(): void {
    this.hideLoadingIndicator();
  }

  /**
   * 进房余额不足提示。金额只在显示层按币种压缩，传入的最低筹码和后端判断都没有被改写。
   */
  public enterRoomFailTips(minimumGoldAmount: number): void {
    const displayAmount = formatDzpkCurrencyAmount(
      minimumGoldAmount,
      this.gameContext.currency,
      {
        maxCharacters: 8,
        sourceTenThousandDecimals: 1,
        sourceHundredMillionDecimals: 1,
        includeCurrencySymbol: true,
      },
    );
    this.showTransientMessage(`进入该房间至少需要 ${displayAmount} 筹码`);
  }

  /**
   * 保留旧调用签名，但不使用浏览器 confirm：牌桌返回的语义是发送 Msg_DZPK_Out 回原 Room，
   * 不是关闭整个浏览器游戏。
   */
  public showGameOutTips(request: ConfirmationRequest): void {
    request?.okCB?.();
  }
}
