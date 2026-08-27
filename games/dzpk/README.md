# KG 德州扑克（DZPK）

GameHub gameCode：`dzpk-955`  
KG source gameId：`119`  
KG Cocos client gameId / PHP gtype：`19`

## 版本目录

### `creator-2.4.x-standalone`

- 技术基线：Cocos Creator `2.4.7`；
- 权威 Cocos commit：`b5694d576c482e02dc00a33f51eea633b9cd647f`；
- 导入前独立工程 commit：`8f08eb4b234b44c093d3338535d169bde0063183`；
- 目标：原 Prefab、节点、资源、动画和事件语义还原为可独立运行工程；
- 当前范围：一名真人、五名服务端机器人、TRIAL 牌局、Redis 快照与 GameHub 后端接口；
- 人工复核状态以版本目录内 `docs/phase-a-validation-evidence.md` 为准。

### `creator-3.8.x-upgrade`

迁移已开始。Creator 3.8.8 工程骨架、基础 TypeScript 和语义组件输入已建立；首次人工
检查证明直接复制的 2.4 `.fire/.prefab` 不能被 3.8 正确反序列化，现已撤销该导入检查点，
改用官方 **Import Cocos Creator 2.x Project** 工作流重新生成序列化。正式工程已集成官方
Scene/Prefab/resource/meta，并排除旧转译
helper/CommonJS 脚本；Checkpoint 02 暴露的 DEFAULT Layer 与漏 UITransform 已做确定性后处理，
2026-08-27 人工确认 Room 和其余 Prefab 均能正常打开/显示且无红错。原牌桌 Controller/
Presentation 已完成 3.8 TypeScript 静态迁移，当前为
`Creator38TableBehaviorImplementedStaticAwaitingHumanReview`，等待 Manual Checkpoint 04 的完整牌局、
第二手、返回 Room 与重连快照；尚不能称为原版一致的 3.8.x 工程。

端到端过程和踩坑实例见 `docs/process-journal.md`。

## 共同边界

- GameHub 正式真钱、2-6 名认证真人、线上包和生产候选不属于当前 2.4.x Phase A；
- 原 KG Cocos/PHP 只读，不从其它游戏借 UI、资产、赔率或规则；
- 后续修正先改对应版本目录，不在仓库根目录散放游戏源码。
