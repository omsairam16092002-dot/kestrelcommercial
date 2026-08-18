import {
  AGENCY,
  deriveAssetCategory,
  type AssetCategory,
  type PropertyStatus,
  type PropertyType,
  type TransactionSide,
} from "@kestrel/shared";

export type InfoPackListing = {
  slug: string;
  address: string;
  suburb: string;
  state: "VIC";
  postcode: string;
  status: PropertyStatus;
  transactionSide: TransactionSide;
  priceLabel: string;
  priceValue: null;
  floorAreaSqm: number | null;
  landAreaSqm: number | null;
  clearSpanM: null;
  rollerDoorM: null;
  threePhasePower: boolean;
  hardstand: boolean;
  bedrooms: null;
  bathrooms: null;
  carSpaces: number | null;
  zoning: string;
  propertyType: PropertyType;
  assetCategory: AssetCategory;
  description: string;
  images: [];
  floorplanPublicId: null;
  brochureUrl: null;
  agentLicenceNumber: string;
  featured: boolean;
  lat: null;
  lng: null;
  yieldPercent: null;
  leaseTermYears: null;
  outgoingsPa: null;
  evidenceLine: null;
  internalNotes: string;
  syndicateToRealcommercial: false;
  syndicateToCommercialRealEstate: false;
};

const PACK =
  "https://drive.google.com/drive/folders/1yIMt2snEude_9Lfigou2_jM25R55l8WG";

function listing(partial: Omit<InfoPackListing, "state" | "images" | "floorplanPublicId" | "brochureUrl" | "agentLicenceNumber" | "lat" | "lng" | "yieldPercent" | "leaseTermYears" | "outgoingsPa" | "evidenceLine" | "priceValue" | "clearSpanM" | "rollerDoorM" | "bedrooms" | "bathrooms" | "propertyType" | "assetCategory" | "syndicateToRealcommercial" | "syndicateToCommercialRealEstate" | "internalNotes"> & {
  type: PropertyType;
  notes: string;
  description: string;
}): InfoPackListing {
  return {
    slug: partial.slug,
    address: partial.address,
    suburb: partial.suburb,
    state: "VIC",
    postcode: partial.postcode,
    status: partial.status,
    transactionSide: partial.transactionSide,
    priceLabel: partial.priceLabel,
    priceValue: null,
    floorAreaSqm: partial.floorAreaSqm,
    landAreaSqm: partial.landAreaSqm,
    clearSpanM: null,
    rollerDoorM: null,
    threePhasePower: partial.threePhasePower,
    hardstand: partial.hardstand,
    bedrooms: null,
    bathrooms: null,
    carSpaces: partial.carSpaces,
    zoning: partial.zoning,
    propertyType: partial.type,
    assetCategory: deriveAssetCategory(partial.type),
    description: partial.description,
    images: [],
    floorplanPublicId: null,
    brochureUrl: null,
    agentLicenceNumber: AGENCY.licenceNumber,
    featured: partial.featured,
    lat: null,
    lng: null,
    yieldPercent: null,
    leaseTermYears: null,
    outgoingsPa: null,
    evidenceLine: null,
    internalNotes: [
      "Information pack stock. Confidential — do not publish this note or any Drive URL.",
      `Pack folder: ${PACK}.`,
      partial.notes,
      "Commission is not stated in the pack files — confirm before quoting.",
    ].join(" "),
    syndicateToRealcommercial: false,
    syndicateToCommercialRealEstate: false,
  };
}

const confirm =
  "Figures and availability are as advised in the current information pack and can change without notice. Confirm title, measurements, inclusions and all contract documents with our desk before you offer.";

export const DEMO_LISTING_SLUGS = [
  "14-logistics-drive-truganina",
  "8-10-foundation-road-laverton-north",
  "22-commerce-circuit-derrimut",
  "5-palmers-road-truganina",
  "41-fitzgerald-road-sunshine-west",
  "9-11-paramount-road-west-footscray",
  "36-38-little-boundary-road-laverton",
  "2-55-keilor-park-drive-keilor-east",
  "sample-1-atlas-drive-truganina",
  "sample-7-cluster-court-laverton-north",
  "sample-12-seed-circuit-derrimut",
  "sample-3-database-road-sunshine-west",
];

export const INFO_PACK_LISTINGS: InfoPackListing[] = [
  listing({
    slug: "19-23-paramount-road-west-footscray",
    address: "19-23 Paramount Road",
    suburb: "West Footscray",
    postcode: "3012",
    status: "for-sale",
    transactionSide: "sale",
    priceLabel: "Contact agent",
    floorAreaSqm: null,
    landAreaSqm: null,
    threePhasePower: false,
    hardstand: false,
    carSpaces: null,
    zoning: "TBC",
    type: "warehouse",
    featured: true,
    notes: "West Footscray pack: Yard 3012 brochure, site plan MD072, photographs and video. Sale and lease stock both sit in the same park — desk to confirm the live unit.",
    description: [
      "Yard 3012 at 19–23 Paramount Road, West Footscray — an inner-west warehouse park, about ten minutes from the CBD.",
      "The information pack is the current project brochure plus a site plan. Individual unit sizes, asking figures and whether a given shed is for sale or for lease are in that pack. Confirm the live unit with our desk.",
      "Photography covers the park, unit exteriors and office interiors. Do not treat a rendering or a neighbouring unit number on a facade as the lot you are buying.",
      confirm,
    ].join("\n\n"),
  }),
  listing({
    slug: "g03-288-albert-street-brunswick",
    address: "G03, 288 Albert Street",
    suburb: "Brunswick",
    postcode: "3056",
    status: "for-lease",
    transactionSide: "lease",
    priceLabel: "Contact agent",
    floorAreaSqm: null,
    landAreaSqm: null,
    threePhasePower: false,
    hardstand: false,
    carSpaces: null,
    zoning: "TBC",
    type: "showroom",
    featured: true,
    notes: "Brunswick pack: 288 Albert Street leasing pack. Vacant-lot photos labelled G03.",
    description: [
      "G03 at 288 Albert Street, Brunswick — a vacant ground-floor suite offered from the current leasing pack.",
      "The pack includes the leasing booklet, architectural drawings, car-park plan and vacant-lot photographs for this suite. Asking rent, area and car allocation are in that pack. Confirm them with our desk before you inspect.",
      confirm,
    ].join("\n\n"),
  }),
  listing({
    slug: "g02b-288-albert-street-brunswick",
    address: "G02B, 288 Albert Street",
    suburb: "Brunswick",
    postcode: "3056",
    status: "for-lease",
    transactionSide: "lease",
    priceLabel: "Contact agent",
    floorAreaSqm: null,
    landAreaSqm: null,
    threePhasePower: false,
    hardstand: false,
    carSpaces: null,
    zoning: "TBC",
    type: "showroom",
    featured: false,
    notes: "Brunswick pack: 288 Albert Street leasing pack. Vacant-lot photos labelled G02B.",
    description: [
      "G02B at 288 Albert Street, Brunswick — a vacant ground-floor suite offered from the current leasing pack.",
      "The pack includes the leasing booklet, drawings and vacant-lot photographs for this suite. Asking rent and area are in that pack. Confirm them with our desk before you inspect.",
      confirm,
    ].join("\n\n"),
  }),
  listing({
    slug: "g05b-288-albert-street-brunswick",
    address: "G05B, 288 Albert Street",
    suburb: "Brunswick",
    postcode: "3056",
    status: "for-lease",
    transactionSide: "lease",
    priceLabel: "Contact agent",
    floorAreaSqm: null,
    landAreaSqm: null,
    threePhasePower: false,
    hardstand: false,
    carSpaces: null,
    zoning: "TBC",
    type: "showroom",
    featured: false,
    notes: "Brunswick pack: 288 Albert Street leasing pack. Vacant-lot photos labelled G05B.",
    description: [
      "G05B at 288 Albert Street, Brunswick — a vacant ground-floor suite offered from the current leasing pack.",
      "The pack includes the leasing booklet, drawings and vacant-lot photographs for this suite. Asking rent and area are in that pack. Confirm them with our desk before you inspect.",
      confirm,
    ].join("\n\n"),
  }),
  listing({
    slug: "20-lecky-road-officer",
    address: "20 Lecky Road",
    suburb: "Officer",
    postcode: "3809",
    status: "for-sale",
    transactionSide: "sale",
    priceLabel: "Contact agent",
    floorAreaSqm: null,
    landAreaSqm: 814_000,
    threePhasePower: false,
    hardstand: false,
    carSpaces: null,
    zoning: "TBC",
    type: "development-land",
    featured: true,
    notes: "Officer pack: M2 Space Group 20 Lecky Road Consolidated Proposal. Site area 81.4 ha as published for this project.",
    description: [
      "20 Lecky Road, Officer — a large south-east landholding offered from the current consolidated proposal.",
      "The information pack is an M2 Space Group proposal for this address. The published project site area is 81.4 hectares. Proposed product, timing and price are in that proposal. Confirm zoning, overlays and the live deal with our desk — this is not a completed warehouse listing.",
      confirm,
    ].join("\n\n"),
  }),
  listing({
    slug: "34-mitchell-street-kalkallo",
    address: "34 Mitchell Street",
    suburb: "Kalkallo",
    postcode: "3064",
    status: "for-sale",
    transactionSide: "sale",
    priceLabel: "Contact agent",
    floorAreaSqm: null,
    landAreaSqm: null,
    threePhasePower: false,
    hardstand: false,
    carSpaces: null,
    zoning: "TBC",
    type: "development-land",
    featured: false,
    notes: "Kalkallo pack: town-planning drawings MD091-TPP and MD091-CP01A. Subject site labelled 34 Mitchell Street on the car-park plan.",
    description: [
      "34 Mitchell Street, Kalkallo — the subject site on the current town-planning drawings in the information pack.",
      "The pack is a set of TPP and car-park plans, not a warehouse brochure. Proposed use, yield and price are not on those drawings. Confirm the live permit, title and what is actually for sale with our desk before you underwrite it.",
      confirm,
    ].join("\n\n"),
  }),
];
