# Language support

Documentation: [English](README.md) · [简体中文](README.zh-CN.md) · [Español](README.es.md) · [日本語](README.ja.md) · [Deutsch](README.de.md) · [Français](README.fr.md). Each README covers installation, editing, graphing, numerical limits and feedback; interface language selection remains separate.

## 1.1.2 6-language coverage

Visual Math 1.1.2 provides full local interface translations in **six languages**: **English (`en`), Simplified Chinese (`zh`), Spanish (`es`), Japanese (`ja`), German (`de`), and French (`fr`)**.

All plugin-owned UI surfaces follow the selected language (or **Follow Obsidian**):
- Visual, LaTeX, and Hybrid equation workspaces, the 41-symbol Greek letters drawer (`αβ Greek letters`), Greek symbol tooltips/hints, and mode-display settings (both in the editor header and in Obsidian's native plugin settings tab).
- Single-formula import review, `1×1`–`6×6` visual matrix builder, `2–6` row equation-system builder, 19 set/sequence tools, trigonometric/geometry symbols, and 9 advanced-math templates.
- 2D function/calculus, polar, complex-plane, 3D surface, 9 primitive 3D solids, `2–6` part composite 3D solid builder, 3 spatial-relation scenes, `EquationPicker` formula/graph/3D model rows, 1-click PNG copy statuses, and scoped SVG accessibility captions.
- Chemistry `\ce` reaction checks, 24 physics templates, 66 preset units across 11 categories (including `eV`, `keV`, `MeV`), all 118 periodic-table element names and multilingual element search, and the Periodic Table chemical equation bar.

Actual automation, browser, and native checks are recorded in [TEST-REPORT.md](TEST-REPORT.md); dictionary coverage does not claim external native-speaker certification on every platform.

Technical input remains unchanged across languages. Switching the interface language never modifies formula source, matrix cells, equation-system rows, graph expressions, composite 3D parameters, integration/θ bounds, camera state, or note files.

## Follow Obsidian: current behavior

**Follow Obsidian** (`system`) resolves Obsidian's configured app language (`getLanguage()`) to one of the **six bundled translations**, falling back to English for other locales:

| Obsidian interface language | Resolved Visual Math interface |
| --- | --- |
| English (`en`, `en-US`, `en-GB`, etc.) | English (`en`) |
| Chinese (`zh`, `zh-CN`, `zh-TW`, etc.) | Simplified Chinese (`zh`) |
| Spanish (`es`, `es-ES`, `es-MX`, etc.) | Español (`es`) |
| Japanese (`ja`, `ja-JP`, etc.) | 日本語 (`ja`) |
| German (`de`, `de-DE`, `de-AT`, `de-CH`, etc.) | Deutsch (`de`) |
| French (`fr`, `fr-FR`, `fr-CA`, etc.) | Français (`fr`) |
| Other unsupported languages | English (`en`) fallback |

Chinese regional/script tags currently resolve to the bundled Simplified Chinese translation; a separate Traditional Chinese table is not bundled yet.

Changing the language updates mounted controls, plugin settings labels, and saved-graph toolbars immediately without rewriting note text, complex points, saved ranges, or unsaved 3D/2D views. `Visual`, `LaTeX`, `Hybrid`, `Re`, `Im`, chemical element symbols, unit symbols (`m`, `Pa`, `eV`, etc.), and TeX commands retain their international mathematical spellings. Numeric inputs use standard mathematical decimal point syntax across all locales.

## Historical language milestones

- **1.1.0 – 1.1.2 (2026-11)**: Expanded from three languages to **six languages** (`en`, `zh`, `es`, `ja`, `de`, `fr`) with matching 6-language READMEs, 41-symbol Greek drawer & chemical equation bar labels, 118-element localized names/search, composite 3D geometry labels, and persisted language preferences in `data.json`.
- **1.0.0 (2026-10-31)**: Extended English, Simplified Chinese, and Spanish across single-formula import, matrices, equation systems, sets/sequences, advanced math, and 3D geometry; removed custom formula keywords.
- **0.7.0 (2026-10-18)**: Added bundled Spanish (`es`) alongside English (`en`) and Simplified Chinese (`zh`). Earlier `0.6.x` builds shipped English and Simplified Chinese only.

## What other Obsidian math & diagram plugins do

Repository observations checked on **2026-10-18** (describing the inspected versions at that date):

| Project | Observed language approach | Evidence and limits |
| --- | --- | --- |
| MathLive for Obsidian | Commands, dialogs, and settings use English literals. | [Plugin UI source](https://github.com/danzilberdan/obsidian-mathlive/blob/master/main.ts) and [settings schema](https://github.com/danzilberdan/obsidian-mathlive/blob/master/settings.ts). |
| Formula Library | Documents Chinese and English interfaces, with an option to follow Obsidian's language. | [Official repository README](https://github.com/strangelion/obsidian-formula-library#features). |
| LMath | Documents English, Spanish, and Portuguese, with English as the default. | [README settings](https://github.com/LubrieDev/lmath#settings) and [technical reference](https://github.com/LubrieDev/lmath/blob/main/docs/TECHNICAL-REFERENCE.md#153-i18n-srci18n). |
| Advanced Tables | Commands and settings are written directly in English. | [Plugin source](https://github.com/tgrosinger/advanced-tables-obsidian/blob/main/src/main.ts). |
| Excalidraw for Obsidian | Ships 24 locale files with English fallback for unknown locales and missing keys. | [Locale directory](https://github.com/zsviczian/obsidian-excalidraw-plugin/tree/master/src/lang/locale) and [fallback helper](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/master/src/lang/helpers.ts). |

## Current implementation rules

- `src/i18n.ts` owns locale resolution, English messages (`UI_TRANSLATIONS`), dynamic pattern translators (`translateCore`, `translatePlotUiText`), and scoped DOM localization (`localizeEditor`).
- Dedicated offline dictionaries bundle the other four non-source languages and their 118 element names:
  - `src/i18n-es.ts` (`SPANISH_TRANSLATIONS`, `SPANISH_ELEMENT_NAMES`)
  - `src/i18n-ja.ts` (`JAPANESE_TRANSLATIONS`, `JAPANESE_ELEMENT_NAMES`)
  - `src/i18n-de.ts` (`GERMAN_TRANSLATIONS`, `GERMAN_ELEMENT_NAMES`)
  - `src/i18n-fr.ts` (`FRENCH_TRANSLATIONS`, `FRENCH_ELEMENT_NAMES`)
- Every fixed UI key in `UI_TRANSLATIONS` must have non-empty entries in all five target dictionaries (`en`, `es`, `ja`, `de`, `fr`), verified automatically by `tests/i18n.test.ts` (including zero Han-script leakage checks for `en`, `es`, `de`, and `fr`).
- Host code supplies Obsidian's public [`getLanguage()`](https://docs.obsidian.md/Reference/TypeScript%2BAPI/getLanguage) result; standalone browser previews fall back to `document.documentElement.lang` / `navigator.language`.
- Localize plugin-owned DOM only. Never walk note content, user input values, `math-field` LaTeX values, generic user SVGs, or elements marked `data-no-i18n` / `data-i18n-ignore`.
- Plugin-generated SVGs marked `data-vme-plot` localize only their fixed accessible prose (`aria-label`, `<title>`, `<desc>`, and `data-vme-plot-caption` headings/footers), leaving mathematical expressions, coordinates, and tick values untouched.
- MathLive's static global locale setter is not mutated when changing Visual Math's interface language, avoiding side effects on other plugins.

## Contributing or extending translations

1. Update the Chinese source key in `src/i18n.ts` together with its English, Spanish, Japanese, German, and French entries across `src/i18n*.ts`. Include tooltips, placeholders, accessibility labels, validation errors, and dynamic patterns.
2. Before adding a new language, open an issue naming its [official Obsidian locale code](https://github.com/obsidianmd/obsidian-translations#existing-languages) and native menu label.
3. Extend `Language`, `ResolvedLanguage`, `resolveLanguage`, `TRANSLATION_DICTIONARIES`, `ELEMENT_NAME_DICTIONARIES`, dynamic patterns, and language `<select>` options together while keeping saved `data.json` preferences backward-compatible. Never call an external translation API at runtime.
4. Run `npm run check` (`tsc --noEmit`, full unit/i18n test suite, and production build) and verify switching across languages preserves formula source, note bytes, and unsaved graph/3D views.
5. Element search accepts atomic numbers, chemical symbols, canonical English names, and all bundled localized element names (including accent-insensitive matching) entirely offline.
