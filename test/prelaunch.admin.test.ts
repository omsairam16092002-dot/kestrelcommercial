/**
 * Pre-launch admin desk checks — in-process API against Mongo.
 * All created records are tracked in docs/qa/qa-manifest.json.
 */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { ContactModel } from "../backend/src/models/Contact";
import { processInboundEmail } from "../backend/src/services/inboundLeads";
import {
  apiBase,
  apiJson,
  deskLogin,
  mongoReady,
  startDeskServer,
  stopDeskServer,
} from "./helpers/deskServer";
import { qaEnquiryPayload, qaListingPayload } from "./helpers/qaFixtures";
import { initManifest, trackEmail, trackId, trackListing, loadManifest } from "./helpers/qaManifest";

const REA_FIXTURE = `You have received a new enquiry from realestate.com.au

Name: QA Test Occupier
Email: qa-occupier@example.com
Phone: 0412 345 678
Message: Prelaunch portal test enquiry.
Property: 14 Logistics Drive, Truganina
Listing ID: REA-441122
`;

const ENQUIRY_SOURCES = ["web", "contact", "appraisal", "appraisal-quick"] as const;

before(async () => {
  initManifest("local");
  await startDeskServer();
});

after(stopDeskServer);

test("prelaunch admin: auth login, invalid creds, logout", async (t) => {
  if (!mongoReady()) {
    t.skip("Mongo + ADMIN_SEED_PASSWORD required");
    return;
  }

  const bad = await apiJson("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "bad@example.com", password: "wrong-password-qa" }),
  });
  assert.equal(bad.res.status, 401);

  const auth = await deskLogin();
  assert.ok(auth);

  const me = await apiJson("/api/auth/me", auth);
  assert.equal(me.res.status, 200);

  await apiJson("/api/auth/logout", { method: "POST", headers: auth.headers });

  const blocked = await apiJson("/api/enquiries");
  assert.equal(blocked.res.status, 401);
});

test("prelaunch admin: enquiry from every public source", async (t) => {
  if (!mongoReady()) {
    t.skip("Mongo required");
    return;
  }

  const manifest = loadManifest();
  const stamp = Date.now();

  for (const source of ENQUIRY_SOURCES) {
    const email = `qa-${source}-${stamp}@example.com`;
    const res = await apiJson("/api/enquiries", {
      method: "POST",
      body: JSON.stringify(qaEnquiryPayload(source, email)),
    });
    assert.equal(res.res.status, 201, `${source} should create enquiry: ${JSON.stringify(res.body)}`);
    trackEmail(manifest, "enquiry", email);
    if (res.body?.enquiry?.id) trackId(manifest, "enquiry", String(res.body.enquiry.id));
  }

  const auth = await deskLogin();
  assert.ok(auth);

  for (const source of ENQUIRY_SOURCES) {
    const inbox = await apiJson(`/api/enquiries?source=${source}`, auth);
    assert.equal(inbox.res.status, 200);
    const rows = (inbox.body.enquiries || inbox.body) as { source?: string; email?: string }[];
    assert.ok(rows.some((r) => r.source === source && r.email?.includes(`qa-${source}-${stamp}`)));
  }
});

test("prelaunch admin: newsletter subscribe and CSV export", async (t) => {
  if (!mongoReady()) {
    t.skip("Mongo required");
    return;
  }

  const manifest = loadManifest();
  const email = `qa-newsletter-${Date.now()}@example.com`;

  const sub = await apiJson("/api/newsletter", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  assert.ok(sub.res.status === 200 || sub.res.status === 201);
  trackEmail(manifest, "subscriber", email);

  const auth = await deskLogin();
  assert.ok(auth);

  const list = await apiJson("/api/newsletter", auth);
  assert.equal(list.res.status, 200);
  const subs = (list.body.subscribers || list.body) as { email?: string }[];
  assert.ok(subs.some((r) => r.email === email));

  const csv = await fetch(`${apiBase()}/api/newsletter?format=csv`, { headers: auth.headers });
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get("content-type") || "", /csv|text/i);
});

test("prelaunch admin: portal dedupe and needs-review queue", async (t) => {
  if (!mongoReady()) {
    t.skip("Mongo required");
    return;
  }

  const manifest = loadManifest();
  const stamp = Date.now();
  const email = `qa-portal-${stamp}@example.com`;
  const body = REA_FIXTURE.replace("qa-occupier@example.com", email);

  const first = await processInboundEmail({
    from: "leads@realestate.com.au",
    to: "leads@leads.kestrelcommercial.com",
    subject: `QA portal ${stamp}`,
    text: body,
  });
  assert.equal(first.duplicate, false);
  assert.ok(first.enquiry);
  trackEmail(manifest, "enquiry", email);
  if (first.enquiry?.id) trackId(manifest, "enquiry", String(first.enquiry.id));
  if (first.inbound?.id) trackId(manifest, "inboundEmail", String(first.inbound.id));

  const dup = await processInboundEmail({
    from: "leads@realestate.com.au",
    subject: `QA portal ${stamp}`,
    text: body,
  });
  assert.equal(dup.duplicate, true);
  assert.equal(dup.enquiry, null);

  const incomplete = await processInboundEmail({
    from: "leads@realestate.com.au",
    subject: `QA incomplete ${stamp}`,
    text: "Hello from realestate.com.au with no contact details.",
  });
  assert.equal(incomplete.enquiry, null);
  assert.equal((incomplete.inbound as { needsReview?: boolean }).needsReview, true);
  if (incomplete.inbound?.id) trackId(manifest, "inboundEmail", String(incomplete.inbound.id));

  const auth = await deskLogin();
  assert.ok(auth);
  const review = await apiJson("/api/admin/inbound-emails?needsReview=1", auth);
  assert.equal(review.res.status, 200);
});

test("prelaunch admin: listing CMS create edit archive duplicate REAXML", async (t) => {
  if (!mongoReady()) {
    t.skip("Mongo required");
    return;
  }

  const manifest = loadManifest();
  const auth = await deskLogin();
  assert.ok(auth);

  const slug = `qa-test-listing-${Date.now()}`;
  const created = await apiJson("/api/properties", {
    method: "POST",
    headers: auth.headers,
    body: JSON.stringify(qaListingPayload(slug)),
  });
  assert.equal(created.res.status, 201, created.body.error || JSON.stringify(created.body));
  const id = String(created.body.id || created.body.property?.id);
  trackListing(manifest, slug, id);

  const patched = await apiJson(`/api/properties/${id}`, {
    method: "PATCH",
    headers: auth.headers,
    body: JSON.stringify({ priceValue: 995000, featured: true }),
  });
  assert.equal(patched.res.status, 200);
  assert.equal(patched.body.priceValue ?? patched.body.property?.priceValue, 995000);

  const dup = await apiJson(`/api/properties/${id}/duplicate`, { method: "POST", headers: auth.headers });
  assert.equal(dup.res.status, 201);
  trackListing(manifest, String(dup.body.slug), String(dup.body.id));

  const feed = await fetch(`${apiBase()}/api/properties/feed.xml`, { headers: auth.headers });
  assert.equal(feed.status, 200);
  assert.match(await feed.text(), /listing/i);

  const single = await fetch(`${apiBase()}/api/properties/${slug}/feed.xml`, { headers: auth.headers });
  assert.equal(single.status, 200);

  const archived = await apiJson(`/api/properties/${id}`, { method: "DELETE", headers: auth.headers });
  assert.equal(archived.res.status, 200);
});

test("prelaunch admin: contact upsert and task lifecycle", async (t) => {
  if (!mongoReady()) {
    t.skip("Mongo required");
    return;
  }

  const manifest = loadManifest();
  const email = `qa-contact-${Date.now()}@example.com`;
  trackEmail(manifest, "contact", email);

  const auth = await deskLogin();
  assert.ok(auth);

  const created = await apiJson("/api/contacts", {
    method: "POST",
    headers: auth.headers,
    body: JSON.stringify({ name: "QA Contact", email, phone: "0412345678", role: "buyer" }),
  });
  assert.equal(created.res.status, 201);

  await apiJson("/api/enquiries", {
    method: "POST",
    body: JSON.stringify(qaEnquiryPayload("web", email, { message: "Should upsert same contact" })),
  });

  const contacts = await ContactModel.find({ email }).lean();
  assert.equal(contacts.length, 1);

  const task = await apiJson("/api/tasks", {
    method: "POST",
    headers: auth.headers,
    body: JSON.stringify({ title: "QA follow-up", dueAt: new Date().toISOString() }),
  });
  assert.equal(task.res.status, 201);
  const taskId = String(task.body.id);
  trackId(manifest, "task", taskId);

  const done = await apiJson(`/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: auth.headers,
    body: JSON.stringify({ status: "done" }),
  });
  assert.equal(done.res.status, 200);
});

test("prelaunch admin: overview stats and command palette search", async (t) => {
  if (!mongoReady()) {
    t.skip("Mongo required");
    return;
  }

  const auth = await deskLogin();
  assert.ok(auth);

  const stats = await apiJson("/api/admin/stats", auth);
  assert.equal(stats.res.status, 200);
  assert.equal(typeof stats.body.staleNew, "number");
  assert.ok(stats.body.attention);

  const search = await apiJson("/api/admin/search?q=QA", auth);
  assert.equal(search.res.status, 200);

  const notifyBefore = await apiJson("/api/admin/notifications", auth);
  assert.equal(notifyBefore.res.status, 200);

  const read = await apiJson("/api/admin/notifications/read", { method: "POST", headers: auth.headers });
  assert.equal(read.res.status, 200);
});
