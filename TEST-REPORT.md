# Test report / 测试记录

Version: **0.6.2**, desktop public beta. Updated: **2026-10-18**.

This report distinguishes automated checks, browser components and native Obsidian integration. Passing one does not establish that the others passed. Public release status is shown on [GitHub Releases](https://github.com/oranipost/visual-math-editor/releases); community-directory approval is separate.

## Environment and automated checks

- Native application: **Obsidian 1.14.4 on macOS**, main window, a separate test vault and example notes.
- Locked runtime dependencies: MathLive **0.111.1** and Convert **8.0.2**.
- **155 logic tests pass**, with TypeScript checking and the production build passing.
- Hosted CI checks clean dependency installation, types, tests and builds on **Node.js 22 and 24**. Node 24 also checks release packaging. Results are available under [Actions](https://github.com/oranipost/visual-math-editor/actions).
- The official source-rule precheck recorded **0 errors and 17 reviewed warnings**; explicit manifest validation recorded **0 errors and 0 warnings**. See [code precheck](docs/CODE-REVIEW.md) for tool versions and the remaining warnings. This is not an independent security audit or a guarantee of no defects.

## Current native integration observations

| Workflow | Observed result |
| --- | --- |
| Reopen an equation | The note-header ∑ picker opens the existing fraction and square root in an editor directly below the note paragraph. |
| Switch to Hybrid | The stored LaTeX and formatted equation appear in synchronized editing areas using the same draft. |
| Check a chemical reaction | `H2 + O2 -> H2O` reports oxygen counts of 2 / 1 and suggests `2H2 + O2 -> 2H2O`. **Insert as written** remains available; checking does not replace the main equation. |
| Save a complex-plane view | **Zoom in → Save view** changes both saved axis ranges from [-5,5] to [-4,4]. Switching notes and reopening preserves the range and the three complex points. |
| Real usage screenshots | Four screenshots in [docs/images](docs/images) show Visual, Hybrid, a saved complex plane and optional reaction balancing in the actual application. They use a separate test vault and invented examples. |

The full browser component suite was **not completed again for 0.6.2**. The preview builds and loads, but there is no new full-suite result for this version. In particular, the interaction styling's enable/disable/destroy behavior has not received a fresh browser pass. Native zoom/save observations above and logic tests have narrower, explicitly stated coverage.

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

当前版本的类型检查、155 项逻辑测试和生产构建通过。原生操作在 macOS / Obsidian 1.14.4 主窗口与独立测试库中验证；四张演示截图来自实际应用。此版本没有新完成浏览器组件全套复测，未验证的平台与交互范围已在上文列出。开发预览地址只用于开发者自己的电脑，普通用户无需启动或访问。
