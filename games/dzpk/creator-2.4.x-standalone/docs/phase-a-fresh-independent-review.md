# DZPK Phase A Fresh Independent Review

```text
ReviewMode: FromZeroFreshReview
ReviewTimeJST: 2026-08-25T23:25:31+09:00
ReviewTimeBeijing: 2026-08-25T22:25:31+08:00
Verdict: Creator247OriginalClientParityVerified
P0: 0
P1: 0
P2: 0
```

旧自绘客户端、旧 `LocalSingleHumanBotBaselineVerified` 和旧 Phase A 人工结论均未继承。
本次复核以只读 KG Cocos commit
`b5694d576c482e02dc00a33f51eea633b9cd647f`、只读 KG PHP commit
`13a3d5c3dfb88e5608bf2e84b8559be7790202f1`、独立 Creator 2.4.7 工程和
GameHub `develop` 基线 `8b94b3496d45718b684ef39d1a476ef88fce27b2` 为事实源。

## 通过的硬门

- 权威 `assets/DZPK` 695 文件、六个 Prefab、`DZPKMain` 321 节点和五份字节相同原脚本身份闭合；
- 五份语义核心真实挂载，Load -> Room -> DZPKMain、Rule、Set、Night 继续使用原节点、资源与动画；
- Boot 只有容器、Camera 和原 Night，不存在自绘桌台、外层网页壳或客户端 authority；
- Creator 2.4.7 临时副本 fresh build、边界 verifier、两手自然浏览器、844x390、Rule/Set/Night、刷新和后端重启通过；
- engine、GameHub backend、Redis CAS/AOF、viewer privacy、幂等、REAL fail-closed 和 Phase A TRIAL 控牌通过；
- full acceptance：2,598,960 五张穷举、1,000,000 七张 oracle 零差异、50,000 手/1,150,532 动作/50,000 unique deals、三方向 CI、target-stop 与 13 状态恢复全部通过；
- GameHub 官方站、micro-shell、管理台、SDK 等前端路径零 diff。

## 审计发现与关闭

首次 fresh focused run 发现 200 手机器人轮换测试会超过 Bun 默认 5 秒，形成 P1。
最终只对该压力测试固化 30,000ms 局部预算，没有降低 200 手覆盖，也没有放宽全局 timeout。
独立复核用原失败命令重跑得到 67 pass / 0 fail / 530 expects，200 手用例 9.640 秒，
因此 P1 关闭。

## 非阻塞后续范围

REAL hand economics 与 wallet/order/ledger/audit/admin reconciliation、正式 UID control
policy、2-6 认证真人、Creator 3.8、线上不可变 package、部署、AI-QA 和生产候选均属于后续阶段。
Bank 为 `SourcePresentButGameRuntimeNotApplicable`；forced settlement 图片只证明原节点表达能力，
不作为自然概率证据。
