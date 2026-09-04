# DZPK Creator 3.8.x Upgrade

Status：`Creator388CurrencyLayoutFixAwaitingHumanVisualVerification`

本工程以 Creator `3.8.8` 官方 `empty-2d` 模板为结构事实源，从
`../creator-2.4.x-standalone` 迁移。它与 2.4.x 工程并存，不覆盖冻结基线。

## 当前节点

- 已冻结 2.4.7 工程、六个 Prefab 与权威 Cocos commit；
- 已导入原 DZPK/BJL/Hall 资源和 2.4.7 Scene/Prefab 序列化输入；
- 旧 JavaScript 只保存在 `migration-source/creator-2.4.7`，不会作为 3.8 runtime 编译；
- Standalone 与语义组件已经迁成可维护的 TypeScript/ES Module；
- Creator 3.8.8 已完成脚本导入，但直接复制的 2.4 `.fire/.prefab` 无法打开；干净
  workbench 已通过 Cocos 官方 **Import Cocos Creator 2.x Project** 生成 3.x 序列化输入；
- 官方 Scene、六个 Prefab、资源和 meta 已集成，机械转换的旧模块脚本已排除，组件继续绑定
  维护版 TypeScript 的原 UUID；
- 已规范化 importer 遗留的 DEFAULT/UI_2D Layer 和十个缺失 UITransform；
- 2026-08-27 人工确认七个序列化资源均能正常打开/显示且无红错；
- 原牌桌 Controller/Presentation、完整牌局、机器人、第二手、返回 Room、重连快照及 GameHub
  TRIAL/REAL 直连已经完成；
- 27 个 runtime TypeScript 文件已补充中文学习导读、Cocos API 说明和复杂交互注释；
- 最新 CNY/USD/VND 动态金额与长文本布局已完成实现和构建，仍等待 Manual Checkpoint 05 人工视觉复核。

因此源码实现和可维护性已经具备，但在 Checkpoint 05 通过前仍不能关闭最新视觉一致性门。

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

建议从 [`docs/creator-3.8-source-reading-guide.zh-CN.md`](./docs/creator-3.8-source-reading-guide.zh-CN.md)
开始阅读；它给出适合分段学习的文件顺序和一条完整玩家动作链。

后续 2-6 名认证真人仍只保留类型/方法边界，当前没有伪造为已实现功能。
