import type { Metadata } from "next";
import type { SpecFilters } from "@kestrel/shared";
import { getSiteUrl } from "./siteUrl";

export function siteOrigin() {
  return getSiteUrl();
}

/** Spec filters beyond side — these create thin/duplicate index URLs. */
export function hasHeavySearchFilters(filters: SpecFilters): boolean {
  return Boolean(
    filters.minFloorAreaSqm ||
      filters.maxFloorAreaSqm ||
      filters.minClearSpanM ||
      filters.minRollerDoorM ||
      filters.minLandAreaSqm ||
      filters.minBedrooms ||
      filters.minBathrooms ||
      filters.minCarSpaces ||
      filters.maxPrice ||
      filters.zoning ||
      filters.suburb ||
      filters.propertyType ||
      filters.threePhasePower ||
      filters.hardstand ||
      filters.featured ||
      (filters.status?.length && filters.status.length > 0),
  );
}

export function hubCanonicalPath(basePath: string, filters: SpecFilters): string {
  if (filters.side === "lease") return `${basePath}?side=lease`;
  return basePath;
}

export function searchHubMetadata(opts: {
  canonicalPath: string;
  title: string;
  description: string;
  filters: SpecFilters;
}): Metadata {
  const heavy = hasHeavySearchFilters(opts.filters);
  const canonical = hubCanonicalPath(opts.canonicalPath, opts.filters);
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical },
    robots: heavy ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: `${opts.title} · Kestrel Commercial`,
      description: opts.description,
      url: canonical,
    },
  };
}

export function listingTitle(property: {
  address: string;
  suburb: string;
  transactionSide: string;
  propertyType: string;
}): string {
  const side = property.transactionSide === "lease" ? "Lease" : "Sale";
  const type = property.propertyType.replace(/-/g, " ");
  const spec = type.charAt(0).toUpperCase() + type.slice(1);
  return `${property.address}, ${property.suburb} — ${spec} For ${side}`;
}
