import { PROPERTY_TYPES } from "./constants";
import { deriveAssetCategory } from "./format";
import { statusesForSide } from "./status";
import {
  ASSET_CATEGORIES,
  PROPERTY_STATUSES,
  type Property,
  type SpecFilters,
  type TransactionSide,
} from "./types";

function toNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function toBool(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  const s = String(value).toLowerCase();
  if (s === "1" || s === "true" || s === "yes") return true;
  if (s === "0" || s === "false" || s === "no") return false;
  return undefined;
}

/**
 * Parse URL / Express query into SpecFilters.
 * Rejects Mongo operators — never pass unsanitized query objects to Mongoose.
 */
export function parseSpecFilters(
  query: Record<string, unknown> | URLSearchParams,
): SpecFilters {
  const get = (key: string): unknown => {
    if (query instanceof URLSearchParams) return query.get(key) ?? undefined;
    const v = query[key];
    if (Array.isArray(v)) return v[0];
    return v;
  };

  const sideRaw = String(get("side") ?? "").toLowerCase();
  const side: TransactionSide | "all" | undefined =
    sideRaw === "sale" || sideRaw === "lease" || sideRaw === "all" ? sideRaw : undefined;

  const statusRaw = String(get("status") ?? "");
  const status = statusRaw
    ? statusRaw
        .split(",")
        .map((s) => s.trim())
        .map((s) => (s === "auction" ? "for-sale" : s))
        .filter((s): s is (typeof PROPERTY_STATUSES)[number] =>
          (PROPERTY_STATUSES as readonly string[]).includes(s),
        )
    : undefined;

  const typeRaw = String(get("type") ?? "");
  const propertyType = (PROPERTY_TYPES as readonly string[]).includes(typeRaw)
    ? (typeRaw as SpecFilters["propertyType"])
    : undefined;

  const categoryRaw = String(get("category") ?? "").toLowerCase();
  const assetCategory = (ASSET_CATEGORIES as readonly string[]).includes(categoryRaw)
    ? (categoryRaw as SpecFilters["assetCategory"])
    : undefined;

  const suburb = String(get("suburb") ?? "").trim();
  const zoning = String(get("zoning") ?? "").trim().toUpperCase();

  return {
    side,
    status: status && status.length ? status : undefined,
    assetCategory,
    minFloorAreaSqm: toNumber(get("minFloor")),
    maxFloorAreaSqm: toNumber(get("maxFloor")),
    minClearSpanM: toNumber(get("minSpan")),
    minRollerDoorM: toNumber(get("minDoor")),
    minLandAreaSqm: toNumber(get("minLand")),
    minBedrooms: toNumber(get("minBeds")),
    minBathrooms: toNumber(get("minBaths")),
    minCarSpaces: toNumber(get("minCars")),
    maxPrice: toNumber(get("maxPrice")),
    zoning: zoning || undefined,
    suburb: suburb || undefined,
    propertyType,
    threePhasePower: toBool(get("power")),
    hardstand: toBool(get("hardstand")),
  };
}

export function specFiltersToQuery(filters: SpecFilters): Record<string, string> {
  const q: Record<string, string> = {};
  if (filters.side && filters.side !== "all") q.side = filters.side;
  if (filters.status?.length) q.status = filters.status.join(",");
  if (filters.assetCategory) q.category = filters.assetCategory;
  if (filters.minFloorAreaSqm) q.minFloor = String(filters.minFloorAreaSqm);
  if (filters.maxFloorAreaSqm) q.maxFloor = String(filters.maxFloorAreaSqm);
  if (filters.minClearSpanM) q.minSpan = String(filters.minClearSpanM);
  if (filters.minRollerDoorM) q.minDoor = String(filters.minRollerDoorM);
  if (filters.minLandAreaSqm) q.minLand = String(filters.minLandAreaSqm);
  if (filters.minBedrooms) q.minBeds = String(filters.minBedrooms);
  if (filters.minBathrooms) q.minBaths = String(filters.minBathrooms);
  if (filters.minCarSpaces) q.minCars = String(filters.minCarSpaces);
  if (filters.maxPrice) q.maxPrice = String(filters.maxPrice);
  if (filters.zoning) q.zoning = filters.zoning;
  if (filters.suburb) q.suburb = filters.suburb;
  if (filters.propertyType) q.type = filters.propertyType;
  if (filters.threePhasePower) q.power = "1";
  if (filters.hardstand) q.hardstand = "1";
  return q;
}

export function specFiltersToSearchParams(filters: SpecFilters): string {
  const q = specFiltersToQuery(filters);
  const params = new URLSearchParams(q);
  return params.toString();
}

export function matchesSpecFilters(property: Property, filters: SpecFilters): boolean {
  if (filters.featured && !property.featured) return false;

  if (filters.assetCategory) {
    const category = property.assetCategory ?? deriveAssetCategory(property.propertyType);
    if (category !== filters.assetCategory) return false;
  }

  if (filters.side && filters.side !== "all") {
    if (property.transactionSide !== filters.side) return false;
  }

  if (filters.status?.length) {
    if (!filters.status.includes(property.status)) return false;
  } else if (filters.side && filters.side !== "all") {
    const allowed = statusesForSide(filters.side);
    if (!allowed.includes(property.status)) return false;
  }

  if (filters.minFloorAreaSqm != null) {
    if (property.floorAreaSqm == null || property.floorAreaSqm < filters.minFloorAreaSqm) {
      return false;
    }
  }
  if (filters.maxFloorAreaSqm != null) {
    if (property.floorAreaSqm == null || property.floorAreaSqm > filters.maxFloorAreaSqm) {
      return false;
    }
  }
  if (filters.minClearSpanM != null) {
    if (property.clearSpanM == null || property.clearSpanM < filters.minClearSpanM) {
      return false;
    }
  }
  if (filters.minRollerDoorM != null) {
    if (property.rollerDoorM == null || property.rollerDoorM < filters.minRollerDoorM) {
      return false;
    }
  }
  if (filters.minLandAreaSqm != null) {
    if (property.landAreaSqm == null || property.landAreaSqm < filters.minLandAreaSqm) {
      return false;
    }
  }
  if (filters.minBedrooms != null) {
    if (property.bedrooms == null || property.bedrooms < filters.minBedrooms) return false;
  }
  if (filters.minBathrooms != null) {
    if (property.bathrooms == null || property.bathrooms < filters.minBathrooms) return false;
  }
  if (filters.minCarSpaces != null) {
    if (property.carSpaces == null || property.carSpaces < filters.minCarSpaces) return false;
  }
  if (filters.maxPrice != null) {
    if (property.priceValue == null || property.priceValue > filters.maxPrice) return false;
  }
  if (filters.zoning) {
    if (property.zoning.toUpperCase() !== filters.zoning.toUpperCase()) return false;
  }
  if (filters.suburb) {
    if (!property.suburb.toLowerCase().includes(filters.suburb.toLowerCase())) return false;
  }
  if (filters.propertyType && property.propertyType !== filters.propertyType) return false;
  if (filters.threePhasePower && !property.threePhasePower) return false;
  if (filters.hardstand && !property.hardstand) return false;

  return true;
}

/** Sale first, then lease. Live stock before sold/leased. Featured before the rest. */
export function sortPropertiesBySide(properties: Property[]): Property[] {
  const sideRank = (p: Property) => (p.transactionSide === "sale" ? 0 : 1);
  const statusRank = (p: Property) => {
    if (p.status === "sold" || p.status === "leased") return 2;
    if (p.status === "under-offer") return 1;
    return 0;
  };
  return [...properties].sort((a, b) => {
    const side = sideRank(a) - sideRank(b);
    if (side !== 0) return side;
    const status = statusRank(a) - statusRank(b);
    if (status !== 0) return status;
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return a.address.localeCompare(b.address, "en-AU");
  });
}

export function filterProperties(properties: Property[], filters: SpecFilters): Property[] {
  return sortPropertiesBySide(properties.filter((p) => matchesSpecFilters(p, filters)));
}

/** Strip keys that look like Mongo operators before any DB query is built. */
export function sanitizeQueryKeys<T extends Record<string, unknown>>(input: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key.startsWith("$")) continue;
    if (typeof value === "string" && value.includes("$where")) continue;
    if (value && typeof value === "object" && !Array.isArray(value)) continue;
    (out as Record<string, unknown>)[key] = value;
  }
  return out;
}

export function hasMapCoordinates<T extends Pick<Property, "lat" | "lng">>(
  property: T,
): property is T & { lat: number; lng: number } {
  return latLngPair(property) !== null;
}

/** Safe Leaflet pair. Returns null when missing, null, 0/0, or non-finite. */
export function latLngPair(property: Pick<Property, "lat" | "lng">): [number, number] | null {
  const lat = toNumber(property.lat);
  const lng = toNumber(property.lng);
  if (lat === undefined || lng === undefined) return null;
  if (lat === 0 && lng === 0) return null;
  return [lat, lng];
}
