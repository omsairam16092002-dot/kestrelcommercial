/**
 * Handover page smoke — every public marketing page and listing detail must
 * return HTTP 200 and contain expected content markers.
 *
 * Skips automatically when frontend/API are not running locally.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { ADMIN_PUBLIC_PAGES, PUBLIC_PAGES, WARRAGUL_SLUG } from "./handover.catalog";
import { SITE, API, waitForLiveServers } from "./helpers/liveServers";

async function serversUp() {
  return waitForLiveServers();
}

async function tryFetch(url: string) {
  try {
    return await fetch(url, { redirect: "follow" });
  } catch {
    return null;
  }
}

test("handover: every public marketing page renders with expected content", async (t) => {
  if (!(await serversUp())) {
    t.skip("Start npm run dev:frontend (:3000) and npm run dev:backend (:4000)");
    return;
  }

  for (const page of PUBLIC_PAGES) {
    const res = await tryFetch(`${SITE}${page.path}`);
    assert.ok(res?.ok, `${page.path} should return 2xx (got ${res?.status})`);
    const html = await res!.text();
    for (const marker of page.markers) {
      assert.match(html, marker, `${page.path} should match ${marker}`);
    }
  }
});

test("handover: admin login and signup pages render", async (t) => {
  if (!(await serversUp())) {
    t.skip("Frontend/API not running");
    return;
  }
  for (const page of ADMIN_PUBLIC_PAGES) {
    const res = await tryFetch(`${SITE}${page.path}`);
    assert.ok(res?.ok, `${page.path} should render`);
    const html = await res!.text();
    for (const marker of page.markers) {
      assert.match(html, marker, `${page.path} should match ${marker}`);
    }
  }
});

test("handover: listing detail pages render for sale samples and Warragul", async (t) => {
  if (!(await serversUp())) {
    t.skip("Frontend/API not running");
    return;
  }

  const saleRes = await tryFetch(`${API}/api/properties?side=sale`);
  assert.ok(saleRes?.ok);
  const sale = (await saleRes!.json()) as { slug?: string; propertyType?: string }[];

  const slugs = new Set<string>();
  const first = sale.find((p) => p.slug)?.slug;
  if (first) slugs.add(first);

  const warehouse = sale.find((p) => p.propertyType === "warehouse")?.slug;
  if (warehouse) slugs.add(warehouse);

  const house = sale.find((p) => p.propertyType === "house")?.slug;
  if (house) slugs.add(house);

  const warragul = sale.find((p) => p.slug === WARRAGUL_SLUG)?.slug;
  if (warragul) slugs.add(warragul);

  if (!slugs.size) {
    t.skip("No listings available");
    return;
  }

  for (const slug of slugs) {
    const res = await tryFetch(`${SITE}/listing/${slug}`);
    assert.ok(res?.ok, `/listing/${slug} should render`);
    const html = await res!.text();
    assert.match(html, /Enquire|Inspect|Kestrel|Sale|Lease/i, `/listing/${slug} content`);
  }
});

test("handover: buy and lease pages honour filter query strings", async (t) => {
  if (!(await serversUp())) {
    t.skip("Frontend/API not running");
    return;
  }

  const filterPages = [
    { path: "/buy?category=commercial", marker: /Commercial|Sale|Search/i },
    { path: "/buy?category=residential", marker: /Residential|Sale|Search/i },
    { path: "/buy?category=development-site", marker: /Development|Sale|Search/i },
    { path: "/lease?type=warehouse", marker: /Lease|Search|Kestrel/i },
    { path: "/properties/commercial?side=sale", marker: /Commercial/i },
    { path: "/properties/development-sites", marker: /Development/i },
  ];

  for (const fp of filterPages) {
    const res = await tryFetch(`${SITE}${fp.path}`);
    assert.ok(res?.ok, `${fp.path} should render`);
    const html = await res!.text();
    assert.match(html, fp.marker, `${fp.path} should show filtered hub content`);
  }
});

test("handover: public enquiry form accepts submission via API", async (t) => {
  if (!(await serversUp())) {
    t.skip("Frontend/API not running");
    return;
  }

  const created = await fetch(`${API}/api/enquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Handover Page Test",
      email: `handover-page-${Date.now()}@kestrelcommercial.com`,
      phone: "0431000088",
      message: "Page handover smoke enquiry.",
      intent: "enquire",
      source: "web",
    }),
  });
  assert.equal(created.status, 201);
  const body = await created.json();
  assert.equal(body.ok, true);
  assert.ok(body.enquiry?.id);
});
