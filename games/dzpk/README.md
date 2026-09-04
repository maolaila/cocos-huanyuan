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

Creator 3.8.8 已通过官方 **Import Cocos Creator 2.x Project** 工作流生成并集成 Scene、六个
Prefab、resource/meta，排除旧转译 helper/CommonJS 脚本，并由维护版 TypeScript 保持原组件 UUID。
原牌桌 Controller/Presentation、完整牌局、机器人、第二手、返回 Room、重连快照以及 GameHub
TRIAL/REAL 直连均已实现和验证。27 个 runtime TypeScript 文件已补充中文学习注释，阅读入口见
`creator-3.8.x-upgrade/docs/creator-3.8-source-reading-guide.zh-CN.md`。

当前 gate 为 `Creator388CurrencyLayoutFixAwaitingHumanVisualVerification`：最新 CNY/USD/VND 金额与
长文本布局还需按 Manual Checkpoint 05 人工视觉复核，因此暂不关闭最终 3.8 视觉一致性门。

端到端过程和踩坑实例见 `docs/process-journal.md`。

## 共同边界

- GameHub 正式真钱、2-6 名认证真人、线上包和生产候选不属于当前 2.4.x Phase A；
- 原 KG Cocos/PHP 只读，不从其它游戏借 UI、资产、赔率或规则；
- 后续修正先改对应版本目录，不在仓库根目录散放游戏源码。
