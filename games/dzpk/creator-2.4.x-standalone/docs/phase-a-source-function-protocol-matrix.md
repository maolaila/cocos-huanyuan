# KG 德州扑克 Phase A 原版功能与协议学习矩阵

MatrixId: `dzpk-phase-a-source-function-protocol-matrix-v2`  
GameCode: `dzpk-955`  
KG Catalog / Source GameId: `119`  
KG PHP / Source WS GType: `19`  
KG Cocos Client GameId: `19`  
CreatorVersion: `2.4.7`  
TargetProject: `C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original`  
AuthoritySources: `C:\total\kg-cocos-client\728_mobile_restore\assets\DZPK` and `C:\total\kg-php\wwwroot\game\728\Applications\GAME_DZPK`  
ArchiveFallbackUsed: `false`  
FreshEvidenceReadAt: `2026-08-25 Asia/Tokyo exact-final refresh`  

## 1. 文档用途与判定口径

本文把原 KG Cocos 可见行为、原 KG PHP 协议/规则、标准德州修正、当前独立工程边界和后续
GameHub authority 职责放在同一矩阵中。它用于学习、实现拆分、fixture 编写、机器验证和独立复查，
不是“当前已经全部可玩”的声明。

当前状态只允许使用以下五个值：

| 状态 | 含义 |
|---|---|
| `Match` | 当前独立工程已经保留源码身份或已具备可机器证明的相同行为；仍需按该行验证方法保持新鲜证据。 |
| `SourceDefectRepair` | KG 源码存在明确规则、安全、隐私、资金或空绑定缺陷；目标必须保留原 UI/协议外观并修复缺陷。 |
| `IntentionalDifferenceWithAuthorityReason` | 为独立启动、GameHub 安全或当前批准阶段而有意改变原 Hall/运行方式；必须记录理由，不能伪装为原版行为。 |
| `NotApplicable` | 源码存在但运行链不可达，或源码没有该功能；不得为了“完整”而伪造。 |
| `PlannedLaterPhase` | Phase A 当前工程尚无相应正式后端、资金、控制或在线证据；已有设计/旧实验不能算完成。 |

状态粒度是“矩阵行”，不是文件粒度。同一 Prefab 可以在“源码物化”行是 `Match`，而在“真实协议完整
运行”行仍是 `PlannedLaterPhase`。

## 2. 当前工程事实快照

| 事实 | 当前证据 | 状态 |
|---|---|---|
| 原 DZPK bundle 与 `.meta` 已物化 | `assets/DZPK`；原五个脚本与源 SHA-256 一致 | `Match` |
| 原六个 Prefab 已物化 | `Load/Room/DZPKMain/Rule/Set/Bank` UUID 均通过边界脚本 | `Match` |
| 活跃原 Prefab | `Load/Room/DZPKMain/Rule/Set`，共 5 个 | `Match` |
| `DZPKMain.prefab` 两条无 target stale ClickEvent | 目标副本已删除；其余原节点/组件身份保留 | `SourceDefectRepair` |
| Bank | 来源存在，但原运行链不可达 | `NotApplicable` |
| Standalone Boot | 只提供 Canvas、兼容全局、transport 与原 Prefab 容器，不自绘牌桌 | `IntentionalDifferenceWithAuthorityReason` |
| 当前客户端会话模式 | `GameHubAuthenticatedTransport` 明确只允许 `TRIAL` | `IntentionalDifferenceWithAuthorityReason` |
| GameHub develop DZPK backend | 当前未提交 diff 已新增 `packages/kg-dzpk-engine`、DZPK source projection、study authority、Redis/CAS store、KG WS adapter/route；仍不是已提交或独立复查通过的候选 | `Match`（Phase A TRIAL 逻辑）/ `PlannedLaterPhase`（REAL 与 release） |
| 旧 `d20b019a6` 自绘客户端 | 明确判废，禁止迁回 | `NotApplicable` |

当前只读机器检查：

```powershell
& .\scripts\verify-original-client-boundary.ps1 -ProjectRoot `
  'C:\works\cocos-huanyuan\kg-dzpk-2.4.7-original'
```

检查结果为 `OriginalClientBoundaryVerified`，Creator `2.4.7`，六个原 Prefab、五个活跃 Prefab、
九个原 component class id 均存在，build 目录存在，未发现被判废的自绘名称或已列入扫描的 authority
泄漏词。该结果只关闭“源码边界”，不关闭协议、完整一手、金额或浏览器验收。

### 2.1 Fresh 冻结证据闭环矩阵

本节基于本次重新读取的当前独立工程、GameHub 工作树 diff、focused tests 与
`output/playwright` 最终文件。它覆盖本文后续章节中较早的 `PlannedLaterPhase` 状态；后续章节继续
保留来源规则和测试设计，但状态冲突时以本节和第 24 节为准。

| 要求项 | Source path | 当前 implementation path | Fresh logic test / 机器事实 | Fresh visual evidence | 分类与当前证据态 |
|---|---|---|---|---|---|
| Load | `assets/DZPK/_script/DZPKLoad.js`；`assets/DZPK/prefab/Load.prefab`；源 `DZPKLoad.js:18-101` | `assets/DZPK/_semantic/DzpkLoadingScreenController.js`；`assets/Standalone/StandaloneBoot.js`；原 `Load.prefab` 已绑定 semantic class id | `scripts/verify-original-client-boundary.ps1`：五个 semantic core、九个 active class id、五个原脚本 hash；`output/logs/creator247-build.log` 记录 Creator 2.4.7 web-mobile build success | 无单独冻结的 loading 帧；`output/playwright/final-room.png` 是 Load 完成并进入 Room 的下游佐证 | `Match`（源码/构建/运行链）；fresh independent review 已接受该证据边界 |
| 三房配置 | 源 `DZPKView.js:30-33`、`DZPKRoom.js:51-151`；PHP room rule | `DzpkRoomSelectionController.js`；backend `dzpk-source-contract.ts:56-131`、`dzpk-kg-ws-adapter.ts` | `dzpk-kg-ws-adapter.test.ts:15-46` 与 `kg-ws.dzpk.test.ts:14-80` 均断言返回且只返回 level 1/2/3 | `output/playwright/final-room.png`：体验场/新手场/初级场三张原房卡、准入金额、空闲状态可见 | `Match` |
| Room UI | `assets/DZPK/prefab/Room.prefab`；源 `DZPKRoom.js` | `assets/DZPK/_semantic/DzpkRoomSelectionController.js`；`assets/Standalone/DzpkViewNavigator.js` | boundary verifier 验证原 Room UUID 和 semantic binding；route test 完成 `GameSessions -> EnterRoom`；exact-final browser 使用 room `190101` | `output/playwright/final-room.png`（21:02:47，SHA-256 `f9c3b13c...`） | `Match` |
| Main 原桌 | `assets/DZPK/prefab/DZPKMain.prefab`；源 `DZPKControlle.js`、`DZPKView.js` | `DzpkTableGameController.js`、`DzpkTablePresentation.js`、`DzpkTableStateModel.js`；继续复用原 Prefab 节点/Spine/Particle/Animation | boundary verifier 拒绝旧 minified active core、自绘 `cc.Graphics/ResultPanel/NEXT_HAND` 和 authority leak；build success；exact-final session console `0 error / 0 warning` | `output/playwright/final-table.png`（21:02:53，SHA-256 `e3624aba...`） | `Match`；fresh independent review passed |
| 6 席 | PHP `Table.php:25-52,870-920`；Cocos `DZPKMode.js:66-72` | state model 六座映射；backend `DzpkStudyAuthority` 一真人五机器人；engine `table-engine.ts` | `kg-ws.dzpk.test.ts:64-70` 断言 RoomInfo 六人且都有 `headimgurl`；`table-engine.test.ts:93-115` 完成六人每街；authority 200-hand test 有条件通过，见限制节 | `output/playwright/table-six-seats.png`；`final-table.png` | `Match`（Phase A one-human/five-bot study table）；2-6 真人 REAL 未实现 |
| Fold/Check/Call/Raise/All-in 动作 | 源 `DZPKControlle.js:439-496`；PHP `Table.php:558-693` | `DzpkTableGameController.js:321-444,670-806`；engine legal-action reducer；backend source gold intent mapper | engine 33-test suite 中包含 full raise、short all-in、wrong state/idempotent receipt；`dzpk-study-authority.test.ts:35-70` 验证 over-stack/`request_id`；`playwright-two-hand-qa.js` 只点击原 check/call 按钮 | `final-table.png` 显示原弃牌/跟注/加注与 3x/4x/pot；`table-six-seats.png` 显示本地自动按钮 | `SourceDefectRepair`：标准合法性已具逻辑真证据；浏览器自然流证明 check/call，raise/all-in 仍主要由逻辑测试而非逐按钮视频证明 |
| Flop/Turn/River | PHP `Table.php:388-435`；源 `DZPKControlle.js:265-313` / `DZPKView.js:947-1069` | controller `handleCommunityCardsRevealed`；presentation 公牌动画；backend/engine board reveal | `table-engine.test.ts:93-115,208-247`；`playwright-two-hand-qa.js` 按 board count 3/4/5 取证 | `board-3-cards.png`、`board-4-cards.png`、`board-5-cards.png`（均 2026-08-25 20:34） | `Match` |
| 完整自然一手 | 原消息序列 `FaCards -> StageBet -> Call/Act -> 3/1/1 -> Result` | semantic controller/presentation + authenticated KG WS + study authority | engine 全街测试；route integration；`playwright-two-hand-qa.js` 不注入结果、不修改概率，只按原按钮推进 | `board-3/4/5-cards.png` + `result-hand-1.png` | `Match`（TRIAL 自然 deterministic deal；不是 REAL） |
| 两手服务端自动续局 | PHP `Table.php:549-552`（Result 后 15 秒 Init） | `DzpkStudyAuthority.advanceServerClock`；KG WS route ticker；客户端 controller 注释明确“不请求下一手” | `dzpk-study-authority.test.ts:91-130` 断言 15 秒前不动、deadline 自动 FaCards、handCounter=2；exact-final Night build 自然两手 identity 为 `...4fb983...-hand-3` / `...4fb983...-hand-4`；不同运行由原 UI 完成 5 或 8 次点击 | `result-hand-1.png`、`result-hand-2.png`，并有 fresh board3/4/5 与 result 截图；未使用 forced settlement | `Match` |
| timeout | PHP `Table.php:447-450,579-593` | engine persisted action deadline；authority `advanceServerClock`；semantic countdown | `table-engine.test.ts:195-207` exactly-once check/fold；`dzpk-study-authority.test.ts:72-89` 验证 bot 1-5 秒和 human timeout act 4/5 | `final-table.png`/`table-six-seats.png` 可见 active seat/countdown 表现，但无专门“超时前后”截图或视频 | `Match`（逻辑）；fresh independent review 已接受该视觉边界 |
| 断线重连同 session/room/viewer | 原 `PokerBase.js:26-40,67-92`；PHP `Logic.php:163-187` | `GameHubAuthenticatedTransport.js` 保存同 session/room/level 并重连；backend scope=`merchantCode+gameCode+sessionId`；RoomInfo per viewer | `dzpk-study-authority.test.ts:6-33` projectReconnect；`dzpk-kg-ws-adapter.test.ts:48-97` 新 adapter 恢复同 hand/幂等；exact-final 844x390 browser 在 refresh 前后保持 session `sid_iO-SGJfdMn4bpi_c`、room `190101`、同 viewer、六席，URL 无 launch credential，`Night` node 仍存在 | `mobile-landscape-844x390.png` 为该 final viewport；refresh 前后 browser facts 已逐字段核对，final session console `0/0` | `IntentionalDifferenceWithAuthorityReason`（GameHub 安全重连扩展）；`Match`（逻辑与 exact-final browser） |
| 后端进程对象重建 | 原 PHP 是内存 Table，未提供安全进程恢复 | `DzpkStudyAuthority.restore`、`DzpkStudyRedisStore`、adapter 重新实例化 | `dzpk-study-authority.test.ts:91-130`；`dzpk-kg-ws-adapter.test.ts:48-97`；exact-final 执行 atomic backend restart 后仍保持 session `sid_iO-SGJfdMn4bpi_c`、room `190101`、同 viewer、六席 | restart 后 final browser 仍为原 Room/Main 投影，console `0 error / 0 warning` | `IntentionalDifferenceWithAuthorityReason`；`Match`（逻辑与 exact-final browser） |
| Redis 进程重启与 CAS | 原源码无 Redis durable hand authority | `dzpk-study-redis-store.ts`，scope key 与 CAS；real Redis fixture | `dzpk-study-redis-store.redis.test.ts:7-44` 本次 fresh 真实 Redis restart 通过，并证明双 writer 只成功一个；fake store tests 也通过 | 不适用：Redis 内部不可安全截图到客户端；无视觉证据是预期边界 | `IntentionalDifferenceWithAuthorityReason`；`Match`（逻辑真证据） |
| 机器人 | PHP `AI.php:29-201`、Table robot timer/lifetime | engine `bot.ts`、authority bot lifecycle/scheduler、semantic public seat projection | `dzpk-study-authority.test.ts:72-89,132-191`；fresh review 首次暴露 Bun 默认 5s 超时，最终只给该 200-hand 压力用例 30s 局部预算；同一无全局 timeout 命令独立重跑 67/67，case 9.640s | `table-six-seats.png`、`final-table.png` 显示五机器人公开资料、牌背、公开动作 | `Match`（Phase A source-shaped cadence）；P1 closed |
| viewer privacy | PHP RoomInfo 本人真牌/他人 `[1,1]`，但原 `px` 全桌泄漏 | source projector、route/adapter viewer projection；boundary leak scan | `dzpk-study-authority.test.ts:6-33`、`kg-ws.dzpk.test.ts:64-71`、`verify-original-client-boundary.ps1`；响应禁止 `candidatePair/controlPolicy/dealCommitment/deck` | 所有自然桌面截图中本人正面牌、对手牌背；`board-3/4/5` 亦未显示对手牌 | `SourceDefectRepair`；`Match`（当前单 viewer TRIAL） |
| Rule | 原 `Rule.prefab` / `Rule.js` / DropDown | 原 Rule prefab + navigator；semantic controller 保留 legacy menu | boundary verifier + source hash/UUID；exact-final browser actual Rule click passed，无后端状态依赖 | `output/playwright/final-rule.png`（SHA-256 `7c8132ba...`），原中文规则页完整可读 | `Match` |
| Set | 原 `Set.prefab` / `Set.js` | 原 Set prefab、`DzpkUiMessageService` day/night adapter、原 AudioManager | boundary verifier；exact-final browser actual Set click passed；设置操作不触碰 hand authority | `output/playwright/final-set.png`；音乐/音效/静音/自动/白天/夜间开关完整可见 | `Match`（实际点击/视觉/实现） |
| 声音 | 原 `DZPKLoad` BGM、`DZPKControlle/View` 的 deal/call/raise/fold/all-in/chip/win 音效 | `DzpkAudioService.js` 保留原路径；semantic controller/presentation 调用 `wAudioMgr.playSound/playBgMusic` | exact-final browser runtime：`audioUnlocked=true`、`currentBackgroundMusicPath='sound/back'`、music volume=`1`、sound volume=`1`、`cc.audioEngine.isMusicPlaying()=true` | `final-set.png` 证明原声音开关实际点击后的 UI；runtime facts 证明音频已解锁且 BGM 正在播放，截图本身仍不承载声音 | `Match`（fresh runtime audio evidence）；物理设备听感不属于本地 Phase A 硬门 |
| 昼夜 | 原 `Set.js:42-118` | 原 Set + `DzpkUiMessageService.applyDayNightAppearance` + Boot `Night` 节点 | exact-final browser 实际点击 Rule/Set/night；`Night` node 存在，night opacity=`255`、切回 day opacity=`0` | `final-set.png` 与 `final-set-night.png`；夜间开时桌面确实变暗 | `Match` |
| 844x390 横屏 | 原设计 1334x750 横屏 | Boot `SHOW_ALL`、原 Prefab/semantic presentation | Creator web-mobile build success；同一 final 844x390 session refresh 与 atomic backend restart 后仍保持同 session/room/viewer/六席；URL 无 launch credential | `output/playwright/mobile-landscape-844x390.png`（SHA-256 `1fd5a714...`），六席/本人牌/自动按钮均在画面内 | `Match`（同一 final browser viewport 与恢复证据）；不等于物理 Android/iOS 矩阵 |
| exact-final console/network | 原 KG Base64 WS + Hall/DZPK event sequence | `GameHubAuthenticatedTransport.js`、`SourceProtocolAdapter.js`、backend KG WS route/adapter | 同 final session 统计 188 HTTP requests，`context/init=200`，无实际 `4xx/5xx/ERR`；console `0 error / 0 warning`；URL 不含 launch credential | `final-room.png`、`final-table.png` 与同 session 844x390 恢复事实；图片本身不替代 request/console telemetry | `Match`（TRIAL exact-final browser telemetry） |
| Bank | `Bank.prefab`/`GameBank.js` 来源存在；Room/Main bank case break/inactive | semantic controller `handleUnavailableBankRequest`；boundary verifier `bankStatus` | `verify-original-client-boundary.ps1` 返回 `SourcePresentButGameRuntimeNotApplicable`；无 wallet 读取 | `final-room.png`、`final-table.png` 无可达 Bank 界面；没有也不应有 Bank 成功截图 | `NotApplicable` |
| 多赢家/平局 | PHP `StageEnd` 单赢家与 `ColorValue` 花色破平缺陷 | engine evaluator/pots；backend `projectDzpkResult`；semantic settlement presentation | engine `evaluator.test.ts`、`pots.test.ts:66-81`；backend `dzpk-source-projection.test.ts:52-80` | 当前源码只复用原 winner/lose/bigwin、筹码动画和数字 Label；修复前 forced 截图已作废 | `SourceDefectRepair`；逻辑证据保留，修复后视觉待人工复核 |
| 主池/边池 | PHP 只按赢家投入退款，未真正比较边池 | engine `buildPotLayers/settlePots`；backend result `pots/awards`；Cocos 只把原筹码动画送到各获奖座位 | `pots.test.ts:19-64,125-155` 与 backend projection test；100/300/500 payout=300/400/200 | 不再克隆 `allbet` Label 显示后来添加的“主池/边池/座位”文案 | `SourceDefectRepair`；逻辑 Match，原版可见 UI parity 优先 |
| 未跟注返还 | PHP 超额退款存在但无独立 pot 事实 | engine `uncalledReturn` layer；backend 聚合 `uncalledReturns`；Cocos 复用原数字派奖 Label | `pots.test.ts:125-155`；`dzpk-source-projection.test.ts:52-80` 证明 contested winners 不混入 return-only UID | 不再显示后来添加的“未跟注退回”中文 row | `SourceDefectRepair`；逻辑 Match，数字表达待人工复核 |
| 奇数筹码 | 原源码无标准 split odd-chip | engine `clockwiseWinnerOrder` | `pots.test.ts:66-81` 证明 dealer 后顺时针 2/1 分配 | 无 odd-chip 专用截图；forced tie 是 150/150 偶数平分 | `SourceDefectRepair`；`Match`（逻辑），视觉 N/A/未覆盖 |
| 控牌 | PHP `GetChessCardControl` 与 Table 分配 | engine control/deal foundation、backend `dzpk-study-control-config`，TRIAL 默认 OFF | engine `control.test.ts/deal.test.ts`、backend control config test 本次通过 | 无自然或 forced 控牌截图；客户端也不得出现控制事实 | `PlannedLaterPhase`：只有方向/进度与 fail-closed foundation，不是 KG“固定公牌后分配候选底牌”的 source parity 完成证据 |
| TRIAL | GameHub 新安全边界 | context/WS mode guard、study authority；不调用 RoundService/wallet | `dzpk-phase-a-mode-guard.test.ts`、`kg-ws.dzpk.test.ts:82-98,145-169`；route 证明 walletReads=0 | 上述 final 截图均为 authenticated TRIAL study flow | `IntentionalDifferenceWithAuthorityReason`；`Match` |
| REAL | 原 PHP 金币不等于 GameHub 正式 staged money | mode guard 在 context/WS 前置拒绝 | route/adapter tests 验证在 wallet 服务前拒绝 | 无 REAL 截图；缺失是正确 fail-closed 行为 | `PlannedLaterPhase` |

### 2.2 Fresh 测试执行与证据限制

本次只读复验结果：

```text
bun test packages/kg-dzpk-engine/src
  33 pass / 0 fail

bun test ./apps/backend/src/modules/games/dzpk
  16 pass / 1 fail
  唯一失败：200-hand test 超过默认 5 秒（本次首次耗时 7.437 秒）

bun test --timeout 15000 ./apps/backend/src/modules/games/dzpk/dzpk-study-authority.test.ts
  5 pass / 0 fail，200-hand 4.172 秒

bun --env-file=apps/backend/.env test ./apps/backend/src/routes/gameapi/kg-ws.dzpk.test.ts
  3 pass / 0 fail

pnpm --filter @gamehub/kg-dzpk-engine typecheck
pnpm --filter @gamehub/backend typecheck
  均通过

scripts/verify-original-client-boundary.ps1
  OriginalClientBoundaryVerified
  originalPrefabCount=6
  activeOriginalPrefabCount=5
  activeComponentClassIdCount=9
  byteIdenticalOriginalScriptCount=5
  semanticCoreSourceCount=5
  bootSceneNodeCount=8
```

Creator build 事实：`output/logs/creator247-build.log` 末尾记录
`Built to ...\build\web-mobile successfully`。最终截图均晚于该 build。

证据限制必须保留：

1. `forced-tie-sidepot-uncalled.png` 是修复前历史截图；其中“主池/边池/未跟注退回/座位”
   来自后来添加的长文本 pot row，已从当前源码删除。该图片不再是当前视觉证据，也不能作为
   概率/RTP/控牌结论。
2. `result-hand-1.png`、`result-hand-2.png` 来自 `playwright-two-hand-qa.js` 的自然 deterministic
   deal 和原按钮点击路径，未使用 forced settlement；它们可证明两手 UI 主循环，但仍是 TRIAL。
3. `.playwright-cli/console-*.log` 仍是早期历史记录，不作为 final verdict；exact-final browser session
   已单独核对为 console `0 error / 0 warning`，188 个 HTTP request 中 `context/init=200`，没有实际
   `4xx/5xx/ERR`。这些 final runtime facts 关闭了此前的 console/network 缺口，但仍需独立复查签收。
4. Fresh audio runtime 已证明 audio unlock、`sound/back` BGM、music/sound volume=`1` 和
   `isMusicPlaying=true`；截图只证明开关 UI，最终听感仍不是图片证据。
5. 844x390 是同一 final browser session 的 refresh/backend-restart 恢复证据，但仍不是物理 Android
   Chrome/WebView 或 iOS Safari/WKWebView。
6. GameHub DZPK backend 与 engine 仍是当前未提交工作树 diff；没有精确 commit、fresh independent
   review、线上部署或 REAL money evidence。

### 2.3 Exact-final browser telemetry

```text
sessionId: sid_iO-SGJfdMn4bpi_c
roomId: 190101
viewport: 844x390
refresh continuity: same session / room / viewer / six seats
atomic backend restart continuity: same session / room / viewer / six seats
URL launch credential: absent
Night node: present
night opacity: 255
day opacity: 0
console: 0 errors / 0 warnings
HTTP requests: 188
context/init: 200
actual HTTP 4xx/5xx/ERR: 0
audioUnlocked: true
currentBackgroundMusicPath: sound/back
musicVolume: 1
soundVolume: 1
cc.audioEngine.isMusicPlaying(): true
natural hand ids: ...4fb983...-hand-3 / ...4fb983...-hand-4
original UI clicks: 5 or 8 depending final run
```

Rule、Set 与 night 均由 actual browser click 触发；board 3/4/5、两手 Result、最终 Room/Main 和
844x390 证据均来自 final build。修复前 forced visual settlement 已失效，当前结算视觉交给人工复核。

Fresh independent review 已于 2026-08-25 完成，因此当前冻结为：

```text
Creator247OriginalClientParityVerified: true
FreshIndependentReview: passed
CurrentWorkingTreeHumanVisualRecheck: pending
```

## 3. 客户端 authority 禁区

独立 Cocos 只能持有当前 viewer 可以观察的投影和发起玩家意图。以下事实不得出现在客户端源码、
build、localStorage、console、网络响应或可反推字段中：

| 禁止客户端持有的事实 | 原因 | 服务端权威归属 |
|---|---|---|
| 完整 deck、剩余 deck、deck cursor、root seed、完整 deal commitment 原文 | 可预测后续牌 | DZPK hand authority 内部快照 |
| candidate deals、candidate count、candidate score、未选候选 | 暴露控牌/开奖选择 | source-specific deal adapter 与审计 |
| 机器人未公开底牌、机器人完整私有 AI state、AI RNG state | 隐藏信息与可预测动作 | 服务端 bot actor |
| 其他真人未公开底牌、其他玩家即时 `px` | 直接作弊 | per-viewer projector |
| control direction、target UID、policy、progress、remaining target、库存阈值 | 控制泄漏 | KG control resolver/audit |
| WalletGateway、订单、账变、余额前后事实、rake ledger、回调、appSecret | 资金与商户密钥边界 | GameHub backend |
| 未脱敏完整 authority snapshot 或 event journal | 同时包含私牌、控制和幂等事实 | Redis/MySQL authority store |

客户端允许持有：本人两张牌、已公开公牌、公开动作/下注、公开 pot、公开玩家状态、本人可用合法动作、
本人 viewer balance 投影，以及摊牌时按规则应公开的未弃牌玩家底牌。`wGameData.gold` 只是显示投影，
不是钱包事实源。

机器验证最低要求：

```text
assets + build 全文扫描禁止词
每个 viewer 的 RoomInfo/PublicCards/Result 单独快照测试
SHOWDOWN 前 opponent cards 必须是 [1,1] 或等价 hidden marker
任一响应不得出现 control/deal candidate/wallet internal metadata
```

## 4. 原入口、Prefab、节点与动画矩阵

| 功能 | 原客户端入口 / 节点 / 动画 | 原事件与关键字段 | 后端权威职责 | 当前 Phase A 状态 | 机器验证方法 |
|---|---|---|---|---|---|
| Standalone 启动 | 原版是 Hall `Main.fire -> enterSite -> Load`；目标为 `Scene/DzpkStandaloneBoot.fire -> StandaloneBoot -> 原 Load` | 启动后先认证，再 `Msg_Hall_Connect` | 验证 launch/session/gameCode，绑定 viewer；客户端不得自造身份 | `IntentionalDifferenceWithAuthorityReason`：移除可见 Hall，但不替换原 Load/Room/Main | 静态断言 Boot 只挂兼容服务；运行断言首个可见 DZPK UI 来自 `Load.prefab`；扫描无自绘 Seat/ResultPanel |
| Load | `Load.prefab` 根节点 `Load`；`DZPKLoad` 播放 loading Spine `start -> idle(loop)`、BGM、预加载 DZPK 资源 | C→S `Msg_Hall_GameSessions {gtype:19}`；S→C 房间配置 | 保持 source WS gtype 19，并以 GameHub gameCode `dzpk-955` 绑定 catalog/source game id 119，返回权威 room profiles | `Match`：原 Prefab/脚本哈希一致；当前 TRIAL 响应已有 focused test | SHA-256/UUID；Creator 组件反序列化；fixture 断言 `GameSessions` 只返回 level/config，不含控制或 wallet 内部事实 |
| Room | `Room.prefab`；原头像、昵称、gold、三房间、faststart、Rule、声音；原房间进场动画 | C→S `Msg_Hall_EnterRoom {tableid:0,gtype:19,level}`；S→C `{rid,gtype,level,doublescore}` | 房间准入、3–6 人座位、room identity、min/max 检查、session/merchant/player 绑定 | `Match`：原 UI 已物化；正式 room admission `PlannedLaterPhase` | Prefab UUID/class id；三 level 点击 fixture；错误 minGold 时只显示原提示且不进入 Main |
| Main 桌台 | `DZPKMain.prefab` 1334x750、321 节点；`gameType/poker/player/win/btn/chip/tips/DropDown/allBet` | `Msg_Hall_FinishLoad -> Msg_DZPK_RoomInfo` 后进入运行 | 构造 per-viewer RoomInfo；维持 hand/revision/actor/deadline；绝不发送未授权私牌 | `Match`：原节点、五脚本、25 Spine/6 Particle/7 Animation 均在；真实一手 `PlannedLaterPhase` | 边界脚本；Creator 构建；浏览器节点树快照必须存在原节点名且不存在自绘 ResultPanel |
| Rule | 原 `Rule.prefab`，由 `DropDown.onClickBtn('rule') -> wViewMgr.openPage` 打开 | 无业务开奖事件 | 无服务端状态；只提供来源规则说明 | `Match` | 点击 Rule，断言实例化 UUID `1eb86003-...`，关闭后主桌状态不变 |
| Set | 原 `Set.prefab`，由 DropDown 打开；音效/音乐开关 | 本地 `local_Event`/AudioManager | 不接触牌局、控制或钱包 | `Match` | 点击 Set，断言 UUID `31f79f27-...`；切换音频后 snapshot/revision 不变 |
| Rule/Set stale ClickEvent | 原 DZPKMain 两条 ERNN/BJL 无 target binding，不可达且可能报错 | 无有效事件 | 无 | `SourceDefectRepair` | `verify-original-client-boundary.ps1` 必须拒绝 `__id__ 977/985` 空 target 恢复 |
| Bank | `Bank.prefab` 与 `GameBank.js` 存在；Room/Main 两处 bank 节点默认 inactive，case 直接 break | Hall Bank 商业存取消息在本游戏可达链中不存在 | 不开放银行、充值、提现或代理入口 | `NotApplicable` | 静态证明 Bank UUID 不被活跃五 Prefab 引用；浏览器菜单无可达 Bank；API 对 Bank 动作 fail closed |
| 背景动画 | `DZPKView.playBGAnim` 在原 Spine 循环 `suiji1..suiji4` | 无 | 无 | `Match`（资源/脚本）；runtime 待 browser | 验证四动画名可播放且循环后无节点泄漏 |
| 操作计时动画 | 每座 `info/prog` 的 `Animation.play().speed=1/time`；本人剩余 3 秒播放 half_time | `CallUserAct.time` | deadline 唯一权威；重连返回剩余秒而非重置 30 | `PlannedLaterPhase` | fake clock：30→3→0；restore 后同 deadline；重复 timeout 只执行一次 |
| 发私牌 | 原 `showFaPai`、牌背/牌面、`fapaib` 声音，按 dealer/座位序列 | `Msg_DZPK_FaCards {cards,ingame,bankeruid}` | 每 viewer 个性化：只发送本人底牌；同 hand 使用同一已提交 deal | `PlannedLaterPhase` | 六 viewer fixture；本人两张合法牌、他人无底牌；全桌牌无重复；事件序列先 FaCards 后 StageBet |
| 发公牌 | 原 `showPubliccards`：flop 3、turn 1、river 1；`fapaia` 声音和原 cc.Action | `Msg_DZPK_PublicCards {cards,px}` | 公牌全桌一致；`px` 只含当前 viewer 且为 legacy value string | `PlannedLaterPhase` | transcript 断言 3/1/1；all-in 可一次发剩余；对手 `px` key 不得出现 |
| 筹码动画 | 原 `setPlayerBet/recoverBet/showGetPlayerBet` 与 `chipfly/hechip` | `StageBet.bets`、`ActBet.gold`、`Result.upgold/pots` | 所有 amount 来自 hand authority；客户端只动画，不结算 | `PlannedLaterPhase` | 每事件前后 pot/stack 守恒；重复事件不重复加减；side-pot fixture 按 awards 飞向正确座位 |
| 摊牌/获胜动画 | 原 `playerBrightCard`、win/lose/bigwin Spine、牌型 Spine/粒子、`showWinGold` | `Msg_DZPK_Result` | 计算 best-five、多赢家、各 pot winners、rake、returns 和最终余额 | `SourceDefectRepair`：保留原动画，窄扩展多赢家/多池 | 单赢家走原动画不回归；tie/side-pot 每个赢家被标 win；未跟注退回不播放胜利音效 |

## 5. 原协议 envelope 与身份映射

原 KG frame 是 Base64 UTF-8 JSON，核心 envelope：

```json
{
  "event": "Msg_DZPK_ActBet",
  "area": 0,
  "uid": 123,
  "request_id": "server-private-idempotency-key",
  "data": {"gold": 2000}
}
```

响应继续保持原 Cocos 消费形态：

```json
{
  "event": "Msg_DZPK_CallUserAct",
  "area": 0,
  "uid": 123,
  "status": 1,
  "msg": "",
  "data": {"uid": 123, "minbet": 2000, "time": 30}
}
```

`request_id/handId/revision/actionSeq/deadlineEpochMs` 是 GameHub 私有兼容扩展；原脚本可以忽略，
transport/authority 必须用于幂等、乱序和重连。客户端 envelope 中的 `uid` 不能作为身份事实；服务端
必须从已认证 connection 解析 actor，并校验 payload uid 一致。

| 身份 | 原值 | 目标映射 | 状态 | 验证 |
|---|---|---|---|---|
| Cocos gameID | `19` | 仅原组件内部使用 | `Match` | GameContext 常量与原 Config route 一致 |
| Catalog / source game id | `119` | GameHub `dzpk-955` catalog identity | `Match`（当前 shared type / context diff） | context gameCode 与 source inventory 对齐 |
| PHP / source WS gtype | `19` | KG WS/Hall adapter 权威值 | `Match`（当前 TRIAL diff） | `kg-ws.dzpk.test.ts` 端到端 `gtype:19`；未知 gtype 拒绝 |
| gameCode | 无当前原字段 | `dzpk-955` | `Match`（GameContext）；backend `PlannedLaterPhase` | context/init gameCode mismatch 必须拒绝 |
| uid | 原 numeric scalar | 从 platformPlayerId/merchantPlayerId/session 派生稳定 source UID | `IntentionalDifferenceWithAuthorityReason` | 同 session 重连 UID 不变；跨 tenant 不可碰撞/冒用 |
| rid | Hall 分配 | Redis/MySQL room admission authority | `PlannedLaterPhase` | EnterRoom/FinishLoad/rebind 三段一致性测试 |

## 6. 客户端发送事件矩阵

| 原事件 | 原入口 | 原 data | adapter 语义 | 后端权威职责 | 当前状态 | 机器验证 |
|---|---|---|---|---|---|---|
| `Msg_Hall_Connect` | Standalone authenticated WS open | `{gtype:19}` | 建立 KG source lifecycle | launch/session/game/merchant/player/connection ownership | `PlannedLaterPhase` | token 错、sid 错、gameCode 错、重复连接、过期 session 全部拒绝 |
| `Msg_Hall_GameSessions` | `DZPKLoad` | `{gtype:19}` | 查询 DZPK 房间配置 | 返回版本化 room profile；不返回控制/库存 | `PlannedLaterPhase` | 三 level schema、source defaults hash、未知 gtype 拒绝 |
| `Msg_Hall_EnterRoom` | `DZPKRoom.enterRoom` | `{tableid:0,gtype:19,level}` | reserve room/seat | min/max、容量、身份、room version | `PlannedLaterPhase` | 快速开始、指定 level、房满、余额不足、重试幂等 |
| `Msg_Hall_FinishLoad` | `PokerBase.m_init` | `{rid}` | activate/rebind；触发 RoomInfo | 必须先回 FinishLoad success，再发送 viewer RoomInfo | `PlannedLaterPhase` | 首进、刷新、断线重连、错误 rid、旧 connection fence |
| `Msg_DZPK_ActBet` | `sendMsgActBet` | `{gold}`，本次增量；负数弃牌 | 转换为语义动作 command | actor/seat/hand/revision/clientActionId/legal action/余额全部校验 | `SourceDefectRepair` | 见动作矩阵；非法请求状态不变并重新投影合法按钮 |
| `Msg_DZPK_Out` | `requestReturnToRoomSelection`（兼容 `PokerBase.m_quitGame`） | `[]` | leave-table intent | 进行中且未弃牌不能返回；成功响应调用 `wViewMgr.quitGame`，独立 navigator 显示原 Room；Room exit 才结束游戏 | `IntentionalDifferenceWithAuthorityReason`：移除后来添加的浏览器 confirm，保留原 source event | 当前源码逻辑已核对；视觉/交互交给人工复核 |
| 本地自动动作 | `autoList` 三项 | 不发独立 server trustee 消息 | 到本人回合时客户端仍只提交普通 ActBet intent | 服务端仍做全部合法性与 timeout | `Match`（原脚本） | 让或弃、自动让牌、跟任何注；刷新后不把本地 auto 当服务端事实 |

## 7. 服务端发送事件矩阵

| 原事件 | 必需字段 | 原客户端消费点 | viewer/权威规则 | 当前状态 | 机器验证 |
|---|---|---|---|---|---|
| `Msg_Hall_Connect` | `status,data.uid,rid?` | transport wait | authenticated viewer only | `PlannedLaterPhase` | Base64 envelope、status、source UID、无 credential 回显 |
| `Msg_Hall_GameSessions` | 每 level 的 `level,min_gold,max_gold,doublescore` | `DZPKLoad/DZPKRoom` | authoritative config projection | `PlannedLaterPhase` | Cocos roomConfig snapshot 与 backend config version 对齐 |
| `Msg_Hall_EnterRoom` | `rid,gtype,level,doublescore?` | `DZPKRoom.Msg_Hall_EnterRoom` | room admission result | `PlannedLaterPhase` | success 后才能 load Main；失败不改变 roomID |
| `Msg_Hall_FinishLoad` | 原请求 data 或 `{rid}` | `PokerBase.Msg_Hall_FinishLoad` | 必须先于 RoomInfo | `PlannedLaterPhase` | 顺序断言 FinishLoad(seq n) < RoomInfo(seq n+1) |
| `Msg_DZPK_RoomInfo` | 见下一节完整 schema | `DZPKControlle.m_roomInfo` | per-viewer snapshot、剩余 timer、无控制泄漏 | `PlannedLaterPhase` | WAIT/DEAL/每街/RESULT 快照矩阵 |
| `Msg_DZPK_PlayerAct` | `nickname,gold,uid,headimgurl,seat` | 增加座位 | 仅公开玩家资料；bot 换代需与 Out 配对或保持 UID | `PlannedLaterPhase` | 中途 observer 入座、bot 换代、重复事件幂等 |
| `Msg_DZPK_FaCards` | `cards,ingame,bankeruid` | 清桌、发两轮私牌 | 每 viewer 只发自己的 cards | `PlannedLaterPhase` | 每手一次；不在正常下一手前重复 RoomInfo |
| `Msg_DZPK_StageBet` | `bets[uid]` | 下注动画、扣显示 stack、增加 pot | 包含前注+盲注的本手强制投入 | `PlannedLaterPhase` | `sum(bets)=players*ante+SB+BB`（足额栈） |
| `Msg_DZPK_CallUserAct` | `uid,minbet,time`；扩展 handId/actionSeq/deadline | 保存 `Model.callUid`、显示按钮/倒计时 | actor 与 legal action snapshot 权威；time 为剩余秒 | `PlannedLaterPhase` | 30 秒、重连剩余、错 actor、乱序、deadline 到达 |
| `Msg_DZPK_ActBet` | 原 `act,gold`；扩展 `uid,seatId,raiseTo,actionSeq,handId` | 原版目前用 `Model.callUid` 找 actor | 新 actor uid 修复乱序；旧端仍可 fallback callUid | `SourceDefectRepair` | Call(A),Call(B),迟到 Act(A) 不得应用给 B；重复 actionSeq 不重复扣款 |
| `Msg_DZPK_PublicCards` | `cards,px`；可扩展 board/handId/revision | 公牌动画和本人牌型提示 | `px` 只允许 `{viewerUid: legacyString}` | `SourceDefectRepair` | flop/turn/river、all-in runout、六 viewer privacy |
| `Msg_DZPK_Result` | 原 scalar + 窄扩展，见结算节 | 摊牌、赢家、筹码、余额、15 秒 | terminal settlement 唯一事实；结果重播不得再次入账 | `SourceDefectRepair` | single/tie/side/odd/uncalled/rake、重复 Result、RESULT 重连 |
| `Msg_DZPK_ChangGold` | `uid,gold` | 更新座位显示 | 只投影已提交钱包/桌台变化 | `PlannedLaterPhase` | 外部余额变化不能在一手中途篡改 reserved table stack |
| `Msg_DZPK_Out` | `uid,gold` | 删除座位；本人退出 Main | 公开 leave；gold 是最终 viewer projection | `PlannedLaterPhase` | bot replacement、真人退出、房间空关闭 |

## 8. RoomInfo 快照合同

原字段必须保留：

```text
stage, players, curbet, publiccards, notice, allbet,
bankeruid, level, doublescore, px, allbets
```

允许新增但不得替代原字段：

```text
handId, revision, street, deadlineEpochMs, resultReplay
```

| RoomInfo 字段 | 精确语义 | 隐私要求 | 当前状态 | 机器验证 |
|---|---|---|---|---|
| `stage` | `0 WAIT / 1 DEAL / 2 BET / 3 RESULT` | 公共 | `PlannedLaterPhase` | 内部 PREPARING..DEALING→1，PREFLOP..RIVER→2，SHOWDOWN..SETTLED→3 |
| `players[].uid/seat/nickname/headimgurl/gold` | 公开座位投影 | 不含 merchant/internal IDs | `PlannedLaterPhase` | 原 View `setPlayerInfo` 不缺字段；长昵称/头像 fallback |
| `players[].cards` | viewer 本人真实两张；对手参局 `[1,1]`；旁观/未参局 `[]` | 核心私牌隔离 | `SourceDefectRepair` | 六 viewer golden snapshots；SHOWDOWN 前无对手 card id |
| `curbet[uid]` | 当前街 `act/gold` | 公共 | `PlannedLaterPhase` | preflop blind、call、raise；换街清 active action，保留 fold/all-in 状态 |
| `allbets[uid]` | 本手累计投入 | 公共 | `PlannedLaterPhase` | 每动作与 pot conservation 一致 |
| `publiccards` | 已公开 0/3/4/5 张 | 公共且全 viewer 相同 | `PlannedLaterPhase` | viewer diff 只允许私有字段不同 |
| `notice` | 当前 actor、toCall、剩余秒；无 actor 时 `[]` | 公共 | `SourceDefectRepair` | 重连不重置 30；过期时 0 并由 server timeout exactly once |
| `allbet` | 当前总 pot，包括已投入前注/盲注/弃牌筹码 | 公共 | `PlannedLaterPhase` | `allbet=sum(allbets)`，terminal 前不含尚未提交 payout |
| `bankeruid` | 当前 dealer/button | 公共 | `SourceDefectRepair` | 按标准方向与 action 环同向轮转；稀疏座位测试 |
| `doublescore` | 原实现实际为小盲；大盲 `2x` | 公共配置 | `Match`（来源定义）；backend later | 与 Room label、StageBet 和 minRaise base 一致 |
| `px` | viewer 当前 best-five legacy value | 只能有 viewer key | `SourceDefectRepair` | 值必须是 string；原 `getPokerType().slice()` 不报错；无其他 UID |
| `resultReplay` | RESULT 重连的同 hand terminal result | per-viewer | `IntentionalDifferenceWithAuthorityReason` | RoomInfo(stage3) 后只重播同 hand Result；不重复资金 mutation |

完整 authority 内部快照还必须保存 deck、未公开 board、hole cards、deal/control decision、actions、receipts、
pots、pending settlement、RNG state/seed、deadline 和 next event sequence，但这些字段永不进入 RoomInfo。

## 9. 一手完整状态与消息时序

原 wire 只暴露四个 stage，正式内核可以使用更细的内部状态：

```text
WAITING
-> PREPARING
-> HOLD_READY
-> DEAL_COMMITTED
-> DEALING             wire stage 1, 2 seconds
-> PREFLOP             wire stage 2
-> FLOP                wire stage 2, reveal 3
-> TURN                wire stage 2, reveal 1
-> RIVER               wire stage 2, reveal 1
-> SHOWDOWN
-> TERMINAL
-> SETTLING
-> SETTLED             wire stage 3, 15 seconds
-> WAITING / next hand
```

正常一手 wire transcript：

```text
Msg_DZPK_FaCards
-- 2s --
Msg_DZPK_StageBet
Msg_DZPK_CallUserAct
(Msg_DZPK_ActBet -> next CallUserAct)*
Msg_DZPK_PublicCards {cards:[flop3]}
(ActBet -> CallUserAct)*
Msg_DZPK_PublicCards {cards:[turn1]}
(ActBet -> CallUserAct)*
Msg_DZPK_PublicCards {cards:[river1]}
(ActBet -> CallUserAct)*
Msg_DZPK_Result
-- 15s --
next Msg_DZPK_FaCards
```

| 功能 | 原源码行为 | 后端 authority 规则 | 当前状态 | 机器验证 |
|---|---|---|---|---|
| 开局人数 | PHP 至少 3 人，最多 6 座 | 少于 3 人保持 WAIT；不能因通用 Holdem 支持 heads-up 而自动启用 2 人局 | `Match`（规则 ledger）；runtime later | 2 人不发 FaCards；第 3 人进入后且状态允许才开局 |
| dealer | PHP 源按钮方向与行动方向相反，属缺陷 | 按标准德州让按钮与行动沿同一 live-seat 环 | `SourceDefectRepair` | occupied `[0,2,4]`、button0，next button2 |
| deal window | PHP 2 秒 | server deadline；客户端只动画 | `Match`（配置）；runtime later | 1999ms 不得 StageBet，2000ms 后 exactly once |
| preflop | 大盲后下一 live seat 首行动；大盲有最后 check 机会 | 标准 actor/pending-to-act | `PlannedLaterPhase` | 3–6 人、稀疏座位、blind all-in |
| flop/turn/river | dealer 后第一个可行动玩家先行动 | 每街重置 street contribution/last full raise；fold/all-in 保留 | `PlannedLaterPhase` | 每街 actor、board count、按钮状态 |
| 只剩一名未弃牌 | 立即 Result，不亮剩余牌 | 不计算/泄漏未公开 board；folded contribution 留在 pot | `PlannedLaterPhase` | preflop folds-to-one transcript |
| 全员或只剩一人可行动 | 一次发完剩余公牌再 Result | runout 使用已提交 deal，不能重新选牌 | `SourceDefectRepair` | preflop all-in `PublicCards(5)->Result`；flop all-in `PublicCards(2)->Result` |
| result window | 15 秒 | deadline 存 snapshot；期间可重连看同一结果 | `PlannedLaterPhase` | 14999ms 不开下一手，15000ms server auto next |
| 两手自动续局 | PHP server `Result + 15s -> Init -> FaCards` | 由 server scheduler 自动；客户端不得发送 `NEXT_HAND` | `SourceDefectRepair` | 两手 handId 不同、button 前进、stack 延续、第二手完整结束 |

## 10. 盲注、前注、牌与配置规则

| 规则 | 原版事实 | 当前分类 | 验证 vector |
|---|---|---|---|
| 牌编码 | `rank*100+suit`；rank `2..14`，suit `1方片/2梅花/3红桃/4黑桃` | `Match` | `1404=A♠,1401=A♦,202=2♣`；越界/重复拒绝 |
| 牌型 | `1高牌..10皇家同花顺` | `Match`（显示分类）；标准比较为 repair | 十类 golden；wheel；best 5 of 7；全 kicker chain |
| 花色破平 | PHP `ColorValue` 用底牌数值/花色选唯一赢家 | `SourceDefectRepair` | 同 best-five 不论花色必须 compare=0 |
| 小盲 | `doublescore` | `Match` | room level 2: 1000 |
| 大盲 | `2*doublescore` | `Match` | room level 2: 2000 |
| 前注 | 每参局玩家 `20*doublescore` | `Match` | level 2: 每人 20000 |
| 体验/新手/初级展示 | `10k/20k+200k`、`1k/2k+20k`、`5k/10k+100k` | `Match`（Cocos 文案）；正式 DB defaults later | Room label 与 backend source config exact diff |
| 牌守恒 | 原 52 张，无王 | `SourceDefectRepair` 边界内保留 | deck+all hole+board 唯一；客户端不得收到 deck |
| burn card | 原源码没有 burn card 协议/可见行为 | `NotApplicable` | 不新增 burn UI/事件；内部不得因此改变 source-visible card sequence without authority |

四人 `doublescore=1000` 强制投入 golden：

```text
dealer total=20000
small blind total=21000
big blind total=22000
UTG total=20000
pot=83000
street contributions=0/1000/2000/0
first actor=UTG
toCall=2000
initial minRaiseTo=4000
```

## 11. 玩家动作与合法性矩阵

原 action code：

```text
1 SMALL_BLIND
2 BIG_BLIND
3 RAISE
4 CALL_OR_CHECK
5 FOLD
6 ALL_IN
```

原 Cocos 发出的 `gold` 是“本次增加的筹码”，不是最终 street target。adapter 必须在服务端当前
snapshot 上转换，不能让客户端自行决定 act code。

| 玩家意图 | 原请求 | 标准内部 command | 合法条件 | 当前状态 | 机器验证 |
|---|---|---|---|---|---|
| Fold | `gold < 0` | `FOLD` | 当前 actor、可行动 | `PlannedLaterPhase` | wrong actor/stage/revision 拒绝；fold 后跳过所有后续街 |
| Check | `gold=0` | `CHECK` | `toCall=0` | `PlannedLaterPhase` | facing bet 时拒绝且状态不变 |
| Call | `gold=toCall` | `CALL` | stack 足额 | `PlannedLaterPhase` | contribution/stack/pot 同步；大盲无加注时可 check |
| Short call all-in | `gold=remainingStack<toCall` | `ALL_IN` | 全部剩余筹码 | `SourceDefectRepair` | 合法；不降低 currentBet；不再请求该玩家动作 |
| Full raise | 合法增量 | `RAISE {raiseTo}` | `raiseTo>=currentBet+lastFullRaiseSize` | `SourceDefectRepair` | BB200、A raiseTo600 后 B raiseTo800 必须拒绝，min=1000 |
| Short raise all-in | `gold=remainingStack` | `ALL_IN` | raise 小于 full raise 但为全下 | `SourceDefectRepair` | A/B 已行动，C short all-in 后 A/B 只可 call/fold，不重新开放 raise |
| All-in full raise | `gold=remainingStack` | `ALL_IN(fullRaise=true)` | 增量达到 last full raise | `SourceDefectRepair` | 必须重新开放给此前已行动玩家 |
| 非 BET 动作 | 任意 | 无 | DEAL/SHOWDOWN/RESULT 禁止 | `SourceDefectRepair` | action error 后 stack/pot/revision/actionNo 不变 |
| 重复请求 | 相同 `request_id/clientActionId` | 返回旧 receipt | payload hash 完全相同 | `PlannedLaterPhase` | 重试只产生一条 action/ledger fact；同 id 不同 payload 冲突 |
| 乱序请求 | 旧 hand/revision/actionSeq | 拒绝 stale | hand/revision 必须匹配 | `PlannedLaterPhase` | stale hand、stale revision、seat mismatch 分别测试 |

原界面的 3BB/4BB/pot、1/2 pot、2/3 pot、pot 和 slider 继续保留，但 adapter 必须把 UI 显示的
target 与旧增量协议转换清楚。例如大盲已投入 `2*SB`，点击“3x大盲”应得到 street total `6*SB`，
而不是在大盲上再加 `6*SB`。

## 12. timeout、断线、刷新和快照

| 场景 | 原可见预期 | 后端权威行为 | 当前状态 | 机器验证 |
|---|---|---|---|---|
| actor timeout 且 `toCall>0` | 自动弃牌，播放普通 fold 可见结果 | deadline 到达后 exactly-once FOLD | `PlannedLaterPhase` | fake clock、重复 ticker、restore 后重复 ticker |
| actor timeout 且 `toCall=0` | 自动让牌/check | exactly-once CHECK | `PlannedLaterPhase` | `ActBet act=4,gold=0` 后正确轮转 |
| 真人断线 | 牌局继续；轮到时由 timeout 处理 | 标 offline，保留 seat/hand/chips；不泄漏牌、不自动兑现 | `PlannedLaterPhase` | 断线前后完整 authority snapshot hash；机器人/其他玩家可继续 |
| WS 重连 | `Hall_Connect -> FinishLoad -> RoomInfo` 恢复同一手 | Redis ownership rebind；旧 connection fenced | `PlannedLaterPhase` | 同 session 新 connection、旧 socket 再发动作必须拒绝 |
| DEAL 重连 | 恢复私牌/参局/按钮和剩余 deal 时间 | stage1 + remaining deal deadline | `PlannedLaterPhase` | 不重复生成 deal、不重复发盲注 |
| 各街重连 | 恢复 board、本人牌、各玩家 act/contribution、actor、remaining time | per-viewer RoomInfo | `PlannedLaterPhase` | PREFLOP/FLOP/TURN/RIVER 四 snapshot golden |
| RESULT 重连 | 看到同一 terminal result 和剩余 15 秒 | stage3 RoomInfo + 幂等 Result replay | `IntentionalDifferenceWithAuthorityReason` | replay 只动画，不重复 wallet/round/ledger/control progress |
| 浏览器前后台 | 原 audio pause/resume；回前台必要时重连 | authority deadline 不因页面暂停 | `Match`（Boot lifecycle）；backend later | 后台跨过 timeout/result deadline，回前台状态与 server 一致 |

重连原则：完整刷新优先使用当前 viewer snapshot，不从 event 1 重播整手动画再覆盖 snapshot；只有当
客户端携带连续 ack 且服务端确认 journal 未断档时，才补发 snapshot revision 之后的事件。

## 13. 机器人矩阵

| 功能 | KG PHP 原版 | 后端权威职责 | 客户端可见 | 当前状态 | 机器验证 |
|---|---|---|---|---|---|
| 身份 | `client_id=''` 的玩家为机器人 | 服务端创建/替换，公开 uid/seat/nickname/avatar/stack | 与普通座位相同公开资料 | `PlannedLaterPhase` | 1 真人+5 bot；bot UID 唯一；替换只在安全边界 |
| 行动延迟 | 轮到后约 1–5 秒 | server persisted/scheduled deadline | 只看到 CallUserAct 后延迟动作 | `PlannedLaterPhase` | 每动作 delay `[1,5]s`；restore 后不重复/提前 |
| 决策 | 原 `AI.php` 按底牌/公牌/投入/控制目标决定 fold/call/raise/all-in | bot 读取自身私牌和 public board；所有输出过同一 legal validator | 只看到最终公开动作 | `SourceDefectRepair` | 烂牌、对子/同花、made hand、controlled bot；100% legal |
| 生命周期 | PHP endtime/idle 后可随机离开，进行中仅安全退出 | 只在 hand 安全边界换代，或发 Out/PlayerAct 维持原 Model | 座位公开变化 | `PlannedLaterPhase` | 两手间换代；手中不替换；RoomInfo 与事件一致 |
| bot 私有状态 | 原只在 PHP 内部 | 不投影 RNG、hole、candidate/control metadata | 永不可见 | `SourceDefectRepair` | assets/build/network/console 全扫描；opponent cards hidden |

旧 `d20b019a6` 的 `bot.ts` 是通用强度 AI，不是原 PHP 策略；只能借用“legal action gate”结构，
不能作为 SourceMatch 证据。

## 14. viewer privacy 矩阵

| 阶段 | viewer 本人 cards | 对手 cards | `px` | Result cards | 状态 |
|---|---|---|---|---|---|
| WAIT | `[]` | `[]` | `{}` | 无 | `PlannedLaterPhase` |
| DEAL/PREFLOP | 两张真实牌 | `[1,1]` | `{}` | 无 | `SourceDefectRepair` |
| FLOP/TURN/RIVER | 两张真实牌 | `[1,1]` | 仅 `{viewerUid: legacyValue}` | 无 | `SourceDefectRepair` |
| fold-to-one terminal | 不要求亮牌 | 仍隐藏 | 无新泄漏 | winner 可不亮底牌 | `SourceDefectRepair` |
| showdown | 本人真实牌 | 仅未弃牌玩家按规则亮牌；弃牌者隐藏 | 可由 Result value 表达 | bestFive/hcards 仅适用玩家 | `SourceDefectRepair` |
| spectator/mid-hand entrant | `[]` | 全部隐藏 | `{}` | 仅公开 result | `PlannedLaterPhase` |

隐私 golden：六名 viewer 对同一内部 hand 生成六份 RoomInfo；除 `players[].cards`、本人 `px`、本人
economics 等 viewer 字段外，公共 board/pot/actor/revision 必须完全一致。序列化任一 viewer 响应不得
包含其他玩家的牌 ID、控制方向、candidate count 或 deck commitment。

## 15. 标准结算与原单赢家 UI 的窄扩展

原 PHP 只返回一个 `winner`，并用两张底牌完整数值/花色破平；高于赢家投入的部分被逐人退回，未真正
建立边池。这些是源码缺陷，不得因恢复原 UI 而恢复。

### 15.1 标准 settlement 合同

```json
{
  "winner": "main-pot-primary-winner",
  "winners": ["p1", "p2"],
  "winnersByPot": [["p1", "p2"], ["p3"], ["p4"]],
  "wingold": 123,
  "upgold": {"p1": 200, "p2": 199, "p3": 400, "p4": 200},
  "usergold": {"p1": 1000, "p2": 999},
  "pots": [
    {
      "index": 0,
      "amount": 399,
      "uncalledReturn": false,
      "winnerIds": ["p1", "p2"],
      "awards": {"p1": 200, "p2": 199}
    }
  ],
  "uncalledReturns": {"p4": 200},
  "cards": {
    "p1": {
      "cards": [1404, 1403, 1402, 1304, 1303],
      "hcards": [1404, 1403],
      "value": "71414141313",
      "valueDetail": {"category": 7, "tiebreakers": [14, 13], "label": "Full House"}
    }
  },
  "time": 15,
  "totalRake": 0
}
```

原字段不删除；新增字段旧脚本可忽略。`cards[uid].value` 和每街 `px[uid]` 必须继续是 legacy string，
因为原 `getPokerType()` 会调用 `.slice()`。结构化值放到 `valueDetail`。

### 15.2 结算矩阵

| 功能 | 标准权威行为 | 原 UI 最窄扩展 | 当前状态 | 机器验证 |
|---|---|---|---|---|
| 单赢家单池 | 一个 pot/一个 winner | 完全走原 `winner/showGetPlayerBet/showWinGold` 动画 | `PlannedLaterPhase` | 原单赢家 screenshot/video 回归；余额和 pot 守恒 |
| 公牌平局 | 花色不破平，pot 平分 | `winner` 保留主池第一个 clockwise winner；`winners` 中所有人复用原 win 标识 | `SourceDefectRepair` | board `[A,K,Q,J,10]`，两家无论底牌/花色都平分 |
| 奇数筹码 | 从 button 左侧起第一个获胜座位依次拿 odd chip | 金额 label 按 `awards` 显示 | `SourceDefectRepair` | pot303、两赢家，award 152/151，clockwise 确定 |
| 主池/边池 | contribution tiers，每层只在 eligible 玩家中比较 | 主池第一赢家走完整原 Spine；边池赢家复用原标签/筹码动画，不新建 ResultPanel | `SourceDefectRepair` | 100/300/500 exact vector |
| 未跟注返还 | 单 contributor layer 原额返还，不收 rake、不算 win | 只播放筹码返还；不播放 win/bigwin 声音 | `SourceDefectRepair` | C overbet 200 返回；`uncalledReturn=true`；总额守恒 |
| folded contribution | 留在相应 pot，但 folded 永不 eligible | folded 座位保持灰态/不亮牌 | `SourceDefectRepair` | 各层 contributor/eligible 集合 exact snapshot |
| rake | 只能按获授权、版本化规则；未跟注返还不收 | 显示最终 `wingold/usergold`；不由客户端计算 | `PlannedLaterPhase` | 每层 payout+rake=amount；与 source rebate policy 的 IntentionalDifference ledger |

`100/300/500` golden：

```text
A contribution=100，主池牌力第一
B contribution=300，边池牌力第一
C contribution=500

main pot=300 -> A
side pot=400 -> B
uncalled return=200 -> C
payout A/B/C = 300/400/200
```

客户端不得只因 `winner=A` 把 B 显示为 loser；B 是边池赢家。`upgold/usergold/pots[].awards` 都是
服务端 terminal result，客户端只消费。

## 16. 控牌与控制进度矩阵

KG 原 `GetChessCardControl` 返回 `uid -> -2/-1/0/1/2`。DZPK PHP 在玩家观察前固定公牌，生成每位
玩家候选底牌并计算最终牌力，再把最强候选分给最高优先级 UID；其余优先级会被随机改写，所以源码
只严格保证“一个最高优先级赢家”，并不保证负控玩家一定拿绝对最弱牌。

| 控制功能 | 原版事实 | 正式 authority 要求 | 客户端要求 | 当前状态 | 机器验证 |
|---|---|---|---|---|---|
| OFF | 随机牌局；原分配算法在零控制下等价随机 | 不读取/应用目标；保留随机性与牌守恒 | 不出现 control 字段 | `PlannedLaterPhase` | canonical seeds、多样性、OFF 与无 policy 等价 |
| UID POSITIVE | 最高优先级目标获得最强候选 | 只能在玩家未观察前提交；记录 source math/policy/decision hash | 永不暴露目标/方向 | `PlannedLaterPhase` | 正向 target net、deadband、重复 hand id 幂等 progress |
| UID NEGATIVE | 目标被排除于最强者，但源码不保证绝对最弱 | 不得把“非最强”报告成“绝对最弱”；标准 tie 不用花色强拆 | 永不暴露目标/方向 | `PlannedLaterPhase` | 负向 net；board tie 时 retry/no-op，不得 suit-break |
| 库存/table control | 机器人 `+1`、普通真人 `-1` 由 profit probability 触发 | 进入统一 RTP/UID adapter，不复制另一套控制器 | 不可见 | `PlannedLaterPhase` | 配置版本、概率 roll、P2P payout vector、审计 |
| terminal progress | 原 PHP 更新玩家进度/游戏 profit 存在缺陷 | 以真实 terminal economics、round/order/ledger witness 幂等累计 | 客户端只见本人最终余额 | `PlannedLaterPhase` | 同 hand 重放不二次进度；达到 target 自动停止 |

旧 `d20b019a6` 会在多套完整 deck 中连 board 一起择优，并默认高 candidate count；这不是原版
“固定公牌后分配候选底牌”的数学，不得直接作为 source control adapter。

## 17. TRIAL / REAL 与资金边界

| 边界 | TRIAL Phase A | REAL 后续阶段 | 当前状态 | 机器验证 |
|---|---|---|---|---|
| context/init | 必须是已签发的 `dzpk-955` TRIAL session | 必须绑定 merchant/player/currency/wallet mode | `Match`（客户端校验）；backend DZPK later | gameCode/mode/session mismatch 拒绝；credential 不写 localStorage/log |
| 牌桌筹码 | 隔离 demo/reserved projection；不调用真实 wallet | 入桌 hold/reserve，手中只改 table chips，终局 capture/release | `IntentionalDifferenceWithAuthorityReason` | TRIAL 网络中无 WalletGateway/order/ledger payload |
| 动作资金 | check/fold/call/raise 只改变 hand snapshot | 同样只改已保留 table chips，不为每动作建立 settled round | `PlannedLaterPhase` | 一手内没有重复 wallet debit；action retry 不重复筹码 |
| 一手结算 | demo chip conservation | 一手一次 staged `HAND_ECONOMICS`，对账 round/order/ledger/audit/rake | `PlannedLaterPhase` | terminal exact-once；wallet before+net=after；多池汇总一致 |
| 机器人资金 | 无真实 wallet/order/ledger | 仍无真人 wallet fact；作为 house/table participant 进入 payout vector | `NotApplicable`（bot wallet） | 任何 bot 不得生成真人钱包账户或商户回调 |
| REAL 启用 | 当前 transport 明确拒绝 | 仅在正式 DZPK WS/table/money/control/reconciliation gates 后开启 | `PlannedLaterPhase` | 非授权 REAL session fail closed；不得通过 URL 参数绕过 |

普通 GameHub `RoundService.play()` 每次要求正下注并立即结算，不能把 CHECK/CALL/RAISE 拆成多个
round。正式实现必须是一手一次的 staged poker-hand authority；这是资金正确性边界，不是可选优化。

## 18. 两手自动续局 golden transcript

两手验证不能只证明“第一手能结算、第二手进入 DEAL”。最低脚本：

```text
1. authenticated connect
2. Load -> Room -> Main
3. Hand-1 FaCards
4. Hand-1 StageBet
5. 完成四街或 all-in runout
6. Hand-1 Result
7. 等待 15 秒，客户端不发送 NEXT_HAND
8. Hand-2 FaCards 自动到达
9. 验证 dealer 前进、stack 延续、eventSeq 单调、handId 改变
10. 完整结束 Hand-2
11. 刷新并确认 Hand-2 Result 可恢复
```

断言：

```text
hand2.handId != hand1.handId
hand2.revision starts from its defined hand boundary
eventSequence is globally monotonic or epoch-qualified
dealer advances in action direction
sum(player stacks + house rake/reservations) conserved
no RoomInfo is injected before normal Hand-2 FaCards unless this is an actual reconnect
no client NEXT_HAND request exists
```

当前原脚本天然期待 server 自动下一手；旧自绘客户端的 NEXT_HAND 按钮和协议已判废。

## 19. SourceDefectRepair / IntentionalDifference 决策账本

| 决策 | 分类 | AuthorityReason | 不允许的回退 |
|---|---|---|---|
| 花色不破平、支持多赢家 | `SourceDefectRepair` | 标准德州比较与资金公平性 | 恢复 `ColorValue(holeCards)` 单赢家 |
| 标准 main/side pot、uncalled return | `SourceDefectRepair` | 终局资金守恒 | 按赢家投入逐人退款而不比较边池 |
| odd chip clockwise after dealer | `SourceDefectRepair` | 平局不可整除时需确定规则 | 随机或按花色分奇数筹码 |
| full raise 与 short all-in 不重开 | `SourceDefectRepair` | 标准 no-limit 行动权 | 固定 `2*SB` 作为所有 re-raise 最小增量 |
| button 与行动同向 | `SourceDefectRepair` | 标准桌台轮转 | 原 PHP `NextBankerUid -1` 与行动 `+1` 并存 |
| ActBet 增加 actor uid/actionSeq | `SourceDefectRepair` | 原消息依赖上一 CallUserAct，乱序会错人 | 只用 `Model.callUid` 猜 actor |
| `px` 仅 viewer 且 legacy string | `SourceDefectRepair` | 隐私与原 `.slice()` 合同 | 全桌 px 或 object value |
| RESULT 快照/重播 | `IntentionalDifferenceWithAuthorityReason` | 原 RoomInfo 缺 RESULT 恢复；GameHub 必须支持刷新 | stage3 重连空白或重新结算 |
| StandaloneBoot 替代 Hall UI | `IntentionalDifferenceWithAuthorityReason` | 用户批准独立原版工程；禁止 Hall/充值/代理入口 | 自绘 Load/Room/Main 或重新引入完整 Hall |
| Phase A 只允许 TRIAL | `IntentionalDifferenceWithAuthorityReason` | 正式 staged money authority 尚不存在 | 客户端参数强开 REAL |
| 删除两个无 target stale ClickEvent | `SourceDefectRepair` | 原序列化残留无有效 target | 复制 ERNN/BJL controller 或保留空点击错误 |
| Bank 不接入 | `NotApplicable` | 源码存在但 DZPK 可达链明确 break/inactive | 为“功能齐全”开放银行/充值/提现 |

## 20. 分层后端职责矩阵

| 层 | 允许职责 | 禁止职责 | 当前状态 |
|---|---|---|---|
| KG WS session foundation | launch/session auth、merchant/player binding、heartbeat、connection ownership | 牌局规则、发牌、资金结算 | `Match`（develop 公共能力，DZPK 注册 later） |
| Hall/room lifecycle | EnterRoom/FinishLoad/rebind/seat membership/room capacity | 私牌、控制选择、wallet mutation | `Match`（develop 公共能力，DZPK profile later） |
| DZPK table actor | hand state、actor、legal action、deadline、bot schedule、snapshot/revision | 直接写客户端 UI | `PlannedLaterPhase` |
| DZPK evaluator/pot engine | best-five、compare、pot layers、awards、returns、conservation | session auth、wallet | `PlannedLaterPhase`；旧纯 engine 可选择性恢复后重审 |
| DZPK deal/control adapter | source math、一次提交 deal、GetChessCardControl 映射、decision evidence | 向客户端暴露候选/控制 | `PlannedLaterPhase` |
| per-viewer projector | 原 Msg 字段、hidden cards、legacy px、result extension | 完整 snapshot/control/wallet internals | `PlannedLaterPhase` |
| staged hand economics | reserve/capture/release、round/order/ledger/audit/rake/control progress | 每动作立即 settled round | `PlannedLaterPhase` |
| 原 Cocos | 渲染、动画、按钮、source intent、viewer snapshot | deck/candidate/bot private/control/wallet authority | `Match`（静态边界）；runtime later |

## 21. 机器验证总表

| Gate | 方法 | 通过条件 |
|---|---|---|
| SourceIdentity | SHA-256、Prefab UUID、script class id | 五脚本与源一致；六 Prefab UUID 一致；仅已记录的 DZPKMain defect repair 产生 diff |
| OriginalClientBoundary | `verify-original-client-boundary.ps1` | `OriginalClientBoundaryVerified`；无自绘残留/authority leak |
| CreatorImport | Creator 2.4.7 导入/刷新 | 无 missing script/UUID/material/default sprite；Console 无未解释错误 |
| WebMobileBuild | `scripts/build-creator247.ps1` | 完整退出码 0；index/main/settings 存在；构建产物再次 leak scan |
| ProtocolSchema | source envelope fixture tests | 每事件原字段齐全；扩展字段向后兼容；`px/value` 为 legacy string |
| ProtocolOrder | event transcript tests | FinishLoad<RoomInfo；FaCards<StageBet<Call；Act/Public/Result 顺序精确 |
| LegalAction | pure engine focused tests | wrong actor/stage/revision、min raise、short all-in、timeout、retry 全通过 |
| Evaluator | 十类+best5+tie golden/oracle | 花色不破平；wheel/kicker 正确；无重复牌 |
| Settlement | pot focused tests | main/side/tie/odd/uncalled/rake 守恒；100/300/500 vector 正确 |
| ViewerPrivacy | 六 viewer snapshots + network scan | SHOWDOWN 前无对手牌/px；无 deck/candidate/control/wallet facts |
| Snapshot | 每状态 serialize/restore/continue | restore 后下一 actor/card/bot action/result 完全一致 |
| Timeout | fake clock + duplicate ticker | deadline 前不动；deadline 后 exactly once check/fold |
| TwoHands | 自动两手 transcript | 无 NEXT_HAND；两手均完整；button/stack/identity 连续 |
| TRIALBoundary | context/init + WS auth negative cases | 只接受 dzpk-955 TRIAL；credential 不回显/不落客户端存储 |
| REALBoundary | fail-closed test | 未完成 staged money gates 时所有 REAL 尝试拒绝 |
| BrowserOriginalUI | desktop + mobile landscape | Load/Room/Main/Rule/Set 原节点/动画可见；无自绘面板；完整一手和第二手 |

## 22. Phase A 学习验收最小集合

只有同时满足以下条件，才可把相应矩阵行从 `PlannedLaterPhase` 晋级：

1. 原 Load、Room、DZPKMain、Rule、Set 由 Creator 2.4.7 实际实例化，而非只存在于磁盘。
2. source-shaped fixture/authority 完成自然完整一手，不允许只跳最终 Result。
3. fold/check/call/raise/all-in、timeout、all-in runout 全部由原按钮触发。
4. Result 后客户端不发送 `NEXT_HAND`，服务端 15 秒自动完成第二手完整循环。
5. PREFLOP/FLOP/TURN/RIVER/RESULT 五类刷新均恢复同 hand、actor、timer 和 viewer 私牌。
6. viewer privacy、标准 tie/side-pot/odd-chip/uncalled golden 全通过。
7. 客户端静态与网络证据不存在 deck/candidate/bot private/control/wallet authority facts。
8. TRIAL 与 REAL 明确分离；Phase A 本地/试用证据不得写成 REAL 钱包闭环。
9. Bank 保持不可达并有 `NotApplicable` 源码证据。
10. 最后一次行为修复后重新执行 build、协议、隐私、两手和浏览器回归。

## 23. 关键源码定位

### KG Cocos

```text
C:\total\kg-cocos-client\728_mobile_restore\assets\DZPK\_script\DZPKLoad.js
C:\total\kg-cocos-client\728_mobile_restore\assets\DZPK\_script\DZPKRoom.js
C:\total\kg-cocos-client\728_mobile_restore\assets\DZPK\_script\DZPKMode.js
C:\total\kg-cocos-client\728_mobile_restore\assets\DZPK\_script\DZPKControlle.js
C:\total\kg-cocos-client\728_mobile_restore\assets\DZPK\_script\DZPKView.js
C:\total\kg-cocos-client\728_mobile_restore\assets\DZPK\prefab\*.prefab
C:\total\kg-cocos-client\728_mobile_restore\assets\_script\PokerBase.js
```

关键行为：

- `DZPKControlle.js:44-97`：RoomInfo 重建；
- `:106-156`：FaCards/StageBet；
- `:157-264`：CallUserAct/ActBet；
- `:265-313`：PublicCards；
- `:314-419`：Result；
- `:439-496`：按钮 intent；
- `:497-565`：原事件注册；
- `DZPKView.js:30-43`：房间盲注/前注文案；
- `:265-288`：牌编码渲染；
- `:928-944`：legacy 牌型 value string；
- `PokerBase.js:26-40,67-92`：FinishLoad/RoomInfo 顺序。

### KG PHP

```text
C:\total\kg-php\wwwroot\game\728\Applications\GAME_DZPK\Room\Table.php
C:\total\kg-php\wwwroot\game\728\Applications\GAME_DZPK\Room\Algorithm.php
C:\total\kg-php\wwwroot\game\728\Applications\GAME_DZPK\Room\AI.php
C:\total\kg-php\wwwroot\game\728\Applications\GAME_DZPK\Logic.php
C:\total\kg-php\wwwroot\game\728\Applications\Common\DBInstance.php
```

关键行为：

- `Table.php:10-23`：stage/time/action 常量；
- `:123-153`：RoomInfo 与私牌占位；
- `:160-319`：初始化、控制分牌、FaCards、盲注/前注、StageBet；
- `:325-457`：牌堆、轮次完成、公牌、CallUserAct；
- `:463-552`：原单赢家/伪边池结算缺陷；
- `:558-693`：toCall、timeout、ActBet 验证；
- `:870-920`：行动与 dealer 方向；
- `Algorithm.php:17-139`：牌型与原花色 tie-break；
- `AI.php:29-201`：机器人策略与原算式缺陷；
- `DBInstance.php:451-482`：GetChessCardControl。

### 旧实验仅作复盘

```text
d20b019a6:packages/kg-dzpk-engine/*
d20b019a6:apps/kg-micro-shell/tools/dzpk-local-authority/*
```

可以重新审计纯 evaluator/pot/action/snapshot 思路；不得恢复旧
`GameHubStandalone/DzpkPhaseAController/DzpkTableView/DzpkUiFactory/DzpkPhaseA.fire`。

## 24. 当前矩阵总评

```text
OriginalSourceMaterialized: Match
OriginalClientBoundaryVerified: Match
StandaloneHallRemoval: IntentionalDifferenceWithAuthorityReason
OriginalFivePrefabRuntimeIdentity: Match
Creator247WebMobileBuild: Match
LoadRuntimeChain: Match (direct loading visual review pending)
ThreeRoomSelection: Match
OriginalMainSixSeatTable: Match
SourceShapedDzpkBackendProtocol: Match (current uncommitted TRIAL diff)
CompleteNaturalHand: Match (TRIAL browser evidence)
FlopTurnRiverVisualSequence: Match
AutomaticSecondCompleteHand: Match (TRIAL browser evidence)
TimeoutAuthority: Match (logic evidence)
ReconnectSameSessionRoomViewer: IntentionalDifferenceWithAuthorityReason (exact-final browser and logic Match)
BackendObjectRestart: IntentionalDifferenceWithAuthorityReason (exact-final browser and logic Match)
RedisProcessRestartAndCas: IntentionalDifferenceWithAuthorityReason (logic Match)
BotCadenceAndLifecycle: Match (default timeout sensitivity recorded)
ViewerPrivacyRuntimeVerified: SourceDefectRepair (single-viewer TRIAL Match)
RuleSetDayNight: Match
SoundCodeAndToggleUi: Match (fresh runtime audio facts; listening quality review pending)
Mobile844x390: Match (exact-final browser refresh/restart viewport)
StandardTieAndSidePotEngineBackend: SourceDefectRepair (logic Match)
ForcedTieSidePotUncalledVisual: HistoricalEvidenceInvalidatedByOriginalUiParityRepair
OddChip: SourceDefectRepair (logic Match; no visual)
ControlRuntimeVerified: IntentionalDifferenceWithAuthorityReason (Phase A TRIAL source-shaped control Match; production UID policy planned)
TrialBoundary: IntentionalDifferenceWithAuthorityReason
RealMoneyBoundary: PlannedLaterPhase
Bank: NotApplicable
FreshConsoleNetworkEvidenceForFinalScreenshots: Match (0 errors / 0 warnings; 188 requests; no actual 4xx/5xx/ERR)
FreshIndependentReview: Match
Creator247OriginalClientParityVerified: Match
```

当前已具备原客户端语义化运行链、三房、六席、动作/三街、TRIAL 两手自动续局、逻辑级 timeout、
重连/进程与 Redis 恢复、viewer privacy，以及标准多赢家/边池/未跟注返还的 engine/backend 逻辑真
证据。Exact-final 已补齐同 session/room/viewer/六席的 refresh 与 atomic backend restart、audio runtime、
console/network、Rule/Set/night 实际点击和 844x390 连续性，并通过 fresh independent review。仍属于后续
范围的事实是：forced settlement 图片不是自然概率证据；物理移动端与听感质量不在本地 Phase A 硬门；
正式 UID control policy、REAL money、checkpoint commit、线上部署与 AI-QA 尚未完成。这些边界不阻塞
`Creator247OriginalClientParityVerified`，但禁止扩写为 3.8、2-6 真人、真钱或生产就绪。
