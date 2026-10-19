# Language support

Documentation: [English](README.md) · [简体中文](README.zh-CN.md) · [Español](README.es.md). The Spanish README covers installation, editing, graphing, numerical limits and feedback; interface language selection remains separate.

## 0.8.0 graph additions

The 0.8.0 graph expansion keeps the same three languages: English, Simplified Chinese and Spanish. It adds translated polar/XYZ mode selectors, calculus controls, θ/integration/camera range labels, numerical-limit errors and scoped generated graph captions. It adds no additional language and does not claim fluent-speaker or every-platform validation; actual checks belong in [TEST-REPORT.md](TEST-REPORT.md).

**中文：** 0.8.0 新增绘图功能继续提供英语、简体中文、西班牙语。极坐标、微积分和 XYZ 控件、错误与图形说明使用同一语言设置。GitHub 发行、目录审核与原生验证分别见测试报告；0.7.0 的历史验证见下文。

**Español:** La versión 0.8.0 conserva el español, el inglés y el chino simplificado e incorpora controles y mensajes para gráficas polares, cálculo numérico y superficies XYZ. La publicación en GitHub, la revisión del directorio y las pruebas nativas se registran por separado.

Technical input remains unchanged: `r=2*sin(3*theta)`, `y=x^2` and `z=(x^2-y^2)/10` use the same syntax in all languages. Symbols insert at the caret or wrap the selection; example buttons replace the graph expression. Changing language does not modify formulas, graph modes, integration bounds, θ bounds or camera state and is not a save. Reopening restores the saved graph parameters independently of a separate saved equation.

## Published 0.7.0 language support

Visual Math 0.7.0 includes **English, Simplified Chinese and Spanish**. The language menu offers **Follow Obsidian**, **中文**, **English** and **Español**. The **中文** option selects the Simplified Chinese translation. The saved `system`, `zh` and `en` preferences remain compatible; `es` selects the new Spanish interface. The `system` setting follows Obsidian's configured interface language first. Unsupported app languages use English. Chinese regional/script tags use the same Simplified Chinese translation; a dedicated Traditional Chinese translation is not provided.

This historical section documents the published 0.7.0 implementation. Earlier 0.6.x releases provide English and Simplified Chinese only. Actual automation, browser and native checks are recorded in [TEST-REPORT.md](TEST-REPORT.md), separately from translation coverage. A Spanish dictionary is not a claim of native-speaker review or complete operating-system validation.

## Follow Obsidian: current behavior

Follow Obsidian selects one of the plugin's **three available translations**; it does not supply every language supported by the host.

| Obsidian interface language | 0.7.0 / 0.8.0 interface |
| --- | --- |
| English (`en`, `en-US`, etc.) | English |
| Chinese (`zh`, `zh-CN`, `zh-TW`, etc.) | Simplified Chinese |
| Spanish (`es`, `es-ES`, `es-MX`, etc.) | Spanish |
| Other unsupported languages | English fallback |

**中文说明：** 0.7.0 提供英语、简体中文和西班牙语，菜单中的“中文”选择简体中文翻译。“跟随 Obsidian”会从这三种已有翻译中选择，其他未支持语言使用英语；旧版 0.6.x 的西班牙语仍回退为英语。切换语言不会改写公式、笔记内容、复数点、坐标范围或未保存的图像视野。

**Español:** La versión 0.7.0 incluye español, inglés y chino simplificado. «Usar el idioma de Obsidian» elige una de estas traducciones; los idiomas no disponibles usan el inglés. La opción «中文» selecciona el chino simplificado. Cambiar el idioma de la interfaz no modifica las fórmulas ni el contenido de las notas.

Changing the language must update mounted controls and graph toolbars without changing formula source, note text, complex points, saved ranges or an unsaved graph view. A language change is not a graph save. `Visual`, `LaTeX`, `Hybrid`, `Re`, `Im`, element symbols, unit symbols and formula commands keep their technical spellings. Numeric entry retains mathematical decimal syntax; this release does not localize parsing to decimal commas.

## What other plugins do

Repository observations checked on **2026-10-18**. These describe the inspected versions, not the language distribution of their users. The presence of a translation file does not establish complete or actively maintained coverage.

| Project | Observed language approach | Evidence and limits |
| --- | --- | --- |
| MathLive for Obsidian | Its inspected plugin commands, dialogs, and settings use English literals. | [Plugin UI source](https://github.com/danzilberdan/obsidian-mathlive/blob/master/main.ts) and [settings schema](https://github.com/danzilberdan/obsidian-mathlive/blob/master/settings.ts). No plugin language setting appears in that schema. The underlying MathLive component has its own localization and should be considered separately. |
| Formula Library | Documents Chinese and English interfaces, with an option to follow Obsidian's language. | [Official repository README](https://github.com/strangelion/obsidian-formula-library#features). Its documented two-language scope is sufficient to show that a visual formula plugin need not ship every Obsidian language. Missing-key behavior was not independently verified. |
| LMath | Its inspected README and technical reference describe English, Spanish, and Portuguese, with English as the default. | [README settings](https://github.com/LubrieDev/lmath#settings) and [technical reference](https://github.com/LubrieDev/lmath/blob/main/docs/TECHNICAL-REFERENCE.md#153-i18n-srci18n). This is the repository's stated scope; different cached catalog descriptions can lag or disagree. |
| Advanced Tables | The inspected plugin commands and settings are written directly in English. | [Plugin source](https://github.com/tgrosinger/advanced-tables-obsidian/blob/main/src/main.ts). There is no separate fallback mechanism in those inspected command/settings paths. |
| Excalidraw for Obsidian | Has 24 locale files, including regional variants. Unknown locales and missing message keys fall back to English. | [Locale directory](https://github.com/zsviczian/obsidian-excalidraw-plugin/tree/master/src/lang/locale), [fallback implementation](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/master/src/lang/helpers.ts). Its [contribution policy](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/master/CONTRIBUTING.md#-localization--user-facing-text) specifically names English, Spanish, Russian, Simplified Chinese, and Traditional Chinese as the translations to update together. |

LaTeX Suite also has a localization layer: its [new settings UI](https://github.com/artisticat1/obsidian-latex-suite/blob/main/src/settings/settings_tab2.ts) calls `settings_translation`, while the [legacy settings UI](https://github.com/artisticat1/obsidian-latex-suite/blob/main/src/settings/settings_tab.ts) still contains English literals. Its complete current language list and fallback behavior were not verified in this review, so no count is claimed.

These examples support maintaining a small, tested language set first. They do not establish which language is most common among Visual Math users. English provides a shared fallback. English, Simplified Chinese and Spanish ship in 0.7.0; Brazilian Portuguese, German, French, Japanese, Korean and Traditional Chinese remain possible additions when contributors or user reports justify them. This is a roadmap, not a claim that those other translations ship today.

## Current implementation rules

- `src/i18n.ts` owns locale resolution, English messages, dynamic labels and scoped DOM localization; `src/i18n-es.ts` bundles `SPANISH_TRANSLATIONS` and `SPANISH_ELEMENT_NAMES`. New messages must provide English and Spanish wording for their Chinese source message, including explicit-label paths such as `data-i18n-en`. Maintain all three languages together, including graph controls, saved keyword tools, errors and accessibility labels.
- Host code supplies Obsidian's public [`getLanguage()`](https://docs.obsidian.md/Reference/TypeScript%2BAPI/getLanguage) result. The installed API declaration marks it available since Obsidian 1.8.7; older supported hosts fall back to their browser locale. Obsidian's official [lint guidance](https://github.com/obsidianmd/eslint-plugin#rules) also prefers this API for language detection.
- Locale fallback and message fallback are distinct. Unsupported locales resolve to English. An unrecognized message is preserved rather than guessed or passed to a translation service. UI coverage checks should catch missing known messages before release.
- Localize plugin-owned DOM only. Do not walk note content, editable values, `math-field` source, generic SVGs, or elements marked `data-no-i18n` / `data-i18n-ignore`. Do not translate a `<select>` option without an explicit `value`. The controlled graph pass described below is the only exception for ignored SVG previews.
- Plugin-generated SVGs marked `data-vme-plot="function"` or `data-vme-plot="complex"`, plus 0.8.0 `polar`, `surface`, `derivative`, `second-derivative` and `integral` graphs, localize only their fixed accessible prose in the root `aria-label`, direct `<title>` and `<desc>`, plus headings/footers explicitly marked `data-vme-plot-caption`. Their formula text, point labels, axis names, tick values, shapes and coordinates remain unchanged. Surrounding controls and status text are localized too. This narrow pass also handles newly rendered graphs inside an ignored preview; it does not walk arbitrary SVG content or rewrite an existing `vme-plot` block.
- MathLive's locale setter is static and affects all math fields on the page, as its [official guide](https://mathlive.io/mathfield/guides/customizing/#localization) explains. This plugin does not change that shared locale merely to change its own toolbar language.

## Contributing or extending translations

1. For wording fixes, update the source Chinese text and its English entry together. Include tooltips, placeholders, accessibility labels, errors, empty states, and dynamic messages. Keep technical syntax and numeric examples intact.
2. Before adding a language, open an issue naming its Obsidian locale code and a person able to review the terminology. Follow the [official locale codes](https://github.com/obsidianmd/obsidian-translations#existing-languages); use the language's native name in the menu.
3. Add a language table through a reviewed code change. Extend `Language`, `ResolvedLanguage`, the locale resolver, explicit-label message paths and the language selector together. Keep `system`, `zh`, `en` and `es` compatible with existing preferences. Do not silently claim an unfinished table as complete. Keep the current unknown-message preservation rule: unrecognized UI strings retain their source text rather than being guessed. Locale fallback remains English. Do not call a translation service at runtime.
4. Check both directions of switching: English → new language → English. Verify the editor, chemistry balancing, conversion, periodic table details, graph preview, saved graph controls, notices, and draft recovery. Formula and note bytes must stay unchanged; an unsaved graph view must survive the switch.
5. Run `npm run typecheck` and `npm test`, then check a narrow window, long labels, keyboard access, and screen-reader labels in the actual UI. Numeric entry remains the documented mathematical syntax; translating the UI must not silently change decimal parsing.
6. Right-to-left languages need a separate layout review. Apply direction only inside plugin-owned controls, and keep mathematical notation readable. Do not change Obsidian's document direction globally.

Element search retains canonical English names and symbols and also accepts bundled Spanish names, including accent-insensitive matching. This does not translate chemical symbols or note contents. Translations use bundled dictionaries and run locally, without an account or runtime network requests.
