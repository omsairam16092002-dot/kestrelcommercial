import { INDUSTRIAL_PROPERTY_TYPES } from "./constants";
import type { Property, PropertyType } from "./types";

export function formatLandArea(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 10_000) {
    const ha = value / 10_000;
    return `${new Intl.NumberFormat("en-AU", { maximumFractionDigits: 2 }).format(ha)} ha`;
  }
  return formatSqm(value);
}

export function formatSqm(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${new Intl.NumberFormat("en-AU").format(value)} m²`;
}

/** Always smallest → largest. Use for any size or price range on the site. */
export function formatAscendingRange(
  a: number | null | undefined,
  b: number | null | undefined,
  format: (n: number) => string,
): string {
  const nums = [a, b].filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  if (!nums.length) return "—";
  if (nums.length === 1) return format(nums[0]);
  const lo = Math.min(nums[0], nums[1]);
  const hi = Math.max(nums[0], nums[1]);
  return `${format(lo)} – ${format(hi)}`;
}

export function formatMetres(value: number | null | undefined, digits = 1): string {
  if (value == null) return "—";
  return `${value.toFixed(digits)} m`;
}

export function formatAud(value: number | null | undefined): string {
  if (value == null) return "Contact agent";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function propertyTypeLabel(type: PropertyType): string {
  switch (type) {
    case "office-warehouse":
      return "Office / warehouse";
    case "warehouse":
      return "Warehouse";
    case "development-land":
      return "Development land";
    case "showroom":
      return "Showroom";
    case "yard":
      return "Yard";
    case "house":
      return "House";
    case "townhouse":
      return "Townhouse";
    case "apartment":
      return "Apartment";
    case "rural":
      return "Rural";
    default:
      return type;
  }
}

export function isIndustrialPropertyType(type: PropertyType): boolean {
  return (INDUSTRIAL_PROPERTY_TYPES as readonly PropertyType[]).includes(type);
}

export function listingPreviewSpecs(property: Property): { k: string; v: string }[] {
  if (isIndustrialPropertyType(property.propertyType) || property.propertyType === "development-land") {
    return [
      { k: "GFA", v: formatSqm(property.floorAreaSqm) },
      { k: "Land", v: formatLandArea(property.landAreaSqm) },
      { k: "Span", v: formatMetres(property.clearSpanM) },
      { k: "Zone", v: property.zoning },
    ];
  }
  return [
    { k: "Beds", v: property.bedrooms != null ? String(property.bedrooms) : "—" },
    { k: "Baths", v: property.bathrooms != null ? String(property.bathrooms) : "—" },
    { k: "Cars", v: property.carSpaces != null ? String(property.carSpaces) : "—" },
    { k: "Size", v: formatSqm(property.floorAreaSqm) },
  ];
}

export function listingSearchSpecs(property: Property): { k: string; v: string }[] {
  if (isIndustrialPropertyType(property.propertyType) || property.propertyType === "development-land") {
    return [
      { k: "GFA", v: formatSqm(property.floorAreaSqm) },
      { k: "Span", v: formatMetres(property.clearSpanM) },
      { k: "Door", v: formatMetres(property.rollerDoorM) },
      { k: "Zone", v: property.zoning },
      { k: "3P", v: property.threePhasePower ? "Yes" : "No" },
      { k: "Yard", v: property.hardstand ? "Yes" : "No" },
    ];
  }
  return [
    { k: "Beds", v: property.bedrooms != null ? String(property.bedrooms) : "—" },
    { k: "Baths", v: property.bathrooms != null ? String(property.bathrooms) : "—" },
    { k: "Cars", v: property.carSpaces != null ? String(property.carSpaces) : "—" },
    { k: "GFA", v: formatSqm(property.floorAreaSqm) },
    { k: "Land", v: formatLandArea(property.landAreaSqm) },
    { k: "Zone", v: property.zoning },
  ];
}

export function fullAddress(p: {
  address: string;
  suburb: string;
  state?: string;
  postcode?: string;
}): string {
  return `${p.address}, ${p.suburb} ${p.state ?? "VIC"} ${p.postcode ?? ""}`.trim();
}

export function yesNo(value: boolean | null | undefined): string {
  if (value == null) return "—";
  return value ? "Yes" : "No";
}
