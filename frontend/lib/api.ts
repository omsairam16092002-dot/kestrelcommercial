import {
  AGENTS,
  PROPERTIES,
  filterProperties,
  parseSpecFilters,
  type Agent,
  type EnquiryIntent,
  type EnquirySource,
  type EnquiryTopic,
  type InspectionWindow,
  type Property,
  type SpecFilters,
} from "@kestrel/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const REVALIDATE = 60;

async function apiFetch<T>(
  path: string,
  init?: RequestInit & { revalidate?: number },
): Promise<T | null> {
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
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
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
  if (filters.featured) params.set("featured", "1");

  const qs = params.toString();
  const data = await apiFetch<Property[]>(`/api/properties${qs ? `?${qs}` : ""}`);
  if (data) return filterProperties(data, filters);
  return filterProperties(PROPERTIES, filters);
}

export async function getFeaturedProperties(): Promise<Property[]> {
  return getProperties({ featured: true });
}

export async function getPropertyBySlug(
  slug: string,
): Promise<{ property: Property; agent: Agent } | null> {
  const data = await apiFetch<{ property: Property; agent: Agent }>(
    `/api/properties/${encodeURIComponent(slug)}`,
    { revalidate: 10 },
  );
  if (data?.property) return data;
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
