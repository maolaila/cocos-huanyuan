# Manual Checkpoint 01 — 工程导入与序列化

Status：`ReadyForHumanReview`

请使用 Creator 3.8.8：

1. 打开本目录，而不是 2.4.x 目录；
2. 观察是否触发旧 `.fire/.prefab/.meta` 升级；
3. 不要手工删除 missing component，先截图错误；
4. 核对 `assets/DZPK/prefab` 六个 Prefab 是否都能在资源管理器看到；
5. 打开 Boot Scene，记录缺失脚本、资源和序列化字段；
6. 分别打开 Load、Room、DZPKMain、Rule、Set、Bank Prefab；
7. 本节点不要运行牌局：Table Controller/Presentation 仍是序列化桥；
8. 等待资源导入完成，保存 Creator 自动迁移后的文件，再通知 Codex继续处理。

请把 Console 的第一批红色错误完整截图。不要手工删除 missing component、重新生成 UUID、
改变 Prefab 节点或点击“修复全部”，这些变化应由后续源码迁移解决。
