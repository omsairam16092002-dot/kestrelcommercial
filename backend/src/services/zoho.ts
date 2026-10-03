/**
 * Zoho CRM (Zoho One) integration.
 *
 * OAuth2 authorization-code flow, connected once from /admin/settings:
 *   GET /api/integrations/zoho/connect  → Zoho consent screen (access_type=offline)
 *   GET /api/integrations/zoho/callback → code exchanged for a refresh token, stored encrypted.
 *
 * Every desk enquiry is pushed after it is saved: the person is upserted as a CRM Lead
 * (deduped on Email, then Phone), the enquiry is added as a Note, and inspection requests
 * also create a Task. Each attempt writes a SyncLog row; failures can be retried from Settings.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { isValidObjectId } from "mongoose";
import { INTENT_LABELS, type EnquiryIntent } from "@kestrel/shared";
import { env } from "../config/env";
import { isDbConnected } from "../db/mongoose";
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
  propertySlug?: string | null;
  preferredInspectionAt?: string;
  inspectionWindow?: string;
  createdAt?: Date;
};

async function pushEnquiry(enquiry: EnquiryDoc, sess: { apiDomain: string; token: string }) {
  const id = String(enquiry._id);
  const intent = enquiry.intent ?? "enquire";
  const label = (await propertyLabelFor(enquiry.propertySlug)) || enquiry.propertySlug || "";
  const sourceLabel = SOURCE_LABELS[enquiry.source] ?? enquiry.source;
  const { first, last } = splitName(enquiry.name);
  const email = enquiry.email?.trim() || "";
  const phone = enquiry.phone?.trim() || "";
  if (!email && !phone) throw new ZohoError("Enquiry has no email or phone to match a Zoho lead on.");

  const lines = [
    `${INTENT_LABELS[intent]} via ${sourceLabel}`,
    label ? `Property: ${label}` : null,
    enquiry.propertySlug ? `Listing: ${env.siteUrl}/listing/${enquiry.propertySlug}` : null,
    enquiry.preferredInspectionAt ? `Preferred inspection: ${enquiry.preferredInspectionAt}` : null,
    enquiry.inspectionWindow ? `Window: ${enquiry.inspectionWindow}` : null,
    `Desk record: ${env.siteUrl}/admin/enquiries/${id}`,
    "",
    enquiry.message,
  ].filter((line) => line !== null);

  const lead = await crmFetch(sess.apiDomain, sess.token, "Leads/upsert", {
    method: "POST",
    body: JSON.stringify({
      data: [
        {
          ...(first ? { First_Name: first } : {}),
          Last_Name: last,
          Company: enquiry.company?.trim() || "Individual",
          ...(email ? { Email: email } : {}),
          ...(phone ? { Phone: phone } : {}),
          Description: lines.join("\n"),
        },
      ],
      duplicate_check_fields: email ? ["Email"] : ["Phone"],
    }),
  });
  const leadResult = recordResult(lead.data, "Lead upsert");

  const note = await crmFetch(sess.apiDomain, sess.token, `Leads/${leadResult.id}/Notes`, {
    method: "POST",
    body: JSON.stringify({
      data: [{ Note_Title: `${INTENT_LABELS[intent]}${label ? ` · ${label}` : ""}`, Note_Content: lines.join("\n") }],
    }),
  });
  recordResult(note.data, "Note");

  let taskId: string | null = null;
  if (intent === "inspection") {
    const task = await crmFetch(sess.apiDomain, sess.token, "Tasks", {
      method: "POST",
      body: JSON.stringify({
        data: [
          {
            Subject: `Book inspection${label ? ` · ${label}` : ""} · ${enquiry.name}`,
            Due_Date: melbourneDate(),
            Status: "Not Started",
            Priority: "High",
            Description: lines.join("\n"),
            What_Id: { id: leadResult.id },
            $se_module: "Leads",
          },
        ],
      }),
    });
    taskId = recordResult(task.data, "Task").id;
  }

  return { leadId: leadResult.id, leadAction: leadResult.action ?? null, taskId };
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
