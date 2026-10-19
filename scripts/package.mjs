import { cp, lstat, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const manifestText = await readFile("manifest.json", "utf8");
const manifest = JSON.parse(manifestText);
const version = manifest.version;
if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) throw new Error("Release version must use x.y.z");
const pkg = JSON.parse(await readFile("package.json", "utf8"));
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
const versions = JSON.parse(await readFile("versions.json", "utf8"));
if (pkg.version !== version || lock.version !== version || lock.packages?.[""]?.version !== version) {
  throw new Error("Release versions disagree: manifest, package and lockfile must match");
}
if (versions[version] !== manifest.minAppVersion) throw new Error("versions.json must map this version to minAppVersion");
if (await readFile("dist/manifest.json", "utf8") !== manifestText) {
  throw new Error("Built manifest is stale; run npm run check before packaging");
}
for (const file of ["main.js", "styles.css"]) {
  if (!(await readFile(path.join("dist", file))).byteLength) throw new Error(`Missing build content: ${file}`);
}
const output = path.resolve(process.argv[2] ?? "release");
const stage = path.resolve(".packaging");
if (output === stage || output.startsWith(stage + path.sep)) throw new Error("Package output must be outside the staging directory");
const docs = ["README.md", "README.zh-CN.md", "README.en.md", "LANGUAGE-SUPPORT.md", "MVP.md", "TEST-REPORT.md", "LICENSE", "LICENSING.md", "KATEX-FONTS-LICENSE.txt", "MHCHEM-LICENSE.txt", "CONVERT-LICENSE.txt", "THIRD-PARTY-NOTICES.md", "CONTRIBUTING.md", "SECURITY.md", "CHANGELOG.md", "RELEASING.md", "docs"];
const sourceInputs = [...docs, "MATHLIVE-LICENSE.txt", "third-party-sources", ".github", "src", "scripts", "dev", "tests", "ELEMENT-DATA-SOURCES.json", "package.json", "package-lock.json", "tsconfig.json", "manifest.json", "versions.json", "styles.css", ".gitignore"];
async function checkSourceInput(file) {
  const info = await lstat(file);
  if (info.isSymbolicLink()) throw new Error(`Source package refuses symbolic link: ${file}`);
  if (/(^|\/)(?:node_modules|\.git|\.obsidian|work|outputs|dist|release|data\.json|\.env(?:\..*)?)$/.test(file.split(path.sep).join("/"))) {
    throw new Error(`Private or generated source input: ${file}`);
  }
  if (info.isDirectory()) {
    for (const child of await readdir(file)) await checkSourceInput(path.join(file, child));
  } else if (!info.isFile()) throw new Error(`Source package requires regular files: ${file}`);
}
for (const file of sourceInputs) await checkSourceInput(file);
await checkDependencySources();

async function checkDependencySources() {
  if (pkg.license !== "SEE LICENSE IN LICENSING.md" || lock.packages?.[""]?.license !== pkg.license) {
    throw new Error("Project license metadata must point to LICENSING.md in package and lockfile");
  }
  const folder = "third-party-sources";
  const records = JSON.parse(await readFile(path.join(folder, "sources.json"), "utf8")).archives;
  const dependencies = new Map(Object.entries(pkg.dependencies ?? {}));
  if (!Array.isArray(records) || records.length !== dependencies.size) {
    throw new Error("Bundled dependency source records must cover the pinned runtime dependencies");
  }
  const sums = [];
  const files = new Set();
  for (const record of records) {
    const name = record.package;
    const dependency = lock.packages?.[`node_modules/${name}`];
    if (!dependencies.has(name) || dependencies.get(name) !== record.version || dependency?.version !== record.version) {
      throw new Error(`Dependency source version disagrees with package or lockfile: ${name}`);
    }
    dependencies.delete(name);
    if (!/^[a-f0-9]{40}$/.test(record.sourceCommit ?? "") || !record.sourceArchiveUrl?.endsWith(`/tar.gz/${record.sourceCommit}`)) {
      throw new Error(`Dependency source must identify a fixed source commit: ${name}`);
    }
    if (record.npmArchiveUrl !== dependency.resolved || record.npmIntegrity !== dependency.integrity) {
      throw new Error(`Dependency distribution provenance disagrees with lockfile: ${name}`);
    }
    for (const [fileKey, hashKey] of [["sourceArchiveFile", "sourceArchiveSha256"], ["npmArchiveFile", "npmArchiveSha256"]]) {
      const file = record[fileKey];
      if (typeof file !== "string" || !/^[a-z0-9][a-z0-9.-]*\.(?:tar\.gz|tgz)$/.test(file) || files.has(file)) {
        throw new Error(`Invalid or repeated dependency source archive name: ${name}`);
      }
      files.add(file);
      const bytes = await readFile(path.join(folder, file));
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      if (!/^[a-f0-9]{64}$/.test(record[hashKey] ?? "") || sha256 !== record[hashKey]) {
        throw new Error(`Dependency source archive checksum mismatch: ${file}`);
      }
      if (fileKey === "npmArchiveFile" && `sha512-${createHash("sha512").update(bytes).digest("base64")}` !== record.npmIntegrity) {
        throw new Error(`Dependency npm archive integrity mismatch: ${file}`);
      }
      sums.push(`${sha256}  ${file}`);
    }
    const source = path.join(folder, record.sourceArchiveFile);
    const listing = spawnSync("tar", ["-tzf", source], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
    const prefix = `${name}-${record.sourceCommit}/`;
    const entries = listing.stdout?.split("\n") ?? [];
    if (listing.status !== 0 || !entries.some(file => file.startsWith(`${prefix}src/`) && /\.(?:ts|tsx|js)$/.test(file)) || !entries.some(file => file.startsWith(prefix) && /^license/i.test(path.basename(file)))) {
      throw new Error(`Dependency preferred source or license is missing from archive: ${name}`);
    }
    const sourcePackage = spawnSync("tar", ["-xOf", source, `${prefix}package.json`], { encoding: "utf8" });
    if (sourcePackage.status !== 0 || JSON.parse(sourcePackage.stdout).version !== record.version) {
      throw new Error(`Dependency source package version mismatch: ${name}`);
    }
  }
  if (await readFile(path.join(folder, "SHA256SUMS.txt"), "utf8") !== sums.join("\n") + "\n") {
    throw new Error("Dependency source checksum manifest disagrees with source records");
  }
}

await mkdir(output, { recursive: true });
await rm(stage, { recursive: true, force: true });
await mkdir(path.join(stage, "binary", "visual-math-editor"), { recursive: true });
await mkdir(path.join(stage, "source", "visual-math-editor-source"), { recursive: true });
for (const file of ["main.js", "manifest.json", "styles.css", "MATHLIVE-LICENSE.txt"]) {
  await cp(path.join("dist", file), path.join(stage, "binary", "visual-math-editor", file));
}
for (const file of docs) await cp(file, path.join(stage, "binary", "visual-math-editor", file), { recursive: true });
for (const file of sourceInputs) {
  await cp(file, path.join(stage, "source", "visual-math-editor-source", file), { recursive: true });
}
const checksums = [];
for (const [folder, name] of [["binary", `visual-math-editor-${version}.zip`], ["source", `visual-math-editor-source-${version}.zip`]]) {
  const destination = path.join(output, name);
  // zip updates existing archives in place, retaining removed entries. Recreate
  // this generated release file so its contents match the current staging tree.
  await rm(destination, { force: true });
  const result = spawnSync("zip", ["-r", "-q", destination, "."], { cwd: path.join(stage, folder), stdio: "inherit" });
  if (result.status !== 0) throw new Error("ZIP packaging failed");
  checksums.push(`${createHash("sha256").update(await readFile(destination)).digest("hex")}  ${name}`);
}
await writeFile(path.join(output, "SHA256SUMS.txt"), checksums.join("\n") + "\n");
console.log(`Packaged installer and source ${version} in ${output}`);
await rm(stage, { recursive: true, force: true });
