# DZPK Creator 3.8.x Upgrade

Status：`PlannedLaterPhase`

本目录预留给从 `../creator-2.4.x-standalone` 迁移得到的 Creator 3.8.x 完整工程。
迁移尚未开始，因此这里不复制 2.4.x 源码，也不声明可运行。

计划顺序：

1. 冻结 2.4.7 Prefab、资源 UUID、事件 trace、截图与源码身份；
2. 建立干净的 Creator 3.8.x 工程和 API/序列化差异账本；
3. 逐 Prefab 迁移资源和语义组件，保持 source event 与 GameHub backend 合约不变；
4. 恢复桌面与横屏移动端主循环；
5. 人工验收通过后，再恢复 2-6 名认证真人和后续真钱边界。

任何实际 3.8.x 文件进入本目录时，都必须同步更新本状态和迁移证据。
