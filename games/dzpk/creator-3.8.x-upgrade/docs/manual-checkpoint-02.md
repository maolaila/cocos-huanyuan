# Manual Checkpoint 02 — 官方序列化正式工程复核

Status：`SupersededByManualCheckpoint03`

请关闭临时 workbench，然后使用 Creator 3.8.8 打开正式工程：

`C:\works\cocos-huanyuan\games\dzpk\creator-3.8.x-upgrade`

本节点仍不要运行游戏。等待资源刷新后：

1. 清空 Console，确认 workbench 中的 `__extends`、`__awaiter`、`__spreadArrays`、
   `exports is not defined` 和四个 `_semantic` 转换错误不再出现；
2. 打开 `assets/Scene/DzpkStandaloneBoot.scene`；
3. 依次打开 Load、Room、DZPKMain、Rule、Set、Bank 六个 Prefab；
4. 检查层级树能否显示，而不是只选中资源条目；
5. 检查 Inspector 是否有 Missing Script、丢失资源或空的必需序列化字段；
6. Room 中重点检查三个 RoomChoose 组件和 `img1` 数组；
7. DZPKMain 中重点检查 Controller、Presentation、DropDown、AdaptView；
8. 设计分辨率应为 `1334 x 750`，Canvas 不应再出现项目设置不一致 warning。

不要删除 Missing Script、重新生成 UUID、手工重新挂组件、移动原节点或点击“修复全部”。
若出现红错，只需提供清空 Console 后的第一组错误；若没有红错，请报告七个序列化资源是否都
能进入编辑模式。

本检查点只验证官方序列化与组件绑定，不代表牌桌行为已经迁移完成。
