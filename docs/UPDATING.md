# Updates / 更新机制

**0.8.1:** removes the unnecessary assertion and unused import, adds explicit string validation and complete Spanish documentation in both downloads. Save drafts, back up the plugin folder, keep `data.json`, replace program files and restart. Focused polar/XYZ save/reopen checks passed on macOS with Obsidian 1.14.4; other workflows/platforms and app-catalog installation retain their limits.

**0.8.1：** 清理多余类型声明与未使用导入，明确检查字符串参数，两种下载包均包含完整西班牙语文档。先保存草稿、备份插件目录，保留 `data.json` 并重启应用。macOS Obsidian 1.14.4 已通过极坐标/XYZ 保存与重开实测；不扩展为其他功能、平台或商城安装验证。

Historical 0.8.0 compatibility notes / 0.8.0 历史兼容性说明：

**0.8.0:** back up the plugin folder and retain `data.json`. Earlier function and complex-plane blocks remain supported. New polar/XYZ/calculus settings require 0.8.0 to render/edit; downgrading leaves their original definitions in the note but an older build may report unsupported settings. Save drafts before updating and restart Obsidian. Native 0.8.0 save/reopen still needs verification; use a disposable note/vault first.

**0.8.0：** 更新前备份插件目录并保留 `data.json`。旧函数与复平面区块继续支持；新增极坐标、XYZ 和微积分参数需要 0.8.0，降级后原始定义仍留在笔记里，但旧版可能提示不支持。先保存草稿，更新后重启 Obsidian。原生 0.8.0 保存重开仍待验证，请先用独立测试笔记或笔记库。

[English](#english) · [简体中文](#简体中文) · [Installation](INSTALLATION.md)

## English

### Updating the plugin

Visual Math (formerly Visual Math Editor) is distributed as a GitHub public beta. Community-directory submission and approval are separate steps; these instructions do not claim that it is listed.

Once it is approved and available in the community directory:

1. Save or cancel open equation and graph drafts. Draft recovery is temporary memory and does not survive a restart.
2. Open **Settings → Community plugins → Check for updates**.
3. Click **Update** next to Visual Math, or **Update all** for your installed plugins. Community plugins do not update automatically.
4. Restart Obsidian to refresh this plugin's bundled MathLive component.

Obsidian downloads the new version's `main.js`, `manifest.json` and `styles.css`. This replaces the plugin program; you do not edit or append source code, download your entire vault, or reinstall all plugins. Your notes and the plugin's `data.json` preferences are separate from these release files and are retained by normal updates.

For a manual GitHub installation, download the new **installation ZIP** from [Releases](https://github.com/oranipost/visual-math-editor/releases), save drafts, disable the plugin, and back up its existing folder. Copy the new distributed files into `.obsidian/plugins/visual-math-editor/`, replacing files with the same names and retaining the included license notices. **Keep your existing `data.json`**; the installation archive does not include one. Do not delete the plugin folder first or replace `.obsidian` or the vault. Restart Obsidian afterwards. [Detailed installation steps](INSTALLATION.md#english)

### Updating from Visual Math Editor to Visual Math

The 0.7.0 rename changes the display name while keeping plugin ID and directory `visual-math-editor`, the repository URL, existing settings and `vme-plot` identifiers. Update the existing plugin rather than installing a second folder. The new Spanish selection and custom equation keywords use the same local settings file. Back up and retain `data.json` as for any normal update. An older public release can still display the former name.

### How maintainers publish updates

A code or distribution change gets a new version, for example `0.6.3` followed by `0.6.4`. Update `manifest.json`, `package.json` and `package-lock.json` together, and add the version/minimum-app mapping to `versions.json` for this project's packaging checks. Test, build, package, commit, and create an exact-version GitHub tag without `v`. Publish a Release with matching individual runtime files and the installation/source archives. Do not move published tags or overwrite an existing version's program assets. See [RELEASING.md](../RELEASING.md).

The initial directory entry is submitted once. New releases are checked again by the directory, including release assets, source and build consistency; errors may require a correction and another incremented release. Use **Check for new releases** or **Request review** on the entry when necessary.

`versions.json` supports users whose Obsidian version is below the newest plugin's `minAppVersion`: it lets Obsidian find an older compatible release. Officially it only needs updating when that minimum changes; this project records every release. Keep older public releases available for compatibility.

### Contact

Developer: [Dongfang Wang / oranipost](https://github.com/oranipost). Public feedback: [GitHub Issues](https://github.com/oranipost/visual-math-editor/issues). Private contact: [oranipost@outlook.com](mailto:oranipost@outlook.com). GitHub profiles do not provide direct messages. Please include plugin/app versions, your operating system and a small invented example, rather than private notes or an entire vault.

## 简体中文

### 用户怎样更新

Visual Math（原 Visual Math Editor）通过 GitHub 分发公开测试版。目录提交、审核通过和上架是独立步骤，本说明不代表已经收录。

社区目录审核通过、可在目录内安装后：

1. 保存或取消尚未提交的公式和图像草稿；草稿恢复只使用临时内存，不会跨重启保留。
2. 进入 **设置 → 第三方插件 → 检查更新（Settings → Community plugins → Check for updates）**。
3. 点击 Visual Math 旁的 **更新（Update）**；也可用 **全部更新（Update all）** 更新其他已装插件。社区插件不会自动更新。
4. 重启 Obsidian，以刷新本插件内置的 MathLive 组件。

更新器下载新版 `main.js`、`manifest.json`、`styles.css`，替换插件程序文件。**用户无需自行补代码，不必重新下载整个笔记库，也不必重新安装所有插件。** 笔记和保存偏好的 `data.json` 独立于这些发行文件，正常更新会保留。

目前手动安装的用户，从 [Releases](https://github.com/oranipost/visual-math-editor/releases) 下载新版**安装 ZIP**。保存草稿、关闭插件并备份现有文件夹后，把新版分发文件复制到 `.obsidian/plugins/visual-math-editor/`，覆盖同名文件并保留随包附带的许可证。**保留原有 `data.json`**；安装包不包含这个设置文件。不要先删除插件文件夹，也不要替换整个 `.obsidian` 或笔记库。完成后重启 Obsidian。[完整安装步骤](INSTALLATION.md#简体中文)

### 从 Visual Math Editor 更新为 Visual Math

0.7.0 更改显示名称，继续保留插件 ID 与目录 `visual-math-editor`、仓库地址、既有设置和 `vme-plot` 标识。更新现有插件即可，不另建第二个文件夹。新增西班牙语选择与自定义公式关键词使用同一个本地设置文件；像正常更新一样备份并保留 `data.json`。旧的公开发行版仍可能显示旧名称。

### 开发者怎样发布新版

代码或分发内容改变时使用新版本号，例如从 `0.6.3` 更新为 `0.6.4`。同步修改 `manifest.json`、`package.json`、`package-lock.json`，并按项目打包检查要求，在 `versions.json` 增加版本与最低 Obsidian 版本的对应项。测试、构建、打包和提交后，创建与 manifest 完全相同的标签，不加 `v`。Release 需单独附上三个程序文件，再提供安装包、源码包和校验值。不要移动已发布标签或覆盖旧版本的程序附件。详见[发布维护](../RELEASING.md)。

目录只需首次创建条目，但后续新版本仍会自动检查附件、源码和构建一致性；发现错误时按审核结果修复，再增加版本号发布。需要时可在条目菜单选择 **Check for new releases / Request review**。

`versions.json` 为 Obsidian 版本较旧的用户提供兼容回退，让客户端找到仍能运行的旧版插件。官方只要求在最低版本变化时更新；本项目每个发行版都记录对应项。应保留旧的公开发行版供兼容回退使用。

### 联系开发者

开发者：[Dongfang Wang / oranipost](https://github.com/oranipost)。公开问题反馈：[GitHub Issues](https://github.com/oranipost/visual-math-editor/issues)。私下联系：[oranipost@outlook.com](mailto:oranipost@outlook.com)。GitHub 普通个人主页没有私信功能。反馈时请提供插件/应用版本、操作系统和独立示例，不发送私人笔记或整个笔记库。

## Official references / 官方依据

- [Community plugins: checking and applying updates](https://help.obsidian.md/Extending+Obsidian/Community+plugins)
- [Submitting a plugin and release-file requirements](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin)
- [Managing an entry and release reviews](https://docs.obsidian.md/community-directory/manage-entry)
- [Versions and minimum-app compatibility](https://docs.obsidian.md/Reference/Versions)
