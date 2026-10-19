# Third-party software and data

- **MathLive 0.111.1**, Copyright (c) 2017-present Arno Gourdol, MIT. The complete upstream license is included as `MATHLIVE-LICENSE.txt`. [Upstream project](https://github.com/arnog/mathlive).
- **KaTeX-derived fonts** bundled by MathLive, MIT. Font copyright and license notices are included as `KATEX-FONTS-LICENSE.txt`. [Upstream font project](https://github.com/KaTeX/katex-fonts).
- **mhchem parser**, bundled within MathLive's `src/latex-commands/mhchem.ts`: an adaptation of KaTeX's adaptation of MathJax's mhchem implementation. Copyright (c) 2011-2015 The MathJax Consortium; Copyright (c) 2015-2019 Martin Hensel. Licensed under the Apache License, Version 2.0; the complete license is included as `MHCHEM-LICENSE.txt`. [MathLive source and attribution](https://github.com/arnog/mathlive/blob/master/src/latex-commands/mhchem.ts), [mhchem manual](https://mhchem.github.io/MathJax-mhchem/). The build corrects MathLive's chemistry atom constructor as described below; the mhchem syntax parser itself is unchanged.
- **Convert 8.0.2**, Copyright (c) 2020 Jonah Snider, MIT. The complete upstream license is included as `CONVERT-LICENSE.txt`. [Upstream project](https://github.com/jonahsnider/convert). This zero-dependency library is bundled locally for deterministic unit conversion. Compound speed combines its length and time factors; no external conversion service is used.
- **Element identities**: atomic numbers, symbols and English names were checked against the [IUPAC Commission on Isotopic Abundances and Atomic Weights table](https://ciaaw.org/atomic-weights.htm) on 2026-10-18. The plugin contains its own table layout; it does not reproduce IUPAC table artwork. Standard atomic weights (including intervals and uncertainties) and radioactive isotope mass numbers are factual lookups from [CIAAW standard atomic weights](https://ciaaw.org/atomic-weights.htm) and [CIAAW radioactive elements](https://ciaaw.org/radioactive-elements.htm). Neutral electron configurations are factual lookups from the [PubChem periodic table](https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON), with lawrencium corrected to the [NIST 7p configuration](https://physics.nist.gov/cgi-bin/Elements/elInfo.pl?element=103). Calculated/predicted qualifiers are retained; shell populations are derived from the listed configurations. Details were checked on 2026-10-18. The f-block's group value in the data is a layout anchor, not a claim about disputed group-3 membership.
- **Obsidian and CodeMirror** are supplied by the host application, not redistributed in `main.js`. Development tooling and exact dependency versions are recorded in `package-lock.json`.

All MathLive JavaScript and required WOFF2 fonts are included in the build. No runtime CDN is needed. Upstream MIT and Apache 2.0 terms, copyrights and attributions remain unchanged for their respective components. The current project's licensing and the retained historical MIT notice are stated below.

## Project license and transition — 2026-10-18

Visual Math: Copyright (c) 2026 Dongfang Wang.

Starting with version **0.7.0**, this project's new original code and the current project as a whole are licensed under the **GNU General Public License, version 3 only, with the Obsidian linking exception**. The unmodified GPL text is in `LICENSE`; the complete project terms are in `LICENSING.md`, and the additional permission is reproduced below. You may redistribute and modify that covered code under GPL version 3. It is provided without any warranty, including the implied warranties of merchantability or fitness for a particular purpose. See `LICENSE` for the complete terms.

The full GPLv3 text was obtained from the [official SPDX license-list-data repository](https://github.com/spdx/license-list-data/blob/main/text/GPL-3.0-only.txt). Its standard appendix includes a sample “or later” notice; this project's base-version choice is **version 3 only**, with the additional Obsidian permission stated here and in `LICENSING.md`. `package.json` points to that combined project notice.

The transition does **not** revoke rights granted for earlier releases. Project code already published through **0.6.5** remains available under its original MIT grant. Published historical tags, source archives and installation assets keep their original licenses. Reused MIT-covered material retains the copyright and permission notice reproduced below. New GPL-covered contributions in 0.7.0 are not retroactively included in that historical MIT grant.

This transition does not relicense third-party code or scientific factual data. Their original terms, attributions and data provenance are retained. Apache 2.0 code may be incorporated into GPLv3 works while respecting its notices; see the [Apache Software Foundation's compatibility statement](https://www.apache.org/licenses/GPL-compatibility.html) and [GNU's compatibility guide](https://www.gnu.org/licenses/quick-guide-gplv3.html).

### Additional Obsidian permission

The following section 7 additional permission applies to this project's covered code. It does not remove the GPL obligations for plugin modifications or grant rights to Obsidian itself.

```text
Visual Math — Obsidian linking exception
Additional permission under section 7 of the GNU General Public License, version 3

Copyright (c) 2026 Dongfang Wang.

For the Visual Math code to which the copyright holders apply this
additional permission (the "Program"), the copyright holders give you
permission to link or combine the Program with the Obsidian application
as distributed by its copyright holders, through the interfaces and
runtime facilities that Obsidian provides for plugins, and to convey
the resulting combination.

You must comply with GNU GPL version 3 for the Program and its covered
modifications. When conveying such a combination, the requirement to
provide Corresponding Source does not require you to provide Obsidian's
proprietary source code solely because of the combination permitted by
this exception. You must still provide the Corresponding Source for the
Program and all other code for which GNU GPL version 3 requires it.

This permission is limited to the Obsidian host described above. It does
not authorize combining the Program with other proprietary libraries or
programs. It does not change the licenses of third-party components.
Nothing in this exception grants rights to Obsidian's code, name, logos
or other trademarks beyond rights granted separately by their owners.
Any distribution of Obsidian itself must comply with its own license.

This exception is an additional permission, not a replacement for GNU
GPL version 3. You may remove this additional permission from a copy as
allowed by section 7 of that license. If you modify the Program, you may
extend this exception to your modifications when you have the authority
to do so, but you are not required to do so.
```

### Retained MIT notice for previously published project code

The following is the unchanged project notice published before the 0.7.0 transition; it applies to that previously MIT-licensed material, not as an alternative license for new GPL-covered additions.

```text
MIT License

Copyright (c) 2026 Dongfang Wang and Visual Math Editor contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Build modification to MathLive

The pinned MathLive bundle's eager stack-based source-location fallback is replaced with `document.baseURI`. This avoids diagnostics for Obsidian's `plugin:` evaluation URLs. MathLive's relative asset loader is disabled; fonts are embedded, sounds are disabled, and no Compute Engine service is loaded.

The build also corrects MathLive 0.111.1's `ChemAtom` superclass call from `super({ type: "chem" }, { command, mode: "math" })` to `super({ type: "chem", command, mode: "math" })`. `Atom` accepts one options object, so the original second argument was ignored and Undo/Redo snapshots lost the `\\ce` or `\\pu` command. This correction preserves the command through MathLive's normal atom serialization and restores chemistry and units correctly after Undo/Redo. It does not change mhchem's parsing implementation.

Both replacements assert the upstream version and exact, unique replacement sentinels before applying the changes. No `node_modules` files are changed. These modifications are applied only to this plugin's bundled copy of MathLive.
