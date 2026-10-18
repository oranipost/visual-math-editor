import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript" };
http.createServer(async (req, res) => {
  const name = req.url?.split("?")[0] === "/" ? "index.html" : req.url?.split("?")[0].slice(1);
  if (!name || !["index.html", "styles.css", "preview.js"].includes(name)) { res.writeHead(404); res.end(); return; }
  try { res.setHeader("Content-Type", types[path.extname(name)] ?? "application/octet-stream"); res.setHeader("Cache-Control", "no-store"); res.end(await readFile(path.join("dist", name))); }
  catch { res.writeHead(404); res.end(); }
}).listen(8471, "127.0.0.1", () => console.log("Local component test: http://127.0.0.1:8471"));
