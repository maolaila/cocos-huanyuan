# Cocos 还原工程仓库

本仓库统一保存可学习、可维护、可二次开发的 Cocos 游戏还原工程。目录按
`游戏 -> Creator 技术代际` 分层，禁止把不同游戏或 2.x/3.x 工程混在同一源码根目录。

## 目录约定

```text
games/
  <game-code>/
    creator-2.4.x-standalone/  # 从原版 2.4.x 恢复，可独立运行
    creator-3.8.x-upgrade/     # 以上述 2.4.x 基线迁移的升级版
```

每个版本目录必须是完整 Cocos 工程，并保留自己的 `project.json`、`assets/`、
`settings/`、脚本、证据和说明。3.8.x 目录在迁移真正开始前只允许保存范围说明，
不能复制 2.4.x 代码后冒充升级完成。

## 当前游戏

| 游戏 | gameCode | 2.4.x 独立版 | 3.8.x 升级版 |
|---|---|---|---|
| 德州扑克 | `dzpk-955` | `games/dzpk/creator-2.4.x-standalone` | Planned |

具体身份、完成边界和后续路线见各游戏目录的 README。
