# Changelog

This file records version changes. Builds before 0.6.2 were local MVP releases; 0.6.2 prepares the first public desktop beta. Publication status is shown on GitHub Releases. Neither a local package nor a public GitHub release implies Obsidian community-directory approval.

## 0.6.4 — 2026-10-18

- Use Obsidian's DOM creation helpers where available, with a fallback for the standalone browser preview and the registered MathLive custom element.
- Scope MathLive preview styling through plugin classes and preserve hidden controls and reduced-motion behavior without CSS `!important` overrides.
- Localize command names and the interface-language accessibility label to the selected supported language.
- Prepare signed GitHub build provenance for the three runtime files and manual-download assets, with a pinned official action and an exact-tag workflow guard. The hosted workflow and downloaded-asset verification must succeed before provenance is reported as available.
- Stop duplicating standalone license attachments in new releases; complete notices remain embedded in the runtime files and included in both ZIPs. Keep manual installation/source downloads and checksums available.
- Preserve user-initiated equation cut/copy/paste and the documented absence of background clipboard monitoring; no clipboard feature is removed and no new MathLive compatibility patch is added.

The 0.6.3 directory review is historical evidence for that version. Version 0.6.4 needs its own release scan; the changes above do not by themselves establish official approval. Actual tests and remaining limits are recorded separately in [TEST-REPORT.md](TEST-REPORT.md).

## 0.6.3 — 2026-10-18

- Included complete project/dependency notices in the JavaScript runtime and the font license in the stylesheet, so community installation of the three plugin files retains required redistribution notices.
- Added developer contact links, the public support email, and bilingual update instructions for community and manual installations.
- Kept the supported interface languages at English and Simplified Chinese, with English fallback for other Obsidian languages.

## 0.6.2 — 2026-10-18

- Clarified that localhost preview instructions are for developers only and refreshed public documentation and download archives.

- Prepared the first public desktop beta with English and Chinese documentation, installation/update/removal instructions, and real Obsidian test-vault screenshots. Release title/notes identify the MVP as Public beta; the manual draft workflow prepares an ordinary release rather than setting the GitHub pre-release flag.
- Imported generated SVG through a parsed document instead of HTML injection.
- Removed the default global hotkey; assign an optional shortcut in Obsidian Settings → Hotkeys. The ∑ entry and editor Ctrl+Enter remain available.
- Set the minimum Obsidian version to the actually tested desktop version, 1.14.4, and added maintainer metadata.
- Applied the official source-lint fixes; the final local scan reports 0 errors and 17 reviewed warnings, with manifest validation at 0 errors and 0 warnings. Type checking, 155 logic tests and the production build pass.

## 0.6.1 — 2026-10-18

- Added debounced graph previews and explicit direct insertion/saving from the latest input, without a mandatory Preview click.
- Fixed modified Enter being intercepted by function/range inputs; graph save shortcuts now reach the editor.
- Replaced graph controls with consistent original SVG icons beside visible text labels.
- Fixed language changes on saved graph controls/status without replacing the SVG or losing the temporary view; Follow Obsidian uses its public locale API when available.
- Added English documentation and a source-backed language support/contribution guide.

- GitHub preparation: read-only pull-request CI, reviewable build archives, a manually triggered draft-release workflow, issue and pull-request templates, contribution guidance, version metadata checks and source-package exclusions.

## 0.6.0 — 2026-10-18

- Added a Re/Im complex plane with one explicit rectangular complex number per line, point labels and a complete coordinate list.
- Added equal units on the real and imaginary axes, fit-all-points, panning, anchored zooming and reset controls.
- Added temporary navigation for saved graphs and explicit **Save view** persistence, with guarded one-step note writes and native Undo.
- Preserved separate function/complex drafts and compatibility with existing function graph blocks.

## 0.5.0 — 2026-10-18

- Added offline function plotting and editable `vme-plot` Markdown blocks.
- Separated larger X/Y axis titles from numeric ticks.
- Added bounded parsing, discontinuity handling and supported LaTeX-to-function conversion.

## Earlier local MVP builds

- Introduced Visual, LaTeX and Hybrid editing, inline insertion/reopening, chemistry and physical notation, nonblocking reaction balancing, unit conversion and the element table.
- Added English, Simplified Chinese and system-language selection, bundled fonts, offline operation and guarded note writes.

Exact tested environments and limitations are recorded in [TEST-REPORT.md](TEST-REPORT.md).
