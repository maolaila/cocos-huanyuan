# 德州扑克 Creator 3.8.8 源码学习顺序

这份索引服务于“边看代码边学习 Cocos”的场景。正式运行代码仍在 `assets/`；本文只告诉你先看
什么、每一层解决什么问题。源码中的中文块注释会继续解释本文件实际使用的 Cocos API 和调用链。

## 建议一次只看一层

1. `assets/Standalone/StandaloneBoot.ts`
   - 看 Cocos 组件怎样从 Scene 启动，怎样处理横屏、前后台切换，以及怎样组装整个运行环境。
2. `assets/Standalone/GameContext.ts`、`DzpkRuntimeServices.ts`
   - 看原 KG 大厅提供的全局数据怎样被收进一个明确、可追踪的上下文，而不是继续依赖全局变量。
3. `DzpkEventBus.ts`、`SourceProtocolAdapter.ts`、`GameHubAuthenticatedTransport.ts`
   - 看 `按钮意图 -> WebSocket -> 原版 Msg_* 消息 -> 本地事件` 的完整链路。
4. `DzpkLoadingScreenController.ts`、`DzpkRoomSelectionController.ts`
   - 看原 Load/Room Prefab 怎样加载、显示房间、进入牌桌，以及返回/重连时为什么不能销毁 Room。
5. `DzpkTableStateModel.ts`、`DzpkTableControllerSupport.ts`
   - 先只看数据：座位如何以自己为 0 号位旋转，快照、下注、底池和结算怎样被规范化。
6. `DzpkTableGameController.ts`
   - 看牌局主线：快照、发牌、盲注、轮到行动、玩家动作、公共牌、结算、下一手和返回房间。
7. `DzpkTablePresentation.ts`
   - 最后看画面：原 321 节点 Prefab、牌/筹码对象池、Tween、Spine、Label、Slider 和结算动画。
8. `assets/_script/`
   - 看规则、设置、下拉菜单和弹窗等较小的原版组件。

## 阅读时始终区分三件事

- `StateModel` 保存当前“应该显示什么”，不决定牌和钱。
- `GameController` 按服务端事件顺序更新状态并安排表现任务，不直接重画节点。
- `Presentation` 只操作原 Prefab 节点和动画，不计算胜负、不改钱包。

GameHub 后端才是发牌、合法动作、结算和真钱的权威。客户端出现的金额缩写、取整或字体切换都只是
显示行为，不能反写成下注或钱包数据。

## 最常见的 Cocos 3.8 概念

- `Component`：挂在 Scene/Prefab 节点上的脚本。`onLoad/start/onEnable/onDestroy` 是它的生命周期。
- `Node`：场景树节点；位置、缩放、父子关系、显隐都在节点上。
- `_decorator.ccclass`：把 TypeScript 类注册成 Creator 能识别的组件。
- `_decorator.property`：把字段交给 Creator 序列化，并允许 Prefab Inspector 绑定节点或资源。
- `getComponent`：从一个节点取已经挂载的组件；`addComponent` 是运行时新增组件。
- `find/getChildByName`：按路径/名称从原 Prefab 树定位节点。路径改变会让绑定失败。
- `instantiate`：按照 Prefab 或模板节点克隆出一个运行实例。
- `tween` / `Tween`：Creator 3.x 的补间动画 API，用于把位置、缩放或透明度平滑改到目标值。
- `scheduleOnce/schedule`：随组件生命周期管理的延迟/重复任务；比散落的定时器更适合画面动画。
- `UITransform`：2D UI 的尺寸、锚点和坐标转换组件。
- `UIOpacity`：让整个 UI 节点树按 0–255 控制透明度。
- `Sprite/SpriteFrame/SpriteAtlas`：图片组件、单张图片帧和图集。
- `Label`：文本组件；本工程金额会在原宽度内压缩，必要时只对该 Label 回退系统字体。
- `Button/Toggle/Slider/ProgressBar/PageView`：按钮、勾选、滑杆、进度和翻页 UI 组件。
- `Animation`：播放 Creator 动画剪辑；3.8 的 `play()` 不再返回可直接改 speed 的状态对象。
- `sp.Skeleton`：Spine 骨骼动画组件。
- `AudioSource`：音乐/音效播放组件。
- `assetManager`：Creator 资源管理入口；本工程通过 Asset Bundle 异步加载原 DZPK Prefab 和音频。
- `NodePool`：重复动画节点的回收池，避免每次发牌/飞筹码都创建和销毁对象。
- `isValid`：异步回调或延迟动画执行前，确认节点/组件尚未被销毁。
- `view/ResolutionPolicy`：设计分辨率和屏幕适配。

## 一条完整的玩家动作链

```text
原 Prefab Button 点击
  -> DzpkTableGameController 校验当前是否轮到自己
  -> GameHubAuthenticatedTransport 发送 Msg_DZPK_ActBet
  -> GameHub 后端校验动作、更新权威牌局和资金状态
  -> WebSocket 返回/广播 Msg_DZPK_ActBet
  -> SourceProtocolAdapter 解码并发布同名本地事件
  -> Controller 更新 StateModel
  -> Presentation 操作原节点、播放筹码/文字/音效
```

客户端不会先扣钱再等后端认可。只有收到服务端成功事件后，画面状态才正式推进。
