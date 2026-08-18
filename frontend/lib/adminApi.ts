import type {
  Agent,
  ContactRole,
  CrmStage,
  DeskContact,
  DeskTask,
  DeskTaskKind,
  DeskTaskStatus,
  Enquiry,
  EnquiryPropertySummary,
  InspectionAttendance,
  Property,
} from "@kestrel/shared";

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
  });
  if (res.headers.get("content-type")?.includes("text/csv")) {
    return (await res.text()) as T;
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export type DeskUser = { id: string; email: string; name: string; role: string };

let meCache: { user: DeskUser; at: number } | null = null;

export function clearMeCache() {
  meCache = null;
}

export async function loginDesk(email: string, password: string) {
  clearMeCache();
  const data = await adminFetch<{ ok: true; user: DeskUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  meCache = { user: data.user, at: Date.now() };
  return data;
}

export function registerDesk(body: { email: string; password: string; name: string; inviteCode?: string }) {
  return adminFetch<{ ok: true; user: DeskUser }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function googleDesk(credential: string, inviteCode?: string) {
  return adminFetch<{ ok: true; user: DeskUser }>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential, inviteCode }),
  });
}

export async function meDesk() {
  if (meCache && Date.now() - meCache.at < 60_000) {
    return { ok: true as const, user: meCache.user };
  }
  const data = await adminFetch<{ ok: true; user: DeskUser }>("/api/auth/me");
  meCache = { user: data.user, at: Date.now() };
  return data;
}

export async function logoutDesk() {
  clearMeCache();
  return adminFetch<{ ok: true }>("/api/auth/logout", { method: "POST" });
}

export type DeskActivity = {
  id: string;
  type: string;
  entityType: string;
  entityId: string;
  summary: string;
  by: string;
  at: string;
};

export type DeskLeadLite = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  propertySlug?: string | null;
  property?: EnquiryPropertySummary | null;
  contactId?: string | null;
  intent?: string;
  source?: string;
  crmStage?: string;
  preferredInspectionAt?: string | null;
  inspectionWindow?: string | null;
  inspectionAttendance?: string | null;
  followUpAt?: string | null;
  createdAt?: string | null;
};

export type AdminStats = {
  ok: true;
  db: string;
  cloudinary: boolean;
  xero?: boolean;
  pexa?: boolean;
  redis?: boolean;
  leads7d: number;
  pingFailures: number;
  staleNew: number;
  dueFollowUps: number;
  dueTasks?: number;
  contacts?: number;
  needsReviewCount?: number;
  liveSale: number;
  liveLease: number;
  subscribers: number;
  byStage: Record<string, number>;
  listings: { side: string; status: string; count: number }[];
  attention: {
    staleLeads: DeskLeadLite[];
    pingFailures: DeskLeadLite[];
    noImages: { id: string; slug: string; address: string; suburb: string }[];
    upcomingInspections: DeskLeadLite[];
    dueTasks?: { id: string; title: string; kind?: string; dueAt?: string | null; contactId?: string | null; enquiryId?: string | null }[];
    quietPortals?: { portal: string; source: string; warning: string | null; lastReceivedAt?: string | null }[];
  };
  listingHealth: {
    id: string;
    slug: string;
    address: string;
    suburb: string;
    side: string;
    status: string;
    imageCount: number;
    leadCount: number;
  }[];
  activity: DeskActivity[];
};

export function getAdminStats() {
  return adminFetch<AdminStats>("/api/admin/stats");
}

export function getDeskActivity(params?: { limit?: number; entityType?: string; entityId?: string }) {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.entityType) qs.set("entityType", params.entityType);
  if (params?.entityId) qs.set("entityId", params.entityId);
  const q = qs.toString();
  return adminFetch<{ activity: DeskActivity[] }>(`/api/admin/activity${q ? `?${q}` : ""}`);
}

export type DeskNotification = {
  id: string;
  kind: "enquiry" | "follow-up" | "task";
  href: string;
  title: string;
  detail: string;
  at: string;
};

export function getDeskNotifications() {
  return adminFetch<{ unread: number; lastSeenAt: string | null; items: DeskNotification[] }>(
    "/api/admin/notifications",
  );
}

export function markNotificationsRead() {
  return adminFetch<{ ok: true }>("/api/admin/notifications/read", { method: "POST" });
}

export function getInspections(from?: string, days = 7) {
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  qs.set("days", String(days));
  return adminFetch<{ from: string; to: string; inspections: DeskLeadLite[] }>(
    `/api/admin/inspections?${qs.toString()}`,
  );
}

export type DeskSearchHit = { id: string; name: string; href: string; detail: string };

export function deskSearch(q: string) {
  return adminFetch<{
    enquiries: DeskSearchHit[];
    listings: DeskSearchHit[];
    subscribers: DeskSearchHit[];
    contacts: DeskSearchHit[];
  }>(`/api/admin/search?q=${encodeURIComponent(q)}`);
}

export function getDeskHealth() {
  return adminFetch<{ db: string; cloudinary: boolean; xero: boolean; pexa: boolean; redis: boolean }>(
    "/api/admin/health",
  );
}

export type EnquiryQuery = {
  q?: string;
  stage?: string;
  source?: string;
  intent?: string;
  slug?: string;
  from?: string;
  to?: string;
};

export function getAdminEnquiries(query: EnquiryQuery = {}) {
  const qs = new URLSearchParams();
  if (query.q) qs.set("q", query.q);
  if (query.stage && query.stage !== "all") qs.set("stage", query.stage);
  if (query.source && query.source !== "all") qs.set("source", query.source);
  if (query.intent && query.intent !== "all") qs.set("intent", query.intent);
  if (query.slug) qs.set("slug", query.slug);
  if (query.from) qs.set("from", query.from);
  if (query.to) qs.set("to", query.to);
  const q = qs.toString();
  return adminFetch<{ enquiries: Enquiry[]; persistence: string }>(`/api/enquiries${q ? `?${q}` : ""}`);
}

export function getAdminEnquiry(id: string) {
  return adminFetch<Enquiry>(`/api/enquiries/${encodeURIComponent(id)}`);
}

export function patchEnquiryStage(id: string, crmStage: CrmStage) {
  return adminFetch<Enquiry>(`/api/enquiries/${encodeURIComponent(id)}/stage`, {
    method: "PATCH",
    body: JSON.stringify({ crmStage }),
  });
}

export function bulkEnquiryStage(ids: string[], crmStage: CrmStage) {
  return adminFetch<{ enquiries: Enquiry[] }>("/api/enquiries/bulk-stage", {
    method: "POST",
    body: JSON.stringify({ ids, crmStage }),
  });
}

export function patchEnquiryFollowUp(id: string, body: { followUpAt?: string | null; followUpNote?: string }) {
  return adminFetch<Enquiry>(`/api/enquiries/${encodeURIComponent(id)}/follow-up`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function addEnquiryNote(id: string, text: string) {
  return adminFetch<Enquiry>(`/api/enquiries/${encodeURIComponent(id)}/notes`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function attachEnquiryListing(id: string, propertySlug: string) {
  return adminFetch<Enquiry>(`/api/enquiries/${encodeURIComponent(id)}/listing`, {
    method: "PATCH",
    body: JSON.stringify({ propertySlug }),
  });
}

export function patchEnquiryAttendance(id: string, inspectionAttendance: InspectionAttendance) {
  return adminFetch<Enquiry>(`/api/enquiries/${encodeURIComponent(id)}/attendance`, {
    method: "PATCH",
    body: JSON.stringify({ inspectionAttendance }),
  });
}

export function getAdminContacts(query: { q?: string; role?: string } = {}) {
  const qs = new URLSearchParams();
  if (query.q) qs.set("q", query.q);
  if (query.role && query.role !== "all") qs.set("role", query.role);
  const q = qs.toString();
  return adminFetch<{ contacts: DeskContact[] }>(`/api/contacts${q ? `?${q}` : ""}`);
}

export function getAdminContact(id: string) {
  return adminFetch<{
    contact: DeskContact;
    enquiries: (DeskLeadLite & { property?: EnquiryPropertySummary | null })[];
    tasks: DeskTask[];
  }>(`/api/contacts/${encodeURIComponent(id)}`);
}

export function createAdminContact(body: {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  role?: ContactRole;
}) {
  return adminFetch<DeskContact>("/api/contacts", { method: "POST", body: JSON.stringify(body) });
}

export function patchAdminContact(id: string, body: Partial<{ name: string; company: string; email: string; phone: string; role: ContactRole }>) {
  return adminFetch<DeskContact>(`/api/contacts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function addContactNote(id: string, text: string) {
  return adminFetch<DeskContact>(`/api/contacts/${encodeURIComponent(id)}/notes`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function getAdminTasks(query: { status?: string; kind?: string; due?: string; contactId?: string; enquiryId?: string } = {}) {
  const qs = new URLSearchParams();
  if (query.status) qs.set("status", query.status);
  if (query.kind) qs.set("kind", query.kind);
  if (query.due) qs.set("due", query.due);
  if (query.contactId) qs.set("contactId", query.contactId);
  if (query.enquiryId) qs.set("enquiryId", query.enquiryId);
  const q = qs.toString();
  return adminFetch<{ tasks: DeskTask[] }>(`/api/tasks${q ? `?${q}` : ""}`);
}

export function createAdminTask(body: {
  title: string;
  kind?: DeskTaskKind;
  dueAt?: string | null;
  note?: string;
  contactId?: string | null;
  enquiryId?: string | null;
  propertySlug?: string | null;
}) {
  return adminFetch<DeskTask>("/api/tasks", { method: "POST", body: JSON.stringify(body) });
}

export function patchAdminTask(id: string, body: { title?: string; kind?: DeskTaskKind; status?: DeskTaskStatus; dueAt?: string | null; note?: string }) {
  return adminFetch<DeskTask>(`/api/tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export type IntegrationLog = {
  id: string;
  integration: string;
  recordRef: string;
  status: string;
  error?: string;
  lastAttempt?: string | null;
  createdAt?: string | null;
};

export type IntegrationsStatus = {
  xero: { configured: boolean; note: string };
  pexa: { configured: boolean; note: string };
  redis: boolean;
  recentLogs: IntegrationLog[];
};

export function getIntegrationsStatus() {
  return adminFetch<IntegrationsStatus>("/api/integrations/status");
}

export function getAdminListings(query: {
  q?: string;
  side?: string;
  status?: string;
  suburb?: string;
  type?: string;
  featured?: string;
  archived?: boolean;
} = {}) {
  const qs = new URLSearchParams();
  qs.set("includeArchived", query.archived === false ? "0" : "1");
  qs.set("withLeadCounts", "1");
  if (query.q) qs.set("q", query.q);
  if (query.side && query.side !== "all") qs.set("side", query.side);
  if (query.status) qs.set("status", query.status);
  if (query.suburb) qs.set("suburb", query.suburb);
  if (query.type) qs.set("type", query.type);
  if (query.featured === "1") qs.set("featured", "1");
  return adminFetch<Property[]>(`/api/properties?${qs.toString()}`);
}

export function getAdminListing(id: string) {
  return adminFetch<Property>(`/api/properties/id/${encodeURIComponent(id)}`);
}

export async function createListing(body: Record<string, unknown>) {
  const saved = await adminFetch<Property>("/api/properties", { method: "POST", body: JSON.stringify(body) });
  await revalidatePublicSite().catch(() => undefined);
  return saved;
}

export async function updateListing(id: string, body: Record<string, unknown>) {
  const saved = await adminFetch<Property>(`/api/properties/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  await revalidatePublicSite().catch(() => undefined);
  return saved;
}

export async function archiveListing(id: string) {
  const saved = await adminFetch<Property>(`/api/properties/${encodeURIComponent(id)}`, { method: "DELETE" });
  await revalidatePublicSite().catch(() => undefined);
  return saved;
}

export async function duplicateListing(id: string) {
  const saved = await adminFetch<Property>(`/api/properties/${encodeURIComponent(id)}/duplicate`, { method: "POST" });
  await revalidatePublicSite().catch(() => undefined);
  return saved;
}

export function getAdminAgents() {
  return adminFetch<Agent[]>("/api/agents");
}

export function patchAgent(licenceNumber: string, body: Record<string, unknown>) {
  return adminFetch<Agent>(`/api/agents/${encodeURIComponent(licenceNumber)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function getSubscribers(q?: string) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return adminFetch<{ subscribers: { id: string; email: string; source?: string; createdAt?: string | null }[] }>(
    `/api/newsletter${qs}`,
  );
}

export async function downloadSubscribersCsv() {
  const res = await fetch("/api/newsletter?format=csv", { credentials: "include" });
  if (!res.ok) throw new Error("Could not export subscribers.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "kestrel-subscribers.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function signAndUploadImage(file: File, folder?: string) {
  const signed = await adminFetch<{
    timestamp: number;
    signature: string;
    apiKey: string;
    cloudName: string;
    folder: string;
  }>("/api/uploads/sign", {
    method: "POST",
    body: JSON.stringify({ folder }),
  });
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signed.apiKey);
  form.append("timestamp", String(signed.timestamp));
  form.append("signature", signed.signature);
  form.append("folder", signed.folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  const data = (await res.json()) as { public_id?: string; error?: { message?: string } };
  if (!res.ok || !data.public_id) {
    throw new Error(data.error?.message || "Cloudinary upload failed.");
  }
  return data.public_id;
}

export function uploadStatus() {
  return adminFetch<{ ready: boolean; db?: string; note?: string }>("/api/uploads/status");
}

export function revalidatePublicSite() {
  return fetch("/api/site/revalidate", { method: "POST", credentials: "include" }).then(async (res) => {
    if (!res.ok) throw new Error("Could not refresh the public site cache.");
    return res.json() as Promise<{ ok: true }>;
  });
}

export type LeadSourcesStatus = {
  captureEmail: string;
  agencyInbox: string;
  needsReviewCount: number;
  activeListings: number;
  setup: string[];
  portals: {
    portal: string;
    source: string;
    lastParsedAt: string | null;
    lastReceivedAt: string | null;
    quiet: boolean;
    warning: string | null;
  }[];
};

export function getLeadSources() {
  return adminFetch<LeadSourcesStatus>("/api/admin/lead-sources");
}

export type SyndicationStatus = {
  realcommercial: { portal: string; status: string };
  commercialRealEstate: { portal: string; status: string };
  note: string;
  bulkFeedUrl: string;
};

export function getSyndicationStatus() {
  return adminFetch<SyndicationStatus>("/api/admin/syndication");
}

export type InboundEmailRow = {
  id: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  receivedAt: string;
  parseStatus: string;
  needsReview: boolean;
  portal: string;
  enquiryId?: string | null;
  parseError?: string;
  parsedFields?: {
    name?: string;
    phone?: string;
    email?: string;
    message?: string;
    listingId?: string;
    address?: string;
  };
};

export function getInboundEmails(needsReview = true) {
  return adminFetch<{ emails: InboundEmailRow[] }>(
    `/api/admin/inbound-emails${needsReview ? "?needsReview=1" : ""}`,
  );
}

export function fileInboundEmail(
  id: string,
  body: { name: string; phone?: string; email?: string; message?: string; propertySlug?: string; portal?: string },
) {
  return adminFetch<{ enquiryId: string; inbound: InboundEmailRow }>(
    `/api/admin/inbound-emails/${encodeURIComponent(id)}/file`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function downloadReaxml(path: string, filename: string) {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) throw new Error("Could not download REAXML.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
