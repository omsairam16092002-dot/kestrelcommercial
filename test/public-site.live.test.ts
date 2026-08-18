import assert from "node:assert/strict";
import { test } from "node:test";
import { isStockImageId } from "@kestrel/shared";

const API = process.env.API_URL || "http://localhost:4000";
const SITE = process.env.FRONTEND_URL || "http://localhost:3000";

async function tryFetch(url: string) {
  try {
    const res = await fetch(url, { redirect: "follow" });
    return res;
  } catch {
    return null;
  }
}

test("live public site shows Cloudinary portrait when one is uploaded", async (t) => {
  const health = await tryFetch(`${API}/health`);
  if (!health?.ok) {
    t.skip("API is not running on :4000 — start npm run dev:backend");
    return;
  }
  const home = await tryFetch(`${SITE}/`);
  if (!home?.ok) {
    t.skip("Frontend is not running on :3000 — start npm run dev:frontend");
    return;
  }
  const about = await tryFetch(`${SITE}/about`);
  if (!about?.ok) {
    t.skip("About page is not reachable — restart npm run dev:frontend");
    return;
  }

  const agentsRes = await fetch(`${API}/api/agents`);
  assert.equal(agentsRes.ok, true);
  const agents = (await agentsRes.json()) as { photoPublicId?: string; name?: string }[];
  const photo = agents[0]?.photoPublicId;
  const homeHtml = await home.text();
  const aboutHtml = await about.text();

  assert.match(homeHtml, /Kestrel|Industrial|Commercial/i);
  assert.match(aboutHtml, /Jignesh|About/i);

  if (isStockImageId(photo)) {
    assert.match(homeHtml, /unsplash\.com|photo-1560250097/);
    return;
  }

  assert.match(homeHtml, /res\.cloudinary\.com/);
  assert.doesNotMatch(homeHtml, /photo-1560250097-0b93528c311a/);
  assert.match(aboutHtml, /res\.cloudinary\.com/);
  assert.doesNotMatch(aboutHtml, /photo-1560250097-0b93528c311a/);
});

test("live desk login page renders", async (t) => {
  const login = await tryFetch(`${SITE}/admin/login`);
  if (!login?.ok) {
    t.skip("Frontend is not running on :3000");
    return;
  }
  const html = await login.text();
  assert.match(html, /Sign in|Desk|Kestrel|password|Email/i);
});

test("live public search and listing pages render", async (t) => {
  const search = await tryFetch(`${SITE}/buy`);
  if (!search?.ok) {
    t.skip("Frontend is not running on :3000");
    return;
  }
  const html = await search.text();
  assert.match(html, /Sale|Lease|Search|Kestrel/i);

  const contact = await tryFetch(`${SITE}/contact`);
  assert.ok(contact?.ok, "/contact should render");
  const contactHtml = await contact!.text();
  assert.match(contactHtml, /Enquire|Contact|Kestrel/i);

  const listings = await tryFetch(`${API}/api/properties?side=sale`);
  if (!listings?.ok) {
    t.skip("API is not running");
    return;
  }
  const properties = (await listings.json()) as { slug?: string }[];
  const slug = properties[0]?.slug;
  if (!slug) {
    t.skip("No sale listings to open");
    return;
  }
  const listing = await tryFetch(`${SITE}/listing/${slug}`);
  assert.ok(listing?.ok, `listing page for ${slug} should load`);
  const listingHtml = await listing!.text();
  assert.match(listingHtml, /Enquire|Inspect|Kestrel/i);
});
