# Test report / 测试记录

Version: **0.6.4**, desktop public beta. Updated: **2026-10-18**.

This report distinguishes automated checks, browser components and native Obsidian integration. Passing one does not establish that the others passed. Public release status is shown on [GitHub Releases](https://github.com/oranipost/visual-math-editor/releases); community-directory approval is separate.

## 0.6.4 checks and native follow-up

- **159 automated tests**, TypeScript checking and the production build passed. The full local browser component suite passed **280 checks**, including both directions of Hybrid synchronization, save/reopen, actual CSS visibility in normal and compact modes, science helpers, graphs and interaction cleanup.
- The first browser run stopped at an element keyboard-focus assertion. The test read before the component's scheduled focus/scroll reconciliation; it now scrolls each target into view and waits for the actual layout/focus frames. The assertions remain, including real focus, all 118 elements, complete details and ARIA associations. The second full run passed. No element data or runtime focus behavior was changed to make this test pass.
- Before the upgrade, the native 0.6.3 Hybrid editor changed the fraction from 5/8 to 3/4 in its left source and added a plus and square root of x in the right visual field. The resulting source was `\frac34+1+2+\sqrt{x}`. Both directions synchronized; the saved formula had visibly separated operators, fraction and radical. The equation picker successfully reopened the same formula.
- The locally built 0.6.4 installation archive was checksum-verified and installed with Obsidian closed, after backing up the prior plugin. After restart, native Settings showed **0.6.4 enabled**. Existing settings and the demonstration note remained byte-identical.
- In 0.6.4, the English command palette showed a localized command name, and the equation picker reopened the saved formula with its fraction and radical. Hybrid to Graph hid the math workspace/mode/save controls, the x-squared preset produced an SVG preview, and returning to Math retained the formula. Saving without formula edits preserved the whole note byte-for-byte. The editor was reopened in Hybrid mode for continued use.
- The three downloaded hosted runtime files matched the installation ZIP, local production build and installed plugin byte-for-byte. The native check above used the local build, now verified against the hosted program bytes; it does not claim a completed installation through the desktop community index. Reduced-motion selectors were reviewed against the three actual transition-bearing controls; the operating-system preference was not toggled in this check. Untested platforms remain unverified.

## 0.6.4 hosted release and directory status

- [Version 0.6.4](https://github.com/oranipost/visual-math-editor/releases/tag/0.6.4) is publicly published as an ordinary GitHub Release and designated latest. [Release workflow 39179067951](https://github.com/oranipost/visual-math-editor/actions/runs/39179067951) succeeded. The main-branch and version-tag CI checks passed on **Node.js 22 and 24**.
- All **six downloaded assets** passed `gh attestation verify`: `main.js`, `manifest.json`, `styles.css`, the installation ZIP, the source ZIP and `SHA256SUMS.txt`. Verification required source commit **`fedf59cc7d0daa6013bed2e3e2ece1648fb730b2`**, source ref **`refs/tags/0.6.4`**, signer workflow **`oranipost/visual-math-editor/.github/workflows/draft-release.yml`**, and rejection of self-hosted runners. Provenance verifies these exact bytes and their build identity; it is not a guarantee of defect-free code.
- Both ZIPs passed the published SHA-256 checks. The three independent runtime attachments, installation ZIP contents, local `dist` files and installed plugin files were byte-identical. An anonymous download of the public `manifest.json` also matched.
- The directory's **0.6.4 / fedf59c** review page, dated **2026-10-19 UTC** (still 2026-10-18 locally), showed **Completed**, with current release **0.6.4**. No Error or Warning entries were present, and no Source code or CSS lint entries were listed. Pass results covered the `main.js` and `styles.css` GitHub artifact attestations, Vault Read, no known vulnerable dependencies, no obfuscated code, and byte-for-byte reproduction of `main.js`. Only two recommendation categories remained: user-initiated Clipboard Access and extra assets (`SHA256SUMS.txt` and the two manual-download ZIPs). The public listing showed current version **0.6.4**, an enabled **Add to Obsidian** link and **Health Excellent / Review Passed**; the scorecard reported **Passed 6 / Other 2**. It also explicitly disclosed **“Malware scan not available.”** and **“Network requests scan not available.”** Those two scan categories were unavailable in this review. These results do not replace native integration tests or an independent security audit.
- A fresh fetch of the official installation index contained **9,116 entries** and still lacked `visual-math-editor`. The earlier native Browse check returned no result. Obsidian's [official announcement](https://obsidian.md/blog/future-of-plugins/) says passing projects become searchable and downloadable in the app within 24 hours. This does not prove synchronization for this entry; if it remains absent more than 24 hours after a passing review, report the discrepancy to Obsidian. No native community-directory installation has been completed in this report.

## Environment and automated checks

- Native application: **Obsidian 1.14.4 on macOS**, main window. The 0.6.2 baseline used a separate test vault; the 0.6.3 and 0.6.4 follow-ups used a demonstration note with invented formula inputs in an existing desktop vault.
- Locked runtime dependencies: MathLive **0.111.1** and Convert **8.0.2**.
- **159 automated tests pass** for 0.6.4, with TypeScript checking and the production build passing.
- Hosted CI checks clean dependency installation, types, tests and builds on **Node.js 22 and 24**. Node 24 also checks release packaging. Results are available under [Actions](https://github.com/oranipost/visual-math-editor/actions).
- The 0.6.4 local official-rule source precheck recorded **0 errors and 1 mathematical-variable warning**; explicit manifest validation recorded **0 errors and 0 warnings**. The 0.6.2 historical precheck is retained separately in [code precheck](docs/CODE-REVIEW.md). Static checks are not an independent security audit or a guarantee of no defects.

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

0.6.4 的类型检查、159 项自动测试、生产构建和 280 项真实浏览器组件检查通过。首轮组件检查发现元素焦点测试没有等待滚动与焦点恢复帧，修正测试时序后完整通过，没有为迁就测试改动元素数据或运行时行为。

本轮先在 0.6.3 原生 Hybrid 中把左侧 5/8 改为 3/4，再从右侧插入加号和根号 x，确认双向同步、间距、保存与选择器重开。随后使用经校验的本地 0.6.4 安装包更新并重启，确认版本已启用、设置与演示笔记保留；复查重开公式、Hybrid/图像面板隐藏、SVG 预览、切回数学，以及不修改时保存的整篇笔记字节一致性。当前界面保留在 Hybrid 供继续使用。

0.6.4 已公开为 GitHub 普通 latest 发行版；托管发布流程以及 main/tag 的 Node.js 22、24 检查通过。六个附件的来源证明均通过严格验证，核对准确源码提交、标签、签名工作流，并拒绝自托管运行器；两个 ZIP 的 SHA-256 通过，三个独立程序附件与安装 ZIP、本地构建、已安装版本逐字节一致，匿名下载 manifest 也一致。目录页面审核日期为 2026-10-19 UTC，0.6.4 / fedf59c 显示 Completed，当前发行版为 0.6.4。未列出 Error、Warning 或 Source code/CSS lint 条目；程序来源证明、Vault Read、无已知漏洞依赖、无混淆及 main.js 逐字节构建复现均为 Pass，仅保留主动剪贴板和可选手动下载附件两类建议。公开条目显示 0.6.4、已启用 Add to Obsidian 和 Health Excellent / Review Passed，评分卡为 Passed 6 / Other 2；同时明确提示 Malware scan not available 和 Network requests scan not available，即本次恶意软件与网络请求扫描不可用。目录扫描不替代原生实测或独立安全审计。

本轮不声称已从桌面社区目录完成安装；最新官方安装索引的 9,116 条记录仍未包含本插件。官方公告给出审核通过后 24 小时内进入应用搜索与下载的说明，超过该时间仍无结果时应向官方反馈，不保证本条目确切同步时刻。0.6.2/0.6.3 的历史观察和限制保留在各自章节，Windows、Linux、移动端、弹出窗口和任意第三方主题仍未验证。减少动画媒体规则已核对，但本轮没有切换操作系统的减少动画偏好。开发预览仅供开发者本机使用，普通用户无需启动或访问。
