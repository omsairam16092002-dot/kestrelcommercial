/**
 * Zoho CRM (Zoho One) integration.
 *
 * OAuth2 authorization-code flow, connected once from /admin/settings:
 *   GET /api/integrations/zoho/connect  → Zoho consent screen (access_type=offline)
 *   GET /api/integrations/zoho/callback → code exchanged for a refresh token, stored encrypted.
 *
 * Every desk enquiry is pushed after it is saved: the person is upserted as a CRM Lead
 * (deduped on Email, then Phone) with status, source, tags and score; the enquiry is added as a Note;
 * online bookings become a Meeting (Events) and unbooked inspection requests a Task.
 * Each attempt writes a SyncLog row; failures can be retried from Settings.
 *
 * Lead status stays in step both ways: desk stage changes are pushed to Lead_Status, and
 * `pollZohoLeadStatuses` pulls status changes made in Zoho back onto the desk.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { isValidObjectId } from "mongoose";
import {
  BOOKING_KIND_OPTIONS,
  INTENT_LABELS,
  LEAD_SCORE_LABELS,
  formatBookingWhen,
  zonedIsoWithOffset,
  type BookingKind,
  type CrmStage,
  type EnquiryIntent,
  type LeadScore,
} from "@kestrel/shared";
import { env } from "../config/env";
import { isDbConnected } from "../db/mongoose";
import { BookingModel } from "../models/Booking";
import { EnquiryModel } from "../models/Enquiry";
import { IntegrationCredentialModel } from "../models/IntegrationCredential";
import { SyncLogModel } from "../models/SyncLog";
import { propertyLabelFor } from "./deskEnquiry";

const SCOPES = "ZohoCRM.modules.ALL,ZohoCRM.org.READ";
const API_VERSION = "v8";

const SOURCE_LABELS: Record<string, string> = {
  web: "Website enquiry form",
  phone: "Phone / WhatsApp click",
  eoi: "Expression of interest",
  appraisal: "Appraisal request",
  "appraisal-quick": "Quick appraisal request",
  contact: "Contact page",
  newsletter: "Newsletter sign-up",
  "portal-rea": "realestate.com.au",
  "portal-realcommercial": "realcommercial.com.au",
};

/** Lead_Source picklist value and a short CRM tag per desk source. */
const SOURCE_ZOHO: Record<string, { leadSource: string; tag: string }> = {
  web: { leadSource: "Website", tag: "Website" },
  phone: { leadSource: "Website", tag: "Website" },
  eoi: { leadSource: "Website", tag: "EOI" },
  appraisal: { leadSource: "Website", tag: "Appraisal" },
  "appraisal-quick": { leadSource: "Website", tag: "Appraisal" },
  contact: { leadSource: "Website", tag: "Website" },
  newsletter: { leadSource: "Website", tag: "Newsletter" },
  "portal-rea": { leadSource: "realestate.com.au", tag: "REA" },
  "portal-realcommercial": { leadSource: "realcommercial.com.au", tag: "realcommercial" },
};

/** Desk stage → Zoho's standard Lead_Status values. */
const STAGE_TO_STATUS: Record<CrmStage, string> = {
  new: "Not Contacted",
  contacted: "Contacted",
  qualified: "Pre-Qualified",
  inspecting: "Pre-Qualified",
  negotiating: "Pre-Qualified",
  won: "Pre-Qualified",
  lost: "Lost Lead",
};

/** Zoho Lead_Status → desk stage. "Attempted to Contact" only counts as a first response. */
const STATUS_TO_STAGE: Record<string, CrmStage | null> = {
  "Not Contacted": null,
  "Attempted to Contact": null,
  "Contact in Future": "contacted",
  Contacted: "contacted",
  "Pre-Qualified": "qualified",
  "Not Qualified": "lost",
  "Junk Lead": "lost",
  "Lost Lead": "lost",
};

const STAGE_ORDER: CrmStage[] = ["new", "contacted", "qualified", "inspecting", "negotiating", "won"];

/** Fields Zoho may reject on a customised org (picklist edited, tags disabled) — dropped and retried. */
const OPTIONAL_LEAD_FIELDS = new Set(["Lead_Source", "Tag", "Lead_Status"]);

function expectedLeadStatus(enquiry: { crmStage?: CrmStage; firstResponseAt?: Date | null }) {
  if (!enquiry.firstResponseAt) return "Not Contacted";
  return STAGE_TO_STATUS[enquiry.crmStage ?? "new"];
}

type Credential = {
  refreshTokenEnc: string;
  accountsServer: string;
  apiDomain: string;
  orgName?: string;
  connectedBy?: string;
  connectedAt?: Date;
};

let accessCache: { token: string; expiresAt: number } | null = null;

export class ZohoError extends Error {}

export function isZohoConfigured(): boolean {
  return Boolean(env.zoho.clientId && env.zoho.clientSecret);
}

function cipherKey() {
  return createHash("sha256").update(env.zoho.tokenKey ?? env.jwtSecret).digest();
}

function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", cipherKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
}

function decrypt(payload: string): string {
  const [iv, tag, data] = payload.split(".").map((part) => Buffer.from(part, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", cipherKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/** Zoho returns the user's data-centre hosts on the callback; only accept genuine Zoho domains. */
function zohoHost(raw: unknown, pattern: RegExp): string | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && pattern.test(url.hostname) ? url.origin : null;
  } catch {
    return null;
  }
}

const ACCOUNTS_HOST = /^accounts\.zoho(cloud)?\.[a-z]{2,3}(\.[a-z]{2})?$/;
const API_HOST = /^(www\.)?zohoapis\.[a-z]{2,3}(\.[a-z]{2})?$/;

export function zohoAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    scope: SCOPES,
    client_id: env.zoho.clientId ?? "",
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    redirect_uri: env.zoho.redirectUri,
    state,
  });
  return `${env.zoho.accountsUrl}/oauth/v2/auth?${params.toString()}`;
}

async function tokenRequest(accountsServer: string, params: Record<string, string>) {
  const res = await fetch(`${accountsServer}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.zoho.clientId ?? "",
      client_secret: env.zoho.clientSecret ?? "",
      ...params,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || data.error || !data.access_token) {
    throw new ZohoError(`Zoho token request failed: ${String(data.error ?? res.status)}`);
  }
  return data as { access_token: string; refresh_token?: string; api_domain?: string; expires_in?: number; scope?: string };
}

async function loadCredential(): Promise<Credential | null> {
  if (!isDbConnected()) return null;
  return (await IntegrationCredentialModel.findOne({ integration: "zoho" }).lean()) as Credential | null;
}

async function crmFetch(apiDomain: string, accessToken: string, path: string, init?: RequestInit) {
  const res = await fetch(`${apiDomain}/crm/${API_VERSION}/${path}`, {
    ...init,
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { res, data };
}

export async function exchangeZohoCode(input: { code: string; accountsServer?: unknown; by: string }) {
  const accountsServer = zohoHost(input.accountsServer, ACCOUNTS_HOST) ?? env.zoho.accountsUrl;
  const token = await tokenRequest(accountsServer, {
    grant_type: "authorization_code",
    redirect_uri: env.zoho.redirectUri,
    code: input.code,
  });
  if (!token.refresh_token) {
    throw new ZohoError("Zoho did not return a refresh token. Disconnect the app in Zoho and connect again.");
  }
  const apiDomain = zohoHost(token.api_domain, API_HOST) ?? env.zoho.apiUrl;

  let orgName = "";
  const org = await crmFetch(apiDomain, token.access_token, "org").catch(() => null);
  const orgRow = (org?.data.org as { company_name?: string }[] | undefined)?.[0];
  if (orgRow?.company_name) orgName = orgRow.company_name;

  await IntegrationCredentialModel.findOneAndUpdate(
    { integration: "zoho" },
    {
      integration: "zoho",
      refreshTokenEnc: encrypt(token.refresh_token),
      accountsServer,
      apiDomain,
      scope: token.scope ?? SCOPES,
      orgName,
      connectedBy: input.by,
      connectedAt: new Date(),
    },
    { upsert: true, new: true },
  );
  accessCache = { token: token.access_token, expiresAt: Date.now() + ((token.expires_in ?? 3600) - 120) * 1000 };
  return { orgName };
}

export async function disconnectZoho() {
  const cred = await loadCredential();
  accessCache = null;
  if (!cred) return;
  const refreshToken = decryptSafe(cred.refreshTokenEnc);
  if (refreshToken) {
    await fetch(`${cred.accountsServer}/oauth/v2/token/revoke?token=${encodeURIComponent(refreshToken)}`, {
      method: "POST",
    }).catch(() => undefined);
  }
  await IntegrationCredentialModel.deleteOne({ integration: "zoho" });
}

function decryptSafe(payload: string): string | null {
  try {
    return decrypt(payload);
  } catch {
    return null;
  }
}

async function session(): Promise<{ apiDomain: string; token: string } | null> {
  const cred = await loadCredential();
  if (!cred || !isZohoConfigured()) return null;
  if (accessCache && accessCache.expiresAt > Date.now()) return { apiDomain: cred.apiDomain, token: accessCache.token };
  const refreshToken = decryptSafe(cred.refreshTokenEnc);
  if (!refreshToken) throw new ZohoError("Stored Zoho token cannot be read (key changed). Reconnect Zoho in Settings.");
  const token = await tokenRequest(cred.accountsServer, { grant_type: "refresh_token", refresh_token: refreshToken });
  accessCache = { token: token.access_token, expiresAt: Date.now() + ((token.expires_in ?? 3600) - 120) * 1000 };
  return { apiDomain: cred.apiDomain, token: token.access_token };
}

export async function zohoStatus() {
  const cred = await loadCredential();
  return {
    configured: isZohoConfigured(),
    connected: Boolean(cred),
    orgName: cred?.orgName || null,
    connectedBy: cred?.connectedBy || null,
    connectedAt: cred?.connectedAt ? new Date(cred.connectedAt).toISOString() : null,
    dataCentre: new URL(cred?.accountsServer ?? env.zoho.accountsUrl).hostname.replace(/^accounts\./, ""),
  };
}

function splitName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { first: "", last: parts[0] || "Unknown" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

function melbourneDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(date);
}

function recordResult(data: Record<string, unknown>, step: string) {
  const row = (data.data as { code?: string; message?: string; details?: { id?: string; api_name?: string }; action?: string }[] | undefined)?.[0];
  if (!row || row.code !== "SUCCESS" || !row.details?.id) {
    const reason = row ? `${row.code}: ${row.message ?? ""}${row.details?.api_name ? ` (${row.details.api_name})` : ""}` : String(data.code ?? data.message ?? "no response");
    throw new ZohoError(`${step} failed — ${reason}`.trim());
  }
  return { id: row.details.id, action: row.action };
}

type EnquiryDoc = {
  _id: unknown;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  message: string;
  intent?: EnquiryIntent;
  source: string;
  topic?: string;
  propertySlug?: string | null;
  preferredInspectionAt?: string;
  inspectionWindow?: string;
  bookingId?: unknown;
  leadScore?: LeadScore | null;
  crmStage?: CrmStage;
  firstResponseAt?: Date | null;
  createdAt?: Date;
};

type BookingLite = {
  _id: unknown;
  kind: BookingKind;
  status: string;
  startAt: Date;
  endAt: Date;
  location?: string;
  notes?: string;
  zohoEventId?: string;
};

type Session = { apiDomain: string; token: string };

type RowResult = { code?: string; message?: string; details?: { id?: string; api_name?: string }; action?: string };

/** Upsert a lead, dropping optional fields Zoho rejects (customised picklists, tags off) and retrying. */
async function upsertLead(sess: Session, record: Record<string, unknown>, duplicateCheck: string[]) {
  const payload = { ...record };
  const dropped: string[] = [];
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await crmFetch(sess.apiDomain, sess.token, "Leads/upsert", {
      method: "POST",
      body: JSON.stringify({ data: [payload], duplicate_check_fields: duplicateCheck }),
    });
    const row = (res.data.data as RowResult[] | undefined)?.[0];
    const field = row?.details?.api_name;
    if (row && row.code !== "SUCCESS" && field && OPTIONAL_LEAD_FIELDS.has(field) && field in payload) {
      delete payload[field];
      dropped.push(field);
      continue;
    }
    return { ...recordResult(res.data, "Lead upsert"), dropped };
  }
  throw new ZohoError("Lead upsert failed — too many rejected fields");
}

function kindTitle(kind: BookingKind) {
  return BOOKING_KIND_OPTIONS.find((k) => k.value === kind)?.label ?? kind;
}

async function createMeeting(sess: Session, leadId: string, booking: BookingLite, enquiry: EnquiryDoc, label: string, lines: string[]) {
  const res = await crmFetch(sess.apiDomain, sess.token, "Events", {
    method: "POST",
    body: JSON.stringify({
      data: [
        {
          Event_Title: `${kindTitle(booking.kind)}${label ? ` · ${label}` : ""} · ${enquiry.name}`,
          Start_DateTime: zonedIsoWithOffset(new Date(booking.startAt)),
          End_DateTime: zonedIsoWithOffset(new Date(booking.endAt)),
          ...(booking.location ? { Venue: booking.location } : {}),
          Description: lines.join("\n"),
          What_Id: { id: leadId },
          $se_module: "Leads",
        },
      ],
    }),
  });
  const eventId = recordResult(res.data, "Meeting").id;
  await BookingModel.updateOne({ _id: booking._id }, { zohoEventId: eventId }).catch(() => undefined);
  return eventId;
}

async function pushEnquiry(enquiry: EnquiryDoc, sess: Session) {
  const id = String(enquiry._id);
  const intent = enquiry.intent ?? "enquire";
  const label = (await propertyLabelFor(enquiry.propertySlug)) || enquiry.propertySlug || "";
  const sourceLabel = SOURCE_LABELS[enquiry.source] ?? enquiry.source;
  const zohoSource = SOURCE_ZOHO[enquiry.source] ?? { leadSource: "Website", tag: "Website" };
  const { first, last } = splitName(enquiry.name);
  const email = enquiry.email?.trim() || "";
  const phone = enquiry.phone?.trim() || "";
  if (!email && !phone) throw new ZohoError("Enquiry has no email or phone to match a Zoho lead on.");

  const booking = enquiry.bookingId
    ? ((await BookingModel.findById(enquiry.bookingId).lean()) as BookingLite | null)
    : null;
  const liveBooking = booking && booking.status === "confirmed" ? booking : null;
  const score = enquiry.leadScore ? LEAD_SCORE_LABELS[enquiry.leadScore] : null;

  const lines = [
    `${INTENT_LABELS[intent]} via ${sourceLabel}`,
    score ? `Lead score: ${score}` : null,
    label ? `Property: ${label}` : null,
    enquiry.propertySlug ? `Listing: ${env.siteUrl}/listing/${enquiry.propertySlug}` : null,
    liveBooking ? `Booked: ${kindTitle(liveBooking.kind)} — ${formatBookingWhen(new Date(liveBooking.startAt).toISOString())}` : null,
    !liveBooking && enquiry.preferredInspectionAt ? `Preferred inspection: ${enquiry.preferredInspectionAt}` : null,
    !liveBooking && enquiry.inspectionWindow ? `Window: ${enquiry.inspectionWindow}` : null,
    `Desk record: ${env.siteUrl}/admin/enquiries/${id}`,
    "",
    enquiry.message,
  ].filter((line) => line !== null) as string[];

  const tags = [zohoSource.tag, score ? `${score} lead` : null, liveBooking ? `${kindTitle(liveBooking.kind)} booked` : null]
    .filter((t): t is string => Boolean(t))
    .map((name) => ({ name }));

  const leadResult = await upsertLead(
    sess,
    {
      ...(first ? { First_Name: first } : {}),
      Last_Name: last,
      Company: enquiry.company?.trim() || "Individual",
      ...(email ? { Email: email } : {}),
      ...(phone ? { Phone: phone } : {}),
      Description: lines.join("\n"),
      Lead_Status: expectedLeadStatus(enquiry),
      Lead_Source: zohoSource.leadSource,
      Tag: tags,
    },
    email ? ["Email"] : ["Phone"],
  );

  const note = await crmFetch(sess.apiDomain, sess.token, `Leads/${leadResult.id}/Notes`, {
    method: "POST",
    body: JSON.stringify({
      data: [{ Note_Title: `${INTENT_LABELS[intent]}${label ? ` · ${label}` : ""}`, Note_Content: lines.join("\n") }],
    }),
  });
  recordResult(note.data, "Note");

  const createTask = async (subject: string, dueDate: string) => {
    const task = await crmFetch(sess.apiDomain, sess.token, "Tasks", {
      method: "POST",
      body: JSON.stringify({
        data: [
          {
            Subject: subject,
            Due_Date: dueDate,
            Status: "Not Started",
            Priority: "High",
            Description: lines.join("\n"),
            What_Id: { id: leadResult.id },
            $se_module: "Leads",
          },
        ],
      }),
    });
    return recordResult(task.data, "Task").id;
  };

  let taskId: string | null = null;
  let eventId: string | null = null;
  let meetingError: string | null = null;
  if (liveBooking) {
    try {
      eventId = await createMeeting(sess, leadResult.id, liveBooking, enquiry, label, lines);
    } catch (err) {
      meetingError = err instanceof Error ? err.message : String(err);
      taskId = await createTask(
        `${kindTitle(liveBooking.kind)} booked${label ? ` · ${label}` : ""} · ${enquiry.name}`,
        melbourneDate(new Date(liveBooking.startAt)),
      );
    }
  } else if (intent === "inspection") {
    taskId = await createTask(`Book inspection${label ? ` · ${label}` : ""} · ${enquiry.name}`, melbourneDate());
  }

  return {
    leadId: leadResult.id,
    leadAction: leadResult.action ?? null,
    taskId,
    eventId,
    ...(meetingError ? { meetingError } : {}),
    ...(leadResult.dropped.length ? { droppedFields: leadResult.dropped } : {}),
  };
}

async function leadIdForEnquiry(enquiryId: string): Promise<string | null> {
  const log = (await SyncLogModel.findOne({ integration: "zoho", recordRef: enquiryId, status: "success" })
    .sort({ createdAt: -1 })
    .lean()) as { meta?: { leadId?: string } } | null;
  return log?.meta?.leadId ?? null;
}

/** Desk → Zoho: mirror the desk stage onto the lead's Lead_Status. */
export async function pushLeadStatus(enquiryId: string) {
  if (!isDbConnected()) return;
  const sess = await session();
  if (!sess) return;
  const leadId = await leadIdForEnquiry(enquiryId);
  if (!leadId) return;
  const enquiry = (await EnquiryModel.findById(enquiryId).select("crmStage firstResponseAt").lean()) as EnquiryDoc | null;
  if (!enquiry) return;
  const res = await crmFetch(sess.apiDomain, sess.token, `Leads/${leadId}`, {
    method: "PUT",
    body: JSON.stringify({ data: [{ Lead_Status: expectedLeadStatus(enquiry) }] }),
  });
  recordResult(res.data, "Lead status");
}

export function queueLeadStatusPush(enquiryId: string) {
  if (!isZohoConfigured()) return;
  void pushLeadStatus(enquiryId).catch((err) => console.error("[zoho] lead status push failed", err));
}

/** Mirror a booking reschedule / cancellation onto its Zoho meeting. */
export async function updateBookingInZoho(bookingId: string) {
  if (!isDbConnected()) return;
  const booking = (await BookingModel.findById(bookingId).lean()) as BookingLite | null;
  if (!booking?.zohoEventId) return;
  const sess = await session();
  if (!sess) return;
  if (booking.status === "cancelled") {
    const res = await crmFetch(sess.apiDomain, sess.token, `Events?ids=${encodeURIComponent(booking.zohoEventId)}`, { method: "DELETE" });
    recordResult(res.data, "Meeting delete");
    await BookingModel.updateOne({ _id: booking._id }, { zohoEventId: "" });
    return;
  }
  const res = await crmFetch(sess.apiDomain, sess.token, `Events/${booking.zohoEventId}`, {
    method: "PUT",
    body: JSON.stringify({
      data: [
        {
          Start_DateTime: zonedIsoWithOffset(new Date(booking.startAt)),
          End_DateTime: zonedIsoWithOffset(new Date(booking.endAt)),
        },
      ],
    }),
  });
  recordResult(res.data, "Meeting update");
}

export function queueBookingZohoUpdate(bookingId: string) {
  if (!isZohoConfigured()) return;
  void updateBookingInZoho(bookingId).catch((err) => console.error("[zoho] booking update failed", err));
}

/**
 * Zoho → desk: pull Lead_Status changes made in Zoho since the last poll onto the newest linked enquiry.
 * The first run only sets the watermark so historic edits are not replayed.
 */
export async function pollZohoLeadStatuses() {
  if (!isDbConnected() || !isZohoConfigured()) return { checked: 0, updated: 0 };
  const cred = (await IntegrationCredentialModel.findOne({ integration: "zoho" }).lean()) as (Credential & { lastPolledAt?: Date | null }) | null;
  if (!cred) return { checked: 0, updated: 0 };
  const startedAt = new Date();
  if (!cred.lastPolledAt) {
    await IntegrationCredentialModel.updateOne({ integration: "zoho" }, { lastPolledAt: startedAt });
    return { checked: 0, updated: 0 };
  }
  const sess = await session();
  if (!sess) return { checked: 0, updated: 0 };

  const since = new Date(new Date(cred.lastPolledAt).getTime() - 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "+00:00");
  const res = await fetch(
    `${sess.apiDomain}/crm/${API_VERSION}/Leads?fields=Lead_Status,Modified_Time&sort_by=Modified_Time&sort_order=desc&per_page=100`,
    { headers: { Authorization: `Zoho-oauthtoken ${sess.token}`, "If-Modified-Since": since } },
  );
  if (res.status === 304 || res.status === 204) {
    await IntegrationCredentialModel.updateOne({ integration: "zoho" }, { lastPolledAt: startedAt });
    return { checked: 0, updated: 0 };
  }
  const body = (await res.json().catch(() => ({}))) as { data?: { id: string; Lead_Status?: string | null }[]; code?: string };
  if (!res.ok) throw new ZohoError(`Lead poll failed: ${body.code ?? res.status}`);
  const leads = body.data ?? [];

  let updated = 0;
  for (const lead of leads) {
    const status = lead.Lead_Status ?? "";
    if (!(status in STATUS_TO_STAGE)) continue;
    const refs = (await SyncLogModel.distinct("recordRef", { integration: "zoho", status: "success", "meta.leadId": lead.id })) as string[];
    const ids = refs.filter((ref) => isValidObjectId(ref));
    if (!ids.length) continue;
    const enquiry = (await EnquiryModel.findOne({ _id: { $in: ids } })
      .sort({ createdAt: -1 })
      .select("crmStage firstResponseAt name")
      .lean()) as (EnquiryDoc & { _id: unknown }) | null;
    if (!enquiry || expectedLeadStatus(enquiry) === status) continue;

    const patch: Record<string, unknown> = {};
    if (status !== "Not Contacted" && !enquiry.firstResponseAt) patch.firstResponseAt = startedAt;
    const target = STATUS_TO_STAGE[status];
    const current = enquiry.crmStage ?? "new";
    const regress = target === "qualified" && STAGE_ORDER.indexOf(current) > STAGE_ORDER.indexOf("qualified");
    if (target && target !== current && !regress) {
      patch.crmStage = target;
      patch.$push = { notes: { text: `Stage ${current} → ${target} (Zoho lead status: ${status})`, at: startedAt, by: "Zoho CRM" } };
    }
    if (!Object.keys(patch).length) continue;
    await EnquiryModel.updateOne({ _id: enquiry._id }, patch);
    updated += 1;
  }
  await IntegrationCredentialModel.updateOne({ integration: "zoho" }, { lastPolledAt: startedAt });
  return { checked: leads.length, updated };
}

/** Push one enquiry. Safe to call repeatedly — already-synced enquiries are skipped. */
export async function syncEnquiryToZoho(enquiryId: string) {
  if (!isDbConnected()) return { status: "skipped" as const, reason: "db" };
  const sess = await session();
  if (!sess) return { status: "skipped" as const, reason: "not-connected" };

  const done = await SyncLogModel.exists({ integration: "zoho", recordRef: enquiryId, status: "success" });
  if (done) return { status: "skipped" as const, reason: "already-synced" };

  const enquiry = (await EnquiryModel.findById(enquiryId).lean()) as EnquiryDoc | null;
  if (!enquiry) return { status: "skipped" as const, reason: "missing" };

  const log = await SyncLogModel.create({ integration: "zoho", recordRef: enquiryId, status: "running" });
  try {
    const meta = await pushEnquiry(enquiry, sess);
    await SyncLogModel.updateOne({ _id: log._id }, { status: "success", lastAttempt: new Date(), meta });
    return { status: "success" as const, ...meta };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await SyncLogModel.updateOne({ _id: log._id }, { status: "failed", lastAttempt: new Date(), error: message.slice(0, 500) });
    return { status: "failed" as const, error: message };
  }
}

/** Fire-and-forget hook used right after an enquiry is saved. Never throws. */
export function queueEnquirySync(enquiryId: string) {
  if (!isZohoConfigured()) return;
  void syncEnquiryToZoho(enquiryId).catch((err) => console.error("[zoho] enquiry sync failed", err));
}

/** Catch up enquiries from the last `days` that have no successful Zoho sync yet. */
export async function syncPendingEnquiries({ days = 90, limit = 25 } = {}) {
  if (!(await session())) throw new ZohoError("Connect Zoho in Settings first.");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const synced = ((await SyncLogModel.distinct("recordRef", { integration: "zoho", status: "success" })) as string[]).filter(
    (ref) => isValidObjectId(ref),
  );
  const pending = (await EnquiryModel.find({ createdAt: { $gte: since }, _id: { $nin: synced } })
    .sort({ createdAt: 1 })
    .limit(limit)
    .select("_id")
    .lean()) as { _id: unknown }[];

  const totals = { attempted: pending.length, success: 0, failed: 0, skipped: 0 };
  for (const row of pending) {
    const result = await syncEnquiryToZoho(String(row._id));
    totals[result.status] += 1;
  }
  const remaining = Math.max(
    0,
    (await EnquiryModel.countDocuments({ createdAt: { $gte: since }, _id: { $nin: synced } })) - totals.success,
  );
  return { ...totals, remaining };
}
