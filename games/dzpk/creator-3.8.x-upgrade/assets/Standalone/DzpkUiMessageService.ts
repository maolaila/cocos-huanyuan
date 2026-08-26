import { Label, Node, isValid } from 'cc';
import { GameContext } from './GameContext';

export interface ConfirmationRequest {
  okCB?: () => void;
}

/** Hall compatibility without creating non-source table UI at runtime. */
export class DzpkUiMessageService {
  public readonly TIPS_OK = 1;
  private hideMessageTimer: ReturnType<typeof setTimeout> | null = null;

  public constructor(
    private readonly gameContext: GameContext,
    private readonly messageLabel: Label | null,
    private readonly nightModeOverlayNode: Node | null,
  ) {}

  public showTransientMessage(messageText: unknown): void {
    const normalizedMessage = String(messageText || '未知提示');
    if (!this.messageLabel || !isValid(this.messageLabel, true)) {
      console.warn(`[DZPK] ${normalizedMessage}`);
      return;
    }
    this.messageLabel.string = normalizedMessage;
    this.messageLabel.node.active = true;
    if (this.hideMessageTimer) clearTimeout(this.hideMessageTimer);
    this.hideMessageTimer = setTimeout(() => {
      if (this.messageLabel && isValid(this.messageLabel, true)) {
        this.messageLabel.node.active = false;
      }
    }, 2500);
  }

  public showLoadingIndicator(): void {
    if (!this.messageLabel) return;
    this.messageLabel.string = '正在连接 GameHub…';
    this.messageLabel.node.active = true;
  }

  public hideLoadingIndicator(): void {
    if (this.messageLabel) this.messageLabel.node.active = false;
  }

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

  public enterRoomFailTips(minimumGoldAmount: number): void {
    this.showTransientMessage(`进入该房间至少需要 ${minimumGoldAmount} 筹码`);
  }

  public showGameOutTips(request: ConfirmationRequest): void {
    // Table back means Msg_DZPK_Out -> original Room, not browser exit.
    request?.okCB?.();
  }
}
