# GitHub and release preparation

Repository: [oranipost/visual-math-editor](https://github.com/oranipost/visual-math-editor). Version **0.6.3** is a desktop MVP, described as **Public beta** in its release title and notes. Public betas use ordinary GitHub releases with the latest-release designation so the standard download and update paths can find them. This does not establish support for untested platforms or community-directory approval. Verify the actual release and workflow results before reporting them as published or passed.

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
4. After reviewing and committing the source, create and push a tag that matches the manifest **exactly**, such as `0.6.3`, without a `v` prefix.
5. Run **Prepare draft release** manually with that existing tag. It rebuilds and tests the tagged commit, then creates a **draft release** titled **Public beta**, containing the archives, checksums, individual runtime files and license notices. The workflow does not set the pre-release flag. It fails rather than updating an existing release.
6. Review the draft assets and release notes before explicitly publishing as an ordinary release and marking it **latest**. Keep **Public beta**, desktop MVP scope and untested-platform limits visible in the title/notes. Download the public assets and verify their checksums. Publishing a GitHub release and joining the Obsidian community directory are separate steps.

CI checks logic/types/build and verifies package inputs. It does not launch Obsidian, perform native integration tests, publish releases on push, or certify support for every version.

## Obsidian distribution

Obsidian's updater expects `main.js`, `manifest.json` and, when used, `styles.css` as individual release assets, with a tag identical to the manifest version. The full installation ZIP includes third-party license files and is the documented manual installation path. Retain the notices in every redistributed archive.

Only the initial directory entry needs a submission. After that, new releases are scanned for manifest, assets, source and build consistency; review errors still need to be resolved. Use the entry's **Check for new releases** or **Request review** action when needed. Do not report a new version as approved solely because GitHub published it. See the official [entry management guide](https://docs.obsidian.md/community-directory/manage-entry).

Users choose **Check for updates → Update** in Obsidian; community plugins do not update automatically. Updates replace program files rather than adding source-code patches or downloading a vault. Preserve user settings (`data.json`) and note formats. For this plugin, tell users to save drafts before updating and restart Obsidian afterwards to refresh MathLive. See the bilingual [updating guide](docs/UPDATING.md).

Use [docs/COMMUNITY-SUBMISSION.md](docs/COMMUNITY-SUBMISSION.md) for the prepared project metadata. Follow the current official [submission guide](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin), [manifest reference](https://docs.obsidian.md/Reference/Manifest) and [versions reference](https://docs.obsidian.md/Reference/Versions) before community submission. Preparing this repository does not create a listing or establish name/id availability.

## 简体中文

每次公开更新使用新的版本号，同步 manifest、package/lock、`versions.json` 和发布说明。完成构建、测试、打包与实际验证后，创建与 manifest 完全相同的标签（例如 `0.6.3`，不加 `v`），准备草稿 Release，核对独立程序附件、安装/源码 ZIP 和校验值后再发布。不要反复覆盖同版本附件或移动已发布标签。

首次目录提交后无需为每版新建条目，但目录会扫描新发行版，仍须处理审核错误。用户在 Obsidian 中手动检查并确认更新；程序文件被替换，设置与笔记保留。更新前先保存草稿，更新后重启本插件所在的 Obsidian 窗口以刷新 MathLive。手动安装、兼容版本表和维护流程见[更新机制](docs/UPDATING.md#简体中文)。
