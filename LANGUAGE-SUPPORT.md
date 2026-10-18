# Language support

Visual Math Editor currently maintains **English and Simplified Chinese**. The language menu offers **Follow Obsidian**, **简体中文**, and **English**. The stored `system` setting remains compatible with earlier releases; it now follows Obsidian's configured interface language first. Unsupported app languages use English. Chinese regional/script tags currently use the same Simplified Chinese translation; a dedicated Traditional Chinese translation is not yet provided.

## Follow Obsidian: current behavior

Follow Obsidian selects one of the plugin's **two available translations**; it does not supply translations for every language supported by the host.

| Obsidian interface language | This plugin's interface |
| --- | --- |
| English (`en`, `en-US`, etc.) | English |
| Chinese (`zh`, `zh-CN`, `zh-TW`, etc.) | Simplified Chinese |
| Spanish (`es`, `es-ES`, `es-MX`) | English fallback |
| Other unsupported languages | English fallback |

**More languages, including Spanish, are planned for future updates.** They will be offered as translations are completed and reviewed. Currently shipped support remains English and Simplified Chinese.

**中文说明：** 目前只提供英语和简体中文。“跟随 Obsidian”会从已有翻译中选择；西班牙语等尚未支持的语言会使用英语。后续计划逐步增加更多语言，完成翻译与审核后再提供。

Changing the plugin language must update its own mounted controls and graph toolbars without changing formula source, note text, complex points, saved ranges, or an unsaved graph view. A language change is not a graph save. `Visual`, `LaTeX`, `Hybrid`, `Re`, `Im`, element symbols, unit symbols, and formula commands keep their technical spellings.

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

These examples support maintaining a small, tested language set first. They do not establish which language is most common among Visual Math Editor users. English provides a shared fallback; Chinese is a maintained first-class interface for the present user workflow. Candidate additions include Spanish, Brazilian Portuguese, German, French, Japanese, Korean, and Traditional Chinese when contributors or user reports justify them. This is a roadmap, not a claim that those translations ship today.

## Current implementation rules

- `src/i18n.ts` owns locale resolution, the Chinese-to-English UI table, dynamic label translations, and scoped DOM localization. New messages must have English wording in `UI_TRANSLATIONS` or an explicit `data-i18n-en` value beside their Chinese source text.
- Host code supplies Obsidian's public [`getLanguage()`](https://docs.obsidian.md/Reference/TypeScript%2BAPI/getLanguage) result. The installed API declaration marks it available since Obsidian 1.8.7; older supported hosts fall back to their browser locale. Obsidian's official [lint guidance](https://github.com/obsidianmd/eslint-plugin#rules) also prefers this API for language detection.
- Locale fallback and message fallback are distinct. Unsupported locales resolve to English. An unrecognized message is preserved rather than guessed or passed to a translation service. UI coverage checks should catch missing known messages before release.
- Localize plugin-owned DOM only. Do not walk note content, editable values, `math-field` source, SVG formula labels, or elements marked `data-no-i18n` / `data-i18n-ignore`. Do not translate a `<select>` option without an explicit `value`.
- Saved graphs retain technical SVG annotations and formula/point labels. Surrounding controls and status text are localized. No language selection rewrites an existing `vme-plot` block.
- MathLive's locale setter is static and affects all math fields on the page, as its [official guide](https://mathlive.io/mathfield/guides/customizing/#localization) explains. This plugin does not change that shared locale merely to change its own toolbar language.

## Contributing or extending translations

1. For wording fixes, update the source Chinese text and its English entry together. Include tooltips, placeholders, accessibility labels, errors, empty states, and dynamic messages. Keep technical syntax and numeric examples intact.
2. Before adding a language, open an issue naming its Obsidian locale code and a person able to review the terminology. Follow the [official locale codes](https://github.com/obsidianmd/obsidian-translations#existing-languages); use the language's native name in the menu.
3. Add a language table through a reviewed code change. Extend `Language`, `ResolvedLanguage`, the locale resolver, the explicit-English message path, and the language selector together. Keep `system`, `zh`, and `en` compatible with existing preferences. Do not silently claim an unfinished table as complete. A future expansion should use stable message identifiers and typed per-locale tables, with English fallback for missing keys.
4. Check both directions of switching: English → new language → English. Verify the editor, chemistry balancing, conversion, periodic table details, graph preview, saved graph controls, notices, and draft recovery. Formula and note bytes must stay unchanged; an unsaved graph view must survive the switch.
5. Run `npm run typecheck` and `npm test`, then check a narrow window, long labels, keyboard access, and screen-reader labels in the actual UI. Numeric entry remains the documented mathematical syntax; translating the UI must not silently change decimal parsing.
6. Right-to-left languages need a separate layout review. Apply direction only inside plugin-owned controls, and keep mathematical notation readable. Do not change Obsidian's document direction globally.

Translations use bundled dictionaries and run locally, without an account or runtime network requests.
