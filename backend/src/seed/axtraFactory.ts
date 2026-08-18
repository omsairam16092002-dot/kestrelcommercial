import { AGENCY, formatAud, propertyTypeLabel, type PropertyStatus, type PropertyType } from "@kestrel/shared";

export type AxtraCampaign = {
  suburb: string;
  postcode: string;
  type: PropertyType;
  zoning?: string;
  firb: "YES" | "NO";
  completion?: string;
  primary?: string;
  secondary?: string;
  commission: string;
  pack: string;
  extraCampaign?: string;
};

export type AxtraUnit = {
  slug: string;
  address: string;
  status?: PropertyStatus;
  price: number | null;
  gstExclusive?: boolean;
  reserved?: boolean;
  floor?: number | null;
  land?: number | null;
  beds?: number | null;
  baths?: number | null;
  cars?: number | null;
  carNote?: string;
  yieldPercent?: number | null;
  leaseTermYears?: number | null;
  outgoingsPa?: number | null;
  promo?: string;
  specNote?: string;
  occupancy?: string;
  extra?: string;
  evidenceLine?: string | null;
};

export type AxtraListing = {
  slug: string;
  address: string;
  suburb: string;
  state: "VIC";
  postcode: string;
  status: PropertyStatus;
  transactionSide: "sale";
  priceLabel: string;
  priceValue: number | null;
  floorAreaSqm: number | null;
  landAreaSqm: number | null;
  clearSpanM: null;
  rollerDoorM: null;
  threePhasePower: boolean;
  hardstand: boolean;
  bedrooms: number | null;
  bathrooms: number | null;
  carSpaces: number | null;
  zoning: string;
  propertyType: PropertyType;
  description: string;
  images: [];
  floorplanPublicId: null;
  brochureUrl: null;
  agentLicenceNumber: string;
  featured: false;
  lat: null;
  lng: null;
  yieldPercent: number | null;
  leaseTermYears: number | null;
  outgoingsPa: number | null;
  evidenceLine: string | null;
  internalNotes: string;
  syndicateToRealcommercial: false;
  syndicateToCommercialRealEstate: false;
};

export function passingYield(price: number, annualRent: number) {
  if (!price || !annualRent) return null;
  return Math.round((annualRent / price) * 10000) / 100;
}

export function monthlyYield(price: number, monthly: number) {
  return passingYield(price, monthly * 12);
}

export function weeklyYield(price: number, weekly: number) {
  return passingYield(price, weekly * 52);
}

function joining(parts: (string | null | undefined | false)[]) {
  return parts.filter(Boolean).join("\n\n");
}

function listingCopy(campaign: AxtraCampaign, unit: AxtraUnit, priceLabel: string) {
  const typeLabel = propertyTypeLabel(campaign.type).toLowerCase();
  const headline = `${campaign.suburb} ${typeLabel} offered through Kestrel Commercial.`;
  const specBits = [
    unit.beds != null ? `${unit.beds} bedroom${unit.beds === 1 ? "" : "s"}` : null,
    unit.baths != null ? `${unit.baths} bathroom${unit.baths === 1 ? "" : "s"}` : null,
    unit.cars != null
      ? `${unit.cars} car space${unit.cars === 1 ? "" : "s"}${unit.carNote ? ` (${unit.carNote})` : ""}`
      : unit.carNote,
    unit.floor != null ? `${unit.floor} m² floor area` : null,
    unit.land != null ? `${unit.land} m² land (approx.)` : null,
  ].filter(Boolean);
  const statusLine =
    unit.status === "sold"
      ? "This listing is recorded as sold."
      : unit.reserved
        ? "This listing is reserved. Treat availability as subject to the current hold."
        : unit.status === "under-offer"
          ? "This listing is under contract. Treat availability as subject to the current deal completing."
          : `Asking ${priceLabel}.`;

  return joining([
    headline,
    specBits.length ? specBits.join(", ") + "." : null,
    unit.specNote,
    campaign.completion ? `Campaign timing: ${campaign.completion}.` : null,
    campaign.firb === "YES"
      ? "The campaign advises this stock is FIRB-eligible. A foreign purchaser still needs their own approval."
      : "The campaign advises this stock is not FIRB-eligible.",
    campaign.primary || campaign.secondary
      ? `School catchments advised: ${[campaign.primary, campaign.secondary].filter(Boolean).join(" and ")}. Confirm zoning and placements independently.`
      : null,
    unit.occupancy,
    unit.promo,
    campaign.extraCampaign,
    unit.extra,
    statusLine,
    "Figures and availability are as advised for this campaign and can change without notice. Confirm title, measurements, inclusions and all contract documents with our desk before you offer.",
  ]);
}

export function axtraListing(campaign: AxtraCampaign, unit: AxtraUnit): AxtraListing {
  const status: PropertyStatus = unit.reserved ? "under-offer" : (unit.status ?? "for-sale");
  const priceLabel =
    status === "sold"
      ? "Sold"
      : unit.reserved
        ? "Reserved"
        : status === "under-offer"
          ? "Under contract"
          : unit.price == null
            ? "Contact agent"
            : unit.gstExclusive
              ? `${formatAud(unit.price)} + GST`
              : formatAud(unit.price);

  return {
    slug: unit.slug,
    address: unit.address,
    suburb: campaign.suburb,
    state: "VIC",
    postcode: campaign.postcode,
    status,
    transactionSide: "sale",
    priceLabel,
    priceValue: unit.price,
    floorAreaSqm: unit.floor ?? null,
    landAreaSqm: unit.land ?? null,
    clearSpanM: null,
    rollerDoorM: null,
    threePhasePower: false,
    hardstand: false,
    bedrooms: unit.beds ?? null,
    bathrooms: unit.baths ?? null,
    carSpaces: unit.cars ?? null,
    zoning: campaign.zoning ?? (campaign.type === "warehouse" ? "IN1Z" : campaign.type === "rural" ? "FZ" : "TBC"),
    propertyType: campaign.type,
    description: listingCopy(campaign, unit, priceLabel),
    images: [],
    floorplanPublicId: null,
    brochureUrl: null,
    agentLicenceNumber: AGENCY.licenceNumber,
    featured: false,
    lat: null,
    lng: null,
    yieldPercent: unit.yieldPercent ?? null,
    leaseTermYears: unit.leaseTermYears ?? null,
    outgoingsPa: unit.outgoingsPa ?? null,
    evidenceLine: unit.evidenceLine ?? null,
    internalNotes: [
      "Axtra channel-partner stock. Confidential — do not publish this note or any commission.",
      `Commission: ${campaign.commission}.`,
      `Campaign pack: ${campaign.pack}.`,
      `FIRB advised: ${campaign.firb}.`,
    ].join(" "),
    syndicateToRealcommercial: false,
    syndicateToCommercialRealEstate: false,
  };
}

export function campaignListings(campaign: AxtraCampaign, units: AxtraUnit[]) {
  return units.map((unit) => axtraListing(campaign, unit));
}
