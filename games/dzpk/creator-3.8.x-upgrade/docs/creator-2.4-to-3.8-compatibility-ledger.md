# DZPK Creator 2.4.7 → 3.8.8 Compatibility Ledger

## 原则

- 原 Prefab、节点、资源、动画和 source event 语义不变；
- 只替换 Creator 技术 API 和不可维护的旧脚本结构；
- 2.4.x 输入保存在 `migration-source`，不得直接参与 3.8 runtime；
- GameHub backend 合约保持 `context/init + authenticated KG WS + Msg_Hall/Msg_DZPK`；
- 本阶段仍为 TRIAL、一真人五机器人，不借迁移扩大到多人或真钱。

## API 差异

| 2.4.7 | 3.8.8 目标 | 决策 |
|---|---|---|
| 全局 `cc` | `import { ... } from 'cc'` | 全部显式导入 |
| CommonJS `require/exports` | TypeScript ES Module | 禁止 runtime CommonJS |
| `cc.Class` | `@ccclass` + `Component` | 序列化类名显式稳定 |
| `cc._decorator.property` | `@property(...)` | 保留 Prefab 字段语义 |
| `node.runAction/cc.Action` | `tween`、schedule 或 Animation | 按原时序逐方法迁移 |
| `cc.NodePool` | `NodePool` | 封装为语义池，不泄漏旧接口 |
| `cc.audioEngine` | `AudioSource`/`AudioClip` | 保留资源路径与手势解锁 |
| `cc.assetManager` bundle | `assetManager`/`AssetManager.Bundle` | 保持 DZPK bundle |
| `cc.find/instantiate/isValid` | 3.8 同名显式 import | 禁止全局调用 |
| `cc.game.EVENT_HIDE/SHOW` | `Game.EVENT_HIDE/SHOW` | Boot 生命周期迁移 |
| `cc.view` | `view` | 保持 1334×750 SHOW_ALL |
| `sp.Skeleton` | `sp.Skeleton` 显式 import | 保持 Spine 资源/动画名 |
| 2.4 `.fire/.prefab` | 官方 `plugin-import-2x` 输出 `.scene/.prefab` | 干净 workbench 导入后审计并集成；禁止直接复制 |

## 分层迁移状态

| 层 | 状态 | 内容 |
|---|---|---|
| 工程模板 | Implemented | 官方 3.8.8 empty-2d |
| 权威资源输入 | Implemented | DZPK/BJL/Hall、Scene/Prefab 2.4 输入 |
| 会话/事件纯逻辑 | ImplementedStatic | GameContext、EventBus、protocol、transport |
| Cocos Boot/导航/资源 | ImplementedStatic | TypeScript、Asset Bundle、AudioSource |
| Load/Room | ImplementedStatic | 原流程已迁移，等待 Prefab rebind |
| Table Model | ImplementedStatic | viewer-safe 纯状态已迁移 |
| Table Controller/Presentation | SerializedBridgeOnly | handler/字段存在，行为待 Checkpoint 02 |
| Rule/Set/shared components | ImplementedStatic | Popup、Toggle、PageView、DropDown、AdaptView |
| 3.8 序列化输出 | HumanEditorVerified | 官方输出已集成；节点数一致，七个资源可打开/显示且无红错 |
| 可运行结论 | PendingHumanReview | 不得提前宣称 |
