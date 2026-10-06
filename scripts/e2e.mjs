// End-to-end check in headless Chromium: the page loads, Pyodide starts, every
// reference solution passes in the browser's Python, and the UI flow works.
// Usage: node scripts/serve.mjs 8080 & node scripts/e2e.mjs [baseURL]
import { chromium } from "playwright";

const base = process.argv[2] || "http://localhost:8080/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto(base);
await page.waitForFunction(() => document.querySelector("#py-pill")?.textContent.startsWith("Python 3"), null, { timeout: 90_000 });
console.log("pyodide:", await page.textContent("#py-pill"));

// 1. Every reference solution in the browser runtime.
const failures = await page.evaluate(async () => {
  const { problems, flattenTests } = await import("./problems/index.js");
  const runner = await import("./js/runner.js");
  const bad = [];
  for (const p of problems) {
    if (p.playground) continue;
    const res = await runner.runTests(p.solution, flattenTests(p));
    const failed = res.compile_error ? [res.compile_error] : res.tests.filter((t) => !t.pass).map((t) => `${t.name}: ${t.error || t.actual}`);
    if (res.timeout) failed.push("timeout");
    if (failed.length) bad.push({ id: p.id, failed });
  }
  return bad;
});
console.log(failures.length ? `browser solution failures: ${JSON.stringify(failures, null, 2)}` : "all solutions pass in Pyodide");

// 2. UI flow: open Two Sum, type a solution, run tests.
await page.click('button.prow[data-id="two-sum"]');
await page.click('#tabs button[data-tab="code"]');
await page.locator(".cm-content").click();
await page.keyboard.press("Control+A");
await page.keyboard.press("Delete");
await page.keyboard.insertText("def two_sum(nums, target):\n    seen = {}\n    for i, x in enumerate(nums):\n        if target - x in seen:\n            return [seen[target - x], i]\n        seen[x] = i\n");
await page.click("#run-btn");
await page.waitForSelector("#results .summary", { timeout: 30_000 });
console.log("two-sum UI run:", (await page.textContent("#results .summary")).trim());
if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/results.png` });

// 3. Infinite loop is stopped.
await page.click('#tabs button[data-tab="code"]');
await page.locator(".cm-content").click();
await page.keyboard.press("Control+A");
await page.keyboard.press("Delete");
await page.keyboard.insertText("def two_sum(nums, target):\n    while True:\n        pass\n");
const t0 = Date.now();
await page.click("#run-btn");
await page.waitForFunction(() => /Time limit/.test(document.querySelector("#results").textContent), null, { timeout: 60_000 });
console.log(`infinite loop stopped after ${Math.round((Date.now() - t0) / 1000)}s`);

// 4. Multi-part unlock.
await page.goto(base + "#/p/chalk-rain-flow");
await page.waitForSelector(".part");
const lockedBefore = await page.locator(".part.locked").count();
const sol = await page.evaluate(async () => (await import("./problems/index.js")).problems.find((p) => p.id === "chalk-rain-flow").solution);
await page.click('#tabs button[data-tab="code"]');
await page.locator(".cm-content").click();
await page.keyboard.press("Control+A");
await page.keyboard.press("Delete");
await page.keyboard.insertText(sol);
await page.click("#run-btn");
await page.waitForSelector("#results .summary", { timeout: 60_000 });
await page.click('#tabs button[data-tab="problem"]');
const lockedAfter = await page.locator(".part.locked").count();
console.log(`rain-flow locked parts: ${lockedBefore} -> ${lockedAfter}`);

console.log(errors.length ? `page errors:\n${errors.join("\n")}` : "no page errors");
await browser.close();
process.exit(failures.length || errors.length ? 1 : 0);
