# Code precheck / 源码前置检查

[English README](../README.md) · [中文 README](../README.zh-CN.md) · [Test observations](../TEST-REPORT.md)

## Current local precheck — 0.6.4

Checked on **2026-10-18**, using the isolated official ESLint toolchain described below. These are local development results, separate from native Obsidian integration tests and the community directory's official release review.

| Scope | Errors | Warnings |
| --- | ---: | ---: |
| Production `src/`, recommended configuration | **0** | **1** |
| `manifest.json`, explicit validation | **0** | **0** |

The **11 `prefer-create-el` findings are fixed**. A shared DOM adapter uses the target window's Obsidian `createEl` and `createSvg` helpers in the host, with standard DOM factories for the independent offline browser preview. Registered MathLive custom elements and SVG namespaces are preserved. Bilingual commands now use the existing localization entry point, and the interface-language label uses its existing translation key.

Both CSS `!important` declarations were removed. Layout rules for controls and panes that can be hidden explicitly exclude `[hidden]`, without increasing selector specificity; a scoped hidden rule handles visibility. Reduced-motion styling targets every control with a plugin-defined transition. The picker preview uses a dedicated class instead of an unknown `math-field` type selector.

The remaining **one `obsidianmd/ui/sentence-case` warning** concerns the case-sensitive mathematical examples in [plot-ui.ts](../src/plot-ui.ts). The rule treats `x` as the acronym `X`, including in `x^2`, `sin(x)` and `1/x`. The lowercase variable is retained because it is meaningful input to the function parser. **No rule exception, ignore configuration or capitalization workaround was added for this finding.**

TypeScript checking and production building passed, along with **159 automated logic/packaging tests** and **280 checks in the real browser component suite**. The browser checks include computed CSS visibility when Hybrid switches to Graph, compact Graph-draft restoration, Visual/LaTeX pane visibility, and stable focus/details for all 118 periodic elements. Browser success does not establish native Obsidian behavior or official directory approval; see [TEST-REPORT.md](../TEST-REPORT.md) for those separately scoped observations.

### 当前版本中文说明

**0.6.4** 的本地官方规则扫描结果为：生产 `src/` **0 个错误、1 个提示**，显式校验 `manifest.json` **0 个错误、0 个提示**。11 项 DOM 创建提示已通过兼容封装修复；两处 CSS `!important` 和未知 `math-field` 标签选择器也已修复，同时保留独立离线预览、MathLive、SVG、隐藏面板和减少动效行为。

唯一保留的提示是句式规则把数学变量 `x` 当成缩写 `X`。代码保留正确的小写变量，没有添加豁免配置或绕过该提示。类型检查、生产构建、**159 项自动测试**和真实浏览器中的 **280 项组件检查**已通过。上述结果与原生 Obsidian 操作、社区目录正式审核各有不同范围，不能互相替代。

---

## Historical snapshot — 0.6.2

The original 0.6.2 report below is retained as historical evidence. Its warning counts and decisions describe that earlier snapshot, not the current 0.6.4 source.

Version: **0.6.2**. Checked on **2026-10-18**. This records a local scan of production source and release metadata using Obsidian's official lint rules. It is separate from runtime tests, a security audit, and approval for the community directory.

## Tools and results

The review used `eslint-plugin-obsidianmd@0.4.2` with its recommended configuration, ESLint **9.39.5**, and `@typescript-eslint/parser@8.71.2`. The manifest was also checked explicitly with the official `validate-manifest` rule because the recommended preset did not attach that rule to `manifest.json` by default in this setup.

| Scope | Errors | Warnings |
| --- | ---: | ---: |
| Production `src/` and `package.json` | **0** | **17** |
| `manifest.json`, explicit validation | **0** | **0** |

The initial scan identified unnecessary assertions, a redundant union, static inline styles, and a redundant regular-expression escape. Those findings were reviewed and fixed before the final scan. A control-character check in [science-data.ts](https://github.com/oranipost/visual-math-editor/blob/main/src/science-data.ts) intentionally recognizes nonprinting input; its local lint exception has an explanatory comment and preserves that input-validation guard.

## Remaining warnings

| Rule | Count | Files and decision |
| --- | ---: | --- |
| `obsidianmd/prefer-create-el` | 11 | [editor-ui.ts](https://github.com/oranipost/visual-math-editor/blob/main/src/editor-ui.ts), [inline-editor.ts](https://github.com/oranipost/visual-math-editor/blob/main/src/inline-editor.ts), [math-runtime.ts](https://github.com/oranipost/visual-math-editor/blob/main/src/math-runtime.ts), [plot-ui.ts](https://github.com/oranipost/visual-math-editor/blob/main/src/plot-ui.ts), [science-ui.ts](https://github.com/oranipost/visual-math-editor/blob/main/src/science-ui.ts), [ui-icons.ts](https://github.com/oranipost/visual-math-editor/blob/main/src/ui-icons.ts). Native DOM creation is retained for shared components and their independent browser preview, including MathLive and SVG elements. Migrating to host-specific factories requires preserving that preview compatibility. |
| `obsidianmd/ui/sentence-case` | 6 | [editor-ui.ts](https://github.com/oranipost/visual-math-editor/blob/main/src/editor-ui.ts), [main.ts](https://github.com/oranipost/visual-math-editor/blob/main/src/main.ts), [plot-ui.ts](https://github.com/oranipost/visual-math-editor/blob/main/src/plot-ui.ts). The suggestions concern bilingual labels after a slash and the mathematical variable `x`. They were reviewed without changing translation keys or turning `x` into a different variable. |

These warnings remain visible rather than being treated as a claim of a clean, warning-free review. Community reviewers may require further changes.

## Manual source observations

The production-source review looked for dynamic HTML insertion, JavaScript evaluation, network APIs, global `app` access, active-file `Vault.modify` writes, hardcoded configuration paths, and missing write guards. The reviewed production snapshot did not contain those prohibited patterns. This observation concerns the project source, not a complete independent audit of every bundled dependency.

- Graph SVG is generated internally with escaped literal labels, then parsed and imported through `DOMParser` in [plot-ui.ts](https://github.com/oranipost/visual-math-editor/blob/main/src/plot-ui.ts) and [main.ts](https://github.com/oranipost/visual-math-editor/blob/main/src/main.ts).
- Formula and graph writes use guarded editor transactions. Previewing or moving a graph does not itself write the note; saving remains an explicit action.
- The plugin assigns no default global command hotkey. Users can choose one in Obsidian's Hotkeys settings.
- Runtime fonts, notation libraries and scientific data are bundled. Source input is parsed as data rather than evaluated as JavaScript.

Behavioral evidence, tested environments and limits are recorded separately in [TEST-REPORT.md](../TEST-REPORT.md). A passing static scan does not establish absence of bugs or support for untested platforms.

## Repeating the review

Follow the official [lint plugin README](https://github.com/obsidianmd/eslint-plugin) and [configuration guide](https://github.com/obsidianmd/eslint-plugin/blob/master/docs/configuration.md), including type-aware parser configuration. Apply the recommended rules to production source and package metadata, then explicitly validate the manifest. Keep the tool versions and observed counts with the report.

The review tools ran in an isolated development package rather than changing this plugin's dependency lock. Parser **8.71.2** declares a TypeScript range below **6.1**, while this project pins TypeScript **7.0.2**. Do not force an unsupported peer-dependency combination or silently downgrade the compiler to make the lint tool install. The isolated review tools resolved TypeScript **6.0.3** for their own runtime; `npm run typecheck` continues to use the plugin's pinned compiler.

## 中文说明

公开版 **0.6.2** 使用 Obsidian 官方 ESLint 插件做了本地前置检查：生产源码与 `package.json` 为 **0 个错误、17 个提示**；显式检查 `manifest.json` 为 **0 个错误、0 个提示**。这不是 Obsidian 官方审核结果，也不表示不存在 bug。

保留的 17 项提示分为两类：11 项建议使用 Obsidian 的元素创建辅助方法；本项目为共享编辑组件、独立浏览器预览、MathLive 和 SVG 保留原生 DOM 方法。另 6 项涉及双语标签与数学变量 `x` 的句式大小写；逐项复核后没有盲目修改翻译键或变量名。

首轮检查发现的多余类型断言、冗余类型、静态样式赋值和正则转义已修复。不可见控制字符的拦截属于刻意保留的输入校验，只有这一处规则例外，并在源码中说明原因。图像通过内部生成、转义、解析后导入，不把用户输入当作 HTML 或 JavaScript 执行。笔记仍只在用户明确插入或保存时进行带校验的编辑操作。

检查工具独立安装，避免其 TypeScript 兼容范围与项目锁定的编译器冲突。类型检查、逻辑测试、浏览器组件检查和原生 Obsidian 操作各有不同范围；实际结果与尚未验证的平台请看 [测试记录](../TEST-REPORT.md)。社区目录提交步骤见 [提交指南](COMMUNITY-SUBMISSION.md)。
