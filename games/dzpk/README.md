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

后续迁移目录。必须以 2.4.x 独立版为冻结输入，逐项解决序列化、Asset Bundle、
组件 API、构建、浏览器和移动端差异。当前仅为 Planned，不代表已完成 3.8.x 工程。

## 共同边界

- GameHub 正式真钱、2-6 名认证真人、线上包和生产候选不属于当前 2.4.x Phase A；
- 原 KG Cocos/PHP 只读，不从其它游戏借 UI、资产、赔率或规则；
- 后续修正先改对应版本目录，不在仓库根目录散放游戏源码。
