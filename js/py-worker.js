// Module worker that owns a Pyodide (CPython → WebAssembly) instance.
// Running user code here keeps the UI responsive, and an infinite loop can be
// stopped by terminating the worker (see runner.js).
import { loadPyodide } from "../vendor/pyodide/pyodide.mjs";

let pyodide;
let harness;

async function init() {
  pyodide = await loadPyodide({ indexURL: new URL("../vendor/pyodide/", import.meta.url).href });
  const src = await (await fetch(new URL("../py/harness.py", import.meta.url))).text();
  pyodide.FS.writeFile("/home/pyodide/localleet_harness.py", src);
  pyodide.runPython("import sys; sys.path.insert(0, '/home/pyodide')");
  harness = pyodide.pyimport("localleet_harness");
  const version = pyodide.runPython("import sys; sys.version.split()[0]");
  postMessage({ type: "ready", version });
}

const ready = init().catch((e) => postMessage({ type: "fatal", error: String(e) }));

onmessage = async ({ data }) => {
  await ready;
  const { id, kind, code, tests } = data;
  try {
    const out = kind === "plain"
      ? harness.run_plain(code)
      : harness.run_json(code, JSON.stringify(tests), 12);
    postMessage({ type: "result", id, result: JSON.parse(out) });
  } catch (e) {
    // A fatal error (e.g. the WebAssembly stack overflowed while freeing a very
    // deep structure) leaves Pyodide unusable, so ask for a restart.
    const fatal = !!e?.pyodide_fatal_error || /fatal|Maximum call stack/i.test(String(e));
    const msg = fatal
      ? `Python crashed: ${String(e).split("\n")[0]}\nThis usually means very deep recursion or a very long chain of linked objects. Python has been restarted.`
      : String(e);
    postMessage({ type: "result", id, fatal, result: { compile_error: msg, stdout: "", tests: [] } });
  }
};
