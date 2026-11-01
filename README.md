# Visual Math

English · [简体中文](README.zh-CN.md) · [Español](README.es.md)

Write **math, chemistry and physics notes** directly inside Obsidian with **Visual Math** (formerly Visual Math Editor). Visual mode works like Word: choose fractions, roots, scripts, integrals and sums, then fill the placeholders. **Zero LaTeX knowledge is required in Visual mode.** LaTeX and synchronized Hybrid modes are available when you want source editing; formulas remain ordinary LaTeX/Markdown.

Built for quick science notes: optional chemical balance suggestions, physics templates, a periodic table, offline unit conversion, function graphs and a Re/Im complex plane. Everything runs locally without an account or runtime network connection.

## 1.0.0 — More math, fewer steps

[Visual Math 1.0.0 · Desktop release](https://github.com/oranipost/visual-math-editor/releases/tag/1.0.0) adds:

- **Import one equation:** inspect the original input, recognized outer delimiters and candidate before explicitly applying it. Unsupported or invalid input stays recoverable.
- **Matrix editor** with 1–6 rows and columns, and a **System of equations** tool with 2–6 visual rows and an automatic left brace.
- **Nine advanced math templates**, **19 set/sequence tools**, and trigonometric, similarity, congruence and angle symbols.
- **Seven geometry models** plus three adjustable spatial scenes, with rotation, zoom and explicitly saved views.

The display name remains **Visual Math / Oliver** and the plugin ID remains `visual-math-editor`. Custom formula keywords have been removed to keep the editor simpler; existing notes and unrelated settings are preserved. Draft Undo/Redo and temporary recovery remain available. There is no persistent formula library or history.

These tools format notation and illustrate bounded geometry; they do not solve equations, evaluate matrices or prove geometry. Release availability, native checks and community review are recorded separately in [TEST-REPORT.md](TEST-REPORT.md). Historical changes remain in [CHANGELOG.md](CHANGELOG.md).

## New in-note workflow

Real screenshots from Visual Math 0.7.0 running in Obsidian on macOS. The Spanish Hybrid interface and graph preview share the same equation draft. They are historical captures, not demonstrations or verification of the new 1.0.0 tools.

![Visual Math 0.7.0 Spanish Hybrid editor inside an Obsidian note](docs/images/visual-math-0.7-spanish-hybrid.png)

![A function graph directly below the current equation in Visual Math 0.7.0](docs/images/visual-math-0.7-linked-graph.png)

## Download and install

**[Open the Obsidian community-directory page](https://community.obsidian.md/plugins/visual-math-editor).** When the plugin is available in the app's index, click **Add to Obsidian**, allow the link to open Obsidian, then choose **Install → Enable** in the plugin details. Open a Markdown note and click **∑** in its header or left ribbon. The directory's enabled installation link and a completed native installation test are separate observations; consult [TEST-REPORT.md](TEST-REPORT.md) for what has actually been tested.

The community directory can offer a different version while a new release is being scanned or indexed. Check the version shown in Obsidian before installing or updating. A passing review for an older version does not establish the result for 1.0.0; see [TEST-REPORT.md](TEST-REPORT.md).

### Manual installation

**[1.0.0 installation ZIP](https://github.com/oranipost/visual-math-editor/releases/download/1.0.0/visual-math-editor-1.0.0.zip)** · [Release notes and checksums](https://github.com/oranipost/visual-math-editor/releases/tag/1.0.0) · [Detailed installation, updates and removal](docs/INSTALLATION.md#english)

For manual installation, download the published installation ZIP, rather than **Code → Download ZIP** or GitHub's automatic **Source code** archives, which require building.

The installation ZIP is already compiled. You do not need Node.js to use it.

1. Extract the ZIP and copy the entire `visual-math-editor` folder into your vault's `.obsidian/plugins/` directory.
2. Confirm that `main.js`, `manifest.json`, `styles.css` and the license files are directly inside that folder, without another nested plugin folder.
3. Restart Obsidian. Open **Settings → Community plugins**, enable community plugins if necessary, then enable **Visual Math**.
4. Open a Markdown note. Use **∑** in the note header or left ribbon to open the editor.

Earlier 0.6.2–0.6.5 releases are retained as recoverable drafts; their historical tags remain available. Historical tags/source and the original MIT rights remain available; the current GPL license does not revoke those earlier grants.

On macOS, **⌘⇧.** shows hidden folders in Finder. If your vault uses a custom configuration directory, use that instead of `.obsidian`.

For directory updates, use **Settings → Community plugins → Check for updates → Update**; community plugins do not update automatically. For manual updates, save or cancel open drafts, disable the plugin and back up its existing folder. Copy the new installation files into that folder and retain your existing `data.json` settings. Save drafts before either update method, then restart Obsidian to refresh MathLive. You do not need to edit code or download your vault again. See [how updates work](docs/UPDATING.md#english).

Requires **Obsidian 1.14.4 or later**. Native verification is limited to the macOS/version-specific flows recorded in the test report. This release targets the desktop main window; Windows, Linux, mobile, detached pop-out windows and arbitrary third-party themes/plugins have not been verified. See [TEST-REPORT.md](TEST-REPORT.md) for actual observations.

## See it in action

These screenshots show the earlier Visual Math Editor interface running in Obsidian's desktop main window, using a separate test vault and example notes. The editor opens directly below the note paragraph. Insertion, reopening, saving and native Undo observations are recorded in the [test report](TEST-REPORT.md).

### Visual and Hybrid editing

![Visual mode with fraction, root and script structure controls](docs/images/equation-visual.jpg)

![Hybrid mode synchronizes LaTeX source and the formatted equation](docs/images/equation-hybrid.jpg)

### Complex plane and science tools

![Saved complex plane in an Obsidian note, with 3+2i, Re/Im axes, zoom and Save view controls](docs/images/complex-plane.jpg)

![Chemistry input, formatted preview and an optional balance suggestion](docs/images/science-tools.jpg)

## Insert a fraction

1. Place the cursor in the note, then click **∑** in its header or the left ribbon. You can assign a shortcut to **Insert or edit equation** under **Settings → Hotkeys**; no global shortcut is assigned by default.
2. In **Visual → Math**, click **Fraction**, enter `3`, press **Tab**, then enter `4`. Previous/next placeholder buttons can also move between empty fields.
3. Choose inline or display math and click **Insert equation**. **Ctrl+Enter** also submits the active editor.

You can also run **Visual Math: Insert or edit equation** from the command palette. Input remains a draft until insertion or saving; **Cancel** leaves the note unchanged. Select existing content before choosing a structure to wrap the selection. Use operators or mathematical spacing when adjacent structures should be separated.

| Mode | Editing behavior |
| --- | --- |
| **Visual** | Edit the formatted equation using structure buttons and placeholders. |
| **LaTeX** | Edit the source directly. |
| **Hybrid** | See and edit both representations, with synchronization in either direction. |

All three modes share the same draft. Source input excludes the outer `$` or `$$` delimiters. Incomplete structures and recognized syntax errors prevent ordinary submission. Complete source containing unsupported commands can use the explicit **Save source** path in LaTeX/Hybrid; rendering still depends on the note environment.

To reopen an equation, put the cursor inside it and click **∑**, or use **Choose equation to edit**. In Reading view, **∑** opens a picker with existing equations/graphs and an option to append a new equation. Double-clicking a rendered equation also attempts to locate it; use the picker if another plugin or Vim intercepts the gesture. The default editor opens below the relevant paragraph. **Open equation dialog** provides an optional separate window.

## Import a single LaTeX formula

Choose **Import one equation**, or paste into the visual field to stage an import. You can provide bare formula contents or one complete matching `$…$`, `$$…$$`, `\(...\)` or `\[...\]` wrapper. The panel keeps the original input separate from its candidate and shows the intended inline/display layout.

1. Check the input and preview. The current equation and note stay unchanged.
2. Choose **Apply and replace equation** to replace the whole formula draft, or **Cancel import** to return without applying it.
3. Edit the draft and explicitly insert/save it to update the note. Undo/Redo can restore the previous draft.

Source panes accept formula contents without outer delimiters. A complete but unsupported macro may use the explicit **Save source** path; preserving its source is not visual support and does not guarantee rendering in another environment. The importer does not silently drop unknown commands, comments or parts of an expression, repair brackets, join multiple formulas, or infer mathematical meaning. Documents, macro definitions, mixed prose, files, OCR and batch import are outside scope.

One import accepts at most **8,192 UTF-16 code units** in the original input, including any wrapper and outer whitespace. Visual rendering has a separate **4,096 UTF-16 code unit** limit for the formula contents. A longer valid formula keeps its full source, skips the visual preview and uses explicit source-only Apply and **Save source** actions in LaTeX/Hybrid. Syntax checks still run; this is source editing, not full visual support. Shortening it to within the visual limit restores visual editing if its notation is supported. Nothing is truncated.

Command and structural budgets also apply. Size alone does not predict rendering cost; a formula within a budget may still be slow. See the measured performance boundaries and unverified cases in [TEST-REPORT.md](TEST-REPORT.md).

## Matrices, systems, sets and advanced notation

In **Math**, expand only the tool you need:

- **Matrix editor:** choose 1–6 rows and columns and a delimiter style, then fill the visual cells. Preview before inserting or replacing a whole supported matrix. Empty cells are not filled automatically; **Fill empty cells with 0** is an explicit choice. Resizing retains hidden cells for this session.
- **System of equations:** choose 2–6 rows and enter an equation or inequality on each row. A left brace is added automatically. Preview, then insert or replace the current single-column system. The tool does not reinterpret a two-column piecewise function as an equation system or solve it.
- **Sets and sequences:** 19 buttons cover set braces and set-builder notation; ℕ, ℤ, ℚ, ℝ and ℂ; membership, subset, union, intersection and empty-set symbols; sequence terms/braces, finite sequences and arithmetic/geometric terms. Fill the variables and conditions yourself. No sorting, deduplication, set calculation or sequence evaluation occurs.
- **Advanced math templates:** limits, ordinary/second/partial derivatives, double integrals, infinite series, products, vectors and gradients. These insert editable notation, not calculation requests.
- **Trigonometry and geometry symbols:** sine, cosine and tangent slots, similarity ∼, congruence ≅, angle ∠, triangle △ and editable right-angle notation 90°.

Matrix and system editing use separate temporary drafts. Preview and Cancel do not alter the main equation. Inserting or replacing updates only the formula draft; the note changes after its final save. Unsupported structures and unfilled slots retain the draft and block ordinary submission. Existing supported formulas can be reopened and loaded for local editing.

## Geometry models and spatial scenes

Open **Graph → Geometry** and choose a sphere, cylinder, cone, regular pyramid, regular prism, cuboid or plane. Adjust the applicable dimensions; regular pyramids/prisms use 3–12 base sides. Three basic scenes illustrate **two planes**, **a line and a plane**, and **a sphere and a plane**, with adjustable parameters and the supported intersection line, circle or tangent point.

Drag to rotate and use wheel/buttons to zoom. Dimensions, face visibility, camera angles and zoom remain drafts until **Insert graph / Save graph**, or **Save view** on a saved model. Reopen the graph to edit the stored settings. Geometry uses an orthographic view with equal X/Y/Z units; curved shapes are polygonal approximations. Base radii are measured from the center to a vertex. Dimensions and camera settings have bounded ranges.

These are fixed teaching scenes, not arbitrary solid intersection, CAD, symbolic geometry or a general model builder. The displayed relationship applies to the documented scene, not every possible placement of those objects. Geometry uses `vme-plot` blocks and needs this plugin to render; older plugin versions cannot display the new geometry mode. Existing earlier graph formats remain supported.

## Graphs and the complex plane

Function, polar, numerical calculus, XYZ and complex-plane tools remain available. Historical screenshots retain their stated versions; current test results are listed in [TEST-REPORT.md](TEST-REPORT.md).

In the equation editor, use **Graph this equation** below your formula to preview a supported function directly underneath it. There is no need to retype the formula in a separate field. Edits to the current formula update its connected preview; graph navigation retains the ranges until you explicitly reset or save them. Click **Insert equation and graph** to save the completed equation and graph together. **Hide graph** closes the connected preview. Previewing alone does not change the note.

**Linking lasts only while this editor is open.** After saving, the LaTeX equation and `vme-plot` graph are independent note blocks. Editing the saved equation does not automatically update its saved graph. Generate a new graph from the revised equation or use the existing graph's **Edit graph** action to update it explicitly.

Conversion supports bounded explicit formulas: `y=x^2` for a function, `r=2\sin(3\theta)` in the equation editor for a polar radius, or `z=(x^2-y^2)/10` for a surface. Fractions, roots and supported trigonometric commands convert without retyping. Arbitrary implicit equations, chemistry, sums, integral notation and unsupported macros receive an explanation instead of a guessed plot. Use the graph calculus selector to differentiate or integrate the supported function; an integral symbol in the equation is not a symbolic calculation request. The formula source is preserved.

For a manually entered function, polar radius, surface or complex points, open the advanced **Graph** tools and choose the graph type. Input changes update the preview after a short pause. You can click **Insert graph** or **Save graph** directly: the action validates the current input again before saving, so a manual preview click is optional. **Preview graph** remains available when you want to refresh it explicitly.

For a real graph, enter `x^2`, `sin(x)` or `1/x`. The X/Y range can be adjusted manually or through navigation. Supported notation includes `x`, `pi`, `e`, decimal/scientific numbers, `+ - * / ^`, parentheses, common implied multiplication and `sin`, `cos`, `tan`, `sec`, `csc`, `cot`, `asin`, `acos`, `atan`, `sinh`, `cosh`, `tanh`, `asinh`, `acosh`, `atanh`, `sqrt`, `abs`, `ln`, `log`, `exp`. `arcsin`, `arccos`, `arctan` and the symbols π/θ are accepted aliases in their supported modes. Function arguments need parentheses; trigonometric functions use radians. `ln` is natural logarithm and `log` is base 10. Explicit constant fractional powers such as `x^(1/3)` support negative real branches when the denominator is odd.

For the complex plane:

1. Choose **Complex plane** and enter `3+2i`. The point appears at **Re = 3, Im = 2**, using equal unit lengths on both axes.
2. Add one number per line if needed, such as `-i`, `4` or `-2+i`. Full coordinates appear below the graph.
3. Drag inside the graph to pan, use the wheel or pinch to zoom, or use the labeled zoom buttons. **Fit all points** includes the points and origin; **Reset view** restores the range from when the editor was opened.
4. Click **Insert graph**. On a saved graph, navigate temporarily and click **Save view** to keep that range. Reopen the note or click **Edit graph** to verify the saved bounds.

Navigation does not write on every gesture. In the editor, **Insert graph / Save graph** commits the current range. On a saved graph, **Save view** commits it explicitly. Scrolling outside the graph continues to scroll the note. A temporary unsaved view may reset when the graph is rendered again. Function, polar, surface and complex modes keep separate drafts while the editor is open. In XYZ mode, dragging rotates the camera; wheel/buttons zoom all three numeric ranges. **Save view** stores these changes only when explicitly selected.

Graphs are stored in versioned `vme-plot` Markdown blocks, including the mode, expression/points, axis bounds and applicable θ, calculus, integration and camera parameters. Saving and reopening restores those stored settings; this persistence does not create a continuing link to a separate saved equation. Earlier function blocks remain supported. The plugin renders them locally as SVG; disabling it leaves the definitions in the note rather than a rendered graph. Graph insertion is limited to standalone blocks in ordinary note text. A valid equation draft can be saved together with a new graph in one note operation; an unfinished equation must be completed or cleared first.

**Function-plotting limits:** one explicit real function `y=f(x)`, polar radius `r=f(theta)`, explicit surface `z=f(x,y)`, or up to 20 rectangular complex literals. This is not a general equation solver. Complex input accepts `a+bi`, `i`, `-i`, real numbers, decimals and scientific notation; it does not evaluate arithmetic, `sqrt(-1)`, polar coordinates or named points. Total complex input is limited to 1,000 characters; function input to 500. Axis bounds and complex components must stay within ±1,000,000. Ranges must be finite, ordered, at least 10⁻⁹ wide and sufficiently wide relative to their magnitude. Numerical sampling has work limits and can miss fine features; a plotted curve is not proof of continuity. General implicit or parametric plotting, multiple function overlays, sliders and symbolic solving are not included. Polar parameter spans must be positive and at most 100π radians. Numerical derivative curves omit detected cusps and unresolved discontinuities. Definite integration requires finite increasing bounds and a real continuous integrand on that interval; it does not compute improper integrals, reversed bounds or exact antiderivatives. Sampling and quadrature can miss fine features; error estimates are not convergence proofs. XYZ uses bounded wireframe sampling and independent axis scaling; use the numeric ticks when comparing axes.

For background on the numerical methods and their limits, see NIST DLMF [§3.4 Differentiation](https://dlmf.nist.gov/3.4) and [§3.5 Quadrature](https://dlmf.nist.gov/3.5).

## Science tools

- **Chemistry:** type ordinary notation such as `H2O`, `SO4^2-`, `CH3-CH2-OH` or `H2 + O2 -> H2O`. Preview subscripts, charges, linear bonds and reaction arrows before inserting into the equation draft.
- **Balance check:** compares supported element and charge counts offline. For `H2 + O2 -> H2O`, it can suggest `2H2 + O2 -> 2H2O`. Choose **Use balanced suggestion** to apply it to the helper input, or **Insert as written** to keep the unbalanced original. Unsupported or unbalanced reactions remain insertable when their display syntax is valid. A balance check does not establish reaction feasibility, conditions or correct products.
- **Physics:** insert vectors, gradients, divergence/curl, partial derivatives, ℏ, Greek letters and common formula templates, then edit their variables visually.
- **Units:** format entries such as `9.81 m/s2`. Offline conversion provides 11 categories and 63 explicit choices. For example, select **Length**, enter `1`, choose **Inch (in) → Centimetre (cm)** and obtain `1 in = 2.54 cm`. **Use converted result** fills the units draft; **Insert units** adds it to the equation draft; the editor's final insert/save writes the note.
- **Elements:** search 118 elements by atomic number, symbol, English name or Spanish name; Spanish-name search also accepts omitted accents. Hover or keyboard-focus an element for atomic-weight/isotope information, neutral ground-state electron configuration and shell populations. Clicking the element inserts its symbol into the chemistry input. Details are local factual lookups, not a molecular structure or electron-cloud simulation.

Chemistry and unit helpers generate `\ce{…}` and `\pu{…}` automatically. In the main visual field they are selected as whole fragments. A single complete fragment can be reopened in its helper; use LaTeX/Hybrid to edit fragments within mixed expressions. This is not a two-dimensional molecular structure editor.

Balance checking supports a bounded subset of chemistry notation and stops on unsupported or excessively complex input. Unit conversion is between preset choices within the same category, not arbitrary dimensional analysis. Temperature conversion uses absolute readings with offsets, not temperature differences. Results use fixed Convert 8.0.2 constants and display at most 12 significant digits. Element data retains uncertainty intervals and predicted/calculated qualifiers; bracketed isotope mass numbers are not standard atomic weights.

## Simpler note taking

Custom formula keyword creation and expansion have been removed in 1.0.0. Existing formulas already inserted in notes remain normal LaTeX. Old keyword data is not used or deleted by this update; keep your `data.json` when updating. Standard Obsidian hotkeys, the ∑ entry, draft Undo/Redo and temporary draft recovery remain available. Temporary recovery is not a saved formula library and does not survive restarting or disabling the plugin.

## Language, saving and privacy

The interface provides **English, Simplified Chinese and Spanish**. Choose **Follow Obsidian**, **中文** (Simplified Chinese), **English** or **Español**; the preference is stored locally for the current vault. The Spanish Follow Obsidian label is **Usar el idioma de Obsidian**. Follow Obsidian uses Spanish for `es`, `es-ES` and other Spanish locales, Simplified Chinese for Chinese locales, and English for unsupported languages. Chinese regional variants share Simplified Chinese. Changing the interface language does not translate formula source, note text or saved ranges. This states the implemented translation scope, not a fluent-speaker or every-platform certification; see [LANGUAGE-SUPPORT.md](LANGUAGE-SUPPORT.md) and [TEST-REPORT.md](TEST-REPORT.md).

Equations use `$…$` or `$$…$$`. Standard mathematics remains native Obsidian math after the plugin is disabled; chemistry/units require mhchem support. Other export targets must support the relevant commands. Complex TeX, custom macros and other plugins' syntax may not be visually compatible. Tables/lists/quotes/callouts support inline equations only; code, YAML properties, comments and link destinations are protected insertion locations.

A save performs one guarded note operation and supports Obsidian's native **Undo**. An unchanged save preserves the original Markdown. If the note changes while the editor is open, saving stops and the draft is retained. **Recover equation draft** can restore a temporarily retained draft during the same application run; restarting Obsidian or disabling the plugin clears that memory.

The runtime needs no account or network connection. MathLive, fonts, Convert and element data are bundled; parsing, checking, conversion and SVG generation run locally. There is no telemetry, CDN, remote font, OCR or cloud recognition. Initial dependency installation during development needs network access. Offline operation is not an independent security audit; report defects using [SECURITY.md](SECURITY.md).

Clipboard access supports user-initiated cutting, copying and pasting in the equation editor. The plugin does not monitor the clipboard in the background or send its contents to a server.

If another plugin has already registered an incompatible MathLive version, disable the conflicting plugin and restart Obsidian before retrying.

## Build, preview and contribute

Use Node.js 22 or 24:

```sh
npm ci
npm run check
npm run package
```

`check` runs type checks, logic tests and the production build. Installable files are generated in `dist/`; `package` verifies release metadata and creates installation/source ZIPs plus `SHA256SUMS.txt` in `release/`. Source archives include project source, scripts, tests, locked metadata and the exact MathLive/Convert preferred-source and published-input archives in `third-party-sources/`. They exclude `node_modules`, generated plugin builds, vaults and application settings. See [source provenance and rebuild instructions](third-party-sources/README.md).

**Developer-only local preview — ordinary plugin users can skip this.** This is not an online demo. Each developer must download or clone the source, open a terminal in the project folder, and start the preview on their own computer:

```sh
npm ci
npm run preview
```

Then open [http://127.0.0.1:8471](http://127.0.0.1:8471) and use the component-test button. `127.0.0.1` always refers to the computer opening the address; it does not connect to this project's maintainer or another user. The address works only while the local preview service is running. It binds only to localhost, restricts external connections, and saves into test memory rather than a vault. Stop it with **Ctrl+C**. Browser checks and native Obsidian integration are separate; record what was actually tested in [TEST-REPORT.md](TEST-REPORT.md).

The repository includes Node.js 22/24 CI and packaging checks. A separate manual workflow prepares a draft release from an existing exact-version tag; it does not publish automatically. Hosted workflow results are available under [Actions](https://github.com/oranipost/visual-math-editor/actions). See [CONTRIBUTING.md](CONTRIBUTING.md) and [RELEASING.md](RELEASING.md) for the development and release process. The [local code precheck](docs/CODE-REVIEW.md) records the official lint-tool results and remaining warnings; it is separate from community-directory approval.

## Feedback and contributions

Developer: [Oliver / oranipost](https://github.com/oranipost). For private contact, email [oranipost@outlook.com](mailto:oranipost@outlook.com). GitHub profiles do not provide direct messages; use email for private enquiries and [Issues](https://github.com/oranipost/visual-math-editor/issues) for public feedback.

Report a problem through the [bug report form](https://github.com/oranipost/visual-math-editor/issues/new?template=bug_report.yml). Include your plugin/Obsidian versions, operating system, view mode, a small invented input and reproduction steps. English, Simplified Chinese and Spanish are welcome. Do not attach a real vault, private notes or settings. Use the [feature request form](https://github.com/oranipost/visual-math-editor/issues/new?template=feature_request.yml) for suggestions.

Code, wording fixes and translation contributions are welcome; read [CONTRIBUTING.md](CONTRIBUTING.md) first. English, Simplified Chinese and Spanish are included. A new locale should cover full workflows, errors and accessibility labels and receive fluent-speaker review.

A GitHub release is separate from approval for Obsidian's community directory. The [community submission guide](docs/COMMUNITY-SUBMISSION.md) records the completed 0.6.3 review, its nonblocking warnings, the published 0.6.4 changes and completed review, the 0.6.5 localization hotfix, and the maintenance process. Review results do not replace the runtime observations in [TEST-REPORT.md](TEST-REPORT.md).

## License and dependencies

Starting with **0.7.0**, new project code and this release as a whole use [GNU GPL version 3 only with the Obsidian linking exception](LICENSING.md). Copyright (c) 2026 Dongfang Wang. Code already released through **0.6.5** retains its original MIT grant; this change does not revoke those permissions. Third-party licenses remain unchanged. The dated transition and retained historical MIT notice are in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). The narrow exception permits working with the Obsidian host while preserving GPL requirements for covered plugin modifications. Distributed modifications of GPL-covered code must meet the GPL's source and licensing requirements; the license also permits commercial redistribution. Your own notes and formulas are not licensed under GPL merely because you create them using this plugin.

MathLive and Convert are pinned; the build applies two asserted MathLive compatibility fixes, including chemistry Undo/Redo serialization. Review those fixes before upgrading the dependency.

MathLive, Convert and the KaTeX-derived fonts use MIT licenses; the bundled mhchem component uses Apache 2.0. Retain `LICENSE`, `LICENSING.md`, `MATHLIVE-LICENSE.txt`, `KATEX-FONTS-LICENSE.txt`, `MHCHEM-LICENSE.txt`, `CONVERT-LICENSE.txt` and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) in redistributed installation archives. That notice also records scientific-data sources and build modifications. Obsidian and CodeMirror are supplied by the host rather than redistributed in the plugin bundle.
