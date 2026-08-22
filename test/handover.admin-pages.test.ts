/**
 * Handover admin UI — logs into the desk and verifies every authenticated
 * admin route loads without runtime errors.
 *
 * Requires frontend + API running and ADMIN_SEED_PASSWORD in backend/.env.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium } from "playwright";
import { env } from "../backend/src/config/env";
import { ADMIN_AUTH_PAGES } from "./handover.catalog";
import { SITE, API, waitForLiveServers } from "./helpers/liveServers";
const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL || env.adminSeedEmail;
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD || env.adminSeedPassword || "";

function isIgnored(text: string) {
  return /Download the React DevTools|Fast Refresh|favicon|net::ERR|AbortError|Failed to load resource/i.test(
    text,
  );
}

test("handover: authenticated admin pages load without runtime errors", async (t) => {
  if (!ADMIN_PASSWORD) {
    t.skip("Set ADMIN_SEED_PASSWORD (or in backend/.env) for admin UI handover test");
    return;
  }

  if (!(await waitForLiveServers())) {
    t.skip("Start npm run dev:frontend and npm run dev:backend");
    return;
  }

  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  const loginRes = await context.request.post(`${SITE}/api/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  if (!loginRes.ok()) {
    await browser.close();
    assert.fail(`Desk login failed (${loginRes.status()}): ${await loginRes.text()}`);
  }

  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => {
    if (!isIgnored(err.message)) pageErrors.push(`${err.name}: ${err.message}`);
  });

  try {
    const failures: string[] = [];
    for (const path of ADMIN_AUTH_PAGES) {
      pageErrors.length = 0;
      const response = await page.goto(`${SITE}${path}`, { waitUntil: "domcontentloaded", timeout: 25_000 });
      await page.waitForTimeout(800);
      const status = response?.status() ?? 0;
      const bodyText = await page.evaluate(() => document.body?.innerText ?? "");
      const hasRuntimeOverlay = /Unhandled Runtime Error|Invalid LatLng/i.test(bodyText);
      const onLogin = bodyText.match(/Sign in to your desk/i) || /\/admin\/login/.test(page.url());
      if (onLogin && path !== "/admin/login") {
        failures.push(`${path} redirected to login`);
        continue;
      }
      if (status >= 500 || hasRuntimeOverlay || pageErrors.length) {
        failures.push(
          `${path} status=${status} overlay=${hasRuntimeOverlay} console=${pageErrors.join(" | ") || "none"}`,
        );
      }
    }
    assert.deepEqual(failures, []);
  } finally {
    await browser.close();
  }
});
