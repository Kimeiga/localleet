// Offline check: visit once online, cut the network, reload, and use the app.
// With --ai it also downloads the CPU tutor model (wllama) online, then loads
// it from cache offline and asks for a hint. --safari forces wllama's compat
// build (what Safari uses, since it lacks JSPI).
// "Offline" = the app's web server is shut down and every other host is
// blocked, which is stricter than Playwright's setOffline (that one bypasses
// the service worker for navigations).
// Usage: node scripts/e2e-offline.mjs [--ai] [--safari]
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const port = 8091;
const base = `http://localhost:${port}/`;
const server = spawn(process.execPath, [fileURLToPath(new URL("./serve.mjs", import.meta.url)), String(port)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const withAI = process.argv.includes("--ai");
const safari = process.argv.includes("--safari");
// Chromium ignores HTTPS_PROXY; pass it through when one is configured
// (and keep localhost direct: Playwright proxies loopback by default).
process.env.PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK = "1";
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" } : undefined;
const browser = await chromium.launch({ proxy });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
if (safari) await ctx.addInitScript(() => { try { delete WebAssembly.Suspending; } catch {} WebAssembly.Suspending = undefined; });
const page = await ctx.newPage();
ctx.on("serviceworker", (w) => w.on("console", (m) => console.log("SW:", m.text().slice(0, 200))));
page.on("pageerror", (e) => console.log("pageerror:", String(e)));
page.on("console", (m) => m.type() !== "log" && console.log("console:", m.type(), m.text().slice(0, 300)));
page.on("requestfailed", (r) => console.log("reqfailed:", r.url(), r.failure()?.errorText));

await page.goto(base);
// Wait until the service worker has fully installed (all precache adds settled).
// (waitForFunction can't await an async predicate, so poll with evaluate.)
for (let i = 0; ; i++) {
  const ready = await page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    return r?.active?.state === "activated" && !r.installing && !!(await caches.match(new URL("vendor/pyodide/pyodide.asm.wasm", location.href).href));
  });
  if (ready) break;
  if (i > 120) throw new Error("service worker never finished installing");
  await page.waitForTimeout(1000);
}
console.log("service worker active, Python precached");
if (process.env.DEBUG) console.log(await page.evaluate(async () => { const out = []; for (const k of await caches.keys()) { const c = await caches.open(k); out.push(k + ": " + (await c.keys()).map((r) => new URL(r.url).pathname).join(" ")); } return out.join("\n"); }));

async function askHint(label) {
  await page.goto(base + "#/p/two-sum");
  await page.click('#tabs button[data-tab="tutor"]');
  await page.click("#load-model");
  await page.waitForFunction(() => /loaded|●/.test(document.querySelector("#model-status").textContent) || /error|offline|memory/i.test(document.querySelector("#model-status").textContent), null, { timeout: 900_000, polling: 2000 });
  const status = (await page.textContent("#model-status")).trim();
  console.log(`[${label}] model status: ${status}`);
  const t0 = Date.now();
  await page.click('#quick-chips button[data-q="hint"]');
  await page.waitForFunction(() => document.querySelector("#chat-send").textContent === "Send" && document.querySelectorAll(".msg.assistant").length > 0, null, { timeout: 300_000, polling: 1000 });
  const reply = (await page.locator(".msg.assistant").last().textContent()).trim();
  console.log(`[${label}] hint after ${Math.round((Date.now() - t0) / 1000)}s: ${reply.slice(0, 400)}`);
}

if (withAI) {
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("localleet:settings") || "{}");
    s.model = "coder-0.5b-cpu";
    localStorage.setItem("localleet:settings", JSON.stringify(s));
  });
  await page.reload();
  await askHint("online");
}

server.kill();
if (withAI) await ctx.route((url) => !url.href.startsWith(base), (route) => route.abort("internetdisconnected"));
await new Promise((r) => setTimeout(r, 300));
console.log("server stopped; external hosts blocked");
await page.goto(base);
await page.waitForFunction(() => document.querySelector("#py-pill")?.textContent.startsWith("Python 3"), null, { timeout: 60_000 });
console.log("offline reload OK:", await page.textContent("#py-pill"));
await page.click('button.prow[data-id="valid-parentheses"]');
const sol = await page.evaluate(async () => (await import("./problems/index.js")).problems.find((p) => p.id === "valid-parentheses").solution);
await page.click('#tabs button[data-tab="code"]');
await page.locator(".cm-content").click();
await page.keyboard.press("Control+A");
await page.keyboard.press("Delete");
await page.keyboard.insertText(sol);
await page.click("#run-btn");
await page.waitForSelector("#results .summary", { timeout: 60_000 });
console.log("offline run:", (await page.textContent("#results .summary")).trim());

if (withAI) await askHint("offline");
await browser.close();
server.kill();
