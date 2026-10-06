// Renders icons/icon.svg to the PNG sizes iOS/Android want (needs playwright).
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const svg = readFileSync(path.join(root, "icons/icon.svg"), "utf8");
const browser = await chromium.launch();
const page = await browser.newPage();
const targets = [
  ["apple-touch-icon.png", 180, false],
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["icon-maskable-512.png", 512, true],
  ["../ios/LocalLeet/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png", 1024, false, true],
];
for (const [name, size, maskable, opaque] of targets) {
  await page.setViewportSize({ width: size, height: size });
  // iOS rounds corners itself, so apple/maskable icons are full-bleed squares.
  const square = name.startsWith("apple") || maskable || opaque;
  const inner = square ? svg.replace(/rx="112"/, 'rx="0"') : svg;
  const pad = maskable ? size * 0.1 : 0;
  await page.setContent(`<html><body style="margin:0;background:${square ? "#4a5ef5" : "transparent"}">
    <div style="padding:${pad}px;width:${size}px;height:${size}px;box-sizing:border-box">${inner.replace("<svg ", `<svg width="${size - 2 * pad}" height="${size - 2 * pad}" `)}</div></body></html>`);
  await page.screenshot({ path: path.join(root, "icons", name), omitBackground: !square });
}
await browser.close();
console.log("icons written");
