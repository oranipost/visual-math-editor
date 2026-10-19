# GitHub and release preparation

Repository: [oranipost/visual-math-editor](https://github.com/oranipost/visual-math-editor). **0.7.0 Desktop public beta is public and marked latest**. The main/tag Node.js 22/24 CI and [release workflow 39192793031](https://github.com/oranipost/visual-math-editor/actions/runs/39192793031) succeeded. All six public release assets passed strict provenance verification. The official management review for **0.7.0 / c21a7ed** is **Completed**; the public directory shows **Health Excellent / Review Passed**, version **0.7.0** and license **GPL-3.0**, without Error or Warning entries. Recommendations for user-initiated clipboard access and extra manual-download archives remain.

The existing Personal vault was upgraded from the release ZIP with settings and existing demo-note bytes preserved. Native About displayed 0.7.0; Hybrid `y=x/2` and its linked graph were opened without saving a new graph during that upgrade check. This records a manual upgrade, not a native community-directory installation. Exact evidence and remaining platform limits are in [TEST-REPORT.md](TEST-REPORT.md).

Earlier **0.6.2–0.6.5** releases are retained as recoverable drafts; the anonymous public release API currently lists 0.7.0 only. Their tags, history and pre-existing MIT rights remain. Historical verification observations below describe their original release checks; draft status does not revoke the original grants. Public betas use ordinary GitHub releases with the latest designation, while untested platforms remain outside verified scope.

## License transition in 0.7.0

The new 0.7.0 project code and release as a whole use **GNU GPL version 3 only with the Obsidian linking exception**. Include the complete current `LICENSE`, `LICENSING.md`, copyright and transition notice, retained historical MIT project notice and unchanged third-party MIT/Apache 2.0 notices in every distribution. The runtime banner must identify the current GPL project license without removing dependency attribution. Keep the package license field (`SEE LICENSE IN LICENSING.md`) and root lockfile entry consistent. The custom exception is an additional permission under GPL section 7, not a built-in SPDX exception identifier. The canonical GPL document is copied verbatim; do not edit its appendix or replace its text with a short summary.

Publish the matching complete, machine-readable Corresponding Source with the compiled release, including the source and scripts needed to modify, build and install it and the applicable dependency source/provenance. Keep source accessible with the release; a binary-only release or a link to a different revision is insufficient. Check the source archive against the exact tagged build. GPL allows commercial distribution while retaining its applicable source and downstream licensing requirements.

Do not rewrite a historical tag or replace 0.6.5/earlier MIT artifacts to apply the new license. Their existing MIT grant remains valid. The [dated transition and original MIT notice](THIRD-PARTY-NOTICES.md#project-license-and-transition--2026-10-18) distinguish old material from new GPL-covered additions. Obsidian's [developer policies](https://docs.obsidian.md/community-directory/developer-policies) require an indicated project license and compliance with upstream licenses; an automated directory scan is not legal certification.

## Before publishing

1. Confirm the owner, repository name and maintainer identity against `manifest.json`, `LICENSE`, README links and repository settings. The maintainer is Dongfang Wang (`oranipost`).
2. Inspect the exact staged files. `.gitignore` excludes local research, dependencies, generated builds, settings and vault directories, but already tracked files must still be reviewed.
3. Review `README.md`, `MVP.md`, `TEST-REPORT.md`, third-party notices and the element-data provenance. Confirm every feature, test claim and compatibility claim against the current build.
4. Decide the supported minimum Obsidian version from evidence. The current minimum is **1.14.4**, the version tested natively on macOS. It does not establish Windows/Linux or newer-version coverage.
5. Confirm support links: [GitHub Issues](https://github.com/oranipost/visual-math-editor/issues), maintainer [oranipost](https://github.com/oranipost), and private email [oranipost@outlook.com](mailto:oranipost@outlook.com). Enable private vulnerability reporting when available. Review the **Check and package** workflow results for the exact commit.

The source ZIP excludes Git metadata/history, private vaults and application settings. It includes public upstream provenance URLs and the fixed preferred-source archives in `third-party-sources/`. Publish only reviewed project files and unchanged, verified upstream source inputs.

## Build and review a version

1. Choose a new version for each public update; never move an existing release tag or replace a published version's program files. Update `manifest.json`, `package.json` and the root package entries in `package-lock.json` together. Add the version/minimum mapping in `versions.json` for every release, as required by this project's packaging checks, and finalize `CHANGELOG.md`. The official compatibility table only requires an update when the minimum app version changes; this repository keeps a mapping for every release.
2. Run `npm ci`, `npm run check`, browser component checks and the relevant native Obsidian flows in a disposable vault. Record actual results and untested platforms.
3. Run `npm run package`. Check the installation/source archives and `release/SHA256SUMS.txt`. Both archives must retain `LICENSE` and `LICENSING.md`; the source archive must additionally retain all four verified archives and their manifest in `third-party-sources/`, while the installation ZIP excludes that source-only folder. Install from the generated archive and verify its three runtime files match the build.
4. After reviewing and committing the source, create and push a tag that matches the manifest **exactly**, such as `0.7.0`, without a `v` prefix.
5. Run **Prepare draft release** manually. Under **Use workflow from**, choose that existing version tag and enter the identical value in **tag**. For example, `gh workflow run draft-release.yml --ref 0.7.0 -f tag=0.7.0` runs the prepared `0.7.0` tag once it exists; use the actual reviewed version. The tag must contain this workflow. Branch runs are rejected so the signed provenance identifies the same commit that is checked out and built. The workflow rebuilds/tests/packages that exact commit, creates provenance for the three runtime files, both ZIPs and their checksum file, then creates a **draft release** titled **Public beta**. It does not set the pre-release flag and fails rather than updating an existing release.
6. Review the draft assets, attestation result and release notes before explicitly publishing as an ordinary release and marking it **latest**. Keep **Public beta**, desktop MVP scope and untested-platform limits visible in the title/notes. Download the public assets, verify ZIP checksums and verify their provenance as described below. Publishing a GitHub release and joining the Obsidian community directory are separate steps.

CI checks logic/types/build and verifies package inputs. It does not launch Obsidian, perform native integration tests, publish releases on push, or certify support for every version.

## Obsidian distribution

Obsidian's updater expects `main.js`, `manifest.json` and, when used, `styles.css` as individual release assets, with a tag identical to the manifest version. Complete required notices are already embedded in `main.js` and `styles.css`; the runtime-license test checks the built files. The full installation ZIP also includes `LICENSE`, `LICENSING.md` and separate third-party license files and is the documented manual installation path. Retain the notices in every redistributed archive.

New releases attach only the three runtime files, the manual installation/source ZIPs and `SHA256SUMS.txt`. Separate license attachments duplicate the notices in the runtime files and archives, so the workflow does not add them. A directory notice about unsupported extra files can still appear for the deliberate manual-download assets: the community installer ignores them and downloads the runtime files. Keep the installation ZIP available for manual installation and make that purpose explicit in release notes. Do not remove license text or an existing release's assets merely to hide an informational notice.

Only the initial directory entry needs a submission. After that, new releases are scanned for manifest, assets, source and build consistency; review errors still need to be resolved. Use the entry's **Check for new releases** or **Request review** action when needed. Do not report a new version as approved solely because GitHub published it. See the official [entry management guide](https://docs.obsidian.md/community-directory/manage-entry).

Users choose **Check for updates → Update** in Obsidian; community plugins do not update automatically. Updates replace program files rather than adding source-code patches or downloading a vault. Preserve user settings (`data.json`) and note formats. For this plugin, tell users to save drafts before updating and restart Obsidian afterwards to refresh MathLive. See the bilingual [updating guide](docs/UPDATING.md).

Use [docs/COMMUNITY-SUBMISSION.md](docs/COMMUNITY-SUBMISSION.md) for the prepared project metadata. Follow the current official [submission guide](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin), [manifest reference](https://docs.obsidian.md/Reference/Manifest) and [versions reference](https://docs.obsidian.md/Reference/Versions) before community submission. Preparing this repository does not create a listing or establish name/id availability.

## Release provenance

The draft workflow uses the official [GitHub attestation action](https://github.com/actions/attest), pinned to commit `1e69f48acb82d1966a394da916b4c1698aa569d6` (the verified `v4` ref when added). `actions/checkout` and `actions/setup-node` are also pinned to full commit hashes. Review upstream releases before changing any pin.

Only the manually dispatched release job has `contents: write` (create a draft), `id-token: write` (request the short-lived signing identity) and `attestations: write` (store provenance). Ordinary CI remains read-only. This binary-only flow does not push containers or create artifact storage records, so it does not request `packages` or `artifact-metadata` permissions. It uses the job's temporary token and requires no personal access token, signing key or stored secret. A maintainer must be able to run Actions; repository/organization restrictions may need an administrator to allow the pinned official action and these job permissions. Do not weaken restrictions or bypass a failed signing step silently. See [GitHub's binary provenance guide](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations).

After downloading a release into a separate review directory, check each runtime file and archive with GitHub CLI, for example:

```sh
gh attestation verify main.js --repo oranipost/visual-math-editor
gh attestation verify manifest.json --repo oranipost/visual-math-editor
gh attestation verify styles.css --repo oranipost/visual-math-editor
gh attestation verify visual-math-editor-0.7.0.zip --repo oranipost/visual-math-editor
```

Use the actual version and also verify the source ZIP and checksum file. Inspect the verification result's source commit and workflow identity against the reviewed tag; a successful signature alone does not certify that code is bug-free. Provenance applies to the exact bytes produced by that run. It does not claim byte-for-byte reproducible ZIPs across machines, and no attestation is claimed until the hosted job and downloaded-asset verification have actually passed. Do not retrofit a published release by rebuilding and overwriting its assets; use the next reviewed version.

For **0.6.5**, the [ordinary latest release](https://github.com/oranipost/visual-math-editor/releases/tag/0.6.5) is public and [hosted workflow 39180466984](https://github.com/oranipost/visual-math-editor/actions/runs/39180466984) succeeded. All six downloaded assets passed strict provenance verification against commit `c1338e7c2afd327d24702c9a746f90d721928aad`, `refs/tags/0.6.5` and the expected signing workflow, with self-hosted runners rejected. ZIP checksums, runtime bytes across independent assets/ZIP/local build/installation, source-archive private-file boundaries and an anonymous manifest download were verified. At that recorded check, the Obsidian directory scan had been queued and a final 0.6.5 review had not yet been recorded. This is a historical observation, not the current review status. See [TEST-REPORT.md](TEST-REPORT.md).

For **0.6.4**, [hosted workflow 39179067951](https://github.com/oranipost/visual-math-editor/actions/runs/39179067951) succeeded, the [ordinary latest release](https://github.com/oranipost/visual-math-editor/releases/tag/0.6.4) is public, and all six downloaded assets passed provenance verification against the exact source commit, version tag and signing workflow. ZIP checksums and delivered/installed runtime bytes also matched. These are release-verification results; the separate community-directory review is **Completed** as observed on **2026-10-19 UTC**, the public scorecard shows **Review Passed**, with no Error or Warning entries and only the clipboard-access and optional-download recommendations remaining. Native index availability remains a separate observation. See [TEST-REPORT.md](TEST-REPORT.md) for the evidence and limits.

## 简体中文

0.7.0 新增项目代码与发行版整体采用 **GPL 第 3 版加 Obsidian 链接例外**。分发时保留完整 GPL、含完整例外的 `LICENSING.md`、项目版权与迁移说明、历史 MIT 原文及第三方 MIT／Apache 2.0 声明，运行时文件中也要包含必要许可证。随编译程序提供与该标签一致、可修改和构建的完整对应源码及构建／安装脚本与适用依赖来源。不要将此变更追溯覆盖到 0.6.5 或更早的已发布标签和附件；旧版 MIT 许可保持有效。

每次公开更新使用新的版本号，同步 manifest、package/lock、`versions.json` 和发布说明。完成构建、测试、打包与实际验证后，创建与 manifest 完全相同的标签（例如 `0.7.0`，不加 `v`），准备草稿 Release，核对独立程序附件、安装/源码 ZIP 和校验值后再发布。不要反复覆盖同版本附件或移动已发布标签。

手动运行发布流程时，**Use workflow from** 和 **tag** 都选择相同的新版本标签，确保来源证明所记录的提交与实际构建一致。流程为三个程序文件、两个 ZIP 和校验文件生成 GitHub 来源证明，使用临时令牌，无需额外保存密钥；实际成功与否必须以托管流程和下载后的验证结果为准。自 0.6.4 起已完成这一发行和验证流程。独立许可证附件不再重复上传，但完整条款保留在程序文件和 ZIP 内。手动安装包仍然有用，即使目录继续提示额外附件也不代表安装错误。旧版附件保持原样，已发布标签与程序附件不覆盖。

首次目录提交后无需为每版新建条目，但目录会扫描新发行版，仍须处理审核错误。用户在 Obsidian 中手动检查并确认更新；程序文件被替换，设置与笔记保留。更新前先保存草稿，更新后重启本插件所在的 Obsidian 窗口以刷新 MathLive。手动安装、兼容版本表和维护流程见[更新机制](docs/UPDATING.md#简体中文)。
