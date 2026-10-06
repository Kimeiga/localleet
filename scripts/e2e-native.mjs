// Checks the web app's native-bridge path (used inside the iOS app) against a
// fake bridge in Chromium: model list, download progress, streamed replies.
// Usage: node scripts/e2e-native.mjs
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const port = 8095;
const base = `http://localhost:${port}/`;
const server = spawn(process.execPath, [fileURLToPath(new URL("./serve.mjs", import.meta.url)), String(port)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
await ctx.addInitScript(() => {
  window.LocalLeetNative = { platform: "ios", appVersion: "test", ramGB: 8 };
  const emit = (e) => setTimeout(() => window.__localleetNativeEvent?.(e), 0);
  let downloaded = false;
  window.__calls = [];
  const models = () => [
    { key: "apple", label: "Apple on-device model", note: "Built in.", engine: "apple", size: "", downloaded: true, available: true, reason: null },
    { key: "coder-1.5b", label: "Qwen2.5-Coder 1.5B", note: "Small.", engine: "llama", size: "1.1 GB", downloaded, available: true, reason: null },
    { key: "ornith-9b", label: "Ornith 1.5 9B", note: "Smart.", engine: "llama", size: "5.8 GB", downloaded: false, available: false, reason: "Needs about 8 GB of RAM; this device has 6 GB." },
  ];
  window.webkit = { messageHandlers: { localleet: { postMessage: async ({ method, params }) => {
    window.__calls.push(method);
    if (method === "list") return models();
    if (method === "load") {
      if (params.key === "coder-1.5b") {
        for (const p of [0.1, 0.5, 0.9]) { emit({ type: "progress", key: params.key, progress: p, text: `Downloading ${p}` }); await new Promise((r) => setTimeout(r, 50)); }
        downloaded = true;
      }
      return true;
    }
    if (method === "chat") {
      const reply = "Think about a **hash map**.\n\n```python\na = 1\nb = 2\nc = 3\nd = 4\n```";
      for (let i = 1; i <= 4; i++) { emit({ type: "token", requestId: params.requestId, text: reply.slice(0, (reply.length * i) / 4) }); await new Promise((r) => setTimeout(r, 30)); }
      return reply;
    }
    if (method === "stop" || method === "unload" || method === "delete") return true;
    throw new Error("unknown " + method);
  } } } };
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(base + "#/p/two-sum");
await page.click('#tabs button[data-tab="tutor"]');
await page.waitForSelector("#load-model");
console.log("tutor status:", (await page.textContent("#model-status")).trim().replace(/\s+/g, " "));
await page.click("#load-model");
await page.waitForFunction(() => /●/.test(document.querySelector("#model-status").textContent));
console.log("loaded:", (await page.textContent("#model-status")).trim());
await page.click('#quick-chips button[data-q="hint"]');
await page.waitForFunction(() => document.querySelector(".msg.assistant .spoiler") && document.querySelector("#chat-send").textContent === "Send");
console.log("reply:", (await page.locator(".msg.assistant").last().innerText()).replace(/\s+/g, " "));

await page.click("#settings-btn");
await page.waitForSelector("[data-load='coder-1.5b']");
console.log("settings gpu-info:", await page.textContent("#gpu-info"));
console.log("offline-info:", await page.textContent("#offline-info"), "| install tip hidden:", await page.isHidden("#install-tip"));
const rows = await page.$$eval(".model", (els) => els.map((e) => e.innerText.replace(/\s+/g, " ")));
console.log("models:\n  " + rows.join("\n  "));
await page.click("[data-load='coder-1.5b']");
await page.waitForFunction(() => /loaded/.test(document.querySelector("#model-list").textContent));
console.log("after download+load:", (await page.$$eval(".model", (els) => els.map((e) => e.innerText.replace(/\s+/g, " "))))[1]);
console.log("bridge calls:", (await page.evaluate(() => window.__calls)).join(","));
console.log(errors.length ? "page errors:\n" + errors.join("\n") : "no page errors");
await browser.close();
server.kill();
process.exit(errors.length ? 1 : 0);
