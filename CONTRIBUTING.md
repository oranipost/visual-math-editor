# Contributing

Bug reports, small improvements and language corrections are welcome in English or Chinese. Describe a concrete task and provide an invented minimal example; never attach a real vault or private note.

## Development

These steps are for developers; ordinary plugin installation does not require a preview server. Download or clone the source and open a terminal in its project folder on your own computer. Use Node.js 22 or 24 and install the locked dependencies:

```sh
npm ci
npm run check
npm run preview
```

`check` runs type checking, the logic tests and the production build. After `npm run preview` starts the local service, open `http://127.0.0.1:8471` on the same computer. This is a developer-only local preview, not a hosted online demo: `127.0.0.1` refers to each visitor's own computer and the address works only while its preview service is running. Stop it with **Ctrl+C**. The component preview includes browser checks, but it does not reproduce Obsidian's file lifecycle. Use a disposable desktop vault for insertion, reopening, saving, view changes and native Undo. Keep actual observations in `TEST-REPORT.md`; do not present a preview pass as a native integration pass.

## Changes

- Keep runtime work offline. Do not introduce telemetry, CDN assets or network services.
- Preserve the note until the user explicitly inserts or saves. Validate the active path and full snapshot before a single write; retain recoverable drafts on failure.
- Preserve unchanged Markdown bytes and compatibility with existing `vme-plot` version 1 blocks.
- Treat formulas, graph input and note contents as data. Do not evaluate input as JavaScript or insert untrusted HTML.
- Bound parsing and numerical work, and provide useful errors for unsupported input.
- Use theme variables, visible labels and keyboard access. Keep mathematical notation separate from interface translations.
- Retain licenses and source provenance. Do not upgrade the pinned MathLive version without reviewing both build patches and chemistry Undo/Redo.

Add regression tests for changed parsing, persistence, numerical behavior or other meaningful failures. For visual changes, include a screenshot with private information removed and state the width/theme tested. Keep unrelated cleanup out of a focused pull request.

## Translations

The current supported interface languages are English and Simplified Chinese, with a system-language choice and English fallback. A new language should cover complete task flows, validation messages, accessibility labels and narrow layouts. Please discuss a language addition before introducing a partial dictionary; a native speaker should review scientific terms. Translation contributions do not change mathematical commands, element symbols, stored expressions or unit identifiers. The current scope and comparison with other plugins are documented in [LANGUAGE-SUPPORT.md](LANGUAGE-SUPPORT.md).

## Packaging

Run `npm run check` before `npm run package`. Packaging verifies metadata and the built manifest, copies an explicit source allowlist, rejects symbolic links in source inputs, and produces installation/source ZIP files plus SHA-256 checksums in `release/`. Do not commit dependencies, generated bundles, test vaults, application profiles or `data.json`.

Release preparation is described in [RELEASING.md](RELEASING.md). Publishing, pushing tags and community submission are maintainer actions.
