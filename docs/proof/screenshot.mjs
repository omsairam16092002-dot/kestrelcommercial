import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const dir = dirname(fileURLToPath(import.meta.url));
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function shot(width, height, name) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(dir, name), fullPage: true });
  await page.close();
}

await shot(1440, 900, "homepage-1440.png");
await shot(390, 844, "homepage-390.png");
await shot(1024, 800, "homepage-1024.png");
await shot(768, 1024, "homepage-768.png");
await browser.close();
console.log("screenshots written");
