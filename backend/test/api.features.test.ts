import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Server } from "node:http";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import mongoose from "mongoose";
import { AGENCY, isStockImageId } from "@kestrel/shared";
import { createApp } from "../src/app";
import { connectDb, isDbConnected } from "../src/db/mongoose";
import { seedAdminUser } from "../src/services/seedAdmin";
import { env } from "../src/config/env";
import { EnquiryModel } from "../src/models/Enquiry";
import { PropertyModel } from "../src/models/Property";
import { ContactModel } from "../src/models/Contact";
import { TaskModel } from "../src/models/Task";
import { InboundEmailModel } from "../src/models/InboundEmail";
import { CommunicationModel } from "../src/models/Communication";
import { processInboundEmail } from "../src/services/inboundLeads";
import { sendEmail } from "../src/services/sendEmail";

const REA_FIXTURE = `You have received a new enquiry from realestate.com.au

Name: Jane Occupier
Email: jane.occupier@example.com
Phone: 0412 345 678
Message: Looking at this warehouse for our west-side operation.
Property: 14 Logistics Drive, Truganina
Listing ID: REA-441122
`;

function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listFiles(p));
    else out.push(p);
  }
  return out;
}

let server: Server;
let base = "";

function cookiesFrom(res: Response, prev = "") {
  const jar = new Map(
    prev
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const i = p.indexOf("=");
        return [p.slice(0, i), p.slice(i + 1)] as [string, string];
      }),
  );
  const set = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  for (const c of set) {
    const pair = c.split(";")[0] ?? "";
    const i = pair.indexOf("=");
    if (i > 0) jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function json(path: string, init?: RequestInit) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

before(async () => {
  try {
    await connectDb();
    await seedAdminUser();
  } catch {
    /* fixture mode */
  }
  await new Promise<void>((resolve) => {
    server = createApp().listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      base = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  if (mongoose.connection.readyState) await mongoose.disconnect();
});

test("health reports api, db and cloudinary", async () => {
  const { res, body } = await json("/health");
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.service, "kestrel-api");
  assert.ok(body.db === "mongo" || body.db === "fixtures");
  assert.equal(typeof body.cloudinary, "boolean");
});

test("public listings and agents are readable without auth", async () => {
  const listings = await json("/api/properties");
  assert.equal(listings.res.status, 200);
  assert.ok(Array.isArray(listings.body));
  assert.ok(listings.body.length >= 1);
  for (const p of listings.body) {
    assert.ok(p.transactionSide === "sale" || p.transactionSide === "lease");
    assert.notEqual(p.status, "auction");
    assert.notEqual(p.archived, true);
    assert.equal(p.internalNotes, undefined);
  }

  const sale = await json("/api/properties?side=sale");
  assert.ok(sale.body.every((p: { transactionSide: string }) => p.transactionSide === "sale"));

  const lease = await json("/api/properties?side=lease");
  assert.ok(lease.body.every((p: { transactionSide: string }) => p.transactionSide === "lease"));

  const houseType = await json("/api/properties?type=house&side=sale");
  assert.equal(houseType.res.status, 200);
  if (Array.isArray(houseType.body) && houseType.body.length) {
    assert.ok(houseType.body.every((p: { propertyType: string }) => p.propertyType === "house"));
    const sample = houseType.body[0] as { slug: string; bedrooms?: number };
    const detail = await json(`/api/properties/${encodeURIComponent(sample.slug)}`);
    assert.equal(detail.res.status, 200);
    assert.equal(detail.body.property.internalNotes, undefined);
    assert.ok(detail.body.property.description);
    if (sample.bedrooms != null) assert.equal(typeof detail.body.property.bedrooms, "number");
  }

  const agents = await json("/api/agents");
  assert.equal(agents.res.status, 200);
  assert.ok(Array.isArray(agents.body));
  assert.ok(agents.body[0]?.name);
  assert.ok(agents.body[0]?.licenceNumber);
});

test("public enquiry and newsletter work; inbox is protected", async () => {
  const blocked = await json("/api/enquiries");
  assert.equal(blocked.res.status, 401);

  const created = await json("/api/enquiries", {
    method: "POST",
    body: JSON.stringify({
      name: "Node Test Buyer",
      email: "node-test@kestrelcommercial.com",
      phone: "0431000038",
      message: "Checking enquiry intake from the automated feature suite.",
      intent: "enquire",
      source: "web",
    }),
  });
  assert.equal(created.res.status, 201);
  assert.equal(created.body.ok, true);
  assert.ok(created.body.enquiry?.id);

  const newsletterEmail = `node-test-${Date.now()}@kestrelcommercial.com`;
  const newsletter = await json("/api/newsletter", {
    method: "POST",
    body: JSON.stringify({ email: newsletterEmail }),
  });
  assert.ok(newsletter.res.status === 201 || newsletter.res.status === 200);
  const newsletterAgain = await json("/api/newsletter", {
    method: "POST",
    body: JSON.stringify({ email: newsletterEmail }),
  });
  assert.equal(newsletterAgain.res.status, 200);
  assert.equal(newsletterAgain.body.duplicate, true);

  const subs = await json("/api/newsletter");
  assert.equal(subs.res.status, 401);

  const sign = await json("/api/uploads/sign", { method: "POST", body: JSON.stringify({ folder: "kestrel/agents" }) });
  assert.equal(sign.res.status, 401);

  const listingWrite = await json("/api/properties", {
    method: "POST",
    body: JSON.stringify({ slug: "nope" }),
  });
  assert.equal(listingWrite.res.status, 401);

  const statsBlocked = await json("/api/admin/stats");
  assert.equal(statsBlocked.res.status, 401);
  const notifyBlocked = await json("/api/admin/notifications");
  assert.equal(notifyBlocked.res.status, 401);
  const inspectBlocked = await json("/api/admin/inspections");
  assert.equal(inspectBlocked.res.status, 401);
  const searchBlocked = await json("/api/admin/search?q=west");
  assert.equal(searchBlocked.res.status, 401);
  const csvBlocked = await json("/api/newsletter?format=csv");
  assert.equal(csvBlocked.res.status, 401);
});

test("desk auth, crm, listing CRUD, archive and agent portrait", async (t) => {
  if (!isDbConnected() || !env.adminSeedPassword) {
    t.skip("Mongo + ADMIN_SEED_PASSWORD required for desk feature tests");
    return;
  }

  const login = await json("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: env.adminSeedEmail,
      password: env.adminSeedPassword,
    }),
  });
  assert.equal(login.res.status, 200, login.body.error || "login failed");
  assert.equal(login.body.ok, true);
  const cookie = cookiesFrom(login.res);
  assert.match(cookie, /kestrel_admin=/);
  assert.match(cookie, /kestrel_desk=/);

  const auth = { headers: { Cookie: cookie } };

  const me = await json("/api/auth/me", auth);
  assert.equal(me.res.status, 200);
  assert.equal(me.body.user.email, env.adminSeedEmail.toLowerCase());

  const inbox = await json("/api/enquiries", auth);
  assert.equal(inbox.res.status, 200);
  assert.ok(Array.isArray(inbox.body.enquiries));
  const lead = inbox.body.enquiries.find((e: { email?: string }) => e.email === "node-test@kestrelcommercial.com");
  assert.ok(lead, "public enquiry should appear in the desk inbox");

  const staged = await json(`/api/enquiries/${lead.id}/stage`, {
    method: "PATCH",
    headers: auth.headers,
    body: JSON.stringify({ crmStage: "contacted" }),
  });
  assert.equal(staged.res.status, 200);
  assert.equal(staged.body.crmStage, "contacted");

  const noted = await json(`/api/enquiries/${lead.id}/notes`, {
    method: "POST",
    headers: auth.headers,
    body: JSON.stringify({ text: "Called from node test." }),
  });
  assert.equal(noted.res.status, 200);
  assert.ok(noted.body.notes?.some((n: { text: string }) => n.text.includes("node test")));

  const slug = `node-test-${Date.now()}`;
  const createdListing = await json("/api/properties", {
    method: "POST",
    headers: auth.headers,
    body: JSON.stringify({
      slug,
      address: "1 Test Drive",
      suburb: "Truganina",
      state: "VIC",
      postcode: "3029",
      status: "for-sale",
      transactionSide: "sale",
      priceLabel: "$1,250,000 + GST",
      priceValue: 1250000,
      zoning: "IN1Z",
      propertyType: "warehouse",
      description: "Automated node test listing.",
      agentLicenceNumber: AGENCY.licenceNumber,
      images: [{ publicId: "kestrel/listings/node-test-hero", isHero: true, alt: "Test" }],
      featured: false,
    }),
  });
  assert.equal(createdListing.res.status, 201, createdListing.body.error || "create listing failed");
  const listingId = createdListing.body.id;
  assert.ok(listingId);

  const publicHit = await json(`/api/properties/${slug}`);
  assert.equal(publicHit.res.status, 200);
  assert.equal(publicHit.body.property.slug, slug);
  assert.equal(publicHit.body.property.transactionSide, "sale");
  assert.ok(publicHit.body.agent?.licenceNumber);

  const patched = await json(`/api/properties/${listingId}`, {
    method: "PATCH",
    headers: auth.headers,
    body: JSON.stringify({ priceLabel: "$1,200,000 + GST", priceValue: 1200000 }),
  });
  assert.equal(patched.res.status, 200);
  assert.equal(patched.body.priceValue, 1200000);

  const dup = await json(`/api/properties/${listingId}/duplicate`, { method: "POST", headers: auth.headers });
  assert.equal(dup.res.status, 201);
  assert.match(dup.body.slug, /-copy/);

  const archived = await json(`/api/properties/${listingId}`, { method: "DELETE", headers: auth.headers });
  assert.equal(archived.res.status, 200);
  assert.equal(archived.body.archived, true);

  const gone = await json(`/api/properties/${slug}`);
  assert.equal(gone.res.status, 404);

  const adminList = await json("/api/properties?includeArchived=1", auth);
  assert.ok(adminList.body.some((p: { slug: string; archived?: boolean }) => p.slug === slug && p.archived));

  const agents = await json("/api/agents");
  const agent = agents.body[0];
  const previousPhoto = agent.photoPublicId;
  const uploaded = "kestrel/agents/mfntqffneeizxmmfhqwi";

  const photoPatch = await json(`/api/agents/${encodeURIComponent(agent.licenceNumber)}`, {
    method: "PATCH",
    headers: auth.headers,
    body: JSON.stringify({ photoPublicId: uploaded }),
  });
  assert.equal(photoPatch.res.status, 200);
  assert.equal(photoPatch.body.photoPublicId, uploaded);
  assert.equal(isStockImageId(photoPatch.body.photoPublicId), false);

  const live = await json("/api/agents");
  assert.equal(live.body[0].photoPublicId, uploaded);
  assert.doesNotMatch(String(live.body[0].photoPublicId), /^unsplash:/);

  const listingAgent = await json(`/api/properties/${dup.body.slug}`);
  assert.equal(listingAgent.body.agent.photoPublicId, uploaded);

  if (previousPhoto && previousPhoto !== uploaded) {
    await json(`/api/agents/${encodeURIComponent(agent.licenceNumber)}`, {
      method: "PATCH",
      headers: auth.headers,
      body: JSON.stringify({ photoPublicId: previousPhoto }),
    });
  }

  const status = await json("/api/uploads/status");
  assert.equal(status.res.status, 200);
  assert.equal(status.body.db, "mongo");

  if (env.cloudinary.cloudName) {
    const signed = await json("/api/uploads/sign", {
      method: "POST",
      headers: auth.headers,
      body: JSON.stringify({ folder: "kestrel/agents" }),
    });
    assert.equal(signed.res.status, 200);
    assert.ok(signed.body.signature);
    assert.equal(signed.body.cloudName, env.cloudinary.cloudName);
  }

  const stats = await json("/api/admin/stats", auth);
  assert.equal(stats.res.status, 200);
  assert.equal(stats.body.db, "mongo");
  assert.equal(typeof stats.body.staleNew, "number");
  assert.ok(stats.body.attention);
  assert.ok(Array.isArray(stats.body.activity));

  const searched = await json(`/api/enquiries?q=Node%20Test&stage=contacted`, auth);
  assert.equal(searched.res.status, 200);
  assert.ok(searched.body.enquiries.some((e: { id: string }) => e.id === lead.id));

  const follow = await json(`/api/enquiries/${lead.id}/follow-up`, {
    method: "PATCH",
    headers: auth.headers,
    body: JSON.stringify({ followUpAt: new Date().toISOString().slice(0, 10), followUpNote: "Call back" }),
  });
  assert.equal(follow.res.status, 200);
  assert.ok(follow.body.followUpAt);
  assert.equal(follow.body.followUpNote, "Call back");

  const inspectDate = new Date().toISOString().slice(0, 10);
  const inspectLead = await json("/api/enquiries", {
    method: "POST",
    body: JSON.stringify({
      name: "Node Inspect Buyer",
      email: "node-inspect@kestrelcommercial.com",
      phone: "0431000038",
      message: "Please book an inspection for the test listing this week.",
      intent: "inspection",
      source: "web",
      preferredInspectionAt: inspectDate,
      inspectionWindow: "morning",
      propertySlug: slug,
    }),
  });
  assert.equal(inspectLead.res.status, 201);
  const inspectId = inspectLead.body.enquiry.id;

  const diary = await json(`/api/admin/inspections?from=${inspectDate}&days=7`, auth);
  assert.equal(diary.res.status, 200);
  assert.ok(diary.body.inspections.some((row: { id: string }) => row.id === inspectId || row.name === "Node Inspect Buyer"));

  const byId = await json(`/api/properties/id/${listingId}`, auth);
  assert.equal(byId.res.status, 200);
  assert.equal(byId.body.slug, slug);
  assert.equal(typeof byId.body.leadCount, "number");

  const listingSearch = await json(`/api/properties?includeArchived=1&withLeadCounts=1&q=Test%20Drive`, auth);
  assert.equal(listingSearch.res.status, 200);
  assert.ok(listingSearch.body.some((p: { slug: string }) => p.slug === slug || p.slug?.includes("copy")));

  const activity = await json("/api/admin/activity?limit=20", auth);
  assert.equal(activity.res.status, 200);
  assert.ok(activity.body.activity.some((a: { type: string }) => String(a.type).startsWith("enquiry") || String(a.type).startsWith("listing")));

  const notes = await json("/api/admin/notifications", auth);
  assert.equal(notes.res.status, 200);
  assert.equal(typeof notes.body.unread, "number");
  const read = await json("/api/admin/notifications/read", { method: "POST", headers: auth.headers });
  assert.equal(read.res.status, 200);

  const palette = await json("/api/admin/search?q=Truganina", auth);
  assert.equal(palette.res.status, 200);
  assert.ok(Array.isArray(palette.body.listings));

  const csv = await fetch(`${base}/api/newsletter?format=csv`, { headers: auth.headers });
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get("content-type") || "", /csv/);
  const csvText = await csv.text();
  assert.match(csvText, /email/);

  const health = await json("/api/admin/health", auth);
  assert.equal(health.res.status, 200);
  assert.ok(health.body.db);

  const bulk = await json("/api/enquiries/bulk-stage", {
    method: "POST",
    headers: auth.headers,
    body: JSON.stringify({ ids: [lead.id], crmStage: "qualified" }),
  });
  assert.equal(bulk.res.status, 200);
  assert.ok(bulk.body.enquiries.some((e: { id: string; crmStage: string }) => e.id === lead.id && e.crmStage === "qualified"));

  const stillPublic = await json(`/api/properties/${dup.body.slug}`);
  assert.equal(stillPublic.res.status, 200);

  await PropertyModel.deleteMany({ slug: { $in: [slug, dup.body.slug] } });
  await EnquiryModel.deleteMany({ email: { $in: ["node-test@kestrelcommercial.com", "node-inspect@kestrelcommercial.com"] } });
});

test("lead record embeds listing; attach listing; phone search; integrations auth", async (t) => {
  if (!isDbConnected() || !env.adminSeedPassword) {
    t.skip("Mongo + ADMIN_SEED_PASSWORD required for lead / integration tests");
    return;
  }

  const login = await json("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: env.adminSeedEmail,
      password: env.adminSeedPassword,
    }),
  });
  assert.equal(login.res.status, 200, login.body.error || "login failed");
  const cookie = cookiesFrom(login.res);
  const auth = { headers: { Cookie: cookie } };

  const unauthConnect = await json("/api/integrations/xero/connect");
  assert.equal(unauthConnect.res.status, 401);
  const unauthPexa = await json("/api/integrations/pexa/connect");
  assert.equal(unauthPexa.res.status, 401);
  const unauthStatus = await json("/api/integrations/status");
  assert.equal(unauthStatus.res.status, 401);

  const status = await json("/api/integrations/status", auth);
  assert.equal(status.res.status, 200);
  assert.equal(typeof status.body.xero.configured, "boolean");
  assert.equal(typeof status.body.pexa.configured, "boolean");
  assert.match(String(status.body.xero.note), /XERO|stub|Connect/i);
  assert.ok(Array.isArray(status.body.recentLogs));

  const xeroConnect = await fetch(`${base}/api/integrations/xero/connect`, {
    headers: auth.headers,
    redirect: "manual",
  });
  if (status.body.xero.configured) {
    assert.ok([301, 302, 303, 307, 308].includes(xeroConnect.status));
  } else {
    assert.equal(xeroConnect.status, 503);
  }

  const pexaConnect = await fetch(`${base}/api/integrations/pexa/connect`, {
    headers: auth.headers,
    redirect: "manual",
  });
  if (status.body.pexa.configured) {
    assert.ok([301, 302, 303, 307, 308].includes(pexaConnect.status));
  } else {
    assert.equal(pexaConnect.status, 503);
  }

  const slug = `lead-integ-${Date.now()}`;
  const createdListing = await json("/api/properties", {
    method: "POST",
    headers: auth.headers,
    body: JSON.stringify({
      slug,
      address: "88 Integration Way",
      suburb: "Laverton North",
      state: "VIC",
      postcode: "3026",
      status: "for-sale",
      transactionSide: "sale",
      priceLabel: "$2,400,000 + GST",
      priceValue: 2400000,
      zoning: "IN1Z",
      propertyType: "warehouse",
      description: "Lead integration test listing.",
      agentLicenceNumber: AGENCY.licenceNumber,
      images: [{ publicId: "kestrel/listings/lead-integ-hero", isHero: true, alt: "Test" }],
      featured: false,
      pexaWorkspaceId: "pexa-test-ws",
    }),
  });
  assert.equal(createdListing.res.status, 201, createdListing.body.error || "create listing failed");
  assert.equal(createdListing.body.pexaWorkspaceId, "pexa-test-ws");
  const listingId = createdListing.body.id;

  const created = await json("/api/enquiries", {
    method: "POST",
    body: JSON.stringify({
      name: "Romeesh Integ",
      email: "romeesh-integ@kestrelcommercial.com",
      phone: "7477024421",
      message: "hi interested in the property.",
      intent: "enquire",
      source: "web",
      propertySlug: slug,
    }),
  });
  assert.equal(created.res.status, 201);
  const enquiryId = created.body.enquiry.id;

  const detail = await json(`/api/enquiries/${enquiryId}`, auth);
  assert.equal(detail.res.status, 200);
  assert.equal(detail.body.phone, "7477024421");
  assert.equal(detail.body.email, "romeesh-integ@kestrelcommercial.com");
  assert.equal(detail.body.property?.address, "88 Integration Way");
  assert.equal(detail.body.property?.suburb, "Laverton North");
  assert.ok(detail.body.property?.priceLabel);

  const orphan = await json("/api/enquiries", {
    method: "POST",
    body: JSON.stringify({
      name: "Orphan Lead",
      email: "orphan-integ@kestrelcommercial.com",
      phone: "0412888999",
      message: "Need a warehouse near the west, no listing yet.",
      intent: "enquire",
      source: "web",
    }),
  });
  assert.equal(orphan.res.status, 201);
  const orphanId = orphan.body.enquiry.id;

  const attached = await json(`/api/enquiries/${orphanId}/listing`, {
    method: "PATCH",
    headers: auth.headers,
    body: JSON.stringify({ propertySlug: slug }),
  });
  assert.equal(attached.res.status, 200, attached.body.error || "attach failed");
  assert.equal(attached.body.propertySlug, slug);
  assert.equal(attached.body.propertyId, listingId);
  assert.equal(attached.body.property?.address, "88 Integration Way");

  const phoneSearch = await json(`/api/enquiries?q=7477024421`, auth);
  assert.equal(phoneSearch.res.status, 200);
  assert.ok(phoneSearch.body.enquiries.some((e: { id: string }) => e.id === enquiryId));

  const emailSearch = await json(`/api/enquiries?q=${encodeURIComponent("romeesh-integ@kestrelcommercial.com")}`, auth);
  assert.ok(emailSearch.body.enquiries.some((e: { id: string }) => e.id === enquiryId));

  const palettePhone = await json(`/api/admin/search?q=0412888999`, auth);
  assert.equal(palettePhone.res.status, 200);
  assert.ok(palettePhone.body.enquiries.some((e: { id: string }) => e.id === orphanId));

  await PropertyModel.deleteMany({ slug });
  await EnquiryModel.deleteMany({
    email: { $in: ["romeesh-integ@kestrelcommercial.com", "orphan-integ@kestrelcommercial.com"] },
  });
});

test("PropertyMe CRM: contact upsert, inspection attendance, tasks", async (t) => {
  if (!isDbConnected() || !env.adminSeedPassword) {
    t.skip("Mongo + ADMIN_SEED_PASSWORD required for CRM tests");
    return;
  }

  const login = await json("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: env.adminSeedEmail, password: env.adminSeedPassword }),
  });
  assert.equal(login.res.status, 200);
  const cookie = cookiesFrom(login.res);
  const auth = { headers: { Cookie: cookie } };

  const inspectDate = new Date().toISOString().slice(0, 10);
  const created = await json("/api/enquiries", {
    method: "POST",
    body: JSON.stringify({
      name: "Grow Crm Buyer",
      email: "grow-crm@kestrelcommercial.com",
      phone: "0412999001",
      message: "Please book an inspection for the west warehouse this week.",
      intent: "inspection",
      source: "web",
      topic: "buying-or-leasing",
      preferredInspectionAt: inspectDate,
      inspectionWindow: "morning",
    }),
  });
  assert.equal(created.res.status, 201);
  const enquiryId = created.body.enquiry.id;

  const detail = await json(`/api/enquiries/${enquiryId}`, auth);
  assert.equal(detail.res.status, 200);
  assert.ok(detail.body.contactId, "enquiry should upsert a contact");
  assert.equal(detail.body.inspectionAttendance, "booked");

  const contactId = detail.body.contactId as string;
  const person = await json(`/api/contacts/${contactId}`, auth);
  assert.equal(person.res.status, 200);
  assert.equal(person.body.contact.email, "grow-crm@kestrelcommercial.com");
  assert.ok(person.body.enquiries.some((e: { id: string }) => e.id === enquiryId));
  assert.ok(person.body.tasks.some((task: { kind: string }) => task.kind === "inspect"));

  const list = await json("/api/contacts?q=Grow%20Crm", auth);
  assert.ok(list.body.contacts.some((c: { id: string }) => c.id === contactId));

  const attended = await json(`/api/enquiries/${enquiryId}/attendance`, {
    method: "PATCH",
    headers: auth.headers,
    body: JSON.stringify({ inspectionAttendance: "attended" }),
  });
  assert.equal(attended.res.status, 200);
  assert.equal(attended.body.inspectionAttendance, "attended");

  const task = await json("/api/tasks", {
    method: "POST",
    headers: auth.headers,
    body: JSON.stringify({
      title: "Call Grow Crm Buyer",
      kind: "call",
      contactId,
      enquiryId,
      dueAt: inspectDate,
    }),
  });
  assert.equal(task.res.status, 201, task.body.error || "create task failed");
  const done = await json(`/api/tasks/${task.body.id}`, {
    method: "PATCH",
    headers: auth.headers,
    body: JSON.stringify({ status: "done" }),
  });
  assert.equal(done.body.status, "done");

  const search = await json("/api/admin/search?q=Grow%20Crm", auth);
  assert.ok(search.body.contacts?.some((c: { id: string }) => c.id === contactId));

  await TaskModel.deleteMany({ enquiryId });
  await EnquiryModel.deleteMany({ email: "grow-crm@kestrelcommercial.com" });
  await ContactModel.deleteMany({ email: "grow-crm@kestrelcommercial.com" });
});

test("unsigned Resend inbound webhook is rejected and not persisted", async () => {
  const before = isDbConnected() ? await InboundEmailModel.countDocuments() : 0;
  const { res, body } = await json("/api/webhooks/resend-inbound", {
    method: "POST",
    body: JSON.stringify({
      from: "leads@realestate.com.au",
      subject: "New enquiry",
      text: "Name: Unsigned\nEmail: unsigned@example.com\nPhone: 0412000000",
    }),
  });
  assert.equal(res.status, 401, body.error || "unsigned webhook should 401");
  if (isDbConnected()) {
    assert.equal(await InboundEmailModel.countDocuments(), before);
  }
});

test("REAXML feed is auth-protected", async () => {
  const blocked = await json("/api/properties/feed.xml");
  assert.equal(blocked.res.status, 401);
});

test("sendEmail without API key is skipped, not faked as sent", async (t) => {
  if (env.notify.resendApiKey) {
    t.skip("RESEND_API_KEY is set — skip assertion would hit the live API");
    return;
  }
  const sent = await sendEmail({
    kind: "acknowledgement",
    to: `skip-${Date.now()}@example.com`,
    subject: "Ack skip test",
    text: "Should log skipped, not fake success.",
  });
  assert.equal(sent.status, "skipped");
  if (isDbConnected() && sent.id) {
    const row = await CommunicationModel.findById(sent.id).lean();
    assert.equal(row?.status, "skipped");
    await CommunicationModel.deleteOne({ _id: sent.id });
  }
});

test("portal inbound pipeline, review queue, dedupe, REAXML and skipped send", async (t) => {
  if (!isDbConnected() || !env.adminSeedPassword) {
    t.skip("Mongo + ADMIN_SEED_PASSWORD required for portal / syndication tests");
    return;
  }

  const stamp = Date.now();
  const uniqueEmail = `jane.occupier+${stamp}@example.com`;
  const reaBody = REA_FIXTURE.replace("jane.occupier@example.com", uniqueEmail);

  const parsedOk = await processInboundEmail({
    from: "leads@realestate.com.au",
    to: "leads@leads.kestrelcommercial.com",
    subject: `New enquiry ${stamp}`,
    text: reaBody,
  });
  assert.equal(parsedOk.duplicate, false);
  assert.ok(parsedOk.enquiry);
  assert.equal(String(parsedOk.enquiry.source), "portal-rea");
  assert.equal(String(parsedOk.enquiry.crmStage), "new");
  assert.equal(String(parsedOk.enquiry.email), uniqueEmail);
  assert.equal(String((parsedOk.inbound as { parseStatus?: string }).parseStatus), "parsed");

  const contact = await ContactModel.findOne({ email: uniqueEmail }).lean();
  assert.ok(contact, "portal lead should upsert a contact");

  const beforeIncomplete = await EnquiryModel.countDocuments();
  const incomplete = await processInboundEmail({
    from: "leads@realestate.com.au",
    subject: `Incomplete ${stamp}`,
    text: "Hello from realestate.com.au\nThis has no contact details.",
  });
  assert.equal(incomplete.enquiry, null);
  assert.equal((incomplete.inbound as { needsReview?: boolean }).needsReview, true);
  assert.equal((incomplete.inbound as { parseStatus?: string }).parseStatus, "needsReview");
  assert.equal(await EnquiryModel.countDocuments(), beforeIncomplete);

  const dup = await processInboundEmail({
    from: "leads@realestate.com.au",
    to: "leads@leads.kestrelcommercial.com",
    subject: `New enquiry ${stamp}`,
    text: reaBody,
  });
  assert.equal(dup.duplicate, true);
  assert.equal(dup.enquiry, null);
  assert.equal((dup.inbound as { parseStatus?: string }).parseStatus, "duplicate");
  assert.equal(String((dup.inbound as { enquiryId?: unknown }).enquiryId), String(parsedOk.enquiry.id));
  assert.equal(await EnquiryModel.countDocuments({ email: uniqueEmail }), 1);

  const login = await json("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: env.adminSeedEmail,
      password: env.adminSeedPassword,
    }),
  });
  assert.equal(login.res.status, 200, login.body.error || "login failed");
  const cookie = cookiesFrom(login.res);
  const authHeaders = { Cookie: cookie };

  const feed = await fetch(`${base}/api/properties/feed.xml`, { headers: authHeaders });
  assert.equal(feed.status, 200);
  const xml = await feed.text();
  assert.match(xml, /<propertyList /);
  assert.match(xml, /<street>/);

  const listings = await json("/api/properties");
  const slug = listings.body[0]?.slug as string;
  assert.ok(slug);
  const one = await fetch(`${base}/api/properties/${encodeURIComponent(slug)}/feed.xml`, { headers: authHeaders });
  assert.equal(one.status, 200);
  const oneXml = await one.text();
  assert.match(oneXml, new RegExp(listings.body[0].address.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  await EnquiryModel.deleteMany({ email: uniqueEmail });
  await ContactModel.deleteMany({ email: uniqueEmail });
  await InboundEmailModel.deleteMany({
    $or: [{ subject: `New enquiry ${stamp}` }, { subject: `Incomplete ${stamp}` }],
  });
});

test("no SMS or Twilio modules were added this pass", () => {
  const files = listFiles(join(__dirname, "../src"));
  const offenders = files.filter((f) => {
    const n = f.replace(/\\/g, "/").toLowerCase();
    return /\/(sms|twilio|messagemedia)(\.[a-z]+)?$/.test(n);
  });
  assert.deepEqual(offenders, []);
  for (const name of ["sendEmail.ts", "emailAutomation.ts", "inboundLeads.ts", "portalParsers.ts", "reaxml.ts"]) {
    const src = readFileSync(join(__dirname, "../src/services", name), "utf8");
    assert.doesNotMatch(src, /twilio|messagemedia|\bsms\b/i);
  }
});
