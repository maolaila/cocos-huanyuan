# Migration Source

`creator-2.4.7/` 保存升级输入脚本的只读副本，用于逐方法对照。该目录位于
`assets/` 之外，因此 Creator 3.8 不应编译这些 CommonJS、全局 `cc` 或旧 `cc.Class` 文件。

运行时代码只能进入 `assets/`，并使用 Creator 3.8 TypeScript/ES Module API。
