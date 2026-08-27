# 德州扑克 DZPK 恢复、升级与 GameHub 接入过程日志

- GameHub gameCode：`dzpk-955`
- KG gameId / gtype：`119 / 19`
- 执行模式：`HUMAN_CHECKPOINTS`
- 活标准：`kg-cocos-restoration-to-gamehub-v1`
- 当前阶段：Creator 3.8.8 牌桌 Controller/Presentation 行为迁移
- 当前结论：2.4 基线已冻结；3.8 parity 未通过；完整 GameHub/商户交付未完成

本日志记录真实决策、失败和恢复点。较新的失败会撤销受影响的旧检查点，但不会抹去仍然正确的
规则、机器人、快照或后端基础成果。

## 1. 已冻结身份

- KG Cocos 主来源：`C:\total\kg-cocos-client\728_mobile_restore`
- 权威 Cocos commit：`b5694d576c482e02dc00a33f51eea633b9cd647f`
- KG PHP：`C:\total\kg-php`
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
- 当前 gate：`Creator38TableBehaviorMigrationInProgress`；
- 下一步：从冻结 2.4 源码迁移牌桌 Model/Controller/Presentation、原事件回调和下一局流程。

### GameHub

- 已有 engine、authority、机器人、快照和规则测试成果继续保留；
- 尚未完成原版 Hall/WS、房间/座位/牌桌完整状态机、GameHub 直接 transport、统一
  RTP/UID 控钱、双后台实际生效、线上包、数据对账和商户加固；
- 当前不能写成“原版后端已经完全恢复”或 `ProductionReadyCandidate`。

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

## 4. 当前恢复点

```text
LastStableGate: Creator388OfficialSerializationImported
CurrentGate: Creator38TableBehaviorMigrationInProgress
NextAction: Migrate source-faithful table Controller/Presentation behavior from the frozen 2.4 baseline
DoNotDo: polyfill transpiler helpers; fake CommonJS exports; add empty module aliases; delete Missing Script; redraw UI; regenerate UUIDs
```

## 5. 标准提升规则

本日志是事实记录，不自动成为其它游戏的要求。完成德州扑克 C06-C15 后，复盘每条 Pitfall：

- 若会改变下一款游戏的路线或防止高代价错误，提升到 GameHub 活标准或 Skill；
- 若只与 DZPK 的 Prefab、牌局或资源有关，保留在本日志；
- 若经验被后续事实推翻，追加 superseded 记录，不改写历史经过。
