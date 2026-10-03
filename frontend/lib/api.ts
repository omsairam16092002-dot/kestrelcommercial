import {
  AGENTS,
  PROPERTIES,
  filterProperties,
  parseSpecFilters,
  type Agent,
  type BookingKind,
  type BookingMode,
  type BookingSlot,
  type BookingStatus,
  type EnquiryIntent,
  type EnquirySource,
  type EnquiryTopic,
  type InspectionWindow,
  type Property,
  type SpecFilters,
} from "@kestrel/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const REVALIDATE = 60;

export type ApiFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number | "network" };

async function apiFetchResult<T>(
  path: string,
  init?: RequestInit & { revalidate?: number },
): Promise<ApiFetchResult<T>> {
  try {
    const fresh = init?.cache === "no-store";
    const revalidate = init?.revalidate ?? REVALIDATE;
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      cache: fresh ? "no-store" : init?.cache,
      next: fresh ? undefined : { revalidate },
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: "network" };
  }
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit & { revalidate?: number },
): Promise<T | null> {
  const result = await apiFetchResult<T>(path, init);
  return result.ok ? result.data : null;
}

export function apiUrl(path: string): string {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function getProperties(filters: SpecFilters = {}): Promise<Property[]> {
  const params = new URLSearchParams();
  if (filters.side && filters.side !== "all") params.set("side", filters.side);
  if (filters.status?.length) params.set("status", filters.status.join(","));
  if (filters.assetCategory) params.set("category", filters.assetCategory);
  if (filters.minFloorAreaSqm) params.set("minFloor", String(filters.minFloorAreaSqm));
  if (filters.maxFloorAreaSqm) params.set("maxFloor", String(filters.maxFloorAreaSqm));
  if (filters.minClearSpanM) params.set("minSpan", String(filters.minClearSpanM));
  if (filters.minRollerDoorM) params.set("minDoor", String(filters.minRollerDoorM));
  if (filters.minLandAreaSqm) params.set("minLand", String(filters.minLandAreaSqm));
  if (filters.minBedrooms) params.set("minBeds", String(filters.minBedrooms));
  if (filters.minBathrooms) params.set("minBaths", String(filters.minBathrooms));
  if (filters.minCarSpaces) params.set("minCars", String(filters.minCarSpaces));
  if (filters.maxPrice) params.set("maxPrice", String(filters.maxPrice));
  if (filters.zoning) params.set("zoning", filters.zoning);
  if (filters.suburb) params.set("suburb", filters.suburb);
  if (filters.propertyType) params.set("type", filters.propertyType);
  if (filters.threePhasePower) params.set("power", "1");
  if (filters.hardstand) params.set("hardstand", "1");
  if (filters.houseLandPackage) params.set("houseLand", "1");
  if (filters.packageSegment) params.set("package", filters.packageSegment);
  if (filters.featured) params.set("featured", "1");

  const qs = params.toString();
  const data = await apiFetch<Property[]>(`/api/properties${qs ? `?${qs}` : ""}`);
  if (data) return filterProperties(data, filters);
  return filterProperties(PROPERTIES, filters);
}

export async function getFeaturedProperties(): Promise<Property[]> {
  return getProperties({ featured: true });
}

export type PropertyBySlugResult = { property: Property; agent: Agent } | null | "unavailable";

export function isPropertySlugUnavailable(
  data: PropertyBySlugResult,
): data is "unavailable" {
  return data === "unavailable";
}

export function isPropertySlugFound(
  data: PropertyBySlugResult,
): data is { property: Property; agent: Agent } {
  return data != null && data !== "unavailable";
}

export async function getPropertyBySlug(slug: string): Promise<PropertyBySlugResult> {
  const result = await apiFetchResult<{ property: Property; agent: Agent }>(
    `/api/properties/${encodeURIComponent(slug)}`,
    { cache: "no-store" },
  );
  if (result.ok && result.data?.property) return result.data;
  if (!result.ok && result.status !== 404) return "unavailable";
  const property = PROPERTIES.find((p) => p.slug === slug);
  if (!property) return null;
  const agent =
    AGENTS.find((a) => a.licenceNumber === property.agentLicenceNumber) ?? AGENTS[0];
  return { property, agent };
}

export async function getAgents(): Promise<Agent[]> {
  const data = await apiFetch<Agent[]>("/api/agents");
  return data?.length ? data : AGENTS;
}

export type EnquirySubmitResult = {
  ok: true;
  persistence?: string;
  intentLabel?: string;
  enquiry: {
    id: string;
    propertySlug?: string | null;
    intent?: EnquiryIntent;
    documents?: { brochureUrl?: string | null; floorplanUrl?: string | null };
    notify?: { delivered: boolean; channels: string[] };
  };
};

export async function submitEnquiry(body: {
  name: string;
  email?: string;
  phone?: string;
  message: string;
  company?: string;
  topic?: EnquiryTopic | string;
  intent?: EnquiryIntent;
  preferredInspectionAt?: string;
  inspectionWindow?: InspectionWindow;
  source: EnquirySource;
  propertySlug?: string;
  propertyId?: string;
}): Promise<EnquirySubmitResult> {
  const res = await fetch(`${API_URL}/api/enquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Could not send enquiry" }));
    throw new Error(err.error ?? "Could not send enquiry");
  }
  return res.json();
}

export async function subscribeNewsletter(email: string): Promise<{ ok: true; persistence?: string }> {
  const res = await fetch(`${API_URL}/api/newsletter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Could not subscribe" }));
    throw new Error(err.error ?? "Could not subscribe");
  }
  return res.json();
}

async function sendJson<T>(path: string, method: string, body?: unknown, fallback = "Something went wrong"): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new Error(`${fallback}. Check your connection and try again.`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? fallback);
  return data as T;
}

export type PublicBooking = {
  kind: BookingKind;
  kindLabel: string;
  status: BookingStatus;
  startAt: string;
  endAt: string;
  name: string;
  propertySlug: string | null;
  propertyLabel: string | null;
  location: string;
  mode?: BookingMode;
  modeLabel?: string;
  /** Zoho Meeting join link for online meetings. */
  meetingUrl?: string | null;
};

export type SlotsResponse = {
  enabled: boolean;
  timezone: string;
  slotMinutes: number;
  maxDaysAhead?: number;
  meetingLocation?: string;
  /** Zoho Meeting is connected, so "Online" can be offered for meetings. */
  onlineMeetings?: boolean;
  slots: BookingSlot[];
};

export function getBookingSlots(opts: { from?: string; days?: number; token?: string } = {}) {
  const params = new URLSearchParams();
  if (opts.from) params.set("from", opts.from);
  if (opts.days) params.set("days", String(opts.days));
  const qs = params.toString();
  const base = opts.token ? `/api/bookings/manage/${encodeURIComponent(opts.token)}/slots` : "/api/bookings/slots";
  return sendJson<SlotsResponse>(`${base}${qs ? `?${qs}` : ""}`, "GET", undefined, "Could not load available times");
}

export function createBooking(body: {
  kind: BookingKind;
  start: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  notes?: string;
  propertySlug?: string | null;
  mode?: BookingMode;
  website?: string;
}) {
  return sendJson<{ ok: true; booking: PublicBooking; manageToken: string; manageUrl: string; enquiryId: string | null }>(
    "/api/bookings",
    "POST",
    body,
    "Could not book that time",
  );
}

export function getManagedBooking(token: string) {
  return sendJson<{ booking: PublicBooking }>(`/api/bookings/manage/${encodeURIComponent(token)}`, "GET", undefined, "Could not load that booking");
}

export function rescheduleManagedBooking(token: string, start: string) {
  return sendJson<{ booking: PublicBooking }>(
    `/api/bookings/manage/${encodeURIComponent(token)}/reschedule`,
    "POST",
    { start },
    "Could not move that booking",
  );
}

export function cancelManagedBooking(token: string) {
  return sendJson<{ booking: PublicBooking }>(
    `/api/bookings/manage/${encodeURIComponent(token)}/cancel`,
    "POST",
    {},
    "Could not cancel that booking",
  );
}

export function bookingIcsUrl(token: string) {
  return apiUrl(`/api/bookings/manage/${encodeURIComponent(token)}/ics`);
}

export type PublicAlert = {
  label: string;
  summary: string;
  searchPath: string;
  email: string;
  confirmed: boolean;
  active: boolean;
  emailAlerts: boolean;
};

export type AlertMatch = { id: string; slug: string; address: string; priceLabel?: string; status: string };

export function createPropertyAlert(body: { email: string; name?: string; query: string; label?: string; website?: string }) {
  return sendJson<{ ok: true; status: "confirm-sent" | "already-active" | "reactivated" }>(
    "/api/alerts",
    "POST",
    body,
    "Could not save that alert",
  );
}

export function getPropertyAlert(token: string) {
  return sendJson<{ alert: PublicAlert; matches: AlertMatch[] }>(
    `/api/alerts/manage/${encodeURIComponent(token)}`,
    "GET",
    undefined,
    "Could not load that alert",
  );
}

export function updatePropertyAlert(token: string, patch: { confirm?: boolean; active?: boolean }) {
  return sendJson<{ alert: PublicAlert }>(`/api/alerts/manage/${encodeURIComponent(token)}`, "POST", patch, "Could not update that alert");
}

export function deletePropertyAlert(token: string) {
  return sendJson<{ ok: true }>(`/api/alerts/manage/${encodeURIComponent(token)}`, "DELETE", undefined, "Could not remove that alert");
}

export function filtersFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): SpecFilters {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(searchParams)) {
    if (Array.isArray(v)) flat[k] = v[0] ?? "";
    else if (v) flat[k] = v;
  }
  return parseSpecFilters(flat);
}
