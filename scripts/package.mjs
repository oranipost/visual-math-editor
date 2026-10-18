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
const docs = ["README.md", "README.zh-CN.md", "README.en.md", "LANGUAGE-SUPPORT.md", "MVP.md", "TEST-REPORT.md", "LICENSE", "KATEX-FONTS-LICENSE.txt", "MHCHEM-LICENSE.txt", "CONVERT-LICENSE.txt", "THIRD-PARTY-NOTICES.md", "CONTRIBUTING.md", "SECURITY.md", "CHANGELOG.md", "RELEASING.md", "docs"];
const sourceInputs = [...docs, "MATHLIVE-LICENSE.txt", ".github", "src", "scripts", "dev", "tests", "ELEMENT-DATA-SOURCES.json", "package.json", "package-lock.json", "tsconfig.json", "manifest.json", "versions.json", "styles.css", ".gitignore"];
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
