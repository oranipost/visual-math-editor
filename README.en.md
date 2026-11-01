# Visual Math — English documentation

[English](README.md) · [简体中文](README.zh-CN.md) · [Español](README.es.md)

The complete English guide is the [repository home page](README.md).

[Visual Math 1.0.0 · Desktop release](https://github.com/oranipost/visual-math-editor/releases/tag/1.0.0) adds reviewed single-formula import, visual matrix and equation-system tools, set/sequence and advanced-math notation, and geometry models/spatial scenes. Custom formula keywords have been removed. These are editing and bounded drawing tools, not a general solver.

- [Download and install](README.md#download-and-install)
- [Import one formula](README.md#import-a-single-latex-formula)
- [Matrices, systems and notation](README.md#matrices-systems-sets-and-advanced-notation)
- [Geometry models](README.md#geometry-models-and-spatial-scenes)
- [Actual test results and limits](TEST-REPORT.md)
- [Installation details](docs/INSTALLATION.md#english)

Single-formula import is limited to **8,192 UTF-16 code units** of original input. Visual rendering has a separate **4,096 UTF-16 code unit** limit for formula contents. Longer valid formulas retain their full source with syntax checks and explicit source-only Apply/Save; they have no visual preview. Shortening to within the visual limit restores supported visual editing. These budgets do not guarantee responsiveness.

GitHub publication, community review and native integration tests are separate observations. Refer to the test report for the exact version/platform checked.
