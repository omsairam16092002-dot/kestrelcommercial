import { ASSET_CATEGORY_LABELS, HOUSE_LAND_SECTION, PACKAGE_SEGMENT_OPTIONS } from "./constants";
import { parseSpecFilters, specFiltersToSearchParams } from "./filters";
import { formatAscendingRange, formatAud, formatSqm, propertyTypeLabel } from "./format";
import type { SpecFilters } from "./types";

/** Canonical query string for a saved search — unknown keys dropped, stable key order. */
export function canonicalSearchQuery(query: string | URLSearchParams | SpecFilters): string {
  const filters = typeof query === "string" || query instanceof URLSearchParams ? parseSpecFilters(new URLSearchParams(query)) : query;
  return specFiltersToSearchParams({ ...filters, featured: undefined, status: undefined });
}

export function filtersFromSearchQuery(query: string): SpecFilters {
  return parseSpecFilters(new URLSearchParams(query));
}

/** Plain-English summary, e.g. "Commercial · For sale · Warehouse · Truganina · Up to $2,000,000". */
export function describeSpecFilters(filters: SpecFilters): string {
  const parts: string[] = [];
  if (filters.houseLandPackage) parts.push(HOUSE_LAND_SECTION.short);
  else if (filters.assetCategory) parts.push(ASSET_CATEGORY_LABELS[filters.assetCategory].short);
  if (filters.side === "sale") parts.push("For sale");
  if (filters.side === "lease") parts.push("For lease");
  if (filters.propertyType) parts.push(propertyTypeLabel(filters.propertyType));
  if (filters.packageSegment) {
    const segment = PACKAGE_SEGMENT_OPTIONS.find((o) => o.value === filters.packageSegment)?.label;
    if (segment) parts.push(segment);
  }
  if (filters.suburb) parts.push(filters.suburb);
  if (filters.minFloorAreaSqm || filters.maxFloorAreaSqm) {
    parts.push(
      filters.minFloorAreaSqm && filters.maxFloorAreaSqm
        ? formatAscendingRange(filters.minFloorAreaSqm, filters.maxFloorAreaSqm, formatSqm)
        : filters.minFloorAreaSqm
          ? `${formatSqm(filters.minFloorAreaSqm)}+`
          : `Up to ${formatSqm(filters.maxFloorAreaSqm)}`,
    );
  }
  if (filters.minLandAreaSqm) parts.push(`Land ${formatSqm(filters.minLandAreaSqm)}+`);
  if (filters.minClearSpanM) parts.push(`${filters.minClearSpanM} m span+`);
  if (filters.minRollerDoorM) parts.push(`${filters.minRollerDoorM} m door+`);
  if (filters.minBedrooms) parts.push(`${filters.minBedrooms}+ bed`);
  if (filters.minBathrooms) parts.push(`${filters.minBathrooms}+ bath`);
  if (filters.minCarSpaces) parts.push(`${filters.minCarSpaces}+ car`);
  if (filters.zoning) parts.push(filters.zoning);
  if (filters.threePhasePower) parts.push("3-phase");
  if (filters.hardstand) parts.push("Hardstand");
  if (filters.maxPrice) parts.push(`Up to ${formatAud(filters.maxPrice)}`);
  return parts.length ? parts.join(" · ") : "All new listings";
}

/** Public search page that shows this search's results. */
export function searchPathForFilters(filters: SpecFilters): string {
  const base = filters.houseLandPackage
    ? HOUSE_LAND_SECTION.path
    : ASSET_CATEGORY_LABELS[filters.assetCategory ?? "commercial"].path;
  const qs = specFiltersToSearchParams({ ...filters, assetCategory: undefined, houseLandPackage: undefined, featured: undefined });
  return `${base}${qs ? `?${qs}` : ""}`;
}
