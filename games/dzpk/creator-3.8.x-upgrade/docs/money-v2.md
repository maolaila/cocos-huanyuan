# GameHub MONEY_V2 金额显示

当前 3.8.8 客户端使用 GameHub context/init 返回的 moneyContract 固定币种、基础单位和显示精度。缺少有效快照时拒绝初始化；没有旧资金协议回退。

原牌桌的整数筹码、盲注、底池、抽水、动作消息仍使用实际金额。只有 Label 显示按 baseUnit 除一次；基础单位1000时，实际1筹码显示为0.001游戏单位。Room、Table、准入提示共用格式化入口，保留原单行、缺字回退和框内缩放。

玩家游戏内不额外叠加余额/精度说明黑色面板；原版钱包标签与 GameHub 钱包事实保持同步。

金额契约接入仍须保留原 CNY/VND/国际短单位风格与 Room 字体、行对齐。不能因为存在
`moneyContract` 就覆盖 `shrinkToFit: false`，也不能用字符长度代替原版短单位规则；
否则盲注长数字会被挤小，钱包的自动宽度也会被错误冻结。基础单位只缩放一次，显示截断不回写筹码。

实际自测：

- `bun test games/dzpk/tests`：41项通过，包括精确小数移动、容量、原上下文币种约束及已有退出/重连文档边界测试。
- TypeScript：使用 Creator 生成的声明，`--skipLibCheck --lib ES2020,DOM,DOM.Iterable` 检查通过；跳过的是引擎声明自身错误，项目代码仍检查。
- Creator 3.8.8 web-mobile 构建：退出码36，构建日志 Finished；本轮产物在 `C:/total/game-hub/.codex-run-logs/player-ui-20260910/dzpk-build/web-mobile`。

本轮修改仅涉及当前 3.8.8 维护源码和必要测试；2.4.7 基线、导入来源和 KG 原目录未修改。原有人工检查记录保持独立，未代替视觉与真机验收。

人工检查：CNY/USD/VND 的Room余额、盲注、准入、最大携带、牌桌下注、底池及派奖；重点检查千倍单位、六位精确余额、长金额和字体。新资源包尚未发布，后续应按 GameHub 的不可变资源发布流程部署此构建。
