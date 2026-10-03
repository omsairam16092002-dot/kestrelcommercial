/**
 * Pre-launch public site checks — Playwright against live local dev servers.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium, type Page } from "playwright";
import { AGENCY } from "@kestrel/shared";
import { PUBLIC_PAGES } from "./handover.catalog";
import { LOCAL_API, LOCAL_SITE } from "./helpers/qaFixtures";

async function waitForLocal() {
  for (let i = 0; i < 12; i++) {
    try {
      const [health, home] = await Promise.all([
        fetch(`${LOCAL_API}/health`, { signal: AbortSignal.timeout(4000) }),
        fetch(`${LOCAL_SITE}/`, { signal: AbortSignal.timeout(4000) }),
      ]);
      if (health.ok && home.ok) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

const LISTING_SLUGS = [
  "14-launceston-street-williamstown-north-lot-1",
  "295-warragul-lardner-road-warragul",
];

async function bodyText(page: Page) {
  return page.evaluate(() => document.body?.innerText ?? "");
}

test("prelaunch public: navigation and chrome", async (t) => {
  if (!(await waitForLocal())) {
    t.skip("Start npm run dev:frontend and npm run dev:backend");
    return;
  }

  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await page.goto(`${LOCAL_SITE}/`, { waitUntil: "domcontentloaded", timeout: 30_000 });

    const logoText = await page.locator("#site-header").innerText();
    assert.match(logoText, /Kestrel/i);
    assert.match(logoText, /COMMERCIAL/i);
    assert.ok(await page.locator("#site-header img[alt='']").count());

    const tel = page.locator('a[href^="tel:"]').first();
    assert.match(await tel.getAttribute("href"), /tel:\+61431000038/);

    const wa = page.locator('a[href*="wa.me"]').first();
    assert.ok(await wa.count());
    assert.match(await wa.getAttribute("href"), /wa\.me\/61431000038/);

    await page.locator("#site-header").getByRole("link", { name: "Properties" }).hover();
    await page.waitForTimeout(300);
    for (const label of ["Commercial", "Residential", "Development"]) {
      assert.ok((await bodyText(page)).includes(label));
    }

    await page.goto(`${LOCAL_SITE}/`, { waitUntil: "domcontentloaded" });
    const footer = page.locator("#site-footer");
    assert.match(await footer.innerText(), /0431 000 038/);
    assert.ok(await footer.locator('a[href*="facebook"]').count());
    assert.ok(await footer.locator('a[href*="linkedin"]').count());
    assert.ok(await footer.locator('a[href*="instagram"]').count());

    await page.goto(`${LOCAL_SITE}/privacy`, { waitUntil: "domcontentloaded" });
    assert.match(await bodyText(page), new RegExp(AGENCY.acn.replace(/\s/g, "\\s*"), "i"));
    assert.match(await bodyText(page), /Licen[cs]e/i);
  } finally {
    await browser.close();
  }
});

test("prelaunch public: mobile navbar Call and WhatsApp icons", async (t) => {
  if (!(await waitForLocal())) {
    t.skip("Start dev servers");
    return;
  }

  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });

  try {
    await page.goto(`${LOCAL_SITE}/`, { waitUntil: "domcontentloaded" });
    assert.ok(await page.locator("#site-header a[href^='tel:']").count());
    assert.ok(await page.locator("#site-header a[href*='wa.me']").count());
  } finally {
    await browser.close();
  }
});

test("prelaunch public: home stats and evidence", async (t) => {
  if (!(await waitForLocal())) {
    t.skip("Start dev servers");
    return;
  }

  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const page = await browser.newPage();

  try {
    await page.goto(`${LOCAL_SITE}/`, { waitUntil: "networkidle", timeout: 45_000 });
    const text = await bodyText(page);
    assert.match(text, /Property transactions/i);
    assert.match(text, /Years in Australian property/i);
    assert.doesNotMatch(text, /4 asset classes/i);
    assert.doesNotMatch(text, /4 markets/i);
    assert.ok(await page.getByText(/On the market now/i).count());
  } finally {
    await browser.close();
  }
});

test("prelaunch public: marketing pages render markers", async (t) => {
  if (!(await waitForLocal())) {
    t.skip("Start dev servers");
    return;
  }

  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const page = await browser.newPage();

  try {
    for (const { path, markers } of PUBLIC_PAGES) {
      await page.goto(`${LOCAL_SITE}${path}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
      const html = await page.content();
      for (const re of markers) {
        assert.match(html, re, `${path} missing ${re}`);
      }
    }

    await page.goto(`${LOCAL_SITE}/this-page-does-not-exist-qa`, { waitUntil: "domcontentloaded" });
    const notFound = await bodyText(page);
    assert.match(notFound, /not found|404|page/i);
  } finally {
    await browser.close();
  }
});

test("prelaunch public: about licence not in bio line", async (t) => {
  if (!(await waitForLocal())) {
    t.skip("Start dev servers");
    return;
  }

  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const page = await browser.newPage();

  try {
    await page.goto(`${LOCAL_SITE}/about`, { waitUntil: "domcontentloaded" });
    const main = await page.locator("main").innerText();
    assert.match(main, /Jignesh Jhanjaria/i);
    assert.doesNotMatch(main, /Licen[cs]e\s+\d/i);

    await page.goto(`${LOCAL_SITE}/privacy`, { waitUntil: "domcontentloaded" });
    assert.match(await bodyText(page), /Licen[cs]e/i);
  } finally {
    await browser.close();
  }
});

test("prelaunch public: listing detail lead desk and map on five listings", async (t) => {
  if (!(await waitForLocal())) {
    t.skip("Start dev servers");
    return;
  }

  let slugs = [...LISTING_SLUGS];
  try {
    const res = await fetch(`${LOCAL_API}/api/properties?side=sale&category=commercial`);
    const rows = (await res.json()) as { slug?: string }[];
    for (const row of rows.slice(0, 5)) {
      if (row.slug && !slugs.includes(row.slug)) slugs.push(row.slug);
    }
  } catch {
    /* use defaults */
  }
  slugs = slugs.slice(0, 5);

  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    for (const slug of slugs) {
      const res = await page.goto(`${LOCAL_SITE}/listing/${slug}`, {
        waitUntil: "domcontentloaded",
        timeout: 35_000,
      });
      if (res?.status() === 404) continue;
      const text = await bodyText(page);
      assert.match(text, /Inspect|Enquire|Documents/i, `${slug} missing lead desk tabs`);
      await page.waitForSelector(".leaflet-container", { timeout: 15_000 });
      assert.ok(await page.locator(".leaflet-container").count(), `${slug} missing map`);
    }
  } finally {
    await browser.close();
  }
});

test("prelaunch public: mobile sticky call bar on listing", async (t) => {
  if (!(await waitForLocal())) {
    t.skip("Start dev servers");
    return;
  }

  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });

  try {
    await page.goto(`${LOCAL_SITE}/listing/14-launceston-street-williamstown-north-lot-1`, {
      waitUntil: "domcontentloaded",
    });
    assert.ok(await page.locator("a[href^='tel:']").count());
    assert.ok(await page.locator("a[href*='wa.me']").count());
  } finally {
    await browser.close();
  }
});

test("prelaunch public: sharp corners spot-check", async (t) => {
  if (!(await waitForLocal())) {
    t.skip("Start dev servers");
    return;
  }

  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const page = await browser.newPage();

  try {
    await page.goto(`${LOCAL_SITE}/properties/commercial`, { waitUntil: "domcontentloaded" });
    const radii = await page.evaluate(() => {
      const selectors = ["#site-header a", ".btn-sharp", ".premium-panel", ".leaflet-bar a", "#site-footer a"];
      return selectors
        .map((sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          return { sel, r: getComputedStyle(el).borderRadius };
        })
        .filter(Boolean);
    });
    for (const item of radii as { sel: string; r: string }[]) {
      assert.match(item.r, /^(0px|0)$/, `${item.sel} has border-radius ${item.r}`);
    }
  } finally {
    await browser.close();
  }
});
