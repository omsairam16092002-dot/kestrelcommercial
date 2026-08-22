/**
 * Handover integration suite — exercises every API filter, listing CRUD path,
 * CRM surface, and admin endpoint before client handover.
 *
 * Runs in-process (no live servers required). Needs MongoDB + ADMIN_SEED_PASSWORD
 * for desk tests; public endpoints work in fixture mode too.
 */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { AGENCY } from "@kestrel/shared";
import { PropertyModel } from "../backend/src/models/Property";
import { ContactModel } from "../backend/src/models/Contact";
import { TaskModel } from "../backend/src/models/Task";
import { EnquiryModel } from "../backend/src/models/Enquiry";
import {
  apiBase,
  apiJson,
  deskLogin,
  mongoReady,
  startDeskServer,
  stopDeskServer,
} from "./helpers/deskServer";
import { PROPERTY_FILTER_CASES, WARRAGUL_SLUG } from "./handover.catalog";

before(startDeskServer);
after(stopDeskServer);

test("handover: health and public read endpoints", async () => {
  const health = await apiJson("/health");
  assert.equal(health.res.status, 200);
  assert.equal(health.body.ok, true);

  const agents = await apiJson("/api/agents");
  assert.equal(agents.res.status, 200);
  assert.ok(Array.isArray(agents.body));
  assert.ok(agents.body[0]?.licenceNumber);

  const feedBlocked = await fetch(`${apiBase()}/api/properties/feed.xml`);
  assert.equal(feedBlocked.status, 401, "REAXML feed is desk-only");

  if (mongoReady()) {
    const auth = await deskLogin();
    assert.ok(auth);
    const feed = await fetch(`${apiBase()}/api/properties/feed.xml`, { headers: auth.headers });
    assert.equal(feed.status, 200);
    assert.match(feed.headers.get("content-type") || "", /xml/i);
    const xml = await feed.text();
    assert.match(xml, /<listing/i);
  }
});

test("handover: every property filter returns matching rows", async () => {
  for (const fc of PROPERTY_FILTER_CASES) {
    const { res, body } = await apiJson(`/api/properties?${fc.query}`);
    assert.equal(res.status, 200, `${fc.label} should return 200`);
    assert.ok(Array.isArray(body), `${fc.label} should return array`);
    for (const row of body as Record<string, unknown>[]) {
      assert.ok(fc.assert(row), `${fc.label} failed on slug=${row.slug}`);
      assert.notEqual(row.archived, true);
      assert.equal(row.internalNotes, undefined);
    }
  }
});

test("handover: suburb, zoning, floor and bedroom filters", async () => {
  const all = await apiJson("/api/properties?side=sale");
  assert.equal(all.res.status, 200);
  const sample = (all.body as { suburb?: string; zoning?: string; floorAreaSqm?: number; bedrooms?: number }[]).find(
    (p) => p.suburb && p.zoning,
  );
  if (!sample?.suburb) return;

  const suburb = await apiJson(`/api/properties?suburb=${encodeURIComponent(sample.suburb)}&side=sale`);
  assert.equal(suburb.res.status, 200);
  assert.ok(
    (suburb.body as { suburb?: string }[]).every(
      (p) => p.suburb?.toLowerCase() === sample.suburb!.toLowerCase(),
    ),
  );

  const zoning = await apiJson(`/api/properties?zoning=${encodeURIComponent(sample.zoning!)}&side=sale`);
  assert.equal(zoning.res.status, 200);
  assert.ok(
    (zoning.body as { zoning?: string }[]).every(
      (p) => String(p.zoning || "").toUpperCase() === sample.zoning!.toUpperCase(),
    ),
  );

  if (typeof sample.floorAreaSqm === "number" && sample.floorAreaSqm > 0) {
    const minFloor = await apiJson(`/api/properties?minFloor=${Math.floor(sample.floorAreaSqm * 0.9)}&side=sale`);
    assert.equal(minFloor.res.status, 200);
    for (const p of minFloor.body as { floorAreaSqm?: number }[]) {
      if (p.floorAreaSqm != null) assert.ok(p.floorAreaSqm >= sample.floorAreaSqm! * 0.9);
    }
  }

  const withBeds = (all.body as { bedrooms?: number }[]).find((p) => typeof p.bedrooms === "number" && p.bedrooms >= 2);
  if (withBeds?.bedrooms) {
    const beds = await apiJson(`/api/properties?minBeds=2&side=sale&category=residential`);
    assert.equal(beds.res.status, 200);
    for (const p of beds.body as { bedrooms?: number }[]) {
      if (p.bedrooms != null) assert.ok(p.bedrooms >= 2);
    }
  }
});

test("handover: text search q param on public and admin listings", async (t) => {
  const publicQ = await apiJson("/api/properties?q=Melbourne&side=sale");
  assert.equal(publicQ.res.status, 200);
  assert.ok(Array.isArray(publicQ.body));

  if (!mongoReady()) {
    t.skip("Mongo + ADMIN_SEED_PASSWORD required for admin listing search");
    return;
  }
  const auth = await deskLogin();
  assert.ok(auth);

  const adminQ = await apiJson("/api/properties?includeArchived=1&q=Warragul", auth);
  assert.equal(adminQ.res.status, 200);
  assert.ok(Array.isArray(adminQ.body));
});

test("handover: Warragul development listing is live when seeded", async (t) => {
  const detail = await apiJson(`/api/properties/${WARRAGUL_SLUG}`);
  if (detail.res.status === 404) {
    t.skip("Warragul listing not seeded — run npm run seed:axtra");
    return;
  }
  assert.equal(detail.res.status, 200);
  const p = detail.body.property;
  assert.equal(p.slug, WARRAGUL_SLUG);
  assert.equal(p.assetCategory, "development-site");
  assert.equal(p.propertyType, "development-land");
  assert.ok(p.landAreaSqm >= 200_000);
  assert.ok(Array.isArray(p.images) && p.images.length >= 1);
});

test("handover: development-site listing full CRUD cycle", async (t) => {
  if (!mongoReady()) {
    t.skip("Mongo + ADMIN_SEED_PASSWORD required");
    return;
  }
  const auth = await deskLogin();
  assert.ok(auth);

  const slug = `handover-dev-${Date.now()}`;
  const created = await apiJson("/api/properties", {
    method: "POST",
    headers: auth.headers,
    body: JSON.stringify({
      slug,
      address: "99 Handover Dev Road",
      suburb: "Warragul",
      state: "VIC",
      postcode: "3820",
      status: "for-sale",
      transactionSide: "sale",
      priceLabel: "$15,500,000",
      priceValue: 15_500_000,
      landAreaSqm: 205_700,
      zoning: "FZ",
      propertyType: "development-land",
      description: "Handover test development site.",
      agentLicenceNumber: AGENCY.licenceNumber,
      images: [{ publicId: "kestrel/listings/handover-dev-hero", isHero: true, alt: "Dev site" }],
      featured: true,
    }),
  });
  assert.equal(created.res.status, 201, created.body.error || "create failed");
  const id = created.body.id as string;
  assert.equal(created.body.assetCategory, "development-site");

  const publicRead = await apiJson(`/api/properties/${slug}`);
  assert.equal(publicRead.res.status, 200);
  assert.equal(publicRead.body.property.landAreaSqm, 205_700);

  const devFilter = await apiJson("/api/properties?category=development-site&side=sale");
  assert.ok((devFilter.body as { slug: string }[]).some((p) => p.slug === slug));

  const patched = await apiJson(`/api/properties/${id}`, {
    method: "PATCH",
    headers: auth.headers,
    body: JSON.stringify({ priceLabel: "$16,000,000", priceValue: 16_000_000, permitLots: 132 }),
  });
  assert.equal(patched.res.status, 200);
  assert.equal(patched.body.priceValue, 16_000_000);

  const dup = await apiJson(`/api/properties/${id}/duplicate`, { method: "POST", headers: auth.headers });
  assert.equal(dup.res.status, 201);
  assert.match(dup.body.slug, /-copy/);

  const archived = await apiJson(`/api/properties/${id}`, { method: "DELETE", headers: auth.headers });
  assert.equal(archived.res.status, 200);
  assert.equal(archived.body.archived, true);

  const gone = await apiJson(`/api/properties/${slug}`);
  assert.equal(gone.res.status, 404);

  const adminList = await apiJson("/api/properties?includeArchived=1", auth);
  assert.ok((adminList.body as { slug: string; archived?: boolean }[]).some((p) => p.slug === slug && p.archived));

  await PropertyModel.deleteMany({ slug: { $in: [slug, dup.body.slug] } });
});

test("handover: contacts create, update, notes, role and q filters", async (t) => {
  if (!mongoReady()) {
    t.skip("Mongo + ADMIN_SEED_PASSWORD required");
    return;
  }
  const auth = await deskLogin();
  assert.ok(auth);

  const tag = `handover-contact-${Date.now()}`;
  const created = await apiJson("/api/contacts", {
    method: "POST",
    headers: auth.headers,
    body: JSON.stringify({
      name: `Handover ${tag}`,
      company: "Test Co",
      email: `${tag}@kestrelcommercial.com`,
      phone: "0412345678",
      role: "buyer",
    }),
  });
  assert.equal(created.res.status, 201);
  const id = created.body.id as string;

  const list = await apiJson("/api/contacts?role=buyer", auth);
  assert.equal(list.res.status, 200);
  assert.ok((list.body.contacts as { id: string }[]).some((c) => c.id === id));

  const search = await apiJson(`/api/contacts?q=${encodeURIComponent(tag)}`, auth);
  assert.ok((search.body.contacts as { id: string }[]).some((c) => c.id === id));

  const patched = await apiJson(`/api/contacts/${id}`, {
    method: "PATCH",
    headers: auth.headers,
    body: JSON.stringify({ company: "Updated Co", role: "occupier" }),
  });
  assert.equal(patched.res.status, 200);
  assert.equal(patched.body.company, "Updated Co");

  const noted = await apiJson(`/api/contacts/${id}/notes`, {
    method: "POST",
    headers: auth.headers,
    body: JSON.stringify({ text: "Handover note from test suite." }),
  });
  assert.equal(noted.res.status, 200);
  assert.ok(noted.body.notes?.some((n: { text: string }) => n.text.includes("Handover note")));

  const detail = await apiJson(`/api/contacts/${id}`, auth);
  assert.equal(detail.res.status, 200);
  assert.equal(detail.body.contact.id, id);

  await ContactModel.deleteOne({ _id: id });
});

test("handover: tasks create, update, complete, and filter", async (t) => {
  if (!mongoReady()) {
    t.skip("Mongo + ADMIN_SEED_PASSWORD required");
    return;
  }
  const auth = await deskLogin();
  assert.ok(auth);

  const due = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const created = await apiJson("/api/tasks", {
    method: "POST",
    headers: auth.headers,
    body: JSON.stringify({
      title: "Handover follow-up call",
      dueAt: due,
      priority: "high",
    }),
  });
  assert.equal(created.res.status, 201);
  const id = created.body.id as string;

  const open = await apiJson("/api/tasks?status=open", auth);
  assert.equal(open.res.status, 200);
  assert.ok((open.body.tasks as { id: string }[]).some((task) => task.id === id));

  const patched = await apiJson(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: auth.headers,
    body: JSON.stringify({ status: "done", title: "Handover follow-up — done" }),
  });
  assert.equal(patched.res.status, 200);
  assert.equal(patched.body.status, "done");

  const done = await apiJson("/api/tasks?status=done", auth);
  assert.ok((done.body.tasks as { id: string }[]).some((task) => task.id === id));

  await TaskModel.deleteOne({ _id: id });
});

test("handover: enquiries inbox filters and desk endpoints", async (t) => {
  if (!mongoReady()) {
    t.skip("Mongo + ADMIN_SEED_PASSWORD required");
    return;
  }
  const auth = await deskLogin();
  assert.ok(auth);

  const created = await apiJson("/api/enquiries", {
    method: "POST",
    body: JSON.stringify({
      name: "Handover Enquirer",
      email: `handover-enq-${Date.now()}@kestrelcommercial.com`,
      phone: "0431000099",
      message: "Handover test enquiry.",
      intent: "enquire",
      source: "web",
    }),
  });
  assert.equal(created.res.status, 201);
  const id = created.body.enquiry.id as string;

  const inbox = await apiJson("/api/enquiries", auth);
  assert.equal(inbox.res.status, 200);
  assert.ok((inbox.body.enquiries as { id: string }[]).some((e) => e.id === id));

  const staged = await apiJson("/api/enquiries?stage=new", auth);
  assert.ok((staged.body.enquiries as { id: string }[]).some((e) => e.id === id));

  const stats = await apiJson("/api/admin/stats", auth);
  assert.equal(stats.res.status, 200);
  assert.ok(stats.body.attention);

  const activity = await apiJson("/api/admin/activity?limit=10", auth);
  assert.equal(activity.res.status, 200);

  const search = await apiJson("/api/admin/search?q=Handover", auth);
  assert.equal(search.res.status, 200);

  const leadSources = await apiJson("/api/admin/lead-sources", auth);
  assert.equal(leadSources.res.status, 200);
  assert.ok(Array.isArray(leadSources.body.portals));

  const syndication = await apiJson("/api/admin/syndication", auth);
  assert.equal(syndication.res.status, 200);
  assert.ok(syndication.body.realcommercial);

  const inbound = await apiJson("/api/admin/inbound-emails", auth);
  assert.equal(inbound.res.status, 200);
  assert.ok(Array.isArray(inbound.body.emails));

  const inspections = await apiJson("/api/admin/inspections?days=14", auth);
  assert.equal(inspections.res.status, 200);
  assert.ok(Array.isArray(inspections.body.inspections));

  await EnquiryModel.deleteOne({ _id: id });
});

test("handover: protected routes reject unauthenticated writes", async () => {
  const cases: { method: string; path: string }[] = [
    { method: "GET", path: "/api/enquiries" },
    { method: "GET", path: "/api/contacts" },
    { method: "GET", path: "/api/tasks" },
    { method: "POST", path: "/api/properties" },
    { method: "GET", path: "/api/admin/stats" },
    { method: "GET", path: "/api/newsletter?format=csv" },
    { method: "POST", path: "/api/uploads/sign" },
  ];
  for (const c of cases) {
    const { res } = await apiJson(c.path, { method: c.method, body: c.method === "POST" ? "{}" : undefined });
    assert.equal(res.status, 401, `${c.method} ${c.path} should be 401`);
  }
});
