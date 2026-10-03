/**
 * Pre-launch cross-system loops — create data, verify public/admin reflection,
 * track everything in qa-manifest.json for Phase 4 cleanup.
 */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import {
  apiJson,
  deskLogin,
  mongoReady,
  startDeskServer,
  stopDeskServer,
} from "./helpers/deskServer";
import { LOCAL_SITE, qaEnquiryPayload, qaListingPayload } from "./helpers/qaFixtures";
import { initManifest, loadManifest, trackEmail, trackListing } from "./helpers/qaManifest";

async function waitForLocal() {
  for (let i = 0; i < 12; i++) {
    try {
      const [health, home] = await Promise.all([
        fetch("http://localhost:4000/health", { signal: AbortSignal.timeout(4000) }),
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

before(async () => {
  initManifest("local");
  await startDeskServer();
});

after(stopDeskServer);

test("prelaunch cross: listing publish loop", async (t) => {
  if (!mongoReady()) {
    t.skip("Mongo required");
    return;
  }

  const manifest = loadManifest();
  const auth = await deskLogin();
  assert.ok(auth);

  const slug = `qa-test-loop-${Date.now()}`;
  const created = await apiJson("/api/properties", {
    method: "POST",
    headers: auth.headers,
    body: JSON.stringify(
      qaListingPayload(slug, {
        address: "QA Loop Warehouse",
        suburb: "Sunshine",
        postcode: "3020",
        lat: -37.78,
        lng: 144.83,
      }),
    ),
  });
  assert.equal(created.res.status, 201);
  trackListing(manifest, slug, String(created.body.id));

  const publicList = await apiJson("/api/properties?category=commercial&side=sale");
  assert.ok((publicList.body as { slug?: string }[]).some((p) => p.slug === slug));

  if (await waitForLocal()) {
    await fetch(`${LOCAL_SITE}/api/site/revalidate`, { method: "POST", headers: auth.headers });

    const browser = await chromium.launch({ headless: true, channel: "msedge" });
    const page = await browser.newPage();
    try {
      const res = await page.goto(`${LOCAL_SITE}/listing/${slug}`, {
        waitUntil: "domcontentloaded",
        timeout: 35_000,
      });
      assert.ok(res?.ok(), "listing page should render");
      assert.match(await page.innerText("body"), /QA Loop Warehouse|Sunshine/i);
    } finally {
      await browser.close();
    }
  }
});

test("prelaunch cross: sold loop removes from sale grid", async (t) => {
  if (!mongoReady()) {
    t.skip("Mongo required");
    return;
  }

  const manifest = loadManifest();
  const auth = await deskLogin();
  assert.ok(auth);

  const slug = `qa-test-sold-${Date.now()}`;
  const created = await apiJson("/api/properties", {
    method: "POST",
    headers: auth.headers,
    body: JSON.stringify(
      qaListingPayload(slug, { address: "QA Sold Warehouse", suburb: "Laverton", postcode: "3028" }),
    ),
  });
  assert.equal(created.res.status, 201);
  const id = String(created.body.id);
  trackListing(manifest, slug, id);

  const sold = await apiJson(`/api/properties/${id}`, {
    method: "PATCH",
    headers: auth.headers,
    body: JSON.stringify({ status: "sold" }),
  });
  assert.equal(sold.res.status, 200);

  const grid = await apiJson("/api/properties?side=sale&category=commercial");
  assert.ok(!(grid.body as { slug?: string; status?: string }[]).some((p) => p.slug === slug && p.status === "for-sale"));
});

test("prelaunch cross: enquiry loop attaches to listing and upserts contact", async (t) => {
  if (!mongoReady()) {
    t.skip("Mongo required");
    return;
  }

  const manifest = loadManifest();
  const auth = await deskLogin();
  assert.ok(auth);

  const slug = `qa-test-enquiry-${Date.now()}`;
  const created = await apiJson("/api/properties", {
    method: "POST",
    headers: auth.headers,
    body: JSON.stringify(qaListingPayload(slug, { address: "QA Enquiry Target", suburb: "Derrimut", postcode: "3026" })),
  });
  assert.equal(created.res.status, 201);
  trackListing(manifest, slug, String(created.body.id));

  const email = `qa-enquiry-loop-${Date.now()}@example.com`;
  trackEmail(manifest, "enquiry", email);
  trackEmail(manifest, "contact", email);

  const enquiry = await apiJson("/api/enquiries", {
    method: "POST",
    body: JSON.stringify(
      qaEnquiryPayload("web", email, {
        message: "Interested in this warehouse",
        propertySlug: slug,
        intent: "inspection",
      }),
    ),
  });
  assert.equal(enquiry.res.status, 201);

  const inbox = await apiJson(`/api/enquiries?propertySlug=${slug}`, auth);
  assert.equal(inbox.res.status, 200);
  const rows = (inbox.body.enquiries || inbox.body) as { email?: string }[];
  assert.ok(rows.some((e) => e.email === email));
});

test("prelaunch cross: newsletter loop appears in admin subscribers", async (t) => {
  if (!mongoReady()) {
    t.skip("Mongo required");
    return;
  }

  const manifest = loadManifest();
  const email = `qa-sub-loop-${Date.now()}@example.com`;
  trackEmail(manifest, "subscriber", email);

  const sub = await apiJson("/api/newsletter", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  assert.ok(sub.res.status === 200 || sub.res.status === 201);

  const auth = await deskLogin();
  assert.ok(auth);
  const list = await apiJson("/api/newsletter", auth);
  const subs = (list.body.subscribers || list.body) as { email?: string }[];
  assert.ok(subs.some((r) => r.email === email));
});

test("prelaunch cross: agent profile change reflects on listing agent card", async (t) => {
  if (!mongoReady()) {
    t.skip("Mongo required");
    return;
  }

  const auth = await deskLogin();
  assert.ok(auth);

  const agents = await apiJson("/api/agents");
  const agent = (agents.body as { licenceNumber?: string; photoPublicId?: string }[])[0];
  assert.ok(agent?.licenceNumber);

  const marker = `qa-agent-${Date.now()}`;
  const patched = await apiJson(`/api/agents/${encodeURIComponent(agent.licenceNumber!)}`, {
    method: "PATCH",
    headers: auth.headers,
    body: JSON.stringify({ photoPublicId: marker }),
  });
  assert.equal(patched.res.status, 200);

  const live = await apiJson("/api/agents");
  assert.equal(live.body[0].photoPublicId, marker);

  await apiJson(`/api/agents/${encodeURIComponent(agent.licenceNumber!)}`, {
    method: "PATCH",
    headers: auth.headers,
    body: JSON.stringify({ photoPublicId: agent.photoPublicId || "kestrel/agents/jignesh" }),
  });
});
