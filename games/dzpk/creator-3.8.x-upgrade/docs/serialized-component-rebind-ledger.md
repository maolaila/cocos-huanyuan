# Creator 3.8 Serialized Component Rebind Ledger

官方 2.x importer 已生成 3.x Scene/Prefab。以下 11 个 2.4 自定义 Class ID 在输出中仍然
存在，并与维护版 3.8 TypeScript meta 的 UUID 一致；2026-08-27 人工确认七个序列化资源均能
正常打开和显示，Console 无红错。

| Prefab | 3.8 class | UUID | 当前状态 |
|---|---|---|---|
| Boot Scene | `DzpkStandaloneBoot` | `bd450fd4-83e2-47de-93e2-2a2c88be6544` | OfficialTypePresent / MaintainedTsUuidMatch |
| Load | `DzpkLoadingScreenController` | `41f21fbc-4cb9-409c-b59c-fcff61a6cad8` | OfficialTypePresent / MaintainedTsUuidMatch |
| Room | `DzpkRoomSelectionController` | `84ec9e6a-d3ac-434e-9990-4fc863466d3e` | OfficialTypePresent / MaintainedTsUuidMatch |
| Room cards | `RoomChoose` | `d3efcaf2-3147-4de2-9bf1-7a0a32adf850` | HumanEditorVerified |
| DZPKMain | `DzpkTableGameController` | `6b8f401e-0cd5-4e75-a424-48316c0f02e7` | MaintainedTsBehaviorPorted / AwaitingHumanFlow |
| DZPKMain | `DzpkTablePresentation` | `2de88e3d-5d6c-47b1-b942-913966e6ac3f` | MaintainedTsBehaviorPorted / AwaitingHumanFlow |
| DZPKMain | `DropDown` | `dd06c934-a75f-46d8-95b9-317ba9ef581d` | OfficialTypePresent / MaintainedTsUuidMatch |
| DZPKMain | `AdaptView` | `f2748e31-1526-4387-b8ae-48eda2768367` | OfficialTypePresent / MaintainedTsUuidMatch |
| Rule | `Rule` | `54b1f51b-95d5-4a15-b19a-f7a921cd7729` | OfficialTypePresent / MaintainedTsUuidMatch |
| Set | `Set` | `a1620120-08bb-4424-8b7d-c54e9f37d1d6` | OfficialTypePresent / MaintainedTsUuidMatch |
| Bank | `GameBank` | `5f912394-03e1-4733-bb66-714299ba29d1` | OfficialTypePresent / NotApplicableBridge |

官方 Room Prefab 仍保存三份 `RoomChoose` 组件及其 `img1` 序列化数组；importer 阶段的
`Prefab asset missing` warning 发生在旧转译脚本未成功注册时，不能据此删除组件。

若后续正式工程显示 Missing Script，先记录 Prefab、节点和缺失 UUID，不要重新挂一个新组件。
当前 `.scene/.prefab/.meta` 已通过序列化打开/显示检查；牌桌脚本的静态迁移完成仍不代表牌桌
可玩，必须执行 Manual Checkpoint 04 的完整主循环与快照恢复。
