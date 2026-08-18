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
  await page.waitForTimeout(600);
  const headers = await page.locator("header").count();
  const statsHits = await page.getByText("700+").count();
  const contactAgentRows = await page.getByText("Contact agent").count();
  const sliders = await page.locator('input[type="range"]').count();
  console.log(JSON.stringify({ width, headers, statsHits, contactAgentRows, sliders }));
  await page.screenshot({ path: join(dir, name), fullPage: true });
  await page.close();
}

await shot(1440, 900, "homepage-1440.png");
await shot(1024, 800, "homepage-1024.png");
await shot(390, 844, "homepage-390.png");

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 60000 });
await mobile.getByRole("button", { name: "Menu" }).click();
await mobile.waitForTimeout(300);
await mobile.screenshot({ path: join(dir, "homepage-390-menu.png") });
await mobile.close();

await browser.close();
console.log("screenshots written");
