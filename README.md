# Oh-my-ark-theme

终末地、众生行记、火山旅梦：三种原创构图，六套明暗主题。支持独立原生配色、可撤销增强背景，以及 Codex / VS Code 分别选择或一次同步。

**当前是 0.1.0 本地预览版。** 原生主题和构建工具可用；增强适配属于实验功能。真实应用、平台和性能验证的状态见 [兼容报告](docs/COMPATIBILITY.md)，不能把构建成功当作 24 个组合均已验收。

## 使用

需要 Node.js 22 或更高版本。便携包不附带 Node。Windows 解压后运行 `arktheme.cmd`；macOS 解压后运行 `sh ./arktheme`。

1. 在 VS Code 中执行 **Extensions: Install from VSIX**，选择发布目录中的 VSIX。
2. 执行 **Ark Theme: Open Control Panel**，选择系列与明暗；或运行：

```sh
node dist/cli.mjs apply endfield --mode system --target all
node dist/cli.mjs status
node dist/cli.mjs doctor
```

同步只保存这次操作指定的两端选择。之后 `--target codex` 或 `--target vscode` 不修改另一端。未启动的应用显示待启动，不会被自动打开。VS Code 扩展在下次启动时读取选择；Codex 需要使用增强启动入口。原生 Codex 参数卡位于 `assets/generated/codex-appearance-cards.json`，这是项目说明数据，**不是官方可导入主题格式**。

## 可选背景

VS Code 需要明确指定当前安装中的 `resources/app`：

```sh
node dist/cli.mjs enhance --target vscode --app-root "D:/Microsoft VS Code/<version>/resources/app"
node dist/cli.mjs disable --target vscode --app-root "D:/Microsoft VS Code/<version>/resources/app"
```

macOS 通常为 `/Applications/Visual Studio Code.app/Contents/Resources/app`。增强首次安装、删除或更新后需要重载窗口；普通六套主题切换不重复写入安装文件。程序只添加有项目标记的内嵌 CSS，不修改 CSP、校验和或完整性提示。安装目录只读时会报告失败；不要修改系统应用目录权限。

当前探测基线为 VS Code 1.143.0。其他版本默认拒绝增强。维护者完成副本验证后可显式使用 `ARKTHEME_ALLOW_UNVERIFIED=1` 做实验验证；这不等于获得兼容认证。

Codex：当前没有完成本项目实机验收的版本，增强层默认关闭。进行明确的实验验证时，先设置 `ARKTHEME_ALLOW_UNVERIFIED=1`（PowerShell：`$env:ARKTHEME_ALLOW_UNVERIFIED='1'`；macOS：`export ARKTHEME_ALLOW_UNVERIFIED=1`），正常关闭应用，再运行：

```sh
node dist/cli.mjs launch --target codex
```

启动入口保留前台桥进程，每五秒检查一次新的窗口和选择；同一状态目录最多一个桥。Ctrl+C 暂停装饰；下次使用同一入口可继续。Windows 使用项目独立 `cdp-profile`，首次必须在界面确认登录和会话可见性。不要把已有浏览器资料目录复制进去。已有普通 Codex 窗口不会被自动关闭。

```sh
node dist/cli.mjs pause
node dist/cli.mjs restore --target codex
node dist/cli.mjs restore --target vscode --app-root "<resources/app>"
```

暂停只移除装饰，不关闭调试端口。完整 Codex 恢复核验项目启动记录和官方应用进程，正常关闭调试实例、验证端口关闭后正常启动；无法验证时拒绝结束进程并明确报告。完整恢复可能中断当前 Codex 工作，请在工作结束后执行。原生配色设置由 VS Code 扩展按原值恢复，用户后来修改的设置会被保留。

## 开发

```sh
npm ci
npm run build
npm run check
npm test
npm run package
npm run preview
```

- `packages/core/src/tokens.ts`：共享语义令牌和六套原生映射。
- `scripts/build.ts`：原创 SVG、英文展示标题转曲、WebP 和离线 CSS。
- `packages/core/src/`：原子状态保存、补丁备份恢复、Codex 进程验证桥。
- `packages/vscode/`：扩展、控制面板、原生主题与离线背景。
- `packages/cli/`：CLI；`dist/cli.mjs` 是独立打包入口。
- `assets/generated/`：18 个可编辑 SVG，增强 CSS，Codex 参数卡。
- `dist/preview/`：六套封面和工作背景画册。
- `dist/releases/`：VSIX、两个平台便携包、SHA256SUMS。

`ARKTHEME_HOME` 可指定隔离状态目录；`ARKTHEME_ROOT` 可指定资源根目录。默认状态位置为 Windows `%LOCALAPPDATA%/OhMyArkTheme`、macOS `~/Library/Application Support/OhMyArkTheme`。状态中没有账号凭证；独立 Codex profile 由 Codex 自己管理。

原创同人风格研究；与鹰角、Gryphline、Microsoft、OpenAI 无隶属或官方授权关系。不打包游戏截图、人物立绘和同人作品。
