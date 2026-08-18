import {
  normalizePropertyStatus,
  type Agent,
  type Property,
  type TransactionSide,
} from "@kestrel/shared";

function serializeCoord(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function serializeLatLng(latRaw: unknown, lngRaw: unknown): { lat: number | null; lng: number | null } {
  const lat = serializeCoord(latRaw);
  const lng = serializeCoord(lngRaw);
  if (lat == null || lng == null || (lat === 0 && lng === 0)) {
    return { lat: null, lng: null };
  }
  return { lat, lng };
}

export function serializeProperty(
  doc: Record<string, unknown>,
  opts?: { includeInternal?: boolean },
): Property {
  const id = String(doc._id ?? doc.id ?? "");
  const side = (doc.transactionSide as TransactionSide | undefined) ?? undefined;
  const status = normalizePropertyStatus(doc.status, side);
  const transactionSide: TransactionSide =
    side ?? (status === "for-lease" || status === "leased" ? "lease" : "sale");
  return {
    id,
    slug: String(doc.slug),
    address: String(doc.address),
    suburb: String(doc.suburb),
    state: String(doc.state ?? "VIC"),
    postcode: String(doc.postcode),
    status,
    transactionSide,
    priceLabel: String(doc.priceLabel),
    priceValue: (doc.priceValue as number | null) ?? null,
    floorAreaSqm: (doc.floorAreaSqm as number | null) ?? null,
    landAreaSqm: (doc.landAreaSqm as number | null) ?? null,
    clearSpanM: (doc.clearSpanM as number | null) ?? null,
    rollerDoorM: (doc.rollerDoorM as number | null) ?? null,
    threePhasePower: Boolean(doc.threePhasePower),
    hardstand: Boolean(doc.hardstand),
    bedrooms: (doc.bedrooms as number | null) ?? null,
    bathrooms: (doc.bathrooms as number | null) ?? null,
    carSpaces: (doc.carSpaces as number | null) ?? null,
    zoning: String(doc.zoning),
    propertyType: doc.propertyType as Property["propertyType"],
    description: String(doc.description),
    images: Array.isArray(doc.images) ? (doc.images as Property["images"]) : [],
    floorplanPublicId: (doc.floorplanPublicId as string | null) ?? null,
    brochureUrl: (doc.brochureUrl as string | null) ?? null,
    agentLicenceNumber: String(doc.agentLicenceNumber),
    featured: Boolean(doc.featured),
    ...serializeLatLng(doc.lat, doc.lng),
    yieldPercent: (doc.yieldPercent as number | null) ?? null,
    leaseTermYears: (doc.leaseTermYears as number | null) ?? null,
    outgoingsPa: (doc.outgoingsPa as number | null) ?? null,
    evidenceLine: (doc.evidenceLine as string | null) ?? null,
    ...(opts?.includeInternal
      ? { internalNotes: String(doc.internalNotes ?? "") || null }
      : {}),
    pexaWorkspaceId: String(doc.pexaWorkspaceId ?? "") || null,
    portalListingId: String(doc.portalListingId ?? "") || null,
    syndicateToRealcommercial: Boolean(doc.syndicateToRealcommercial),
    syndicateToCommercialRealEstate: Boolean(doc.syndicateToCommercialRealEstate),
    externalListingIds: {
      realcommercial: String((doc.externalListingIds as { realcommercial?: string } | undefined)?.realcommercial ?? "") || null,
      commercialRealEstate:
        String((doc.externalListingIds as { commercialRealEstate?: string } | undefined)?.commercialRealEstate ?? "") || null,
    },
    archived: Boolean(doc.archived),
    createdAt: new Date(doc.createdAt as string | Date).toISOString(),
    updatedAt: new Date(doc.updatedAt as string | Date).toISOString(),
  };
}

export function serializeAgent(doc: Record<string, unknown>): Agent {
  return {
    id: String(doc._id ?? doc.id ?? ""),
    name: String(doc.name),
    licenceNumber: String(doc.licenceNumber),
    phone: String(doc.phone),
    email: String(doc.email),
    photoPublicId: String(doc.photoPublicId ?? ""),
    title: String(doc.title ?? ""),
    bio: String(doc.bio ?? ""),
  };
}
