# Creator 3.8 Serialized Component Rebind Ledger

首次打开工程时，以下 2.4 自定义 Class ID 应通过复用 UUID 绑定到 3.8 TypeScript。

| Prefab | 3.8 class | UUID | Checkpoint 01 状态 |
|---|---|---|---|
| Boot Scene | `DzpkStandaloneBoot` | `bd450fd4-83e2-47de-93e2-2a2c88be6544` | ImplementedStatic |
| Load | `DzpkLoadingScreenController` | `41f21fbc-4cb9-409c-b59c-fcff61a6cad8` | ImplementedStatic |
| Room | `DzpkRoomSelectionController` | `84ec9e6a-d3ac-434e-9990-4fc863466d3e` | ImplementedStatic |
| Room cards | `RoomChoose` | `d3efcaf2-3147-4de2-9bf1-7a0a32adf850` | ImplementedStatic |
| DZPKMain | `DzpkTableGameController` | `6b8f401e-0cd5-4e75-a424-48316c0f02e7` | SerializedBridgeOnly |
| DZPKMain | `DzpkTablePresentation` | `2de88e3d-5d6c-47b1-b942-913966e6ac3f` | SerializedBridgeOnly |
| DZPKMain | `DropDown` | `dd06c934-a75f-46d8-95b9-317ba9ef581d` | ImplementedStatic |
| DZPKMain | `AdaptView` | `f2748e31-1526-4387-b8ae-48eda2768367` | ImplementedStatic |
| Rule | `Rule` | `54b1f51b-95d5-4a15-b19a-f7a921cd7729` | ImplementedStatic |
| Set | `Set` | `a1620120-08bb-4424-8b7d-c54e9f37d1d6` | ImplementedStatic |
| Bank | `GameBank` | `5f912394-03e1-4733-bb66-714299ba29d1` | NotApplicableBridge |

若 Creator 显示 Missing Script，先记录 Prefab、节点和缺失 UUID，不要重新挂一个新组件。
自动升级后的 `.scene/.prefab/.meta` 将成为 Checkpoint 02 的输入。
