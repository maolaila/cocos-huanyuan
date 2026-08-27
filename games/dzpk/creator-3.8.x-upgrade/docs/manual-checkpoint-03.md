# Manual Checkpoint 03 — UI Layer 与缺失 UITransform 修复复核

Status：`PassedHumanReview`

Human result：2026-08-27，Room 与其余五个 Prefab 均能正常进入编辑模式并在中央编辑区显示，
Console 无红色错误。

Creator 3.8.8 保持打开正式工程即可；等待资源刷新后关闭并重新打开当前 Prefab。仍不要运行游戏。

请检查：

1. Room 能进入 Prefab 编辑模式，不再出现 `contentSize`、`anchorPoint` 或 `parameter error`；
2. Bank、DZPKMain、Load、Room、Rule、Set 的中央编辑区能显示原 Prefab 内容，不再只有黑色；
3. Inspector 的 Layer 应显示 `UI_2D`；Main Camera 保持 `DEFAULT`；
4. Room 的三个 RoomChoose、`info` Widget 和 `jxlw_quickstart` Spine 仍存在；
5. DZPKMain 的六个粒子节点、`winspine` 和下注 Slider Handle 仍存在；
6. Console 不应再出现红色 `contentSize/anchorPoint`。

`Skeleton version 3.6.37 does not match runtime version 3.8.99` 暂按独立兼容 warning 记录；不要修改
JSON 中的版本字符串。若静态图能显示但某个 Spine 节点仍完全不显示，请记录具体 Prefab/节点。

不要运行、删除组件、重挂脚本、移动节点或修改 Spine 资源。
