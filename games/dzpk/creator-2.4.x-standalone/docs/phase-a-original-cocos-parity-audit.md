# KG 德州扑克 Phase A 原版 Cocos 差异审计

AuditId: dzpk-creator247-original-client-parity-audit-v1
GameCode: dzpk-955
SourceGameId: 119
SourceClientGameId: 19
TargetLabel: Creator247OriginalClientParityVerified
CurrentVerdict: Creator247OriginalClientParityVerified
AuditMode: ReadOnlyBaselinePlusImplementationClosurePlusFreshIndependentReview

## 1. 本轮权威范围

| 事实 | 当前值 |
|---|---|
| Cocos 权威源 | `C:\total\kg-cocos-client\728_mobile_restore` |
| Cocos commit | `b5694d576c482e02dc00a33f51eea633b9cd647f` |
| Cocos 工作树 | `main`，干净，只读 |
| Creator | `2.4.7` |
| PHP 权威源 | `C:\total\kg-php`，只读 |
| 归档兜底 | `C:\total\kg`，本次审计未使用 |
| 独立目标 | `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original` |
| GameHub 分支 | `develop` |
| GameHub develop commit | `8b94b3496d45718b684ef39d1a476ef88fce27b2` |
| GameHub 前端 | 禁止修改；旧自绘残留目录已删除 |
| GameHub 后端 | 仅允许为独立 Cocos 提供服务端权威接口 |

用户明确否决旧提交 `d20b019a6a2f86205369cdd17d09157e3c63cac4` 中的
自绘 Cocos 客户端。该提交和后续 `d8a34aa4b` 仅保留为失败复盘证据，
不得作为原版 UI 权威源或新工程复制来源。

## 2. 十项强制差异结论

| 审计项 | 权威事实 | 当前目标状态 | 分类 |
|---|---|---|---|
| 当前活跃场景 | 原项目从 Hall `Main.fire` 进入 DZPK bundle；独立工程应只新建不可见大厅替代 Boot | `DzpkStandaloneBoot.fire` 仅含容器、原 Night、Camera；可见链实例化原 Prefab | `Match` |
| 旧自绘界面 | 旧提交动态创建 Background/Content/Overlay、六座、按钮、卡牌和 ResultPanel | GameHub develop 无旧自绘路径；独立工程边界扫描拒绝旧类/Graphics/NEXT_HAND | `SourceDefectRepair` |
| 原版 Load/Room/DZPKMain | 三个 Prefab 构成真实加载、选房、牌桌入口 | 原 UUID/节点树保留，活跃组件切换为语义化 Cocos 组件 | `Match` |
| 原五个 DZPK 脚本 | 原控制器、Model、View 驱动节点/动画/事件 | 五份字节相同证据保留；五份语义化实现实际挂载/导入 | `IntentionalDifferenceWithAuthorityReason` |
| 原六个 Prefab | 五个属于可达游戏 UI；Bank 源码存在但运行时不可达 | 五个活跃且浏览器验证；Bank 完整保留但未接 Boot/路由 | 五个 `Match`；Bank `NotApplicableWithSourceEvidence` |
| 原资源和外部 UUID | DZPK bundle、BJL 牌 Atlas、头像、音频、Spine、粒子、AnimationClip、Creator internal UUID | 695 文件及外部闭包物化；Creator 2.4.7 build 和浏览器资源通过 | `Match` |
| 当前 authority 事件 | 旧实验 authority 有引擎/快照思路，但裸 WS、单 viewer、字段类型和时序不兼容原 Cocos | develop 已有 authenticated KG WS DZPK adapter、Redis CAS/AOF、ticker、viewer projection；TRIAL only | `IntentionalDifferenceWithAuthorityReason` |
| 原 Msg_DZPK 事件 | Cocos/PHP 已证明发送、消费字段和 2/30/15 秒时序 | 原事件名/字段/时序进入语义 Controller 和 backend projection | `Match` |
| 当前浏览器效果 | 旧截图证明的是自绘客户端，不是原 Prefab 节点树 | 新截图来自原 Load/Room/Main/Rule/Set，旧截图不继承 | `Match` |
| 原节点和动画预期 | 321 节点主桌、25 Spine、6 Particle、7 Animation 及原 cc.Action 时序 | 原节点/Spine/Particle/Animation/Action 进入 exact-final 浏览器主循环 | `Match` |

实施型 `MismatchBlocker` 已关闭。2026-08-25 的 fresh independent review 与学习 PDF
视觉复核均已通过，结论记录于 `docs/phase-a-fresh-independent-review.md`。

## 3. 被判废的自绘实现

旧实验提交的以下文件禁止进入新目标的活跃客户端：

```text
GameHubStandalone/DzpkPhaseAController.ts
GameHubStandalone/DzpkPhaseATypes.ts
GameHubStandalone/DzpkTableView.ts
GameHubStandalone/DzpkUiFactory.ts
Scene/DzpkPhaseA.fire
```

精确失败事实：

- `DzpkPhaseAController.ts:61-70` 新建 Background/Content/Overlay 并使用
  `cc.Graphics`；
- `DzpkTableView.ts:154` 新建简化 Seat；
- `DzpkTableView.ts:243` 新建 ResultPanel；
- `DzpkUiFactory.ts:34-145` 用 Node/Label/Graphics 重画文字、按钮和牌；
- `DzpkPhaseAController.ts:250` 要求客户端发送 `NEXT_HAND`，而原版在 Result
  15 秒后由服务端自动开始下一手；
- 旧界面只加载部分原资源，没有实例化原 `DZPKMain.prefab`，也没有挂载原
  `DZPKControlle` / `DZPKView`。

结论：这是“使用原素材重写客户端”，不是源码还原。

## 4. 六个原版 Prefab 身份

| Prefab | UUID | SHA-256 | 根节点 / 尺寸 / 节点数 | 目标状态 |
|---|---|---|---|---|
| `Bank.prefab` | `8c9ac144-1168-4a02-b5ee-f895a4d6591e` | `94ac7944b95c9811edce3db382e82af2a3373f5847bfbf9b00fc53aac93acda9` | `Bank` / 1334x750 / 39 | `NotApplicableWithSourceEvidence` |
| `DZPKMain.prefab` | `faea1885-c01d-4a4b-8d14-69319aef5c50` | `34e9d016def1286c182becc97344ec87332d801877bf2cc890667fbb80e5e687` | `DZPKMain` / 1334x750 / 321 | 必须活跃 |
| `Load.prefab` | `07af51a2-d569-4a18-978c-537bf728840b` | `236b129eb53a99dbb4c138e52fc473738ae690ee6d90d3a2e5f0a1e3d2859870` | `Load` / 1334x750 / 4 | 必须活跃 |
| `Room.prefab` | `efa3b3c7-d745-4874-b161-ae25276fb74a` | `479dfa6295cdb6c5118f2e8f70fd0f438789aceab3254325993e07caeecad330` | `Room` / 1334x750 / 58 | 必须活跃 |
| `Rule.prefab` | `1eb86003-fa02-4609-b85f-317c3ed33efc` | `7e4366a86d0c65683506540d453934be0e6107b46bef31c4aeab07dc3e4a7291` | `Rule` / 1334x750 / 11 | 必须活跃 |
| `Set.prefab` | `31f79f27-4c2e-440d-9ad2-edaa10454baf` | `962f2e69dab8a9bb89c4c6d0e559d0fd20b44e43368249f9f047dce2d9b01191` | `Set` / 1334x750 / 58 | 必须活跃 |

原 `.meta` UUID 和脚本 class id 必须保留。首次物化时复制完整
`assets/DZPK` 与 `.meta`，不能让 Creator 自动生成替代 UUID。

## 5. 原版自定义组件

| Prefab / 节点 | Script UUID | Class ID | 原脚本 |
|---|---|---|---|
| `DZPKMain` | `e45b6ac0-6617-46f3-b244-227c5f66bff6` | `e45b6rAZhdG87JEInxfZr/2` | `DZPKControlle.js` |
| `DZPKMain` | `3dc3cd1c-3b26-462a-82ed-bf40ff6f69bf` | `3dc3c0cOyZGKoLtv0D/b2m/` | `DZPKView.js` |
| `DZPKMain/DropDown` | `dd06c934-a75f-46d8-95b9-317ba9ef581d` | `dd06ck0p19G2JW5MXup71gd` | `DropDown.js` |
| `DZPKMain/DropDown/switchBtn` | `f2748e31-1526-4387-b8ae-48eda2768367` | `f27484xFSZDh7iuSO2idoNn` | `AdaptView.js` |
| `Load` | `39d81af7-8abf-4a2a-9fe3-0727ac362b39` | `39d81r3ir9KKp/jByesNis5` | `DZPKLoad.js` |
| `Room` | `337d4208-81a1-4a66-a6d9-45b716f98370` | `337d4IIgaFKZqbZRbcW+YNw` | `DZPKRoom.js` |
| `Room/.../RoomChoose` | `d3efcaf2-3147-4de2-9bf1-7a0a32adf850` | `d3efcryMUdN4pvxegoyrfhQ` | `RoomChoose.js` |
| `Rule` | `54b1f51b-95d-4a15-b19a-f7a921cd7729` | `54b1fUbldVKFbGa96khzXcp` | `Rule.js` |
| `Set` | `a1620120-08bb-4424-8b7d-c54e9f37d1d6` | `a1620EgCLtEJIt9xU6fN9HW` | `Set.js` |
| `Bank` | `5f912394-03e1-4733-bb66-714299ba29d1` | `5f912OUA+FHM7tmcUKZuinR` | `GameBank.js` |

## 6. 五个 DZPK 脚本合同

| 脚本 | 行数 | require | 原职责 | 当前差异 |
|---|---:|---|---|---|
| `DZPKLoad.js` | 104 | `Config` | BGM、Load Spine、请求房间配置、加载 Room | 目标尚无原脚本入口 |
| `DZPKRoom.js` | 192 | `Config` | 三房间、头像/昵称/余额、进入房间、加载 Main | 目标尚无原房间 UI |
| `DZPKMode.js` | 119 | 无 | 六座位映射、牌局/盲注/加注候选状态 | 目标尚无原 Model |
| `DZPKControlle.js` | 570 | `PokerBase,DZPKMode,DZPKView` | 全部原事件、玩家操作、四街、结算和退出编排 | 目标尚未挂载 |
| `DZPKView.js` | 1090 | `Config,NodePool` | 321 节点牌桌、牌/筹码、Slider、Spine、粒子、结算动画 | 旧实现完全重写，必须废弃 |

第一次还原优先保持原脚本和 meta。语义化重构必须放在窄 service/adapter 中；
确需修改原脚本时，以语义化方法承载新逻辑，原 Prefab 序列化入口只保留薄代理。

## 7. 共享脚本和 provider 闭包

原 Prefab 静态 require 闭包：

```text
AdaptView.js
Config.js
DropDown.js
GameBank.js
NodePool.js
PokerBase.js
PopupBase.js
RoomChoose.js
Rule.js
Set.js
```

为最窄全局 provider 还需复制并保留 meta：

```text
AudioManager.js
CountUp.js
EventDispatcher.js
LogManager.js
ResLoader.js
UIHelp.js
Utils.js
```

Boot 只补语义化的 `GameContext`、`DzpkUiMessageService`、
`DzpkViewNavigator`、`LocalAuthorityTransport` / 后续 GameHub transport，
并在兼容边界暴露原 `wGameData/wConstant/wUIManager/wNetWork/wViewMgr`。

## 8. 资源和 UUID 闭包

初次导入建议复制整个 `assets/DZPK`（695 文件 / 10,781,546 bytes），避免
过早删除备用或低概率原资源。机器证明的活跃五 Prefab + provider 最小闭包为
399 文件 / 8,650,690 bytes。

项目外业务资源：

```text
assets/BJL/_res/Atlas_plist/BRNNResult/plist_puke.plist(.meta)
assets/BJL/_res/Atlas_plist/BRNNResult/plist_puke.png(.meta)
assets/resources/Hall/THead/7.png(.meta)
assets/resources/Hall/Head/plist_head.plist(.meta)
assets/resources/Hall/Head/plist_head.png(.meta)
assets/resources/sound/effect/btn_click.mp3(.meta)
assets/resources/sound/effect/btn_close.mp3(.meta)
```

六个无项目 meta 的 material/default-sprite UUID 属于 Creator 2.4.7 internal
资源，应由精确编辑器解析，禁止从其它游戏伪造：

```text
29158224-f8dd-4661-a796-1ffab537140e
3a7bb79f-32fd-422e-ada2-96f518fed422
7afd064b-113f-480e-b793-8817d19f63c3
a23235d1-15db-4b95-8439-a2e005bfff91
e7aba14b-f956-4480-b254-8d57832e273f
eca5d2f2-8ef6-41c2-bbe6-f9c79d09c432
```

## 9. 原版入口链

```text
Main.fire / Main.js（旧大厅，仅事实源）
  -> 初始化 11 个 w* 全局
  -> gtype 119 转内部 gameID 19
  -> ViewManager.enterSite()
  -> DZPK bundle / prefab/Load
  -> Msg_Hall_GameSessions
  -> prefab/Room
  -> Msg_Hall_EnterRoom
  -> prefab/DZPKMain
  -> PokerBase.m_init()
  -> Msg_Hall_FinishLoad
  -> Msg_DZPK_RoomInfo
```

目标入口必须是：

```text
StandaloneBoot（仅容器、兼容对象、transport）
  -> 原 Load
  -> 原 Room
  -> 原 DZPKMain
  -> 原 DZPKMode
  -> 原 DZPKControlle
  -> 原 DZPKView
```

## 10. 原事件和旧 authority 差异

原客户端发送：

```text
Msg_Hall_GameSessions { gtype: 19 }
Msg_Hall_EnterRoom { tableid: 0, gtype: 19, level }
Msg_Hall_FinishLoad { rid }
Msg_DZPK_ActBet { gold }
Msg_DZPK_Out []
```

原客户端消费：

```text
Msg_DZPK_RoomInfo
Msg_DZPK_PlayerAct
Msg_DZPK_FaCards
Msg_DZPK_PublicCards
Msg_DZPK_StageBet
Msg_DZPK_CallUserAct
Msg_DZPK_ActBet
Msg_DZPK_Result
Msg_DZPK_ChangGold
Msg_DZPK_Out
Msg_Hall_Connect / Msg_Hall_FinishLoad
```

旧实验 authority 不可直接接原客户端：

- `px` 和 `Result.cards[uid].value` 发 object；原 `getPokerType()` 会调用
  `.slice()`，必须改为 legacy value string；
- RoomInfo player 缺 `headimgurl`；
- `notice.time` 写死 30，重连应为 deadline 剩余秒；
- SHOWDOWN/TERMINAL/SETTLING 被错误投影为 stage 2；
- 每手额外发送 RoomInfo；原正常下一手从 Result 15 秒后直接 FaCards；
- 旧 Cocos 要求客户端 NEXT_HAND，原版由服务端自动下一手；
- 裸 WS 信任 `viewerParticipantId=human`，不是 GameHub launch/session authority。

## 11. 原版节点和动画预期

`DZPKMain.prefab` 至少包含：

```text
gameType / poker / player / win / btn / chip / tips / DropDown / allBet
```

组件数量：25 个 `sp.Skeleton`、6 个 `cc.ParticleSystem`、7 个
`cc.Animation`、19 个唯一 SkeletonData。

必须由原脚本触发的代表性入口：

- Load Spine `start -> idle(loop)`；
- 房间 5 个原 Spine；
- 背景 `suiji1..suiji4`；
- 操作倒计时 `Animation.play().speed=1/time`；
- all-in `start -> idle`；
- 原发牌/公牌 cc.Action 顺序；
- 原筹码下注和回收；
- 原 winner/Big Win Spine、粒子和声音。

## 12. 原按钮和序列化事件

主桌必须继续使用原按钮：弃牌、跟注、让牌、加注、加注档位、底池档位、
自动动作、Slider、Rule、Set、Exit 和 DropDown。

原 `rule`、`set` 各含一条无 target 的 ERNN/BJL stale ClickEvent。它们不是
依赖闭包，禁止复制其它游戏控制器；目标副本应以 `SourceDefectRepair` 记录后删除
这两条空 target binding，保留正确的 `DropDown.onClickBtn(rule/set)`。

## 13. Bank 适用性

`Bank = SourcePresentButGameRuntimeNotApplicable`。

证据：

1. Bank UUID 未被其它五 Prefab 引用；
2. 两处 bank 可视节点默认 inactive；
3. `DZPKRoom.js:165-166` 的 bank case 直接 break；
4. `DZPKControlle.js:441-445` 只提示体验场不可打开，之后 break；
5. `DropDown.js:103-105` 只收起菜单；
6. `GameBank.js` 消费的是 Hall Bank 消息和商业取款流程。

Bank 可保留为来源盘点/只读参考，不进入 Boot、菜单路由或可玩声明。

## 14. 标准规则修正必须保留

恢复原 UI 不代表恢复 PHP 缺陷。服务端仍必须保持：

- 花色不破平、多赢家；
- 主池、多边池、未跟注退回、odd chip 和 rake 明细守恒；
- full raise、short all-in 不重新开放；
- actor/seat/hand/revision/clientActionId；
- viewer 私牌隔离；
- 开牌前一次提交的完整合法牌局；
- 13 状态、超时、重连和持久化；
- SOURCE_DELAYED 机器人和生命周期；
- 控制只在源码证明且 GameHub 权威允许的边界内生效。

原单赢家/单底池 UI 只允许在原节点树内做窄扩展；必须复用原面板、Label、
Spine、粒子和筹码动画，禁止另画 ResultPanel。

## 15. 审计时 GameHub develop 可用与缺失能力

审计起点的 `develop` 已有 `context/init`、认证 KG Base64 WS、Hall 生命周期、Redis
ownership/CAS、session、WalletGateway hold/capture/release 等公共后端能力，但没有：

- `dzpk-955` WS profile/gtype；
- DZPK table actor、viewer projector、ticker；
- durable deal commitment、hand journal 和 terminal economics；
- P2P Card source-specific UID Adapter。

普通 `RoundService.play()` 每次都要求正下注并立即结算，不能把 CHECK/CALL/RAISE
拆成多个 round。正式资金边界应是一手一次的 staged `HAND_ECONOMICS`；机器人没有
wallet/order/ledger。

实施关闭时已选择 GameHub-owned authenticated KG WS + Redis TRIAL authority；GameHub
前端和 catalog 仍未修改。REAL 钱包/订单/账变/审计和正式 UID control adapter 留待 Phase B。

## 16. 审计后的实施顺序

1. 物化完整原 DZPK + meta 和精确外部闭包；
2. 新建无业务 UI 的 StandaloneBoot Scene；
3. 恢复 Load -> Room -> DZPKMain；
4. 建立最窄 w* 兼容层；
5. 用 source-shaped transport 驱动原组件；
6. 先通过原 UI 的自然牌局，再窄扩展多赢家/边池/未跟注；
7. 生成 naming/component mapping；
8. 构建、浏览器、视觉矩阵、恢复、泄漏验收；
9. fresh independent review；
10. DOCX/PDF 和独立项目本地 checkpoint commit。

## 17. 当前审计结论

```text
SourceInventoryComplete: true
OriginalPrefabRuntimeRestored: true
OriginalScriptRuntimeRestored: true
SelfDrawnUiRemovedFromGameHubDevelop: true
Creator247OriginalClientParityVerified: true
CurrentVerdict: Creator247OriginalClientParityVerified
```

原 Prefab/语义脚本运行链、GameHub TRIAL authority、两手浏览器、刷新/进程恢复、
Rule/Set/Night、forced settlement 视觉和机器验收已完成并通过独立复核。下一步仅允许
证据 bookkeeping 和本地 checkpoint commit；不得再新增自绘牌桌。
