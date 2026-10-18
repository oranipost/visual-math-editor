import { build } from "esbuild";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import path from "node:path";

await mkdir("dist", { recursive: true });
const offlineMathLive = {
  name: "offline-mathlive-source-location",
  setup(builder) {
    builder.onLoad({ filter: /[\\/]mathlive[\\/]mathlive(?:\.min)?\.mjs$/ }, async args => {
      const folder = path.dirname(args.path);
      const pkg = JSON.parse(await readFile(path.join(folder, "package.json"), "utf8"));
      if (pkg.version !== "0.111.1") throw new Error("Recheck the offline MathLive patch before upgrading");
      const original = await readFile(path.join(folder, "mathlive.mjs"), "utf8");
      const sentinel = " || getFileUrl();";
      if (original.split(sentinel).length !== 2) throw new Error("MathLive source location initializer changed");
      // Obsidian evaluates plugins with a plugin: sourceURL. Upstream's eager
      // stack-based URL detector logs errors there, even with local fonts.
      // Embedded assets never use this fallback; avoid stack introspection.
      let contents = original.replace(sentinel, ' || globalThis.document?.baseURI || "about:blank";');
      const chemConstructor = 'super({ type: "chem" }, { command, mode: "math" });';
      if (contents.split(chemConstructor).length !== 2) throw new Error("MathLive chemistry constructor changed; recheck Undo/Redo serialization");
      // Atom accepts one options object. Upstream passes command in an ignored
      // second argument, so undo snapshots omit ce/pu and restore undefined{...}.
      // Preserve command in the normal Atom constructor/JSON path for both kinds.
      contents = contents.replace(chemConstructor, 'super({ type: "chem", command, mode: "math" });');
      return { contents, loader: "js", resolveDir: folder };
    });
  },
};
await build({
  entryPoints: ["src/main.ts"], outfile: "dist/main.js", bundle: true,
  platform: "browser", format: "cjs", target: "es2022", minify: true,
  conditions: ["browser", "production"],
  external: ["obsidian", "electron", "@codemirror/view", "@codemirror/state", "@codemirror/language"],
  legalComments: "eof", sourcemap: false,
  plugins: [offlineMathLive],
});
let fonts = await readFile("node_modules/mathlive/mathlive-fonts.css", "utf8");
const files = [...fonts.matchAll(/url\((fonts\/[^)]+)\)/g)];
for (const match of files) {
  const data = await readFile(path.join("node_modules/mathlive", match[1]));
  fonts = fonts.replace(match[0], `url(data:font/woff2;base64,${data.toString("base64")})`);
}
await writeFile("dist/styles.css", `${fonts}\n${await readFile("styles.css", "utf8")}`);
await copyFile("manifest.json", "dist/manifest.json");
await copyFile("node_modules/mathlive/LICENSE.txt", "dist/MATHLIVE-LICENSE.txt");
await copyFile("LICENSE", "dist/LICENSE");
await copyFile("THIRD-PARTY-NOTICES.md", "dist/THIRD-PARTY-NOTICES.md");
await copyFile("KATEX-FONTS-LICENSE.txt", "dist/KATEX-FONTS-LICENSE.txt");
await copyFile("MHCHEM-LICENSE.txt", "dist/MHCHEM-LICENSE.txt");
await copyFile("CONVERT-LICENSE.txt", "dist/CONVERT-LICENSE.txt");
if (process.argv.includes("--preview")) {
  await build({ entryPoints: ["dev/preview.ts"], outfile: "dist/preview.js", bundle: true, platform: "browser", format: "iife", conditions: ["browser", "production"], target: "es2022", plugins: [offlineMathLive] });
  await copyFile("dev/index.html", "dist/index.html");
}
console.log("Built local plugin with embedded fonts: dist/");
