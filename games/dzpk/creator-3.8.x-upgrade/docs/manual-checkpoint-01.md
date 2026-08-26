# Manual Checkpoint 01 — 工程导入与序列化

Status：`OfficialImporterOutputCapturedAwaitingScriptReplacementAndSerializationAudit`

请使用 Creator 3.8.8：

1. 打开本目录，而不是 2.4.x 目录；Dashboard 应显示 `Creator 3.8.8`，不应再弹出从
   `v0.1.0` 升级的确认框；
2. 观察是否触发旧 `.fire/.prefab/.meta` 升级；
3. 不要手工删除 missing component，先截图错误；
4. 核对 `assets/DZPK/prefab` 六个 Prefab 是否都能在资源管理器看到；
5. 打开 Boot Scene，记录缺失脚本、资源和序列化字段；
6. 分别打开 Load、Room、DZPKMain、Rule、Set、Bank Prefab；
7. 本节点不要运行牌局：Table Controller/Presentation 仍是序列化桥；
8. 等待资源导入完成，保存 Creator 自动迁移后的文件，再通知 Codex继续处理。

请把 Console 的第一批红色错误完整截图。不要手工删除 missing component、重新生成 UUID、
改变 Prefab 节点或点击“修复全部”，这些变化应由后续源码迁移解决。

## 已处理的导入问题

- 首次加入 Dashboard 时曾显示 `Creator3D 0.1.0` 并要求升级。原因是手工组装官方模板时，
  `package.json.version` 被错误写成了 npm 风格的 `0.1.0`，而 Dashboard 会把该字段解释为
  项目所用 Creator 版本。
- 决策：不让 Creator 基于错误版本执行迁移；补齐 3.8 项目的 `type`、独立项目 `uuid`、
  顶层 `version` 与 `creator.version`，并全部锁定为 `3.8.8`。该修正只影响项目身份声明，
  不改变原版资源、Prefab、节点或脚本 UUID。
- Creator 首次导入时对旧 2.4.x 图片、Spine 贴图和 plist 报出
  `The importer version is lower than asset`。这些条目是导入器版本警告，不是当前脚本编译
  阻塞；Creator 已在保留资源 UUID 的前提下写入 3.8 格式 meta，因此保留编辑器生成结果，
  不手工批量覆盖或重新生成 meta。
- 第一条脚本阻塞是 `DzpkRoomSelectionController.ts` 第 188 行的 TypeScript 类型断言被换行到
  独立的 `as` 语句，触发 `Missing semicolon`。已把属性访问保持在同一表达式中；该修正不改变
  房间等级读取、金币门槛或进房事件流。

## 人工反馈记录

- Creator：`3.8.8`；
- Scene 初始化：meshopt、Box2D、Bullet 与 Builtin pipeline 均完成；
- 修正房间脚本语法后，用户清空并重新观察 Console，未出现红色错误；
- 结论边界：仅确认编辑器资源导入和脚本解析当前干净。尚未确认 Boot Scene、六个原版 Prefab、
  组件序列化字段、节点绑定与可运行牌局，因此本检查点尚未完成，也不能晋级
  `Creator38OriginalClientParityVerified`。

## Prefab/Scene 打开失败后的结论修正

- 人工继续打开 Boot Scene 与六个 Prefab 后，它们全部无法进入编辑模式，并共同出现
  `Cannot read properties of null (reading 'anchorPoint'/'contentSize')`。
- 根因不是七份资源分别损坏，而是初始 3.8 工程直接复制了 2.4 的 `.fire/.prefab`。Creator
  首轮只重写了资源 meta，没有执行官方 **Import Cocos Creator 2.x Project** 转换，因此旧
  `cc.Node._contentSize/_anchorPoint` 没有迁移成 3.x 节点上的 `UITransform` 序列化组件。
- 撤销 `EditorImportCleanAwaitingPrefabInspection`：Console 无脚本语法错误只能证明 TypeScript
  可解析，不能证明旧场景数据能够被 3.8 反序列化。
- 修正路线：用全新的官方 Creator 3.8.8 `empty-2d` 工程作为临时 workbench，从冻结的
  `creator-2.4.x-standalone` 根目录执行官方 2.x 项目导入；审计导出的 Scene、六个 Prefab、
  UUID、节点与组件后，再替换当前无效的直接复制输入。禁止手工重画或逐节点猜测补丁。

## 官方 importer 人工结果

- 2026-08-26 用户在干净 workbench 中完成官方导入，Creator 明确显示“导入完毕”。
- 新阻塞集中在 importer 把旧转译 JavaScript 机械转换为 TypeScript 后残留的
  `__extends/__awaiter/__spreadArrays/exports`、裸模块解析和四个 `_semantic` 语法错误。
- `RoomChoose` missing warning 先按脚本注册失败处理，禁止删除 Prefab 上的原组件；待维护版
  TypeScript 以原 UUID 进入 workbench 后，再检查真实序列化绑定。
- 设计分辨率 warning 统一从 3.8 项目设置对齐原 `1334 x 750` Canvas，不逐节点移动原界面。
