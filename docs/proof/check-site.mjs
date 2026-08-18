import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const dir = dirname(fileURLToPath(import.meta.url));
mkdirSync(dir, { recursive: true });

const BASE = process.env.SITE_URL || "http://localhost:3001";
const PAGES = [
  ["/", "home"],
  ["/buy", "buy"],
  ["/lease", "lease"],
  ["/sell", "sell"],
  ["/about", "about"],
  ["/services", "services"],
  ["/investing", "investing"],
  ["/contact", "contact"],
  ["/privacy", "privacy"],
  ["/listing/14-logistics-drive-truganina", "listing"],
  ["/this-page-does-not-exist", "404"],
];

const browser = await chromium.launch({ headless: true });
const results = [];
let failed = false;

async function check(width, height, path, name) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(900);

  const headers = await page.locator("header#site-header").count();
  const allHeaders = await page.locator("header").count();
  const footers = await page.locator("footer#site-footer").count();
  const taglines = await page.locator("[data-footer-tagline]").count();
  const listingImgs = await page.locator("article img, [data-listing-photo]").count();
  const nameFields = await page.locator('input[autocomplete="name"]').count();
  const phoneFields = await page.locator('input[autocomplete="tel"]').count();
  const emailFields = await page.locator('input[autocomplete="email"]').count();
  const messageFields = await page.locator("textarea").count();
  const emptyBullets = await page.locator("li").evaluateAll((els) =>
    els.filter((el) => !(el.textContent || "").trim()).length,
  );
  const oxbloodBars = await page.locator("section.bg-oxblood").count();

  const row = {
    page: name,
    width,
    status: res?.status() ?? 0,
    headers,
    allHeaders,
    footers,
    taglines,
    listingImgs,
    nameFields,
    phoneFields,
    emailFields,
    messageFields,
    emptyBullets,
    oxbloodBars,
  };
  results.push(row);

  const formPages = ["home", "sell", "contact", "listing"];
  const photoPages = ["home", "buy", "lease", "sell", "listing"];
  const formOk = !formPages.includes(name) || (nameFields >= 1 && phoneFields >= 1 && emailFields >= 1 && messageFields >= 1);
  const photoOk = !photoPages.includes(name) || listingImgs >= 1;
  const chromeOk = headers === 1 && allHeaders === 1 && footers === 1 && taglines === 1 && emptyBullets === 0 && oxbloodBars === 0;

  if (!chromeOk || !formOk || !photoOk) {
    failed = true;
    console.error("FAIL", JSON.stringify({ ...row, formOk, photoOk, chromeOk }));
  } else {
    console.log("ok", JSON.stringify(row));
  }

  await page.screenshot({ path: join(dir, `${name}-${width}.png`), fullPage: true });
  await page.close();
}

for (const [path, name] of PAGES) {
  await check(1440, 900, path, name);
  await check(390, 844, path, name);
}

await browser.close();
console.log("screenshots written to", dir);
if (failed) {
  console.error("DOM checks failed");
  process.exit(1);
}
