# Installation / 安装说明

**0.8.1 Desktop public beta:** [installation ZIP](https://github.com/oranipost/visual-math-editor/releases/download/0.8.1/visual-math-editor-0.8.1.zip) · [release notes and checksums](https://github.com/oranipost/visual-math-editor/releases/tag/0.8.1). The ZIP is compiled. Focused polar/XYZ insertion, Save view, application restart and editor reopening were checked on macOS with Obsidian 1.14.4. Other native workflows/platforms and app-catalog installation remain unverified. See [TEST-REPORT.md](../TEST-REPORT.md) for publication and review status.

**0.8.1 桌面公开测试版：** [安装包](https://github.com/oranipost/visual-math-editor/releases/download/0.8.1/visual-math-editor-0.8.1.zip) · [发行说明及校验值](https://github.com/oranipost/visual-math-editor/releases/tag/0.8.1)。安装包已编译。在 macOS Obsidian 1.14.4 已实际验证极坐标/XYZ 插入、保存视图、退出重启与重开编辑器；不代表其他原生功能、平台或商城安装均已验证。发布及目录审核状态见 [TEST-REPORT.md](../TEST-REPORT.md)。

[English](#english) · [简体中文](#简体中文) · [Home](../README.md)

## English

**Visual Math 0.8.1** is a maintenance update for the 0.8 graph tools. Use the matching release ZIP below. See [TEST-REPORT.md](../TEST-REPORT.md) for version-specific build, review and focused native observations.

This is the same plugin previously named Visual Math Editor. Keep the existing `visual-math-editor` folder and its `data.json`; do not create a second installation.
### Requirements and download

- Obsidian **1.14.4 or later**, desktop main window. Native integration was checked on macOS with 1.14.4; other desktop systems have not been verified.
- **0.8.1 desktop public beta:** [installation ZIP](https://github.com/oranipost/visual-math-editor/releases/download/0.8.1/visual-math-editor-0.8.1.zip) · [release notes and checksums](https://github.com/oranipost/visual-math-editor/releases/tag/0.8.1). Release availability is shown on [GitHub Releases](https://github.com/oranipost/visual-math-editor/releases); actual validation is recorded in [TEST-REPORT.md](../TEST-REPORT.md). [Community-directory installation](https://community.obsidian.md/plugins/visual-math-editor) also depends on availability in the app's index.
- You do **not** need Node.js, npm, an account or an API key to use the compiled plugin.

Directory review and release verification apply to the specific version that was checked; see [review observations](COMMUNITY-SUBMISSION.md) and [TEST-REPORT.md](../TEST-REPORT.md). **Code → Download ZIP**, `visual-math-editor-source-0.8.1.zip` and GitHub's automatic **Source code** downloads are for developers; they are not the ready-to-install plugin.

### Community-directory installation (when available)

1. Open the [Visual Math directory page](https://community.obsidian.md/plugins/visual-math-editor) and click **Add to Obsidian**. Allow the browser to open Obsidian and choose the intended vault if prompted.
2. In Obsidian's plugin details, choose **Install**, then **Enable**. Enable community plugins in **Settings → Community plugins** first if required.
3. Open a Markdown note and click **∑** in the note header or left ribbon.

The directory version and the version installed in a vault can differ. The focused 0.8.1 check used a manual ZIP upgrade, preserving settings and the old demonstration note, then inserted/reopened polar and XYZ graphs after an application restart. A native app-catalog installation was not completed; use the version displayed in Obsidian and the corresponding review record.

### Manual installation

1. In Obsidian, open the vault in which you want to use the plugin. Locate that vault's folder in your file manager.
2. Extract `visual-math-editor-0.8.1.zip`. Copy its entire `visual-math-editor` folder into the vault's `.obsidian/plugins/` folder. Create `plugins` if necessary.
3. Check the layout below. `main.js` must be directly inside `visual-math-editor`, with no second nested plugin folder.
4. Restart Obsidian. Open **Settings → Community plugins**, turn on community plugins if necessary, and enable **Visual Math**.
5. Open a Markdown note. Click **∑** in the note header or left ribbon, or run **Visual Math: Insert or edit equation** from the command palette.

```text
your-vault/
└── .obsidian/
    └── plugins/
        └── visual-math-editor/
            ├── main.js
            ├── manifest.json
            ├── styles.css
            ├── LICENSE
            ├── MATHLIVE-LICENSE.txt
            ├── KATEX-FONTS-LICENSE.txt
            ├── MHCHEM-LICENSE.txt
            ├── CONVERT-LICENSE.txt
            └── … other included documentation and notices
```

On macOS, **⌘⇧.** reveals hidden folders in Finder. On Windows, enable **View → Show → Hidden items** in File Explorer. If the vault uses a custom configuration directory, replace `.obsidian` with that directory. Keep the distributed licenses and notices when copying or sharing the installation folder.

### First test

The normal editor is an in-note panel below the selected paragraph in Obsidian's desktop main window. The [README screenshots](../README.md#see-it-in-action) use a separate real test vault. **Open equation dialog** is an optional command when you prefer a modal.

1. In an editable note, click **∑ → Visual → Math → Fraction**, enter `3`, press **Tab**, then enter `4`.
2. Switch to **Hybrid**. Change the numerator in the LaTeX source to `5`; check that the formatted fraction updates. Edits in the formatted field synchronize back to source.
3. Click **Insert equation**. Put the cursor in the inserted equation and click **∑** to reopen it. Use Obsidian's **Undo** to reverse a saved change.

In 0.7.0, enter `y=x^2` in the equation editor and use **Graph this equation** directly below it. Check that edits update the curve without retyping the expression. Choose **Insert equation and graph** to save it with the completed formula; merely viewing it does not write the note. Custom equation keywords can save a frequently used equation for reuse. Choose **Español** in the interface-language menu to try Spanish, or use **Follow Obsidian** with the app configured in Spanish. The equation and graph follow each other only inside the current editor. After saving, they are independent blocks: regenerate a graph from a changed equation or explicitly edit the saved graph. Consult the test report for the checks actually performed.

For a complex plane, open **∑ → Graph → Complex plane**, enter `3+2i`, and click **Insert graph** once the input is valid. Drag or zoom inside the saved graph, then click **Save view**. Reopen the note or use **Edit graph** to check that the range was retained. Gestures alone do not save the note.

Use **Units → Unit conversion → Length** to try `1 Inch (in) → Centimetre (cm)`. The result is `1 in = 2.54 cm`. **Use converted result** fills the helper, **Insert units** adds it to the equation draft, and the editor's final **Insert equation / Save changes** writes the note.

To open the editor by keyboard, assign a shortcut to **Insert or edit equation** under **Settings → Hotkeys**. No global shortcut is assigned by default. **Ctrl+Enter** submits the active editor; this is the tested shortcut on macOS as well.

### Updating

Open **Settings → Community plugins → Check for updates**, then **Update** next to Visual Math when a newer version is available. Community plugins do not update automatically. The updater downloads the new program files (`main.js`, `manifest.json`, `styles.css`), not your vault. You do not apply code patches yourself. Save open drafts first, and restart Obsidian afterwards to refresh MathLive.

For a manual update, use these steps:

1. Save or cancel open editor drafts; drafts are not persisted across restarts.
2. Disable the plugin and back up its existing `visual-math-editor` folder.
3. Replace its distributed files with the new installation folder's contents. Retain an existing `data.json`, which contains your local plugin preferences; installation ZIPs do not supply that file.
4. Restart the full Obsidian window and enable the plugin. A full restart also refreshes the bundled MathLive component.

Do not delete the existing plugin folder or replace the entire vault, `.obsidian` directory or other plugins. Normal updates retain your settings and notes. Old `vme-plot` version 1 function blocks remain readable by this release. See [Updating](UPDATING.md#english) for the user and maintainer workflows.

### Optional BRAT beta installation

Users already familiar with [BRAT](https://github.com/TfTHacker/obsidian42-brat) can add `oranipost/visual-math-editor` as a beta-plugin repository. This project publishes the individual release files BRAT expects. The manual ZIP procedure above is the verified installation path; a native BRAT installation has not been tested for this release. BRAT is a separate third-party plugin and is not required.

### Troubleshooting and removal

| Symptom | Check |
| --- | --- |
| Plugin does not appear | Check the exact folder layout, `manifest.json`, app version and community-plugin setting. Restart after copying the files. |
| No ∑ button | Open a Markdown note in the desktop main window and confirm the plugin is enabled. Try the command palette. |
| Shortcut opens another command | Reassign it under **Settings → Hotkeys**. |
| MathLive conflict on startup | Disable the conflicting formula plugin and restart Obsidian before enabling Visual Math again. |
| Cannot save after changing the note | Keep the draft and reopen the original note; stale-note checks prevent overwriting a changed file. Use **Recover equation draft** during the same app run if needed. |
| Unsaved graph view resets | Dragging/zooming is temporary until **Save view** or **Save graph**. |

To remove the plugin, save drafts, disable it in Community plugins, then remove only `.obsidian/plugins/visual-math-editor/`. Standard `$…$` / `$$…$$` mathematics remains in the notes. Chemistry/units require mhchem support. `vme-plot` definitions remain but need this plugin to render as graphs.

For unresolved problems, use the [bug report form](https://github.com/oranipost/visual-math-editor/issues/new?template=bug_report.yml) with an invented example, versions and exact steps. Do not attach private notes or your entire vault.

Developer: [Oliver / oranipost](https://github.com/oranipost). Public feedback: [GitHub Issues](https://github.com/oranipost/visual-math-editor/issues). Private contact: [oranipost@outlook.com](mailto:oranipost@outlook.com). GitHub profiles do not provide direct messages.

## 简体中文

**Visual Math 0.8.1** 是 0.8 绘图功能的维护更新。使用下方对应版本的安装 ZIP；构建、目录审核及限定范围的原生结果分别见 [TEST-REPORT.md](../TEST-REPORT.md)。

这就是原 Visual Math Editor。继续使用已有的 `visual-math-editor` 文件夹并保留 `data.json`，不要安装成两个插件。
### 要求与下载

- Obsidian **1.14.4 或更新版本**，目前支持桌面主窗口。原生测试使用 macOS 与 1.14.4，其他桌面系统尚未验证。
- **0.8.1 桌面公开测试版：**[安装 ZIP](https://github.com/oranipost/visual-math-editor/releases/download/0.8.1/visual-math-editor-0.8.1.zip) · [发布说明与校验值](https://github.com/oranipost/visual-math-editor/releases/tag/0.8.1)。发行可用性见 [GitHub Releases](https://github.com/oranipost/visual-math-editor/releases)，实际验证见 [TEST-REPORT.md](../TEST-REPORT.md)。插件进入应用索引后也可[从社区目录安装](https://community.obsidian.md/plugins/visual-math-editor)。
- 使用编译好的插件**不需要** Node.js、npm、账号或 API 密钥。

目录审核与发行验证只对应实际检查的具体版本；分别见[审核记录](COMMUNITY-SUBMISSION.md)和 [TEST-REPORT.md](../TEST-REPORT.md)。**Code → Download ZIP**、`visual-math-editor-source-0.8.1.zip` 和 GitHub 自动生成的 **Source code** 均是开发源码，需要自行构建。

### 社区目录安装（索引可用后）

1. 打开 [Visual Math 目录页面](https://community.obsidian.md/plugins/visual-math-editor)，点击 **Add to Obsidian**，允许浏览器打开 Obsidian；出现选择时使用目标笔记库。
2. 在 Obsidian 插件详情中点击 **Install（安装）**，再点 **Enable（启用）**。需要时先在 **设置 → 第三方插件** 中开启社区插件。
3. 打开 Markdown 笔记，点击笔记右上角或左侧工具栏的 **∑**。

目录版本与每个笔记库实际安装的版本可能不同。此次 0.8.1 验证从安装 ZIP 手动升级，保留旧设置与演示笔记，然后插入极坐标/XYZ 并退出重启应用后重开。尚未完成应用内商城安装；以 Obsidian 实际显示的版本及对应目录审核记录为准。

### 手动安装

1. 在 Obsidian 中打开准备使用插件的 vault，找到该 vault 在电脑中的文件夹。
2. 解压 `visual-math-editor-0.8.1.zip`，将其中整个 `visual-math-editor` 文件夹放入 vault 的 `.obsidian/plugins/`。没有 `plugins` 时可新建。
3. 对照上方目录示例：`main.js`、`manifest.json`、`styles.css` 必须直接位于 `visual-math-editor` 中，避免多嵌套一层同名目录。
4. 重启 Obsidian，打开 **设置 → 第三方插件（Settings → Community plugins）**，需要时先开启第三方插件，再启用 **Visual Math**。
5. 打开 Markdown 笔记，点击笔记右上角或左侧工具栏的 **∑**；也可在命令面板运行 **Visual Math: 插入或编辑公式**。

macOS 的 Finder 可按 **⌘⇧.** 显示隐藏文件；Windows 文件资源管理器可打开 **查看 → 显示 → 隐藏的项目**。若 vault 使用自定义配置目录，请以它代替 `.obsidian`。复制或分发时保留安装包中的许可证和第三方声明。

### 第一次试用

默认编辑器是在 Obsidian 桌面主窗口的笔记段落下方展开的就地面板。[README 演示截图](../README.zh-CN.md#演示)使用独立的真实测试库。需要弹窗时可运行 **在弹窗中插入或编辑公式**，不必每次都打开独立窗口。

1. 在可编辑的笔记中点击 **∑ → Visual → 数学 → 分数**，输入 `3`，按 **Tab**，输入 `4`。
2. 切到 **Hybrid**，在 LaTeX 源码中把分子改为 `5`，检查可视化分数同步变化；在可视化公式中修改，也会同步回源码。
3. 点击 **插入公式**。将光标放入已插入的公式，再点 **∑** 即可重编。保存后的改动可用 Obsidian 的 **撤销（Undo）** 恢复。

0.7.0 可直接在公式编辑器填写 `y=x^2`，在公式下方点击 **绘制此公式 / Graph this equation**，检查修改公式后曲线同步变化，无需重填函数。点击 **插入公式与图像 / Insert equation and graph** 才将完整公式与图像写入笔记；只查看不会保存。常用公式可保存为自定义关键词以便复用。语言菜单选择 **Español** 可试用西班牙语；也可将 Obsidian 设置为西班牙语后使用 **跟随 Obsidian**。公式与图像只在当前编辑器内联动。保存后两者是独立区块；以后修改公式，需重新绘图或明确编辑已有图像。实际验证见测试记录。

复平面试用：打开 **∑ → 图像 → 复平面**，输入 `3+2i`；输入有效时点击 **插入图像**。在已保存图形内拖动或缩放，再点 **保存视野**。重开笔记或点 **编辑图像**，检查范围是否保留。仅拖动、缩放不会保存笔记。

单位换算试用：在 **单位 → 单位换算 → 长度** 中选择 `1 英寸 → 厘米`，结果为 `1 in = 2.54 cm`。**使用换算结果** 只填入单位辅助输入；**插入单位** 加入公式草稿；面板顶部的 **插入公式 / 保存修改** 才写入笔记。

本插件不预设全局快捷键。需要键盘打开时，可在 **设置 → 快捷键** 中为“插入或编辑公式”自行指定。面板内可用 **Ctrl+Enter** 提交，这也是本版在 macOS 原生测试通过的提交快捷键。

### 更新

进入 **设置 → 第三方插件 → 检查更新**，有新版时点击 Visual Math 旁的 **更新**。社区插件不会自动更新。更新器下载新版程序文件（`main.js`、`manifest.json`、`styles.css`），不会重新下载笔记库，也不需要用户自行补代码。更新前保存草稿，完成后重启 Obsidian，以刷新 MathLive。

手动更新按以下步骤操作：

1. 先保存或取消未提交草稿；草稿不会跨重启永久保留。
2. 关闭插件，备份现有的 `visual-math-editor` 文件夹。
3. 用新版安装文件替换该文件夹中的分发文件。保留已有的 `data.json`，它保存本地插件偏好；安装 ZIP 不包含该文件。
4. 完整重启 Obsidian 窗口后启用插件，确保 MathLive 组件也载入新版本。

不要先删除原插件文件夹，也不要替换整个 vault、`.obsidian` 或其他插件。正常更新保留设置与笔记。旧版 `vme-plot` 版本 1 的函数区块仍可读取。用户与维护者的完整流程见[更新机制](UPDATING.md#简体中文)。

### 可选的 BRAT 测试版安装

熟悉 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 的用户，可将 `oranipost/visual-math-editor` 添加为测试插件仓库。本项目发布 BRAT 所需的独立安装文件。上面的手动 ZIP 安装是已验证路径；本版尚未实际验证 BRAT 原生安装流程。BRAT 是独立第三方插件，不是使用本插件的必需项。

### 常见问题与卸载

| 现象 | 检查方法 |
| --- | --- |
| 插件列表没有出现 | 检查目录层级、`manifest.json`、Obsidian 版本和第三方插件开关；复制文件后重启。 |
| 没有 ∑ 按钮 | 在桌面主窗口打开 Markdown 笔记，确认插件已启用；也可使用命令面板。 |
| 快捷键触发其他功能 | 在 **设置 → 快捷键** 中重新指定。 |
| 启用时出现 MathLive 冲突 | 暂时关闭冲突的公式插件，重启 Obsidian 后再试。 |
| 笔记改动后无法保存草稿 | 保留草稿并回到原笔记；过时快照检查会阻止覆盖已变化的文件。同次运行内需要时可用 **恢复公式草稿**。 |
| 图形移动后又恢复 | 移动缩放仅为暂时视野；需要点击 **保存视野 / 保存图像**。 |

卸载时先保存草稿，在第三方插件中停用，再只删除 `.obsidian/plugins/visual-math-editor/`。笔记中的 `$…$` / `$$…$$` 标准数学仍保留；化学和单位需要 mhchem 支持。`vme-plot` 定义也会保留，但需要本插件才能显示为图形。

仍有问题时请用 [问题反馈表](https://github.com/oranipost/visual-math-editor/issues/new?template=bug_report.yml)，提供独立示例、版本和重现步骤；不要上传私人笔记或整个 vault。

开发者：[Oliver / oranipost](https://github.com/oranipost)。公开反馈：[GitHub Issues](https://github.com/oranipost/visual-math-editor/issues)。私下联系：[oranipost@outlook.com](mailto:oranipost@outlook.com)。GitHub 普通个人主页没有私信功能。
