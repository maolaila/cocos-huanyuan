# DZPK Phase A 最终验证证据

```text
TargetLabel: Creator247OriginalClientParityVerified
CurrentVerdict: Creator247OriginalClientParityVerified
AuthorityClient: C:\total\kg-cocos-client\728_mobile_restore
AuthorityCommit: b5694d576c482e02dc00a33f51eea633b9cd647f
Creator: C:\ProgramData\cocos\editors\Creator\2.4.7\CocosCreator.exe
GameHubBranch: develop
ProductionClaim: false
```

本文件冻结当前代码和浏览器证据。独立复审已于 2026-08-25 返回 `Passed`，详情见
`docs/phase-a-fresh-independent-review.md`。

## 1. 原版身份和可重复物化

- `scripts/materialize-original-source.ps1` 先比较 695 个 `assets/DZPK` 权威文件，
  权威字节数为 10,781,546。
- 原五个核心脚本在目标工程中保留为逐字节证据：
  `DZPKLoad.js`、`DZPKRoom.js`、`DZPKMode.js`、`DZPKControlle.js`、`DZPKView.js`。
- 两条无 target 的 ERNN/BJL ClickEvent 在逐字节比较后按
  `SourceDefectRepair` 移出活跃 clickEvents。
- `scripts/apply-semantic-prefab-mapping.ps1` 幂等重绑 Load、Room、DZPKMain
  三个原 Prefab；原节点、资源 UUID、动画和数组索引不重建。
- `scripts/verify-original-client-boundary.ps1` 最终输出：6 个原 Prefab、5 个活跃
  原 Prefab、9 个活跃组件 Class ID、5 个字节相同原脚本、5 个语义核心源码、
  8 个 Boot 容器/原 Night 节点；无旧自绘类或客户端 authority 字段。

## 2. Creator 2.4.7 构建

执行：

```powershell
scripts\build-creator247.ps1
```

结果：全新临时目录导入、`web-mobile` 构建和边界校验全部成功；运行入口为
`DzpkStandaloneBoot.fire`。构建后的活跃可见链是：

```text
DzpkStandaloneBoot.fire
  -> original Load.prefab
  -> original Room.prefab
  -> original DZPKMain.prefab
  -> original Rule.prefab / Set.prefab
```

Boot 只包含 Camera、Game、Room、UIShow、MessageOverlay 和从原 Main 场景恢复的
Night 节点；没有桌台、座位、牌、按钮或结算自绘节点。

## 3. 浏览器主循环

最终 exact build 使用真实 Chromium、真实 `context/init`、authenticated KG WS、
Redis authority 和原画面按钮完成：

```text
TwoHandsCompletedThroughOriginalButtons
resultCount: 2
privateDealCount observed between results: 1
actionClickCount: 8
boardStatesCaptured: 3, 4, 5
handId 1: ...4fb983643c5f563e...-hand-3
handId 2: ...4fb983643c5f563e...-hand-4
```

两个 handId 不同；第二手由服务端 15 秒结果窗口后自动发 `FaCards`，客户端没有
`NEXT_HAND`。最终同 session 控制台为 `0 errors / 0 warnings`。

关键截图：

- `output/playwright/final-room.png`
- `output/playwright/final-table.png`
- `output/playwright/board-3-cards.png`
- `output/playwright/board-4-cards.png`
- `output/playwright/board-5-cards.png`
- `output/playwright/result-hand-1.png`
- `output/playwright/result-hand-2.png`
- `output/playwright/final-rule.png`
- `output/playwright/final-set.png`
- `output/playwright/final-set-night.png`
- `output/playwright/mobile-landscape-844x390.png`

最终 result 截图只在原 `win/winlabel.active` 后保存，不能用 River ingress 冒充结算。
结算窗口内下注按钮保持隐藏。

## 4. 平分、边池、退款逻辑与历史视觉证据

`scripts/playwright-forced-settlement-qa.js` 在关闭 WS 后注入
`handId=forced-visual-only` 的 viewer-safe source-shaped Result：

```text
winnerCount: 3
potLayerCount: 3
main pot: 300 split 150 / 150
side pot: 200
uncalled return: 100
```

`output/playwright/forced-tie-sidepot-uncalled.png` 属于修复前历史截图，其中克隆原
`allbet` 金额 Label 显示“主池/边池/未跟注退回”长文案，已确认不是原版可见 UI，
不得继续作为当前视觉证据。当前实现只保留服务端 pot/return 事实、原筹码飞行动画、
原 winner/lose 动画和原数字派奖 Label。规则正确性仍来自 engine `pots.test.ts`、
evaluator、source projection 和 full acceptance；修复后的视觉由人工复核。

## 5. 刷新和进程恢复

最终 844×390 session 的 refresh 前后：

```text
sessionId: same
roomId: 190101 -> 190101
viewer uid: same
participant count: 6 -> 6
current URL has launchCode/launchToken/token: false
sessionStorage keys: gamehub.dzpk.session-reconnect.v1 only
Night node present: true
console: 0 errors / 0 warnings
```

一次性 launchCode 不持久化。Cocos 只在当前标签页 `sessionStorage` 保存交换后的
opaque sessionToken、sessionId、roomId 和 roomLevel；牌局、bot 私牌、事件日志和
authority revision 不保存在客户端。退出游戏会清除此键。

最终后端原子重启窗口内，Cocos 5 秒退避后首次重连成功；重启前后同
session/room/viewer/6 席保持，控制台仍为 0/0。真实 Redis AOF/CAS 另由 focused test
覆盖。

## 6. Rule、Set、昼夜和音频

- Rule 通过原 DropDown `rule` 按钮打开并通过原 close 按钮关闭。
- Set 通过原 DropDown `set` 按钮打开。
- 自动/白天/夜间实际点击：Night opacity `255`，切回白天为 `0`。
- Night 节点从原 `Main.fire` 结构恢复：1334×750、黑色 Splash、子节点 opacity 40。
- 浏览器音频证据：`audioUnlocked=true`、BGM 路径 `sound/back`、音乐/音效音量均为
  `1`、`cc.audioEngine.isMusicPlaying()=true`。
- 刷新后未再次手势前，BGM/网络音效由 Cocos 内置手势门延迟，避免 Chromium
  autoplay warning；首次 pointer/touch/key 后仍调用原 AudioManager。

## 7. 网络和泄漏扫描

最终浏览器请求记录共 188 行；`POST /gameapi/v1/context/init` 为 200，所检查资源均
为 200，未发现实际 4xx、5xx、`ERR_*` 或 failed request。当前 URL 已去除一次性凭证。

静态和构建扫描禁止：

```text
completeDeck
candidateDeals
botPrivateState
controlDirection
controlIntent
WalletGateway
RoundService
appSecret
Applications/GAME_DZPK
```

客户端只提交 `Msg_DZPK_ActBet { gold }` 和退出意图；完整牌组、机器人私牌、赢家、
payout、控牌选择、权威余额和 revision 都由后端生成。

## 8. 机器测试

最终 focused：

```text
engine: 33 pass / 0 fail / 141 expects
backend review-standard: 67 pass / 0 fail / 530 expects
backend expanded focused: 130 pass / 0 fail / 1,206 expects
engine typecheck: passed
shared-types typecheck: passed
backend typecheck: passed
backend build: 8 entrypoints passed
```

最终 full acceptance 见 `docs/evidence/phase-a-acceptance-final.json`：

```text
five-card exhaustive: 2,598,960
seven-card independent oracle: 1,000,000 / 0 mismatch
bot soak: 50,000 hands / 1,150,532 actions / 50,000 unique deals
control: OFF/POSITIVE/NEGATIVE each 1,000, 95% intervals separated as required
target stop: positive and negative passed, next hand OFF
lifecycle: all 13 phases restored, SETTLED -> WAITING restored
```

## 9. 当前结论

```text
Implemented: true
Creator247BuildPassed: true
OriginalPrefabRuntimeChainPassed: true
NaturalTwoHandBrowserPassed: true
RefreshSnapshotPassed: true
BackendProcessRestartPassed: true
ForcedSettlementVisualPassed: true
ConsoleZeroErrorWarning: true
FreshIndependentReview: passed
Creator247OriginalClientParityVerified: true
```

## 10. 人工验收后的源码对齐修正（2026-08-26）

- 牌面 `xh/dh` Atlas 映射恢复为原 `DZPKView` 的 `xh -> color_big`、
  `dh -> color_small`，避免把小花色拉伸到 79×83 节点；
- 删除后来添加的“主池/边池/未跟注退回/座位”长文本 pot rows；边池与退款仍由
  backend/engine 权威计算，Cocos 只复用原筹码动画、winner/lose 和数字 Label；
- 同一玩家的派奖与未跟注退款先合并，再显示一个原数字结算 Label，避免座位重叠；
- Table 返回按钮直接发送原 `Msg_DZPK_Out`，成功后经 `wViewMgr.quitGame` 回到原 Room；
  Room 的 exit 才结束独立游戏；
- 删除后来添加的浏览器原生 `window.confirm`。

按用户约定，本轮不以机器构建、自动测试或浏览器自动验收作为结论；当前工作树等待人工
视觉与交互复核。上方 `Creator247OriginalClientParityVerified` 仍只绑定已提交基线
`7fdd2a7207763a64ad0b30b1c292b80be8a71c42`。
