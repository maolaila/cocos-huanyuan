# DZPK Creator 3.8.x Upgrade

Status：`InProgressStaticMigration`

本工程以 Creator `3.8.8` 官方 `empty-2d` 模板为结构事实源，从
`../creator-2.4.x-standalone` 迁移。它与 2.4.x 工程并存，不覆盖冻结基线。

## 当前节点

- 已冻结 2.4.7 工程、六个 Prefab 与权威 Cocos commit；
- 已导入原 DZPK/BJL/Hall 资源和 2.4.7 Scene/Prefab 序列化输入；
- 旧 JavaScript 只保存在 `migration-source/creator-2.4.7`，不会作为 3.8 runtime 编译；
- 正在把 Standalone 与语义组件迁成 TypeScript/ES Module；
- Creator 3.8.8 已完成脚本导入，但直接复制的 2.4 `.fire/.prefab` 无法打开；干净
  workbench 已通过 Cocos 官方 **Import Cocos Creator 2.x Project** 生成 3.x 序列化输入，
  当前正在审计输出并以可维护 TypeScript 替换 importer 机械转换的旧模块脚本；
- 尚未通过 Scene/Prefab 打开检查或运行确认。

因此当前不能称为 `Creator38OriginalClientParityVerified`。

## 人工协作规则

Codex 负责源码迁移和静态逻辑检查，不执行 Creator 构建、自动测试或浏览器验收。
每个 checkpoint 完成后，由用户用 Creator 3.8.8 打开工程并反馈编辑器、Prefab 和运行结果。

## 目录

```text
assets/                         # 3.8 runtime 资源与 TypeScript
migration-source/creator-2.4.7 # 只读旧脚本证据，不参与 runtime
docs/                           # 基线、兼容账本与人工检查单
settings/ profiles/ .creator/  # Creator 3.8.8 官方模板结构
```

后续 2-6 认证真人和 REAL money 不属于本次客户端技术升级。
