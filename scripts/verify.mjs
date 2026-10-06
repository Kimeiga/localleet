// Verifies every problem: reference solution passes all tests, starter code
// compiles, required fields are present. Usage: node scripts/verify.mjs [id...]
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { problems, flattenTests } from "../problems/index.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const harness = path.join(root, "py", "harness.py");
const only = process.argv.slice(2);

function runPy(code, tests) {
  const r = spawnSync("python3", ["-I", harness], {
    input: JSON.stringify({ code, tests, budget: 60 }),
    encoding: "utf8",
    timeout: 120_000,
  });
  if (r.status !== 0) throw new Error(r.stderr || "python failed");
  return JSON.parse(r.stdout);
}

const ids = new Set();
let failures = 0;
for (const p of problems) {
  if (only.length && !only.includes(p.id)) continue;
  const errs = [];
  for (const f of ["id", "title", "difficulty", "topic", "starter"]) if (!p[f]) errs.push(`missing ${f}`);
  if (ids.has(p.id)) errs.push("duplicate id");
  ids.add(p.id);
  if (!["Easy", "Medium", "Hard"].includes(p.difficulty)) errs.push("bad difficulty");
  const tests = flattenTests(p);
  if (!p.playground) {
    if (!p.solution) errs.push("missing solution");
    if (!p.parts && !p.prompt) errs.push("missing prompt");
    if (tests.length < 3) errs.push(`only ${tests.length} tests`);
    const hints = p.parts ? p.parts.flatMap((x) => x.hints || []) : p.hints || [];
    if (hints.length < 2) errs.push("needs >= 2 hints");
    if (p.solution) {
      const res = runPy(p.solution, tests);
      if (res.compile_error) errs.push("solution error:\n" + res.compile_error);
      for (const t of res.tests) {
        if (!t.pass) errs.push(`solution FAILS ${t.name}: expected ${t.expected} got ${t.actual} ${t.error || ""}`);
      }
    }
    const st = runPy(p.starter, tests);
    if (st.compile_error) errs.push("starter does not run:\n" + st.compile_error);
    const starterPasses = st.tests.filter((t) => t.pass).length;
    if (starterPasses === st.tests.length) errs.push("starter code passes all tests (tests too weak?)");
  }
  if (errs.length) {
    failures++;
    console.log(`✗ ${p.id}\n  ${errs.join("\n  ")}`);
  } else {
    console.log(`✓ ${p.id} (${tests.length} tests)`);
  }
}
console.log(failures ? `\n${failures} problem(s) with issues` : "\nall good");
process.exit(failures ? 1 : 0);
