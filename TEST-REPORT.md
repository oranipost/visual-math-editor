# Test report / 测试记录

Version: **0.6.3**, desktop public beta. Updated: **2026-10-18**.

This report distinguishes automated checks, browser components and native Obsidian integration. Passing one does not establish that the others passed. Public release status is shown on [GitHub Releases](https://github.com/oranipost/visual-math-editor/releases); community-directory approval is separate.

## Environment and automated checks

- Native application: **Obsidian 1.14.4 on macOS**, main window. The 0.6.2 baseline used a separate test vault; the 0.6.3 follow-up used a newly created demonstration note with invented formula inputs in an existing desktop vault.
- Locked runtime dependencies: MathLive **0.111.1** and Convert **8.0.2**.
- **156 automated tests pass**, with TypeScript checking and the production build passing.
- Hosted CI checks clean dependency installation, types, tests and builds on **Node.js 22 and 24**. Node 24 also checks release packaging. Results are available under [Actions](https://github.com/oranipost/visual-math-editor/actions).
- The official source-rule precheck recorded **0 errors and 17 reviewed warnings**; explicit manifest validation recorded **0 errors and 0 warnings**. See [code precheck](docs/CODE-REVIEW.md) for tool versions and the remaining warnings. This is not an independent security audit or a guarantee of no defects.

## Native integration baseline (0.6.2)

| Workflow | Observed result |
| --- | --- |
| Reopen an equation | The note-header ∑ picker opens the existing fraction and square root in an editor directly below the note paragraph. |
| Switch to Hybrid | The stored LaTeX and formatted equation appear in synchronized editing areas using the same draft. |
| Check a chemical reaction | `H2 + O2 -> H2O` reports oxygen counts of 2 / 1 and suggests `2H2 + O2 -> 2H2O`. **Insert as written** remains available; checking does not replace the main equation. |
| Save a complex-plane view | **Zoom in → Save view** changes both saved axis ranges from [-5,5] to [-4,4]. Switching notes and reopening preserves the range and the three complex points. |
| Real usage screenshots | Four screenshots in [docs/images](docs/images) show Visual, Hybrid, a saved complex plane and optional reaction balancing in the actual application. They use a separate test vault and invented examples. |

The full browser component suite was **not completed again for 0.6.2 or 0.6.3**. The 0.6.2 preview builds and loads, but there is no new full-suite result for these versions. The 0.6.3 change adds redistribution notices and contact/update documentation; it does not change editor behavior. In particular, the interaction styling's enable/disable/destroy behavior has not received a fresh browser pass. Native zoom/save observations above and logic tests have narrower, explicitly stated coverage.

## Native follow-up (0.6.3, 2026-10-18)

This follow-up used the **0.6.3 GitHub Release installation ZIP**, verified against its published SHA-256 checksum. It was a manual replacement installation, not an installation completed through Obsidian's native community directory.

| Workflow | Observed result |
| --- | --- |
| Replace the existing plugin | The earlier 0.6.1 plugin, settings and existing demonstration note were backed up. With Obsidian closed, the active plugin directory was replaced with the full 0.6.3 ZIP contents. The existing `data.json` settings were retained byte-for-byte, and the previous demonstration note was unchanged. |
| Restart and verify | After restart, native **Settings → Community plugins** showed **0.6.3** enabled. |
| Visual fraction | A new demonstration note's editor accepted a visual fraction with numerator `3` and denominator `4`. |
| Hybrid source → formula | Entering `\frac{5}{8}+1` in the left source area updated the formatted equation on the right. |
| Hybrid formula → source | Entering `+2` at the end of the formatted equation updated the left source to `\frac58+1+2`, an equivalent compact LaTeX serialization. |
| LaTeX mode | Switching to LaTeX mode retained the draft input. |
| Insert and reopen | Insertion saved the equation as a `$$` display-math block. The note-header **∑** successfully reopened it with **Save changes** and the same source. The reopened editor was left in Hybrid mode for further use. |
| Double-click reopening | The attempted double-click did not reopen the equation in this session. The **∑** route succeeded; double-click should not be treated as verified by this follow-up. |

The official website showed **Completed / Review Satisfactory** and an enabled **Add to Obsidian** button. However, native **Browse** returned **0 results** for the plugin, **Check for updates** offered no update, and the official `obsidian-releases/community-plugins.json` installation index did not yet contain `visual-math-editor`. Website approval and native index availability were therefore recorded separately. Wait for the installation index to synchronize or use the manual ZIP procedure; this report does not claim a successful native community-directory installation.

This was a targeted three-mode and reopening check. Chemistry, conversion, graph navigation, Undo and the full browser suite were not rerun as part of this follow-up; their earlier observations and limitations remain as stated elsewhere in this report.

## Redistribution notices

Community installation downloads only `main.js`, `manifest.json` and `styles.css`. The 0.6.3 build embeds complete project/dependency notices in the JavaScript file and the complete font license in the stylesheet. A build-level regression checks the delivered files rather than relying on extra ZIP attachments.

## Automated regression coverage

- Formula ranges, protected Markdown contexts, exact source offsets, one-operation writes, unchanged-save byte preservation and rejection of stale notes.
- Complete/incomplete math structures, chemistry notation and units, source validation and rendering boundaries.
- Reaction atom/charge counts, optional positive-integer coefficient suggestions, unsupported notation, work limits and preservation of the user's original equation.
- Offline unit conversions, temperature offsets, compound speed, valid same-category round trips and rejection of invalid or incompatible inputs.
- All 118 element identities and sourced mass/electron details, including intervals, isotope mass numbers and predicted/calculated qualifiers.
- Bounded function parsing and numerical sampling, real-domain gaps, discontinuities, SVG geometry, distinct axis titles and tick labels.
- Complex literals, equal Re/Im units, fitting, coordinate limits, pan/zoom calculations, saved configuration validation and compatibility with earlier function blocks.
- Language fallback and release metadata/archive boundaries, including exclusion of vaults, settings, dependencies and symbolic links from source packages.

## Limits and unverified environments

- Native testing covers macOS, Obsidian 1.14.4 and the desktop main window. Windows, Linux, mobile, older hosts, detached windows and arbitrary third-party plugin/theme combinations are unverified.
- Physical touch-device pinch behavior is unverified. Temporary graph navigation must be explicitly saved before remounting or reopening.
- Plotting supports a bounded explicit real function or up to 20 rectangular complex literals. Sampling can miss narrow/high-frequency features and does not prove continuity.
- Reaction checks establish supported atom/charge conservation, not feasibility, conditions or product correctness. Linear chemistry notation is supported; two-dimensional molecular drawing is not.
- Element electron configurations describe neutral ground-state atoms. Unit conversion uses fixed library constants and floating-point calculations, not metrology-grade precision or general dimensional inference.
- Drafts remain in memory for the current application run. Save before restarting or disabling the plugin. Other plugins that register an incompatible MathLive version can interfere with initialization.
- Bundled runtime code, fonts and data support local operation. Development dependency installation needs network access; this report does not claim that Obsidian's own sync/update features make no requests.

## Reproduce the checks

For developers, download the source and run:

```sh
npm ci
npm run check
npm run preview
```

The preview address `http://127.0.0.1:8471` always refers to the developer's own computer and works only while the local preview process is running. Use the component-test button and record the actual result. Stop the process with **Ctrl+C**. Ordinary plugin users do not need this preview or these commands; use the [installation guide](docs/INSTALLATION.md).

For native integration, install the compiled plugin into a disposable Obsidian vault and exercise insertion, reopening, saving and Undo independently of the browser preview.

## 中文摘要

当前版本的类型检查、156 项自动测试和生产构建通过。0.6.2 原生基线在 macOS / Obsidian 1.14.4 主窗口与独立测试库中验证；四张演示截图来自实际应用。0.6.3 新增原生复测使用通过 SHA-256 校验的 GitHub ZIP 手动替换旧插件，保留已有设置，重启后确认 0.6.3 已启用。新建演示笔记验证了 Visual 的 `3/4`、Hybrid 的双向同步、切到 LaTeX 后保留输入、保存为 `$$` 区块，以及通过 **∑** 再次编辑。此次双击未成功，未记为通过。官方目录审核已完成且网站安装按钮启用，但原生 Browse 搜索为 0、检查更新无更新，安装索引尚无本插件 ID；尚未完成从原生社区目录安装。化学、换算、绘图、撤销和浏览器全套测试没有在本次针对性复测中重跑。开发预览地址只用于开发者自己的电脑，普通用户无需启动或访问。
