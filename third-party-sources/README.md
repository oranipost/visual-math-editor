# Bundled dependency source

This directory carries the preferred source for the two bundled runtime libraries and the exact npm distributions used by the plugin build. The upstream archives are kept unchanged, including their copyright, licenses, source, build configuration and scripts. They remain subject to their original terms; the plugin's GPL/Obsidian exception does not relicense their original material.

| Library | Version | Fixed source commit | Upstream terms |
| --- | --- | --- | --- |
| MathLive | 0.111.1 | `30ad20a7a47ea43a2f6915808023202c78f37742` | MIT; embedded mhchem retains Apache 2.0 |
| Convert | 8.0.2 | `a2c58fe0d4ed875a951e52f3d93dbf3162515a0e` | MIT |

Full original URLs, source/archive SHA-256 values and npm SHA-512 integrity values are in [sources.json](sources.json). The source archive package versions match the pinned npm versions. Both npm archives' SHA-512 values match the official registry metadata and this plugin's lockfile; SHA-1 also matched the registry at acquisition. MathLive's commit was identified by the official npm package's `gitHead`. Convert's `v8.0.2` tag and decoded npm provenance name the same commit. The upstream provenance signature was not independently verified, and a fresh upstream TypeScript-to-npm byte comparison was not performed.

The `*-source.tar.gz` files contain the upstream TypeScript/JavaScript preferred modification source. The `*-npm.tgz` files carry the corresponding published build inputs. A compiled npm bundle alone is not substituted for the upstream preferred source.

## Check the files

From this directory on macOS or Linux:

```sh
shasum -a 256 -c SHA256SUMS.txt
```

The checksum file covers the exact four archives. Verify its values against `sources.json` and the reviewed release as well; a checksum alone is not a digital signature or proof that a release is defect-free.

## Build Visual Math

From the enclosing plugin source folder, use Node.js 22 or 24:

```sh
npm ci
npm run check
npm run package
```

Dependency installation needs network access unless the required packages are already available locally. The lockfile fixes the runtime inputs. `scripts/build.mjs` applies the two asserted MathLive compatibility changes documented in [THIRD-PARTY-NOTICES.md](../THIRD-PARTY-NOTICES.md); it also bundles the libraries and embeds the font files. The unchanged published npm packages are included here to make the exact inputs available alongside the source, rather than relying only on an external registry.

## Modify and rebuild upstream source

Work in a separate directory. Extract the source archives, keeping their root folders:

```sh
mkdir unpacked
tar -xzf mathlive-0.111.1-source.tar.gz -C unpacked
tar -xzf convert-8.0.2-source.tar.gz -C unpacked
```

MathLive's source includes its `package-lock.json`, TypeScript sources, static assets and Bash build scripts. Its package requires Node.js 21 or newer and npm 10.5 or newer; use the exact archived contribution/build instructions. From its extracted root, `npm ci` installs the locked tools and runs the upstream prepare script. `npm run build -- production` selects its production build. Bash is required. This project has not separately executed that upstream rebuild.

Convert's source includes `pnpm-lock.yaml`, TypeScript, conversion-generation inputs and scripts. The archived package declares `pnpm@12.3.4` and Node.js 24. With that toolchain, run `pnpm install --frozen-lockfile`, then `pnpm run build`; the upstream Wireit configuration runs the needed generation and bundling stages. This project has not separately executed that upstream rebuild.

For a modified dependency, review its generated package output, install that output into a development copy of the plugin, and deliberately update the pin/lockfile and asserted patch checks as needed. Do not silently substitute modified dependencies for the published version in an existing release. Re-run the plugin's meaningful logic, browser and native tests, record what was actually verified, and publish a new version with the matching source and retained notices. See [RELEASING.md](../RELEASING.md) for the GPL Corresponding Source and distribution process.

## Scientific data and fonts

The element table is maintained in the plugin's own source; factual provenance is in `ELEMENT-DATA-SOURCES.json` and `THIRD-PARTY-NOTICES.md`. MathLive's source archive includes its static assets; font copyright and MIT terms remain in the distributed `KATEX-FONTS-LICENSE.txt`. The adapted mhchem parser is present in MathLive's source with its original Apache 2.0 attribution.
