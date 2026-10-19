# Changelog

This file records version changes. Builds before 0.6.2 were local MVP releases; 0.6.2 prepares the first public desktop beta. Publication status is shown on GitHub Releases. Neither a local package nor a public GitHub release implies Obsidian community-directory approval.

## 0.8.0 — 2026-10-18 · Desktop public beta

Adds polar plots, numerical calculus, XYZ wireframes and faster graph input. Local checks passed: **194 automated tests and 368 browser component checks**. Native 0.8.0 insertion/save/reopen remains unverified; GitHub publication and community review are separate. Actual checks are recorded in [TEST-REPORT.md](TEST-REPORT.md).

- Add polar `r=f(theta)` graphs with a polar grid, equal X/Y units, signed radii and a bounded θ range. Example: `r=2*sin(3*theta)` over 0–2π; the maximum parameter span is 100π radians.
- Add first/second numerical derivative curves and signed definite-integral estimates with interval shading to the function graph's calculus selector. Example: `y=x^2`, integral bounds 0–1. Finite continuous intervals with increasing bounds only; improper integrals and reversed bounds are unsupported. This is numerical differentiation/quadrature, not symbolic algebra.
- Add explicit XYZ wireframes `z=f(x,y)`, such as `z=(x^2-y^2)/10`, with drag rotation, zoom, editable X/Y/Z ranges and persisted camera angles. Use at most a 28 × 28 base mesh with bounded refinement; costly formulas can use a coarser mesh. Each axis is scaled independently to the viewing box.
- Add caret/selection-aware common-symbol insertion, separate full-expression examples, and inverse/hyperbolic/reciprocal trigonometric functions. Keep radians and safe bounded parsing without JavaScript evaluation.
- Recognize supported `y=`, `r=` and `z=` formulas directly beneath the equation editor. Persist mode-specific graph settings for reopening; saved equations and graphs remain independent blocks after insertion.
- Preserve continuous 3D drag/pinch gestures across preview refreshes and cancel queued gestures on explicit reset.
- Extend English, Simplified Chinese and Spanish controls, errors and scoped graph captions for these additions; supported language selection and offline behavior are unchanged.

General implicit/parametric plotting, a general solver, multiple function overlays and symbolic calculus remain outside scope. Numerical sampling may miss fine features, and a numerical error estimate is not a convergence proof. Background: NIST DLMF [§3.4 Differentiation](https://dlmf.nist.gov/3.4) and [§3.5 Quadrature](https://dlmf.nist.gov/3.5).

## 0.7.0 — 2026-10-18

- Rename the display name to **Visual Math**, retaining `visual-math-editor` as the plugin ID, installation folder and repository so existing settings and saved content remain compatible.
- Add **Graph this equation** below the math editor. Supported single-variable formulas feed the preview directly, changes invalidate stale curves, and **Insert equation and graph** validates and saves both together. Advanced function and complex-plane tools remain available.
- Add a bundled Spanish interface, Spanish element-name search and scoped graph accessibility translations alongside English and Simplified Chinese.
- Add local formula keywords: save a completed equation, insert it from a list or type its keyword in the Visual/Hybrid math field. Protect built-in shortcuts, invalid templates and concurrent settings changes.
- Clarify math, chemistry, physics and quick note-taking capabilities in the descriptions and add real 0.7 Obsidian screenshots.
- Apply **GPL version 3 only with the narrow Obsidian linking exception** to new original code and this release as a whole. Commercial use is allowed under GPL; covered derivative code cannot be distributed closed-source. Earlier MIT grants and unchanged third-party licenses remain valid. The source ZIP includes exact upstream preferred-source archives, checksums and build instructions.
- Include an **About and license** command and retain complete required notices in the three-file community distribution as well as the manual ZIP.

The live connection between a formula and its graph operates inside the current editor. Saved formula and graph blocks remain separate; regenerate or edit the graph after later formula changes. Native checks cover macOS and Obsidian 1.14.4, not every desktop platform. Exact automated, browser, native and hosted-release observations are in [TEST-REPORT.md](TEST-REPORT.md).

## 0.6.5 — 2026-10-18

- Localize the inline-editor accessibility label and equation hover-to-edit hint instead of displaying fixed Chinese text in the English interface.
- Refresh the inline label and dialog title when the editor's supported interface language changes, while retaining the current formula draft.
- Keep English/Simplified Chinese scope, offline operation and existing equation storage unchanged.

Local validation passed: 159 automated tests, type checking, the production build, packaging, 295 browser checks and the focused native label-switching check. Hosted release/provenance verification and the independent community-directory review remain separate; see [TEST-REPORT.md](TEST-REPORT.md) for actual status.

## 0.6.4 — 2026-10-18

- Use Obsidian's DOM creation helpers where available, with a fallback for the standalone browser preview and the registered MathLive custom element.
- Scope MathLive preview styling through plugin classes and preserve hidden controls and reduced-motion behavior without CSS `!important` overrides.
- Localize command names and the interface-language accessibility label to the selected supported language.
- Provide signed GitHub build provenance for the three runtime files and manual-download assets, with a pinned official action and an exact-tag workflow guard. The hosted release workflow succeeded and all six downloaded assets' provenance was verified against the exact source commit, tag and signing workflow; see [TEST-REPORT.md](TEST-REPORT.md).
- Stop duplicating standalone license attachments in new releases; complete notices remain embedded in the runtime files and included in both ZIPs. Keep manual installation/source downloads and checksums available.
- Preserve user-initiated equation cut/copy/paste and the documented absence of background clipboard monitoring; no clipboard feature is removed and no new MathLive compatibility patch is added.

Version 0.6.4 was published as the latest ordinary GitHub Release at its recorded check. Its own community-directory review is **Completed** and the public scorecard shows **Review Passed**, with no Error or Warning entries; only recommendations for clipboard access and optional manual-download assets remain. The completed 0.6.3 review remains historical evidence for that earlier version. Directory review does not establish native catalog availability or coverage on untested platforms. Actual tests and remaining limits are recorded separately in [TEST-REPORT.md](TEST-REPORT.md).

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
