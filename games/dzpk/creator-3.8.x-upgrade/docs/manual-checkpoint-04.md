# Manual Checkpoint 04 — Creator 3.8.8 牌桌完整主循环

Status：`AwaitingHumanReview`

本检查点验证冻结 2.4 牌桌 Controller/Presentation 在 Creator 3.8.8 中的行为迁移。Codex 未执行
机器编译、预览或自动测试；以下结果必须由人工实际运行产生。

## A. 脚本与进入牌桌

1. 等待 Creator 资源刷新完成，Console 不应出现新的红色 TypeScript、Missing Script 或绑定错误；
2. 从 `DzpkStandaloneBoot.scene` 预览，原 Load -> Room 流程可见；
3. 选择体验场进入原 `DZPKMain` 牌桌，不出现额外 wrapper 或重绘页面；
4. 六个座位、原头像/筹码/桌面/按钮/荷官位按源快照显示。

## B. 一手完整牌局

1. 一名玩家与五名机器人收到两张牌，发牌顺序和背面/正面切换正常；
2. 强制盲注、单街下注、总底池与已归集底池数字同步；
3. 玩家可实际执行弃牌、过牌、跟注和加注；
4. 加注预设、Slider、加减盲注按钮与全下动画使用正确金额；
5. 机器人行动后显示原跟注/加注/弃牌/全下标记与倒计时；
6. flop、turn、river 按原动画出现，牌面大小/花色和字体不发生回退；
7. 摊牌、高亮五张最佳牌、派奖、筹码回收和余额更新正常；
8. 结算清理后能自动进入第二手，不残留上一手牌、标记、筹码或倒计时。

## C. 导航、弹窗与恢复

1. 桌内菜单的规则、设置仍打开原 Prefab；银行显示独立模式不可用提示；
2. 桌内“返回”在允许离桌时发送原 `Msg_DZPK_Out` 并回到 Room，不直接退出游戏；
3. 牌局进行中返回应显示原限制提示；Room 的返回才执行 standalone/GameHub 退出语义；
4. 在一手进行中刷新/重连后，座位、私牌/公共牌、荷官、下注、底池、当前行动人与倒计时由
   `Msg_DZPK_RoomInfo` 快照一次性恢复，不重复发牌或重复结算；
5. 全流程 Console 无红色错误。`Skeleton 3.6.37 / runtime 3.8.99` 仍单列 warning；若某个实际
   Spine 动画缺失，请记录具体节点与动作，不要只改 JSON 版本字符串。

## 结果记录

- Creator：`3.8.8`
- 日期：
- 完整第一手：
- 第二手：
- 返回 Room：
- 重连快照：
- Console 第一条红错（如有）：
- 视觉/动画差异（如有）：

全部通过后才可把 gate 更新为 `Creator38TableMainLoopHumanVerified`；这仍不是
`Creator388OriginalClientParityVerified`，后者还需要 Load/Room/Rule/Set/Bank、声音、异常分支和
整体原版一致性复核。
