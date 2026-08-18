import { createHmac, createHash, timingSafeEqual } from "crypto";
import type { PortalKind } from "@kestrel/shared";
import { isDbConnected } from "../db/mongoose";
import { InboundEmailModel } from "../models/InboundEmail";
import { PropertyModel } from "../models/Property";
import { HttpError } from "../middleware/errorHandler";
import { env } from "../config/env";
import { createDeskEnquiry } from "./deskEnquiry";
import {
  emailBodyToText,
  hasMinimumLeadFields,
  parsePortalEnquiry,
  sourceForPortal,
  type ParsedPortalEnquiry,
} from "./portalParsers";

const DEDUPE_WINDOW_MS = 15 * 60 * 1000;

export function inboundDedupeKey(from: string, subject: string, text: string) {
  const normalized = `${from.trim().toLowerCase()}\n${subject.trim().toLowerCase()}\n${text.replace(/\s+/g, " ").trim().toLowerCase()}`;
  return createHash("sha256").update(normalized).digest("hex");
}

/** Svix-style Resend webhook signature. Rejects unsigned payloads. */
export function verifyResendSignature(rawBody: string, headers: Record<string, string | string[] | undefined>) {
  const secret = env.notify.resendWebhookSecret;
  if (!secret) {
    throw new HttpError(401, "Inbound webhook secret is not configured. Unsigned payloads are rejected.");
  }
  const id = header(headers, "svix-id");
  const timestamp = header(headers, "svix-timestamp");
  const signatureHeader = header(headers, "svix-signature");
  if (!id || !timestamp || !signatureHeader) {
    throw new HttpError(401, "Missing Resend webhook signature headers.");
  }
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 60 * 5) {
    throw new HttpError(401, "Resend webhook timestamp is stale.");
  }
  const signed = `${id}.${timestamp}.${rawBody}`;
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", secretBytes).update(signed).digest("base64");
  const candidates = signatureHeader.split(" ").map((part) => part.split(",")[1] || part);
  const ok = candidates.some((sig) => safeEqual(sig, expected));
  if (!ok) throw new HttpError(401, "Invalid Resend webhook signature.");
}

export function signResendPayload(rawBody: string, secret: string, id = "msg_test", timestamp = String(Math.floor(Date.now() / 1000))) {
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", secretBytes).update(`${id}.${timestamp}.${rawBody}`).digest("base64");
  return { id, timestamp, signature: `v1,${expected}` };
}

function header(headers: Record<string, string | string[] | undefined>, name: string) {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(raw) ? raw[0] : raw;
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export type InboundPayload = {
  from: string;
  to?: string;
  subject: string;
  text?: string;
  html?: string;
  emailId?: string;
};

export function extractInboundPayload(body: unknown): InboundPayload {
  const root = (body ?? {}) as Record<string, unknown>;
  const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
  const fromRaw = data.from ?? data.sender ?? root.from;
  const from =
    typeof fromRaw === "string"
      ? fromRaw
      : fromRaw && typeof fromRaw === "object"
        ? String((fromRaw as { email?: string }).email || (fromRaw as { address?: string }).address || "")
        : "";
  const toRaw = data.to ?? root.to;
  const to = Array.isArray(toRaw)
    ? String(toRaw[0] ?? "")
    : typeof toRaw === "string"
      ? toRaw
      : "";
  const emailId = String(data.email_id ?? data.emailId ?? root.email_id ?? "");
  return {
    from,
    to,
    subject: String(data.subject ?? root.subject ?? ""),
    text: String(data.text ?? data.body ?? root.text ?? ""),
    html: String(data.html ?? root.html ?? ""),
    emailId: emailId || undefined,
  };
}

/** Resend's email.received webhook is metadata only. Body comes from the Receiving API. */
async function hydrateFromResend(payload: InboundPayload): Promise<InboundPayload> {
  if (!payload.emailId || !env.notify.resendApiKey) return payload;
  if ((payload.text || "").trim().length >= 20 || (payload.html || "").trim().length >= 20) return payload;
  const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(payload.emailId)}`, {
    headers: { Authorization: `Bearer ${env.notify.resendApiKey}` },
  });
  if (!res.ok) {
    console.warn("[inbound] could not fetch received email", payload.emailId, res.status);
    return payload;
  }
  const body = (await res.json().catch(() => ({}))) as {
    from?: string;
    to?: string | string[];
    subject?: string;
    text?: string | null;
    html?: string | null;
    data?: { text?: string; html?: string; from?: string; subject?: string; to?: string | string[] };
  };
  const email = body.data && typeof body.data === "object" ? { ...body, ...body.data } : body;
  const to = Array.isArray(email.to) ? String(email.to[0] ?? "") : String(email.to ?? payload.to ?? "");
  return {
    ...payload,
    from: payload.from || String(email.from ?? ""),
    to: payload.to || to,
    subject: payload.subject || String(email.subject ?? ""),
    text: String(email.text ?? payload.text ?? ""),
    html: String(email.html ?? payload.html ?? ""),
  };
}

async function matchListing(parsed: ParsedPortalEnquiry) {
  if (!isDbConnected()) return { propertySlug: null as string | null, propertyId: null as string | null };
  if (parsed.listingId) {
    const byPortal = await PropertyModel.findOne({
      $or: [{ portalListingId: parsed.listingId }, { slug: parsed.listingId }],
    })
      .select("_id slug")
      .lean();
    if (byPortal && !Array.isArray(byPortal)) {
      return { propertyId: String(byPortal._id), propertySlug: String(byPortal.slug) };
    }
  }
  if (parsed.address) {
    const rx = new RegExp(parsed.address.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 80), "i");
    const byAddress = await PropertyModel.findOne({ $or: [{ address: rx }, { suburb: rx }] })
      .select("_id slug")
      .lean();
    if (byAddress && !Array.isArray(byAddress)) {
      return { propertyId: String(byAddress._id), propertySlug: String(byAddress.slug) };
    }
  }
  return { propertySlug: null, propertyId: null };
}

export async function processInboundEmail(payload: InboundPayload) {
  if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
  const receivedAt = new Date();
  const pending = await InboundEmailModel.create({
    from: payload.from,
    to: payload.to || env.notify.leadCaptureEmail,
    subject: payload.subject,
    text: emailBodyToText(payload.text, payload.html),
    html: payload.html || "",
    receivedAt,
    dedupeKey: inboundDedupeKey(payload.from, payload.subject, emailBodyToText(payload.text, payload.html)),
    parseStatus: "pending",
    needsReview: false,
    portal: "unknown",
  });

  const hydrated = await hydrateFromResend(payload).catch((err) => {
    console.warn("[inbound] hydrate failed", err instanceof Error ? err.message : err);
    return payload;
  });
  const text = emailBodyToText(hydrated.text, hydrated.html);
  pending.from = hydrated.from || pending.from;
  pending.to = hydrated.to || pending.to;
  pending.subject = hydrated.subject || pending.subject;
  pending.text = text;
  pending.html = hydrated.html || pending.html;
  pending.dedupeKey = inboundDedupeKey(String(pending.from), String(pending.subject), text);
  await pending.save();

  const since = new Date(receivedAt.getTime() - DEDUPE_WINDOW_MS);
  const duplicate = await InboundEmailModel.findOne({
    _id: { $ne: pending._id },
    dedupeKey: pending.dedupeKey,
    receivedAt: { $gte: since },
    enquiryId: { $ne: null },
  }).lean();
  if (duplicate && !Array.isArray(duplicate)) {
    pending.parseStatus = "duplicate";
    pending.needsReview = false;
    pending.enquiryId = duplicate.enquiryId;
    pending.portal = (duplicate.portal as PortalKind) || "unknown";
    await pending.save();
    return { inbound: pending.toObject(), enquiry: null, duplicate: true };
  }

  let parsed: ParsedPortalEnquiry;
  try {
    parsed = parsePortalEnquiry(hydrated.from || payload.from, hydrated.subject || payload.subject, text);
  } catch (err) {
    pending.parseStatus = "needsReview";
    pending.needsReview = true;
    pending.parseError = err instanceof Error ? err.message : "Parser threw";
    await pending.save();
    return { inbound: pending.toObject(), enquiry: null, duplicate: false };
  }

  pending.portal = parsed.portal;
  pending.parsedFields = {
    name: parsed.name,
    phone: parsed.phone,
    email: parsed.email,
    message: parsed.message,
    listingId: parsed.listingId,
    address: parsed.address,
  };

  if (!hasMinimumLeadFields(parsed)) {
    pending.parseStatus = "needsReview";
    pending.needsReview = true;
    pending.parseError = "Need a name and at least one contact method.";
    await pending.save();
    return { inbound: pending.toObject(), enquiry: null, duplicate: false };
  }

  const listing = await matchListing(parsed);
  const created = await createDeskEnquiry({
    name: parsed.name,
    email: parsed.email,
    phone: parsed.phone,
    message: parsed.message || `Portal enquiry: ${hydrated.subject || payload.subject}`,
    source: sourceForPortal(parsed.portal),
    propertySlug: listing.propertySlug,
    propertyId: listing.propertyId,
    portalListingId: parsed.listingId || null,
    inboundEmailId: String(pending._id),
    by: "portal",
  });

  pending.parseStatus = "parsed";
  pending.needsReview = false;
  pending.enquiryId = created.record.id;
  await pending.save();
  return { inbound: pending.toObject(), enquiry: created.record, duplicate: false };
}

export function serializeInbound(doc: Record<string, unknown>) {
  const fields = (doc.parsedFields || {}) as Record<string, string>;
  return {
    id: String(doc._id ?? doc.id ?? ""),
    from: String(doc.from ?? ""),
    to: String(doc.to ?? ""),
    subject: String(doc.subject ?? ""),
    text: String(doc.text ?? ""),
    html: String(doc.html ?? ""),
    receivedAt: doc.receivedAt ? new Date(doc.receivedAt as string | Date).toISOString() : new Date().toISOString(),
    dedupeKey: String(doc.dedupeKey ?? ""),
    parseStatus: doc.parseStatus ?? "pending",
    needsReview: Boolean(doc.needsReview),
    portal: doc.portal ?? "unknown",
    enquiryId: doc.enquiryId ? String(doc.enquiryId) : null,
    parseError: String(doc.parseError ?? ""),
    parsedFields: {
      name: fields.name || "",
      phone: fields.phone || "",
      email: fields.email || "",
      message: fields.message || "",
      listingId: fields.listingId || "",
      address: fields.address || "",
    },
    createdAt: doc.createdAt ? new Date(doc.createdAt as string | Date).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt as string | Date).toISOString() : new Date().toISOString(),
  };
}
