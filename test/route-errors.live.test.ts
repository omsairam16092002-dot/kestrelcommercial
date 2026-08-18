import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium, type Page } from "playwright";

const SITE = process.env.FRONTEND_URL || "http://localhost:3000";
const API = process.env.API_URL || "http://localhost:4000";

const STATIC_ROUTES = [
  "/",
  "/buy",
  "/lease",
  "/contact",
  "/about",
  "/services",
  "/sell",
  "/investing",
  "/privacy",
  "/admin/login",
  "/admin/signup",
  "/admin",
  "/admin/listings",
  "/admin/listings/new",
  "/admin/enquiries",
  "/admin/contacts",
  "/admin/tasks",
  "/admin/inspections",
  "/admin/subscribers",
  "/admin/settings",
];

function isIgnored(text: string) {
  return /Download the React DevTools|Fast Refresh|favicon|net::ERR|AbortError|Failed to load resource/i.test(
    text,
  );
}

async function runtimeMessage(page: Page) {
  return page.evaluate(() => {
    const portal = document.querySelector("nextjs-portal");
    const text = `${document.body?.innerText ?? ""}\n${portal?.textContent ?? ""}`;
    const match = text.match(/Unhandled Runtime Error[\s\S]{0,180}|Invalid LatLng[^\n]*/i);
    return match?.[0] ?? "";
  });
}

test("every public and desk route is free of runtime errors", async (t) => {
  let healthOk = false;
  try {
    const health = await fetch(`${API}/health`);
    const home = await fetch(SITE);
    healthOk = health.ok && home.ok;
  } catch {
    healthOk = false;
  }
  if (!healthOk) {
    t.skip("Site/API are not running");
    return;
  }

  const slugs: string[] = [];
  try {
    const sale = (await (await fetch(`${API}/api/properties?side=sale`)).json()) as { slug?: string }[];
    const first = sale.find((p) => p.slug)?.slug;
    if (first) slugs.push(first);
    const dudley = sale.find((p) => p.slug?.includes("dudley"))?.slug;
    if (dudley && dudley !== first) slugs.push(dudley);
  } catch {
    /* listing extras optional */
  }

  const routes = [...STATIC_ROUTES, ...slugs.map((slug) => `/listing/${slug}`)];
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const failures: string[] = [];

  async function check(viewport: { width: number; height: number }, label: string) {
    const page = await browser.newPage({ viewport });
    await page.route("**/*.{png,jpg,jpeg,webp,gif,woff,woff2}", (route) => route.abort());
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => {
      if (!isIgnored(err.message)) pageErrors.push(`${err.name}: ${err.message}`);
    });

    for (const path of routes) {
      pageErrors.length = 0;
      const response = await page.goto(`${SITE}${path}`, { waitUntil: "domcontentloaded", timeout: 25_000 });
      await page.waitForTimeout(900);
      const overlay = await runtimeMessage(page);
      const status = response?.status() ?? 0;
      const okStatus = status > 0 && status < 500;
      if (!okStatus || overlay || pageErrors.length) {
        failures.push(
          `${label} ${path} status=${status} overlay=${overlay || "none"} console=${pageErrors.join(" | ") || "none"}`,
        );
      }
    }
    await page.close();
  }

  try {
    await check({ width: 1440, height: 900 }, "desktop");
    await check({ width: 390, height: 844 }, "mobile");
  } finally {
    await browser.close();
  }

  assert.deepEqual(failures, []);
});
