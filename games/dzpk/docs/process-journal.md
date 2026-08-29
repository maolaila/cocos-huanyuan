# 德州扑克 DZPK 恢复、升级与 GameHub 接入过程日志

- GameHub gameCode：`dzpk-955`
- KG gameId / gtype：`119 / 19`
- 执行模式：`HUMAN_CHECKPOINTS`
- 活标准：`kg-cocos-restoration-to-gamehub-v1`
- 当前阶段：Creator 3.8.8 本地 REAL 聚合牌局资金、回调契约、重连与返回钱包显示验证完成，等待线上交付门
- 当前结论：2.4 基线已冻结；3.8 本地完整牌局与 GameHub REAL 资金 authority 已验证；外部回调送达、线上包、双后台浏览器对账、商户加固和生产候选仍未完成

本日志记录真实决策、失败和恢复点。较新的失败会撤销受影响的旧检查点，但不会抹去仍然正确的
规则、机器人、快照或后端基础成果。

## 1. 已冻结身份

- KG Cocos 主来源：`C:\total\kg-cocos-client\728_mobile_restore`
- 权威 Cocos commit：`b5694d576c482e02dc00a33f51eea633b9cd647f`
- KG PHP：`C:\total\kg-php`
- 可复算 source authority root：`44a10aa5d19291116688686e776deba8d860923900d38a10b332f875fac1203a`
- 2.4 独立工程：`games/dzpk/creator-2.4.x-standalone`
- 2.4 工程来源 commit：`8f08eb4b234b44c093d3338535d169bde0063183`
- 3.8 工程：`games/dzpk/creator-3.8.x-upgrade`
- 目标版本：Creator `3.8.8`
- 临时官方导入 workbench：`C:\works\dzpk-creator38-official-import-workbench`

## 2. 当前阶段事实

### Creator 2.4.7

- 原 Prefab、资源、动画、事件和界面恢复路线已经取代早期重绘客户端；
- 当前基线保留单真人、五机器人、完整离线牌局、规则、authority、Redis 快照和 GameHub
  接口基础；
- 2.4 人工/源码账本以 `creator-2.4.x-standalone/docs/` 为准；
- 当前冻结 gate：`Creator247OriginalClientParityVerified`。

### Creator 3.8.8

- 已建立官方 empty-2d 工程结构、TypeScript/ES Module 基础和迁移账本；
- 旧 JavaScript 放在 `migration-source`，不作为 3.8 runtime；
- 直接复制的 2.4 Scene/Prefab 方案已被人工检查否决；
- 干净 workbench 已显示“导入完毕”，并生成 `DzpkStandaloneBoot.scene` 与 3.x 资源序列化；
- 官方 Scene、六个 Prefab、resource/meta 已集成到正式工程；workbench 机械转换脚本没有进入
  runtime，11 个自定义 component UUID 继续由维护版 TypeScript 承接；
- 六个 Prefab 的源/导入节点数静态一致：39 / 321 / 4 / 58 / 11 / 58；
- Manual Checkpoint 02 证明五个 Prefab 已进入编辑模式但中央画面全黑，Room 仍报
  `contentSize/anchorPoint`；
- 已将 491 个 Prefab 节点和 Scene 的 7 个 Canvas 子树节点设为 `UI_2D`，Main Camera 保持
  `DEFAULT`；
- 已给 Room 的 Widget/Spine 漏项和 DZPKMain 的粒子/Spine/Sprite-Button 漏项补共 10 个官方
  默认结构的 UITransform；不改变节点位置、显式尺寸、资源或业务组件；
- 2026-08-27 人工确认 Room 与其余 Prefab 均能正常打开/显示，Console 无红错；
- 已取得 `Creator388OfficialSerializationImported`；
- 已按冻结 2.4 语义迁移 `DzpkTableGameController` 与 `DzpkTablePresentation`：保留 10 个原
  `Msg_DZPK_*` 事件、快照覆盖、发牌/下注/公共牌/结算/第二手、自动动作、原按钮和返回 Room；
- `cc.Action`、Node 动态字段、全局服务分别迁移为 Tween/schedule、`WeakMap` 和显式
  RuntimeServices；Controller/Presentation 的纯协议与节点访问已拆入 support 文件，所有源文件
  均不超过 1000 行；
- 静态核对 37 条牌桌固定节点路径和关键 UI/Animation/Spine 组件，修正一次误写的 Slider 提交
  按钮路径；未执行 Creator 编译、预览或自动验证；
- Camera 已固定为 2D 正交投影，原按钮 hit-test、房间选择和牌桌操作均可点击；
- 旧 Spine 3.6/2.1 资源的 `_premultipliedAlpha=false` 已按 3.8 实际序列化字段恢复，白块消失；
- TRIAL 已完成第一手、第二手、整页刷新、运行中断线重连和桌内返回 Room；
- REAL 已使用官网商户 `OFFICIAL001`、Creator `http://localhost:7456` 和 GameHub 本地后端完成：
  房间选择、原版桌面、主动弃牌、多手自动续局、整页刷新快照、运行中主动返回 Room；
- REAL 实机样本 `sid_UyvTZIJRljfY8NSw` 完成 13 手，累计下注 `266000.000000`、派彩
  `0.000000`、钱包从 `1000000.000000` 到 `734000.000000`，13 个订单与 13 条账变一致；
- 主动返回样本 `sid_-9Kr1MNz_WaqyJVH` 已从进行中牌局自动折牌、完成该手结算、将 authority
  标记 `LEFT` 并显示原 Room；浏览器 Console 为 0 error；
- 聚合资金/回调样本 `sid_IXAy3x2sFhwlJqNZ` 完成 11 手，累计下注 `223000.000000`、派彩
  `129800.000000`、净额 `-93200.000000`，钱包从 `2000000.000000` 到 `1906800.000000`；
  每手严格一笔 `ROUND_BET`，其中真实跟注手下注 `22000.000000` 且仍只有一个聚合 bet order；
  共 12 个订单、12 条 ledger、11 个 round `ORDER_SUCCESS` 和 12 个 wallet
  `BALANCE_CHANGED` callback authority，标准对账无 identity/money critical mismatch；
- 该样本从进行中手牌返回 Room 后，画面金币 `1,906,800` 与 MySQL wallet
  `1906800.000000` 一致，authority=`LEFT`、play lock=`RELEASED`；
- 当前本地 gate：`Creator388GameHubRealMoneyLocalVerified`；这不是线上或生产候选证明。

### GameHub

- 原版 Hall/WS 事件、三房间、单真人五机器人、牌桌状态机继续由 DZPK adapter/engine 负责；
- REAL 使用 MySQL `dzpk_table_authorities`；逐动作贡献保存在不可变 engine snapshot/action log，
  player/currency play lock 在手中阻止跨游戏消费，终局只创建一个聚合 staged child 和一笔
  `ROUND_BET`，再以 `HAND_ECONOMICS` 汇总到钱包、订单、账变、审计、回调和最终结算；TRIAL
  继续使用 Redis；
- 机器人席位、1–5 秒 cadence、5–200 秒生命周期、牌型/同花/对子/连张输入和
  fold/call/raise/all-in 集合保持 source-shaped；`AI.php` 的非法/超额 GetBet 分支由统一 legal-action
  validator 修复，因此分类为 `SourceDefectRepair`，不声称概率逐分支字节级 Match；
- KG 原版三房间默认值成为共享常量；总控台和商户台均可载入三房间模板，商户申请、平台审批，
  发布版本只在新入桌时冻结生效；
- DZPK 已注册统一 return-control capability；正控只累计实际盈利、负控只累计实际亏损，反向
  结果进度为 0。负控严格保持 KG 语义：排除最强候选但不固定发绝对最弱牌；
- 平台 master gate 可一键关闭商户 KG 控钱：关闭时商户菜单/API 不可见不可用，但平台策略仍可用；
- 通用 target-RTP 对 P2P 德州明确为 `NotApplicable`；原 KG room-profit 库存控制以独立
  `sourceInventoryControl=ACTIVE` 展示，避免把固定源码能力伪装成可发布 RTP；
- 当前不能写成“原版后端已经完全恢复”或 `ProductionReadyCandidate`：仍缺在线测试部署、不可变
  资源包、总控/商户后台浏览器逐局对账、AI-QA v5、真实设备与生产加固。

## 3. Pitfall ledger

### `DZPK-PIT-001` — 复用素材后重绘客户端

- Symptom：画面看似德州，但牌面、字体、节点、动画、交互和事件流与原版不一致。
- RootCause：把“可玩”误当成“原 Cocos 源码还原”。
- RejectedApproach：继续修饰新绘制 UI。
- Decision：撤销旧 `LocalSingleHumanBotBaselineVerified` 视觉结论；从原 Prefab/脚本差异重开，
  保留规则、机器人、快照和 authority 成果。
- GateInvalidated：原版客户端 parity。
- PreventionRule：界面完成必须证明 Prefab、节点、资源、动画、事件和调用语义一比一。
- ResolutionStatus：2.4 基线已按新标准重做并冻结。

### `DZPK-PIT-002` — 把大厅依赖搬到外层 wrapper

- Symptom：只有额外页面先构造参数后，Cocos 才能运行。
- RootCause：把大厅全局依赖误当成必须保留的可见容器。
- Decision：在 Cocos 内实现无可见 UI 的 StandaloneBoot/GameContext/事件/资源/音频兼容面。
- PreventionRule：必需数据流内聚到 Cocos；不再套一层自造大厅或微壳画面。
- ResolutionStatus：已进入 2.4/3.8 架构。

### `DZPK-PIT-003` — 3.8 项目版本误写成 `0.1.0`

- Symptom：Dashboard 显示 `Creator3D 0.1.0` 并询问升级到 3.8.8。
- RootCause：npm 风格 `package.json.version` 被 Dashboard 解释为 Creator 项目版本。
- Decision：目标工程补齐 `type`、独立项目 UUID、`version=3.8.8` 和
  `creator.version=3.8.8`。
- PreventionRule：创建 workbench 和正式项目时先冻结项目身份，再导入资源。
- ResolutionStatus：已修复。

### `DZPK-PIT-004` — 直接复制 2.4 Scene/Prefab 到 3.8

- Symptom：Boot Scene 与 Bank/DZPKMain/Load/Room/Rule/Set 七份序列化资源全部无法打开，
  报 `Cannot read properties of null (reading 'anchorPoint'/'contentSize')`。
- Evidence：`creator-3.8.x-upgrade/docs/official-2x-import-recovery.md`。
- RootCause：Creator 只重写了 meta，没有执行官方 2.x 资源转换；旧 Node UI 字段未迁移成
  3.x `UITransform`。
- RejectedApproach：逐节点猜测补 `UITransform`，或继续直接编辑混合格式 JSON。
- Decision：建立干净 Creator 3.8.8 workbench，使用官方
  **File -> Import Cocos Creator 2.x Project**，导入完整依赖和 Scene。
- GateInvalidated：`EditorImportCleanAwaitingPrefabInspection`。
- PreventionRule：2.4 -> 3.x 序列化必须经过官方 importer；直接复制只能作为只读证据，
  不能作为 runtime 输入。
- ResolutionStatus：等待 workbench 官方导入输出。

### `DZPK-PIT-005` — 无脚本红错被误认为工程导入成功

- Symptom：Console 只显示引擎初始化，没有 TypeScript 错误，但双击 Scene/Prefab 全部失败。
- RootCause：混淆了脚本解析、资源 meta 导入、序列化反序列化和功能验证四个不同 gate。
- Decision：撤销过早状态，检查点拆为 ScriptParse、AssetImport、SerializationOpen、
  ComponentBinding 和 FunctionalParity。
- PreventionRule：任何一项通过都不能推导下一项。
- ResolutionStatus：规则已写入活标准。

### `DZPK-PIT-006` — TypeScript 类型断言换行

- Symptom：`DzpkRoomSelectionController.ts:188 Missing semicolon`。
- RootCause：`as RoomConfiguration` 被换到独立语句。
- Decision：属性访问和类型断言保持为同一表达式，不改变进房、金币门槛或事件流程。
- PreventionRule：静态迁移时避免以 `as` 开头的新语句。
- ResolutionStatus：已修复。

### `DZPK-PIT-007` — 临时牌面和字体破坏原版视觉

- Symptom：花色块比例过大、中文和数字字体不自然、结算提示与原版层级不一致。
- RootCause：使用临时文本/符号绘制代替原 sprite-frame、节点尺寸和字体配置。
- Decision：牌面恢复原大小/小花色映射，文案只使用原节点、图片字、bitmap/system font 配置。
- PreventionRule：视觉差异先查原 Prefab/asset/font/Label 参数，不先调一个相似 CSS/文本实现。
- ResolutionStatus：2.4 已修正；3.8 需在官方 importer 输出后重新核对。

### `DZPK-PIT-008` — 返回行为被浏览器确认框替代

- Symptom：桌内返回直接退出游戏并出现浏览器 `confirm`。
- RootCause：把独立运行的退出需求覆盖到原版两级导航语义。
- Decision：桌内发送原 `Msg_DZPK_Out` 并回 Room；Room 的返回才结束游戏。
- PreventionRule：先追原点击 handler、事件和下一页面，再决定 standalone exit mapping。
- ResolutionStatus：2.4 已修正；3.8 待复核。

### `DZPK-PIT-009` — 官方 importer 机械转换已转译 JavaScript

- Symptom：导入完成后出现 22 次 `__extends`、6 次 `__awaiter`、4 次
  `__spreadArrays` 和 12 次 `exports is not defined`。
- RootCause：2.4 独立工程中部分脚本已是 TypeScript/打包器生成的 ES5/CommonJS 形态；官方
  importer 将扩展名改为 `.ts`，但不会逆向恢复出真正的 ES Module 源码。
- RejectedApproach：在 3.8 全局注入 `__extends/__awaiter`，伪造 CommonJS `exports`，让旧构建
  产物继续充当源码。
- Decision：官方输出只负责 Scene/Prefab/resource 序列化；脚本用维护版 3.8 TypeScript 替换，
  保留原 component UUID、属性和 click handler 身份。
- GateInvalidated：无；这是 C07 的预期脚本迁移阻塞，尚未取得 C06/C07 完成 gate。
- PreventionRule：2.4 基线应尽量保留真正源脚本；importer 生成 `.ts` 必须先识别是否仍是转译产物。
- ResolutionStatus：待替换。

### `DZPK-PIT-010` — 旧裸模块名和 `_semantic` 再转换失败

- Symptom：`AudioManager/GameContext/ResLoader/Utils` 找不到；四个 `_semantic` 文件报语法错误。
- RootCause：旧代码依赖 Cocos 2.x 模块解析/全局加载顺序，且 importer 对已经语义重构过的 JS
  再次做了不适用的语法转换。
- RejectedApproach：添加宽泛 path alias 或空模块，只为了让错误消失。
- Decision：复用正式 3.8 工程中已有的显式 ES Module imports 和语义控制器，以原序列化 UUID
  重新绑定；缺失模块逐项映射到明确 service，不保留裸全局依赖。
- PreventionRule：官方 importer workbench 与维护版源码分层，不能把 importer 脚本输出直接晋级。
- ResolutionStatus：待替换。

### `DZPK-PIT-011` — 设计分辨率与 `RoomChoose` 组件警告

- Symptom：Canvas 与 3.8 项目设计分辨率不一致；Room Prefab 三次报告 `RoomChoose` missing。
- RootCause：workbench 使用 empty-2d 默认项目设置，且 `RoomChoose` 脚本因前述 helper/模块错误未
  成功注册。
- Decision：项目设计分辨率统一对齐原 `1334 x 750`；先安装维护版 RoomChoose 的原 UUID 组件，
  再判断 Prefab 是否真丢绑定，禁止删除组件或移动原节点。
- PreventionRule：设计分辨率和 component registry 是导入后独立审计项。
- ResolutionStatus：待处理。

### `DZPK-PIT-012` — importer 只迁移 Canvas Layer，Prefab 全部留在 DEFAULT

- Symptom：Bank、DZPKMain、Load、Rule、Set 能进入编辑模式且层级/资源存在，但中央编辑区全黑；
  Inspector 显示 Layer=`DEFAULT`。
- RootCause：官方 plugin 只在检测到 Canvas 本身时把默认 group 改为 `UI_2D`，不会递归转换
  Canvas 子节点，也不会替纯 2D Prefab 设置 2D Layer。
- Decision：所有纯 2D Prefab 节点和 Scene Canvas 子树使用 `UI_2D=1<<25`；Camera 保持
  `DEFAULT=1<<30`。
- PreventionRule：官方 importer 后必须单独审计 2D Layer；有层级不等于可渲染。
- ResolutionStatus：人工复核通过。

### `DZPK-PIT-013` — 有 UI 组件但没有 UITransform

- Symptom：Room 打开时报 `contentSize/anchorPoint`；其它 Prefab 的粒子/Spine/Handle 存在潜在漏显。
- RootCause：源节点没有显式 `_contentSize/_anchorPoint` 时，plugin 不会创建 UITransform，即使节点
  已挂 Widget、Spine、ParticleSystem2D、Sprite/Button。
- Decision：只给确有 UI renderer/layout/control 且缺失的节点追加 plugin 同结构默认
  UITransform。本次 Room 2 个、DZPKMain 8 个。
- PreventionRule：post-import audit 必须检查每个 UI 组件节点的同节点 UITransform。
- ResolutionStatus：人工复核通过。

### `DZPK-PIT-014` — 沿用 2.4 的 `Animation.play().speed`

- Symptom：静态迁移把 `countdownAnimation.play().speed = ...` 原样带入 3.8。
- RootCause：Creator 2.4 `Animation.play()` 可取播放状态，3.8.8 的公开 API 返回 `void`。
- Decision：先 `play()`，再用 `defaultClip.name` 取得 `getState()` 并设置 speed；不替换原动画剪辑。
- PreventionRule：旧 Animation、Spine、Particle API 必须逐项查 3.8 签名，不能只改 import。
- ResolutionStatus：静态修正，待 Manual Checkpoint 04。

### `DZPK-PIT-015` — 把动态 Node 字段和相对路径机械照搬到 3.8

- Symptom：2.4 在按钮/牌节点上写 `betGold/sourcePosition`；迁移中一度把提交按钮路径写成
  `btn/jiabet/slider/btn`，而原节点实际是 `btn/jiabet/btn`。
- RootCause：把运行态数据写入序列化 Node，且只凭代码片段猜相对父节点。
- Decision：动态值改存 `WeakMap<Node, ...>`；所有固定路径从官方 importer 的 Prefab 树静态核对。
- PreventionRule：Presentation 完成前生成节点路径/组件清单，逐条验证 Node、Slider、ProgressBar、
  Button、Toggle、Animation 与 Spine 所在节点。
- ResolutionStatus：37 条固定路径与关键组件静态核对通过，待人工运行。

### `DZPK-PIT-016` — 本地 Creator Origin、官网商户和数据库账本漂移

- Symptom：启动命令把 Markdown 链接字面量传给 `--preview`；已删除的 `DEMO001` 被旧本地库
  残留；`OFFICIAL001` 仍有旧 `allowedGames=['*']`；安全迁移因 `0000` hash 不一致拒绝前滚，
  当前代码又读取本地库缺失的 TRIAL 会话字段/凭证表。
- RootCause：人工检查命令、Creator 临时端口、商户 Origin/内部官网语义和本地数据库快照没有形成
  同一版本化启动合同。
- RejectedApproach：继续使用 `DEMO001`、绕过 Origin、伪造 launch token、忽略迁移账本强跑全部
  SQL，或把旧库当作生产迁移通过证据。
- Decision：只使用官网商户 `OFFICIAL001`；显式允许 Creator `7456` Origin；恢复官网商户
  `allowedGames=null` 的内部语义；正式 migrator 继续保持阻塞。仅为本次人工 TRIAL 预览，从正式
  `0023/0027` 精确补齐实际读取的会话字段和 `session_credentials`，不写伪迁移账本。
- PreventionRule：后续标准化命令应先检查原始 URL、商户身份/Origin、migration ledger 与 schema，
  并为 Creator 人工检查建立可重建的专用本地数据库，不能复用漂移库。
- ResolutionStatus：本地 URL 已生成；数据库兼容补丁只算人工预览前置，不算 migration 通过或
  GameHub 集成完成。

### `DZPK-PIT-017` — 画面可见但所有 Cocos UI 点击失效

- Symptom：Room/DZPKMain 正常渲染，但原按钮的 `UITransform.hitTest` 全部为 false。
- RootCause：2.4 Camera 被机械迁移为透视投影；2D UI 视觉近似正常，输入射线却不在同一投影面。
- Decision：Scene 和启动代码都冻结 `Camera.ProjectionType.ORTHO`、`orthoHeight=375`，继续保留
  原按钮节点和事件绑定。
- PreventionRule：3.8 视觉通过后必须单独跑 UI hit-test；2D Camera 同时核对 visibility、projection
  和 orthoHeight，不能用“能看见”代替“能交互”。
- ResolutionStatus：TRIAL/REAL 房间卡片、快速开始、下注按钮和菜单点击均通过。

### `DZPK-PIT-018` — 重连只恢复 Socket，没有恢复房间

- Symptom：WebSocket 重开后只发送 `Msg_Hall_Connect`，桌面停在旧画面；新 launch 又可能误用
  sessionStorage 的旧 sessionToken。
- RootCause：把连接恢复与房间快照恢复混成一个步骤，且凭证选择顺序让旧 sessionToken 高于显式
  launchToken。
- Decision：运行中重连按 `Hall Connect -> Hall FinishLoad -> RoomInfo`；显式 launchCode/launchToken
  永远优先，只有 URL 无新凭证时才使用存储的 sessionToken/room。
- PreventionRule：重连测试必须同时断言新 WS、Hall Connect、FinishLoad、RoomInfo 和继续事件；新启动
  必须做旧存储负控。
- ResolutionStatus：TRIAL/REAL 整页刷新和 WS 恢复通过。

### `DZPK-PIT-019` — 旧 Spine 资源出现大面积白块

- Symptom：Room 人物/动画被白色矩形覆盖，但贴图、骨骼和节点都存在。
- RootCause：3.8 实际读取 `_premultipliedAlpha`，旧序列化的 `premultipliedAlpha=false` 被忽略。
- Decision：导入 normalizer 删除旧字段并写 `_premultipliedAlpha=false`；不重导、不改原贴图。
- PreventionRule：Spine 版本 warning、PMA、材质混合和贴图 alpha 分开检查；字段名必须以目标版本
  实际序列化为准。
- ResolutionStatus：25 个 Spine 组件规范化，Room/Table 白块消失；旧 Skeleton 版本 warning 仍作为
  后续低频动画矩阵事项，不能写成 warning 已清零。

### `DZPK-PIT-020` — 返回 Room 被旧动画队列和隐藏 Room 节点吞掉

- Symptom：`Msg_DZPK_Out` 已成功，但客户端等待旧发牌/结算队列，或销毁桌面后只剩灰色 Canvas。
- RootCause：返回是导航边界，却排在 presentation queue 尾部；进入桌面时原 Room Prefab 子节点被
  置 inactive，返回只激活外层容器。
- Decision：viewer Out 使用 `replacePresentationQueue` 抢占旧动画；返回时显式重新激活原 Room
  Prefab 子节点。进行中返回由服务端在下一合法动作自动折牌并先完成资金结算。
- PreventionRule：导航事件必须抢占陈旧动画，并同时恢复目标容器与实际页面根节点；进行中离桌必须
  先定义资金/状态终局语义。
- ResolutionStatus：进行中主动返回 REAL Room 实机通过。

### `DZPK-PIT-021` — 负控进度沿用带符号净输赢

- Symptom：负控玩家输钱时 `currentProgress` 变成负数，与目标金额越走越远。
- RootCause：通用 staged aggregate 早期直接把 `payout-bet` 当 UID 进度，没有冻结策略方向。
- Decision：participant policy、reservation 和 migration 固化 `POSITIVE/NEGATIVE`；正控进度为
  `max(net,0)`，负控进度为 `max(-net,0)`，反向结果为 0。
- PreventionRule：资金净额与“朝目标前进的非负进度”是不同事实，必须分别持久化、回放和对账。
- ResolutionStatus：83 个 staged settlement 测试及 REAL 负控 MySQL 集成用例通过。

### `DZPK-PIT-022` — 本地迁移账本显示已执行，实际关键表被删

- Symptom：`__drizzle_migrations` 有 0019-0027，但 staged tables、merchant credential table 不存在；
  REAL context/tick 分别报缺表和缺 `settlement_authority`。
- RootCause：长期本地库发生 schema 漂移，账本与实际对象不再一致。
- RejectedApproach：修改 hash、补写 ledger 行或把本地补丁当生产迁移成功。
- Decision：正式提交继续使用合并后的 `0044_exotic_mister_sinister` forward migration、snapshot 和
  journal；本次本地实机只对精确缺失对象
  执行受限 DDL，并明确标注为 local compatibility repair。
- PreventionRule：启动前同时检查 ledger、information_schema 和目标列/触发器；任何一者不一致都
  不能宣称 migration 通过。
- ResolutionStatus：本地实机库可用；正式环境仍必须走完整 forward migration/preflight。

### `DZPK-PIT-023` — Creator 独立预览 URL 路径与短期 launchCode

- Symptom：脚本生成 `/dzpk-955/` 返回 404；人工复制 Markdown URL；等待数分钟后 launchCode 已过期。
- RootCause：独立 Creator preview 入口在 `/`，与 micro-shell package 路径不同；短期可兑换凭证被当成
  长期链接。
- Decision：DZPK dev-play-url 固定生成 Creator 根路径，保留 `backendUrl`；自动验证生成后立即打开，
  不持久化 launchCode。
- PreventionRule：每种 runtime profile 必须声明 standalone entry URL 和凭证生命周期，脚本输出不可
  依赖人工修正。
- ResolutionStatus：根 URL 的 TRIAL/REAL 启动均通过。

### `DZPK-PIT-024` — Creator 外部文件修改未触发实时重新编译

- Symptom：源码已改，但 7456 仍服务旧 chunk，导致已删除的 guard 或旧返回逻辑继续运行。
- RootCause：编辑器长时间运行/锁屏后文件 watcher 没有稳定刷新外部修改。
- Decision：验证 served chunk 身份；必要时精确重启当前 DZPK Creator 进程树并等待 preview ready。
- PreventionRule：源码 mtime 不是运行证据；实机前检查目标文本/hash 已进入 preview chunk。
- ResolutionStatus：已按新 chunk 重跑 REAL 返回。

### `DZPK-PIT-025` — 每次牌桌贡献都写成共享 ROUND_BET

- Symptom：单手存在前注、跟注或加注时会产生多笔 `ROUND_BET`，但共享 `round_records` 只能引用
  一个 `bet_order_no`；后续订单会成为 orphan，round 金额、wallet chain 与 callback 无法同时闭合。
- RootCause：把 engine 的逐动作审计粒度直接等同于平台标准回合的资金订单粒度。
- RejectedApproach：让 round 只引用第一笔、在 ext 中藏其它订单，或放宽 reconciler 忽略 orphan。
- Decision：逐动作继续冻结在 engine snapshot/action log；用 player/currency play lock 保护手中资金；
  终局按总贡献只写一个幂等 `HAND_ECONOMICS` child 和一笔聚合 `ROUND_BET`，非零派彩只写一笔
  `ROUND_PAYOUT`。
- PreventionRule：先确定平台 round/order cardinality；没有显式多订单合同就不能逐动作创建主下注单。
- ResolutionStatus：MySQL crash/race/disconnect 测试与 11 手 REAL 浏览器样本通过，每手正好一笔 bet。

### `DZPK-PIT-026` — staged callback 能入队但不满足标准 round authority

- Symptom：初版余额回调使用 `order:<order>:BALANCE_CHANGED`，child 结算回调使用 child business id；
  STANDARD reconciliation 报 `BALANCE_CHANGED_CALLBACK_AUTHORITY_MISMATCH` 和
  `ROUND_CALLBACK_AUTHORITY_MISMATCH`。
- RootCause：复用了 staged child 的内部 callback identity，没有在 `HAND_ECONOMICS` 边界投影为
  GameHub 标准钱包/回合合同。
- Decision：`HAND_ECONOMICS` 的余额回调使用
  `wallet:<merchant>:<order>:BALANCE_CHANGED`、order createdAt 和无 currency 的标准 data；结算回调
  使用 `round:<unit>:ORDER_SUCCESS`、unit business id 与精确 round payload。其它 staged family 不变。
- PreventionRule：outbox delivered 只证明中继成功；还必须运行标准 reconciliation 核对 business id、
  幂等键、时间、维度和 payload 精确形状。
- ResolutionStatus：focused MySQL reconciliation 0 critical；本地官网商户仍为占位 callback URL，
  因而 HTTP delivery 只保留为线上真实端点 gate。

### `DZPK-PIT-027` — Out 返回 table stack 而不是 GameHub 钱包

- Symptom：玩家初始钱包 `2,000,000`，入桌按房间上限只携带 `1,000,000`；返回 Room 后一度显示
  `980,000`，而数据库结算余额实际为 `1,926,800`。
- RootCause：沿用 study authority 的 `projectLeave()`，把 viewer table stack 当成最终总余额。
- Decision：REAL 在仍持有 play lock 时先从 `WalletGateway` 冻结六位小数 closing balance，把它写入
  LEFT authority snapshot，然后 retire/release 并投影 `Msg_DZPK_Out.gold`；重放只读冻结值，TRIAL
  仍使用 study stack。
- PreventionRule：所有页面切换后的金额都要与 wallet/order/ledger 同点对账，不能把游戏内携带额、
  hold、locked 或 display stack 当总余额。
- ResolutionStatus：同一浏览器样本 Room 显示 `1,906,800`，数据库 wallet=`1906800.000000`。

### `DZPK-PIT-028` — 隔离 MySQL 测试把当前事实读成未来数据

- Symptom：round/order/callback 已直接查到，但 reconciliation snapshot 返回
  `RECONCILIATION_DATASET_EMPTY`；调试发现 `createdAt` 比测试 `asOf` 恰好多 9 小时。
- RootCause：fixture 直接创建 mysql2 pool，只设置/省略驱动 timezone，没有复用 GameHub
  `enforceMysqlUtcSessions`，因此 MySQL `CURRENT_TIMESTAMP` 与 JS Date 解释不在同一时区。
- RejectedApproach：把 asOf 人为加 9 小时、放宽 snapshot 时间门或忽略 empty finding。
- Decision：隔离数据库 pool 同时使用 `timezone:'Z'` 与平台 UTC session initializer；保留原时间窗断言。
- PreventionRule：所有涉及历史/asOf/回调 grace 的 fixture 必须先证明 `@@session.time_zone='+00:00'`。
- ResolutionStatus：相同测试随后读到完整 round graph，callback authority 0 critical。

### `DZPK-PIT-029` — money 已提交但硬进程退出后无人触发 pending recovery

- Symptom：claim 协议能在玩家重连时幂等恢复，但 backend 在 money/round/profit 后、authority commit
  前硬退出，且玩家不再重连时，会留下 pending mutation 与 ACTIVE play lock。
- RootCause：worker 只扫描 `disconnect_recovery_at`；硬退出不会执行 WebSocket onClose。
- Decision：worker 按 `pending_created_at` 扫描过期 claim，先幂等重放 money/round/profit 并 commit；
  同时按 authority `updated_at` 扫描超过完整动作周期仍无活动的 ACTIVE row，CAS 标记 disconnect，
  再走合法 fold/terminal/retire/release。批次总量仍有上限。
- PreventionRule：任何跨事务 claim 协议都必须有“无请求、无 onClose、无人重连”的后台收敛入口。
- ResolutionStatus：新增 hard-crash 无重连 MySQL 用例与 unmarked stale authority 用例通过。

### `DZPK-PIT-030` — UID 只测负控，正控与零进度资金链接错误

- Symptom：初版 HIT audit 固定引用第一笔 bet/debit；POSITIVE 应引用 payout/credit，控制方向相反但
  该手未朝目标前进时又不存在 payout，统一对账无法闭合。
- RootCause：把“已选受控牌”与“本手一定产生同方向金额”混为一谈。
- Decision：正向实际进度使用 ROUND_PAYOUT/CREDIT，负向实际进度使用 ROUND_BET/DEBIT；反向结果
  使用 `OBSERVED_NO_PROGRESS` 并引用已接受的 bet authority。手中被总控停用后使用独立 frozen
  disposition/status，保持策略 DISABLED 但完成原手审计。
- PreventionRule：控牌决策、实际结果、目标进度和资金链接是四个独立事实，正/负/零进度均需用例。
- ResolutionStatus：POSITIVE win、contrary zero、NEGATIVE、disabled-in-hand 与 STANDARD
  reconciliation 集成测试通过。

### `DZPK-PIT-031` — 把 source inventory control 标成通用 RTP ACTIVE

- Symptom：capability 显示 RTP ACTIVE，但通用 RTP 发布服务明确只允许 slots，双后台也没有可发布的
  DZPK targetRtp；形成“后台不可闭环但 capability 假完成”。
- Decision：DZPK `rtpOutcomeCorrection=NotApplicable`，新增独立
  `sourceInventoryControl=ACTIVE`；平台/商户 meta 均展示状态和固定源码原因，runtime 仍使用 KG
  room-profit threshold/probability。
- PreventionRule：同为“影响结果”不等于同一配置语义；固定源码库存、运营 RTP 和 UID 目标分别建模。
- ResolutionStatus：registry、双后台类型/UI 和 focused tests 已更新。

### `DZPK-PIT-032` — 新 migration 已合并，历史测试仍把旧 journal 尾当当前真相

- Symptom：0044 fresh migration 成功，但 inventory count、guard、0042/0043 journal 断言和 v4 snapshot
  fixture 仍期待旧尾，导致全量测试出现大量假失败。
- Decision：历史测试按自己的 idx 查 entry；current-chain 测试统一推进到 journal idx 44、45 个 SQL、72 tables、
  84 triggers 与 snapshot schema v5/16；同时修复空 rounds fixture。
- PreventionRule：新增/合并 migration 后必须重跑整个 migrations 目录，而非只跑最新两个文件。
- ResolutionStatus：0044 加入 orphan preflight 后，migration 全目录再次通过 `88/88`。

### `DZPK-PIT-033` — legacy launchToken fallback 次序仍低于旧 sessionToken

- Symptom：context/init 的显式凭证优先级正确，但 legacy response 不返回 sessionToken 时，WS fallback
  仍可能选浏览器旧存储 session，而不是当前 URL 的 launchToken。
- Decision：WS credential 固定为 `context.sessionToken > launchToken > launchCode > stored sessionToken`。
- PreventionRule：显式一次性启动凭证在 context 与 WS 两层都必须高于缓存，只在 URL 无新凭证时重连。
- ResolutionStatus：3.8 transport 已修正；新 build 的 REAL 启动与房间加载浏览器重放通过。

### `DZPK-PIT-034` — GameHub 六位账务精度不应强迫原版整数 BMFont 展示小数

- Symptom：REAL 钱包使用 `decimal(20,6)`，例如 `2000000.500000`；原版 Room 的 `gold.fnt` 只有
  数字和千分位逗号，没有小数点。若直接显示精确尾数会缺字，扩写字体又会改变原版视觉。
- Decision：GameHub 钱包、订单、账变、round 和 LEFT authority snapshot 全程保留六位精度；客户端
  context 仍保存服务端原值，但 Room 复用原版整数 BMFont 并按源客户端习惯向下取整显示。不得用
  显示值反写、结算或对账。
- PreventionRule：平台资金精度与游戏视觉精度分层处理；视觉能安全舍入不等于权威金额可以舍入，
  也不得为了展示尾数修改原版字体或素材风格。
- ResolutionStatus：`2000000.500000` 的 REAL 钱包在 Room 显示 `2,000,000`，控制台无缺字错误；
  前一手 `200000.000000` 后端结算、wallet/order/ledger/LEFT snapshot 仍精确闭合。

### `DZPK-PIT-035` — 首次入桌的 play lock 与 authority 不能分两次提交

- Symptom：先独立提交 `wallet_play_locks`、再创建 DZPK authority 时，进程若在两者之间退出，会留下
  没有 authority 可供 worker 扫描的永久 ACTIVE 钱包锁。
- Decision：首次/重新激活 authority 在同一个 GameHub DB transaction 中完成 wallet 解析、play-lock
  获取、房间/余额冻结和 `compareAndSet/reactivate(..., tx)`；任一提交前退出都整体回滚。
- PreventionRule：任何“独占资金资格 + 领域权威”的首次建立必须共享事务，不能依赖后续补偿删除锁。
- ResolutionStatus：REAL MySQL 主循环、wallet 31-test 与独立 money audit 通过；lock-only crash P0 关闭。

### `DZPK-PIT-036` — Redis recovery lease 不能单独阻止过期 worker 写 MySQL

- Symptom：固定 TTL 的 Redis close fence 若在 MySQL 阻塞期间过期，新连接可取得 Redis owner；旧 worker
  后置检查只能发现已经提交的强制离桌。
- Decision：Redis recovery fence 自动续租并在不可逆边界重检；同时复用 `wallet_play_locks.row_version`
  作为单调 DB fencing epoch。worker 冻结 epoch 后，mark/claim/commit/retire 的每个事务都锁定并核对
  epoch；重连在处理 pending/disconnected 前先推进 epoch，旧 worker 因 `SESSION_CLOSED` 停止。
- PreventionRule：跨 Redis/MySQL 的 lease 必须有数据库提交栅栏；post-check 不能代替 commit fence。
- ResolutionStatus：Redis 短 TTL 续租测试与 worker/reconnect 竞争 MySQL 用例通过。

### `DZPK-PIT-037` — source inventory ACTIVE 不能只靠同一事件自证

- Symptom：运行时存在 room-profit 表和公式，但标准 reconciliation 起初没有冻结这些表；后来若只用
  event 自己的 `playerNetAmount` 推导自己的 delta，两个字段一起漂移仍可通过。
- Decision：标准 watermark 纳入 authority/event；每个 DZPK round 必须唯一关联 event，并独立核对
  `round.net + rakeAllocated`、完整 frozen decision、authority 租户/币种/房间、源码 hash 与连续链。
  decision roll 和 decisionId 复用运行时同一纯函数重算。该内部 integrity finding 在商户侧脱敏/hash，
  且 create/apply 两阶段均禁止人工 RESOLVED/WAIVED，只能修复后重跑。
- PreventionRule：控钱能力标记 ACTIVE 前必须同时完成 runtime、冻结 population、独立事实交叉核对、
  商户泄漏保护和不可豁免门。
- ResolutionStatus：reports `220/220`、合成篡改矩阵和 REAL MySQL reconciliation 通过。

## 4. 当前恢复点

```text
LastStableGate: Creator388GameHubRealMoneyLocalVerified
CurrentGate: LocalMoneyCodeGatePassedAwaitingExternalDeliveryAndOnlineGates
NextAction: validate real callback endpoint, publish immutable package, deploy exact commits, run dual-admin reconciliation and AI-QA v5 online
DoNotDo: polyfill transpiler helpers; fake CommonJS exports; add empty module aliases; delete Missing Script; redraw UI; regenerate UUIDs
```

## 5. 标准提升规则

本日志是事实记录，不自动成为其它游戏的要求。完成德州扑克 C06-C15 后，复盘每条 Pitfall：

- 若会改变下一款游戏的路线或防止高代价错误，提升到 GameHub 活标准或 Skill；
- 若只与 DZPK 的 Prefab、牌局或资源有关，保留在本日志；
- 若经验被后续事实推翻，追加 superseded 记录，不改写历史经过。
