// Copies / bundles third-party code into vendor/ so the site is fully static
// and works offline. Run after `npm install`: `npm run vendor`.
import { build } from "esbuild";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const nm = (p) => path.join(root, "node_modules", p);
const out = (p) => path.join(root, "vendor", p);

rmSync(out(""), { recursive: true, force: true });
mkdirSync(out("pyodide"), { recursive: true });
mkdirSync(out("wllama"), { recursive: true });

// Pyodide core (CPython 3.14 compiled to WebAssembly). Only the stdlib is used.
for (const f of ["pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"]) {
  cpSync(nm(`pyodide/${f}`), out(`pyodide/${f}`));
}

// wllama (llama.cpp → wasm): CPU fallback when WebGPU isn't available.
cpSync(nm("@wllama/wllama/esm/wasm/wllama.wasm"), out("wllama/wllama.wasm"));
// Safari has no JSPI / Memory64, so wllama needs its "compat" build there.
// Ship it locally instead of letting wllama fetch it from a CDN.
mkdirSync(out("wllama/compat"), { recursive: true });
cpSync(nm("@wllama/wllama-compat/wasm/wllama.js"), out("wllama/compat/wllama.js"));
cpSync(nm("@wllama/wllama-compat/wasm/wllama.wasm"), out("wllama/compat/wllama.wasm"));

const common = { bundle: true, format: "esm", minify: true, legalComments: "none", logLevel: "warning" };
await build({ ...common, entryPoints: [nm("@wllama/wllama/esm/index.js")], outfile: out("wllama/wllama.js") });
await build({ ...common, entryPoints: [nm("@mlc-ai/web-llm/lib/index.js")], outfile: out("web-llm.js") });

// CodeMirror 6 + marked, from small entry files.
const tmp = path.join(root, "node_modules", ".vendor-entry");
mkdirSync(tmp, { recursive: true });
writeFileSync(path.join(tmp, "cm.js"), `
export { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } from "@codemirror/view";
export { EditorState, Compartment } from "@codemirror/state";
export { defaultKeymap, history, historyKeymap, indentWithTab, indentMore, indentLess, undo, redo, toggleComment } from "@codemirror/commands";
export { indentUnit, bracketMatching, syntaxHighlighting, defaultHighlightStyle, indentOnInput, foldGutter } from "@codemirror/language";
export { python } from "@codemirror/lang-python";
export { oneDark } from "@codemirror/theme-one-dark";
export { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
`);
writeFileSync(path.join(tmp, "marked.js"), `export { marked } from "marked";\n`);
await build({ ...common, entryPoints: [path.join(tmp, "cm.js")], outfile: out("codemirror.js"), nodePaths: [nm("")] });
await build({ ...common, entryPoints: [path.join(tmp, "marked.js")], outfile: out("marked.js"), nodePaths: [nm("")] });
rmSync(tmp, { recursive: true, force: true });
console.log("vendor/ ready");
