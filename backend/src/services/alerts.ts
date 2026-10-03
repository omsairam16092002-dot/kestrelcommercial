import { randomBytes } from "crypto";
import { isValidObjectId } from "mongoose";
import {
  canonicalSearchQuery,
  describeSpecFilters,
  filtersFromSearchQuery,
  fullAddress,
  matchesSpecFilters,
  searchPathForFilters,
  type Property,
  type SavedSearch,
} from "@kestrel/shared";
import { isDbConnected } from "../db/mongoose";
import { HttpError } from "../middleware/errorHandler";
import { ContactModel } from "../models/Contact";
import { PropertyModel } from "../models/Property";
import { ListingAlertModel, SavedSearchModel } from "../models/SavedSearch";
import { TaskModel } from "../models/Task";
import { serializeProperty } from "../utils/serialize";
import { logActivity } from "./activity";
import { renderEmail, siteUrl } from "./emailTemplates";
import { sendEmail } from "./sendEmail";

const AVAILABLE = ["for-sale", "for-lease"];
/** New listings wait this long before alerts go out, so the desk can finish photos and copy. */
const PUBLISH_GRACE_MS = 30 * 60 * 1000;
const LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;

type SearchDoc = {
  _id: unknown;
  email: string;
  name?: string;
  contactId?: unknown;
  origin: "public" | "desk";
  label?: string;
  query: string;
  confirmed: boolean;
  confirmedAt?: Date | null;
  active: boolean;
  emailAlerts: boolean;
  token: string;
  alertCount?: number;
  lastAlertAt?: Date | null;
  createdAt?: Date;
};

export function serializeSearch(doc: SearchDoc): SavedSearch {
  return {
    id: String(doc._id),
    email: doc.email,
    name: doc.name ?? "",
    contactId: doc.contactId ? String(doc.contactId) : null,
    origin: doc.origin,
    label: doc.label || describeSpecFilters(filtersFromSearchQuery(doc.query)),
    query: doc.query,
    confirmed: doc.confirmed,
    active: doc.active,
    emailAlerts: doc.emailAlerts,
    alertCount: doc.alertCount ?? 0,
    lastAlertAt: doc.lastAlertAt ? new Date(doc.lastAlertAt).toISOString() : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
  };
}

export function publicSearch(doc: SearchDoc) {
  const filters = filtersFromSearchQuery(doc.query);
  const [user, domain] = doc.email.split("@");
  return {
    label: doc.label || describeSpecFilters(filters),
    summary: describeSpecFilters(filters),
    searchPath: searchPathForFilters(filters),
    email: `${user.slice(0, 2)}${"•".repeat(Math.max(1, user.length - 2))}@${domain}`,
    confirmed: doc.confirmed,
    active: doc.active,
    emailAlerts: doc.emailAlerts,
  };
}

function manageLink(token: string) {
  return siteUrl(`/alerts/${token}`);
}

export async function createPublicSearch(input: { email: string; name?: string; query: string; label?: string }) {
  if (!isDbConnected()) throw new HttpError(503, "Alerts are unavailable right now. Try again shortly.");
  const email = input.email.trim().toLowerCase();
  const query = canonicalSearchQuery(input.query);
  const label = input.label?.trim() || describeSpecFilters(filtersFromSearchQuery(query));
  const existing = (await SavedSearchModel.findOne({ email, query, origin: "public" }).lean()) as SearchDoc | null;
  if (existing?.confirmed && existing.active) return { status: "already-active" as const };

  const doc = existing
    ? ((await SavedSearchModel.findByIdAndUpdate(existing._id, { active: true, label }, { new: true }).lean()) as unknown as SearchDoc)
    : ((await SavedSearchModel.create({
        email,
        name: input.name?.trim() || "",
        origin: "public",
        label,
        query,
        token: randomBytes(24).toString("hex"),
        by: "public",
      })).toObject() as SearchDoc);

  if (!doc.confirmed) {
    const { html, text } = renderEmail({
      eyebrow: "Property alerts",
      heading: "Confirm your property alert",
      paragraphs: [
        "Tap the button to start getting new Kestrel Commercial listings that match this search — the moment they go live.",
        "If you did not ask for this, ignore this email and nothing will be sent.",
      ],
      details: [["Search", label]],
      cta: { label: "Confirm alert", href: manageLink(doc.token) },
    });
    await sendEmail({ kind: "alert-confirm", to: email, subject: `Confirm your property alert — ${label}`, text, html });
  }
  return { status: doc.confirmed ? ("reactivated" as const) : ("confirm-sent" as const) };
}

export async function findSearchByToken(token: string) {
  if (!isDbConnected() || !/^[a-f0-9]{48}$/.test(token)) return null;
  return (await SavedSearchModel.findOne({ token }).lean()) as SearchDoc | null;
}

export async function updateSearchByToken(token: string, patch: { confirm?: boolean; active?: boolean }) {
  const doc = await findSearchByToken(token);
  if (!doc) throw new HttpError(404, "We could not find that alert. It may have been removed.");
  const update: Record<string, unknown> = {};
  if (patch.confirm && !doc.confirmed) Object.assign(update, { confirmed: true, confirmedAt: new Date(), active: true });
  if (typeof patch.active === "boolean") update.active = patch.active;
  const next = (await SavedSearchModel.findByIdAndUpdate(doc._id, update, { new: true }).lean()) as unknown as SearchDoc;
  return next;
}

export async function deleteSearchByToken(token: string) {
  const doc = await findSearchByToken(token);
  if (!doc) return;
  await Promise.all([SavedSearchModel.deleteOne({ _id: doc._id }), ListingAlertModel.deleteMany({ searchId: doc._id })]);
}

export async function createDeskSearch(input: { contactId: string; query: string; label?: string; emailAlerts: boolean }, by: string) {
  if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
  if (!isValidObjectId(input.contactId)) throw new HttpError(400, "Choose a contact.");
  const contact = (await ContactModel.findById(input.contactId).lean()) as { _id: unknown; name: string; email?: string } | null;
  if (!contact) throw new HttpError(404, "Contact not found");
  if (input.emailAlerts && !contact.email) throw new HttpError(400, "Add an email to this contact before turning on email alerts.");
  const query = canonicalSearchQuery(input.query);
  const created = await SavedSearchModel.create({
    email: (contact.email || `contact-${String(contact._id)}@desk.invalid`).toLowerCase(),
    name: contact.name,
    contactId: contact._id,
    origin: "desk",
    label: input.label?.trim() || describeSpecFilters(filtersFromSearchQuery(query)),
    query,
    confirmed: true,
    confirmedAt: new Date(),
    emailAlerts: input.emailAlerts,
    token: randomBytes(24).toString("hex"),
    by,
  });
  await logActivity({
    type: "search.created",
    entityType: "contact",
    entityId: String(contact._id),
    summary: `Requirement added for ${contact.name}: ${created.label}`,
    by,
  });
  return created.toObject() as SearchDoc;
}

async function liveProperties(filter: Record<string, unknown> = {}) {
  const docs = await PropertyModel.find({ archived: { $ne: true }, status: { $in: AVAILABLE }, ...filter }).lean();
  return docs.map((d) => ({ doc: d as Record<string, unknown>, property: serializeProperty(d as Record<string, unknown>) as Property }));
}

/** Live listings that match a query right now — for the desk's "matches" view and the save-search preview. */
export async function matchingListings(query: string, limit = 12) {
  if (!isDbConnected()) return [];
  const filters = filtersFromSearchQuery(query);
  const rows = await liveProperties();
  return rows
    .filter((row) => matchesSpecFilters(row.property, filters))
    .slice(0, limit)
    .map(({ property }) => ({
      id: property.id,
      slug: property.slug,
      address: fullAddress(property),
      priceLabel: property.priceLabel,
      status: property.status,
    }));
}

/**
 * Alert saved searches about listings that went live in the last fortnight (after a short grace period),
 * once per (search, listing). Desk requirements also raise a call task for the matched contact.
 */
export async function runListingAlerts(now = new Date()) {
  if (!isDbConnected()) return { emails: 0, tasks: 0 };
  const fresh = await liveProperties({
    createdAt: { $gte: new Date(now.getTime() - LOOKBACK_MS), $lte: new Date(now.getTime() - PUBLISH_GRACE_MS) },
    "images.0": { $exists: true },
  });
  if (!fresh.length) return { emails: 0, tasks: 0 };
  const searches = (await SavedSearchModel.find({ active: true, confirmed: true }).lean()) as unknown as SearchDoc[];

  let emails = 0;
  let tasks = 0;
  for (const search of searches) {
    const since = new Date(search.confirmedAt ?? search.createdAt ?? 0).getTime();
    const filters = filtersFromSearchQuery(search.query);
    const matches: { property: Property; id: unknown }[] = [];
    for (const row of fresh) {
      if (new Date(row.doc.createdAt as Date).getTime() < since) continue;
      if (!matchesSpecFilters(row.property, filters)) continue;
      try {
        await ListingAlertModel.create({ searchId: search._id, propertyId: row.doc._id });
        matches.push({ property: row.property, id: row.doc._id });
      } catch (err) {
        if ((err as { code?: number }).code !== 11000) throw err;
      }
    }
    if (!matches.length) continue;

    let to = search.email;
    if (search.origin === "desk" && search.contactId) {
      const contact = (await ContactModel.findById(search.contactId).select("email").lean()) as { email?: string } | null;
      to = contact?.email?.trim().toLowerCase() || "";
    }
    if (search.emailAlerts && to && !to.endsWith("@desk.invalid")) {
      const first = (search.name || "").trim().split(/\s+/)[0];
      const label = search.label || describeSpecFilters(filters);
      const { html, text } = renderEmail({
        eyebrow: "New listing alert",
        heading: matches.length === 1 ? `New: ${fullAddress(matches[0].property)}` : `${matches.length} new listings match your search`,
        paragraphs: [
          `${first ? `Hi ${first}, ` : ""}${matches.length === 1 ? "a new listing" : "new listings"} just went live that match${matches.length === 1 ? "es" : ""} "${label}".`,
          "Reply to this email or call to book an inspection before it hits the portals.",
        ],
        details: matches.map(({ property }) => [fullAddress(property), property.priceLabel || "Contact agent"] as [string, string]),
        cta: { label: matches.length === 1 ? "View the listing" : "View new listings", href: siteUrl(matches.length === 1 ? `/listing/${matches[0].property.slug}` : searchPathForFilters(filters)) },
        secondary: matches.length === 1 ? { label: "Book an inspection", href: siteUrl(`/listing/${matches[0].property.slug}#inspect`) } : undefined,
        footnote: `You are getting this because you set up a Kestrel Commercial property alert. Manage or unsubscribe: ${manageLink(search.token)}`,
      });
      const result = await sendEmail({
        kind: "listing-alert",
        to,
        subject: matches.length === 1 ? `New listing: ${fullAddress(matches[0].property)}` : `${matches.length} new listings — ${label}`,
        text,
        html,
        contactId: search.contactId ? String(search.contactId) : null,
      });
      if (result.status === "sent") {
        emails += 1;
        await ListingAlertModel.updateMany({ searchId: search._id, propertyId: { $in: matches.map((m) => m.id) } }, { emailed: true });
      }
    }

    if (search.origin === "desk" && search.contactId) {
      for (const match of matches) {
        const task = await TaskModel.create({
          title: `Call ${search.name || "contact"} — new match: ${fullAddress(match.property)}`,
          kind: "call",
          status: "open",
          dueAt: now,
          contactId: search.contactId,
          propertySlug: match.property.slug,
          note: `Matches requirement "${search.label || describeSpecFilters(filters)}".`,
          by: "alerts",
        });
        await ListingAlertModel.updateOne({ searchId: search._id, propertyId: match.id }, { taskId: task._id });
        tasks += 1;
      }
    }

    await SavedSearchModel.updateOne({ _id: search._id }, { $inc: { alertCount: matches.length }, lastAlertAt: now });
  }
  return { emails, tasks };
}
