// Writes the precache list + content hash into sw.js so each deploy gets a
// fresh cache and old ones are cleaned up. Run: npm run build
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function walk(dir) {
  return readdirSync(path.join(root, dir)).flatMap((name) => {
    const rel = path.posix.join(dir, name);
    return statSync(path.join(root, rel)).isDirectory() ? walk(rel) : [rel];
  });
}

// Core files needed to practice offline. The AI engines (vendor/web-llm.js,
// vendor/wllama/) are cached on first use instead: they're big and optional.
const files = [
  "./",
  "index.html",
  "manifest.webmanifest",
  ...walk("css"),
  ...walk("js"),
  ...walk("problems"),
  ...walk("py"),
  ...walk("icons"),
  "vendor/codemirror.js",
  "vendor/marked.js",
  ...walk("vendor/pyodide"),
];

const hash = createHash("sha256");
for (const f of files) if (f !== "./") hash.update(f).update(readFileSync(path.join(root, f)));
for (const f of walk("vendor")) hash.update(f).update(String(statSync(path.join(root, f)).size));
const version = hash.digest("hex").slice(0, 12);

const swPath = path.join(root, "sw.js");
let sw = readFileSync(swPath, "utf8");
sw = sw.replace(/const VERSION = .*;/, `const VERSION = ${JSON.stringify(version)};`);
sw = sw.replace(/const PRECACHE = \[[\s\S]*?\];/, `const PRECACHE = ${JSON.stringify(files, null, 2)};`);
writeFileSync(swPath, sw);
console.log(`sw.js: version ${version}, ${files.length} files precached`);
