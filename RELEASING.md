# GitHub and release preparation

Repository: [oranipost/visual-math-editor](https://github.com/oranipost/visual-math-editor). Version **0.6.4** is a desktop MVP, described as **Public beta** in its release title and notes. Public betas use ordinary GitHub releases with the latest-release designation so the standard download and update paths can find them. This does not establish support for untested platforms or community-directory approval. Verify the actual release and workflow results before reporting them as published or passed.

## Before publishing

1. Confirm the owner, repository name and maintainer identity against `manifest.json`, `LICENSE`, README links and repository settings. The maintainer is Dongfang Wang (`oranipost`).
2. Inspect the exact staged files. `.gitignore` excludes local research, dependencies, generated builds, settings and vault directories, but already tracked files must still be reviewed.
3. Review `README.md`, `MVP.md`, `TEST-REPORT.md`, third-party notices and the element-data provenance. Confirm every feature, test claim and compatibility claim against the current build.
4. Decide the supported minimum Obsidian version from evidence. The current minimum is **1.14.4**, the version tested natively on macOS. It does not establish Windows/Linux or newer-version coverage.
5. Confirm support links: [GitHub Issues](https://github.com/oranipost/visual-math-editor/issues), maintainer [oranipost](https://github.com/oranipost), and private email [oranipost@outlook.com](mailto:oranipost@outlook.com). Enable private vulnerability reporting when available. Review the **Check and package** workflow results for the exact commit.

The source ZIP contains no Git history, remote URL, private vault or application settings. Publish only the reviewed project files.

## Build and review a version

1. Choose a new version for each public update; never move an existing release tag or replace a published version's program files. Update `manifest.json`, `package.json` and the root package entries in `package-lock.json` together. Add the version/minimum mapping in `versions.json` for every release, as required by this project's packaging checks, and finalize `CHANGELOG.md`. The official compatibility table only requires an update when the minimum app version changes; this repository keeps a mapping for every release.
2. Run `npm ci`, `npm run check`, browser component checks and the relevant native Obsidian flows in a disposable vault. Record actual results and untested platforms.
3. Run `npm run package`. Check the installation/source archives and `release/SHA256SUMS.txt`. Install from the generated archive and verify its three runtime files match the build.
4. After reviewing and committing the source, create and push a tag that matches the manifest **exactly**, such as `0.6.4`, without a `v` prefix.
5. Run **Prepare draft release** manually. Under **Use workflow from**, choose that existing version tag and enter the identical value in **tag**. For example, `gh workflow run draft-release.yml --ref 0.6.4 -f tag=0.6.4` runs the prepared `0.6.4` tag once it exists; use the actual reviewed version. The tag must contain this workflow. Branch runs are rejected so the signed provenance identifies the same commit that is checked out and built. The workflow rebuilds/tests/packages that exact commit, creates provenance for the three runtime files, both ZIPs and their checksum file, then creates a **draft release** titled **Public beta**. It does not set the pre-release flag and fails rather than updating an existing release.
6. Review the draft assets, attestation result and release notes before explicitly publishing as an ordinary release and marking it **latest**. Keep **Public beta**, desktop MVP scope and untested-platform limits visible in the title/notes. Download the public assets, verify ZIP checksums and verify their provenance as described below. Publishing a GitHub release and joining the Obsidian community directory are separate steps.

CI checks logic/types/build and verifies package inputs. It does not launch Obsidian, perform native integration tests, publish releases on push, or certify support for every version.

## Obsidian distribution

Obsidian's updater expects `main.js`, `manifest.json` and, when used, `styles.css` as individual release assets, with a tag identical to the manifest version. Complete required notices are already embedded in `main.js` and `styles.css`; the runtime-license test checks the built files. The full installation ZIP also includes separate third-party license files and is the documented manual installation path. Retain the notices in every redistributed archive.

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
gh attestation verify visual-math-editor-0.6.4.zip --repo oranipost/visual-math-editor
```

Use the actual version and also verify the source ZIP and checksum file. Inspect the verification result's source commit and workflow identity against the reviewed tag; a successful signature alone does not certify that code is bug-free. Provenance applies to the exact bytes produced by that run. It does not claim byte-for-byte reproducible ZIPs across machines, and no attestation is claimed until the hosted job and downloaded-asset verification have actually passed. Do not retrofit a published release by rebuilding and overwriting its assets; use the next reviewed version.

For **0.6.4**, [hosted workflow 39179067951](https://github.com/oranipost/visual-math-editor/actions/runs/39179067951) succeeded, the [ordinary latest release](https://github.com/oranipost/visual-math-editor/releases/tag/0.6.4) is public, and all six downloaded assets passed provenance verification against the exact source commit, version tag and signing workflow. ZIP checksums and delivered/installed runtime bytes also matched. These are release-verification results; the separate community-directory review is **Pending** as observed on **2026-10-19 UTC**. See [TEST-REPORT.md](TEST-REPORT.md) for the evidence and limits.

## 简体中文

每次公开更新使用新的版本号，同步 manifest、package/lock、`versions.json` 和发布说明。完成构建、测试、打包与实际验证后，创建与 manifest 完全相同的标签（例如 `0.6.4`，不加 `v`），准备草稿 Release，核对独立程序附件、安装/源码 ZIP 和校验值后再发布。不要反复覆盖同版本附件或移动已发布标签。

手动运行发布流程时，**Use workflow from** 和 **tag** 都选择相同的新版本标签，确保来源证明所记录的提交与实际构建一致。流程为三个程序文件、两个 ZIP 和校验文件生成 GitHub 来源证明，使用临时令牌，无需额外保存密钥；实际成功与否必须以托管流程和下载后的验证结果为准。自 0.6.4 起已完成这一发行和验证流程。独立许可证附件不再重复上传，但完整条款保留在程序文件和 ZIP 内。手动安装包仍然有用，即使目录继续提示额外附件也不代表安装错误。旧版附件保持原样，已发布标签与程序附件不覆盖。

首次目录提交后无需为每版新建条目，但目录会扫描新发行版，仍须处理审核错误。用户在 Obsidian 中手动检查并确认更新；程序文件被替换，设置与笔记保留。更新前先保存草稿，更新后重启本插件所在的 Obsidian 窗口以刷新 MathLive。手动安装、兼容版本表和维护流程见[更新机制](docs/UPDATING.md#简体中文)。
