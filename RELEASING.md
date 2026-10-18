# GitHub and release preparation

Repository: [oranipost/visual-math-editor](https://github.com/oranipost/visual-math-editor). Version **0.6.2** is a desktop MVP, described as **Public beta** in its release title and notes. The planned first release is an ordinary GitHub release, with the latest-release designation, rather than a GitHub pre-release. That distribution setting does not establish support for untested platforms or community-directory approval. Verify the actual release and workflow results before reporting them as published or passed.

## Before the first push

1. Confirm the owner, repository name and maintainer identity against `manifest.json`, `LICENSE`, README links and repository settings. The maintainer is Dongfang Wang (`oranipost`).
2. Inspect the exact staged files. `.gitignore` excludes local research, dependencies, generated builds, settings and vault directories, but already tracked files must still be reviewed.
3. Review `README.md`, `MVP.md`, `TEST-REPORT.md`, third-party notices and the element-data provenance. Confirm every feature, test claim and compatibility claim against the current build.
4. Decide the supported minimum Obsidian version from evidence. The current minimum is **1.14.4**, the version tested natively on macOS. It does not establish Windows/Linux or newer-version coverage.
5. Enable GitHub private vulnerability reporting before accepting security reports. Require the **Check and package** workflow for pull requests after its first successful hosted run.

The local source ZIP deliberately contains no Git history, remote URL, private vault or application settings. It can be extracted into a clean repository. Do not copy the parent task directory into GitHub.

## Build and review a version

1. Update `manifest.json`, `package.json` and the root package entries in `package-lock.json` together. Add the version/minimum mapping in `versions.json` when needed, and finalize `CHANGELOG.md`.
2. Run `npm ci`, `npm run check`, browser component checks and the relevant native Obsidian flows in a disposable vault. Record actual results and untested platforms.
3. Run `npm run package`. Check the installation/source archives and `release/SHA256SUMS.txt`. Install from the generated archive and verify its three runtime files match the build.
4. After reviewing and committing the source, create and push a tag that matches the manifest **exactly**, such as `0.6.2`, without a `v` prefix.
5. Run **Prepare draft release** manually with that existing tag. It rebuilds and tests the tagged commit, then creates a **draft release** titled **Public beta**, containing the archives, checksums, individual runtime files and license notices. The workflow does not set the pre-release flag. It fails rather than updating an existing release.
6. Review the draft assets and release notes before explicitly publishing. For the first 0.6.2 public beta, publish as an ordinary release and mark it **latest** so the standard latest-release download and beta-install tools can discover it. Keep **Public beta**, desktop MVP scope and untested-platform limits visible in the title/notes. Publishing a GitHub release and joining the Obsidian community directory are separate steps.

CI checks logic/types/build and verifies package inputs. It does not launch Obsidian, perform native integration tests, publish releases on push, or certify support for every version.

## Obsidian distribution

Obsidian's updater expects `main.js`, `manifest.json` and, when used, `styles.css` as individual release assets, with a tag identical to the manifest version. The full installation ZIP includes third-party license files and is the documented manual installation path. Retain the notices in every redistributed archive.

Use [docs/COMMUNITY-SUBMISSION.md](docs/COMMUNITY-SUBMISSION.md) for the prepared project metadata. Follow the current official [submission guide](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin), [manifest reference](https://docs.obsidian.md/Reference/Manifest) and [versions reference](https://docs.obsidian.md/Reference/Versions) before community submission. Preparing this repository does not create a listing or establish name/id availability.
