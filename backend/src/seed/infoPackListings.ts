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
  priceValue: number | null;
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
  brochureUrl: string | null;
  agentLicenceNumber: string;
  featured: boolean;
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

const PACK =
  "https://drive.google.com/drive/folders/1yIMt2snEude_9Lfigou2_jM25R55l8WG";

function listing(partial: Omit<InfoPackListing, "state" | "images" | "floorplanPublicId" | "brochureUrl" | "agentLicenceNumber" | "lat" | "lng" | "clearSpanM" | "rollerDoorM" | "bedrooms" | "bathrooms" | "propertyType" | "assetCategory" | "syndicateToRealcommercial" | "syndicateToCommercialRealEstate" | "internalNotes" | "priceValue" | "yieldPercent" | "leaseTermYears" | "outgoingsPa" | "evidenceLine"> & {
  type: PropertyType;
  notes: string;
  description: string;
  brochureUrl?: string | null;
  priceValue?: number | null;
  yieldPercent?: number | null;
  leaseTermYears?: number | null;
  outgoingsPa?: number | null;
  evidenceLine?: string | null;
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
    priceValue: partial.priceValue ?? null,
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
    brochureUrl: partial.brochureUrl ?? null,
    agentLicenceNumber: AGENCY.licenceNumber,
    featured: partial.featured,
    lat: null,
    lng: null,
    yieldPercent: partial.yieldPercent ?? null,
    leaseTermYears: partial.leaseTermYears ?? null,
    outgoingsPa: partial.outgoingsPa ?? null,
    evidenceLine: partial.evidenceLine ?? null,
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
    slug: "wh12-19-23-paramount-road-west-footscray",
    address: "WH12, 19-23 Paramount Road",
    suburb: "West Footscray",
    postcode: "3012",
    status: "for-sale",
    transactionSide: "sale",
    priceLabel: "Contact agent",
    floorAreaSqm: 340,
    landAreaSqm: null,
    threePhasePower: false,
    hardstand: false,
    carSpaces: 2,
    zoning: "IN1Z",
    type: "warehouse",
    featured: true,
    notes: "West Footscray pack: Yard 3012 brochure, site plan MD072, photographs and video. Warehouse 12 is shown at 340 sqm on the floor plan set. Sale and lease stock both sit in the same park — desk to confirm the live release and quoting.",
    description: [
      "WH12 at Yard 3012, 19-23 Paramount Road, West Footscray, is a modern inner-west warehouse with about 340 sqm shown on the current floor plan set.",
      "The pack shows a roller-door warehouse, mezzanine office/amenities and a minimum of two car parks per warehouse. The current campaign spans owner-occupier, investment and lease stock in the same park, so confirm the live release, pricing and contract structure with our desk.",
      "Photography covers the estate, exteriors and office interiors across the project. Use it as a guide to the finish level, not as a substitute for the live warehouse allocation.",
      confirm,
    ].join("\n\n"),
  }),
  listing({
    slug: "wh13-19-23-paramount-road-west-footscray",
    address: "WH13, 19-23 Paramount Road",
    suburb: "West Footscray",
    postcode: "3012",
    status: "for-sale",
    transactionSide: "sale",
    priceLabel: "Contact agent",
    floorAreaSqm: 170,
    landAreaSqm: null,
    threePhasePower: false,
    hardstand: false,
    carSpaces: 2,
    zoning: "IN1Z",
    type: "warehouse",
    featured: false,
    notes: "West Footscray pack: Warehouse 13 is shown at 170 sqm on the floor plan set. Desk to confirm live release and whether current campaign terms are sale or lease.",
    description: [
      "WH13 at Yard 3012, 19-23 Paramount Road, West Footscray, is shown at about 170 sqm on the current floor plan set.",
      "The pack presents the same modern warehouse format with mezzanine office/amenities and at least two car parks per warehouse. Confirm the live quoting and whether this warehouse is offered for sale, leased investment or lease with our desk.",
      confirm,
    ].join("\n\n"),
  }),
  listing({
    slug: "wh14-19-23-paramount-road-west-footscray",
    address: "WH14, 19-23 Paramount Road",
    suburb: "West Footscray",
    postcode: "3012",
    status: "for-sale",
    transactionSide: "sale",
    priceLabel: "Contact agent",
    floorAreaSqm: 191,
    landAreaSqm: null,
    threePhasePower: false,
    hardstand: false,
    carSpaces: 2,
    zoning: "IN1Z",
    type: "warehouse",
    featured: false,
    notes: "West Footscray pack: Warehouse 14 is shown at 191 sqm on the floor plan set. Desk to confirm live release and whether current campaign terms are sale or lease.",
    description: [
      "WH14 at Yard 3012, 19-23 Paramount Road, West Footscray, is shown at about 191 sqm on the current floor plan set.",
      "The current campaign spans sale and lease pathways inside the same park. Confirm the live availability, quoting and contract form with our desk before presenting this warehouse as available.",
      confirm,
    ].join("\n\n"),
  }),
  listing({
    slug: "wh15-19-23-paramount-road-west-footscray",
    address: "WH15, 19-23 Paramount Road",
    suburb: "West Footscray",
    postcode: "3012",
    status: "for-sale",
    transactionSide: "sale",
    priceLabel: "Contact agent",
    floorAreaSqm: 170,
    landAreaSqm: null,
    threePhasePower: false,
    hardstand: false,
    carSpaces: 2,
    zoning: "IN1Z",
    type: "warehouse",
    featured: false,
    notes: "West Footscray pack: Warehouse 15 is shown at 170 sqm on the floor plan set. Desk to confirm live release and whether current campaign terms are sale or lease.",
    description: [
      "WH15 at Yard 3012, 19-23 Paramount Road, West Footscray, is shown at about 170 sqm on the current floor plan set.",
      "The estate brochure markets both ownership and lease outcomes in the one park. Confirm the live commercial terms for this warehouse with our desk.",
      confirm,
    ].join("\n\n"),
  }),
  listing({
    slug: "wh16-19-23-paramount-road-west-footscray",
    address: "WH16, 19-23 Paramount Road",
    suburb: "West Footscray",
    postcode: "3012",
    status: "for-sale",
    transactionSide: "sale",
    priceLabel: "Contact agent",
    floorAreaSqm: 170,
    landAreaSqm: null,
    threePhasePower: false,
    hardstand: false,
    carSpaces: 2,
    zoning: "IN1Z",
    type: "warehouse",
    featured: false,
    notes: "West Footscray pack: Warehouse 16 is shown at 170 sqm on the floor plan set. Desk to confirm live release and whether current campaign terms are sale or lease.",
    description: [
      "WH16 at Yard 3012, 19-23 Paramount Road, West Footscray, is shown at about 170 sqm on the current floor plan set.",
      "Modern warehouse, mezzanine office/amenity fit-out and project-wide estate photography are included in the current campaign pack. Confirm the live release terms with our desk.",
      confirm,
    ].join("\n\n"),
  }),
  listing({
    slug: "wh17-19-23-paramount-road-west-footscray",
    address: "WH17, 19-23 Paramount Road",
    suburb: "West Footscray",
    postcode: "3012",
    status: "for-sale",
    transactionSide: "sale",
    priceLabel: "Contact agent",
    floorAreaSqm: 170,
    landAreaSqm: null,
    threePhasePower: false,
    hardstand: false,
    carSpaces: 2,
    zoning: "IN1Z",
    type: "warehouse",
    featured: false,
    notes: "West Footscray pack: Warehouse 17 is shown at 170 sqm on the floor plan set. Desk to confirm live release and whether current campaign terms are sale or lease.",
    description: [
      "WH17 at Yard 3012, 19-23 Paramount Road, West Footscray, is shown at about 170 sqm on the current floor plan set.",
      "The Yard 3012 campaign covers multiple warehouse releases across sale and lease pathways. Confirm the live release position and commercial terms with our desk.",
      confirm,
    ].join("\n\n"),
  }),
  listing({
    slug: "1r-288-albert-street-brunswick",
    address: "1R, 288 Albert Street",
    suburb: "Brunswick",
    postcode: "3056",
    status: "for-lease",
    transactionSide: "lease",
    priceLabel: "Contact agent",
    priceValue: null,
    floorAreaSqm: 95,
    landAreaSqm: null,
    threePhasePower: false,
    hardstand: false,
    carSpaces: 2,
    zoning: "TBC",
    type: "showroom",
    featured: false,
    notes: "Brunswick pack: mezzanine suite 1R. Schedule notes vacant, 95 sqm, 2 secured car parks and a gross market rent around $52,150 pa excluding GST.",
    description: [
      "1R at 288 Albert Street, Brunswick, is a vacant mezzanine commercial suite of about 95 sqm with two secured car parks.",
      "The current schedule records this suite as vacant and indicates gross market rent around $52,150 per annum excluding GST, subject to final heads of agreement and outgoings reconciliation.",
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
    priceValue: null,
    floorAreaSqm: 57.8,
    landAreaSqm: null,
    threePhasePower: false,
    hardstand: false,
    carSpaces: 1,
    zoning: "TBC",
    type: "showroom",
    featured: true,
    notes: "Brunswick pack: 288 Albert Street leasing pack. G03 is noted vacant at 57.8 sqm with 1 secured car park, located indoors with entry via Albert Street. Vacant-lot photos labelled G03.",
    description: [
      "G03 at 288 Albert Street, Brunswick, is a vacant ground-floor suite of about 57.8 sqm with one secured car park and indoor entry via Albert Street.",
      "The current leasing pack includes architectural drawings, car-park planning and vacant-suite photography for this tenancy. Confirm the final rent, incentives and outgoings with our desk before you inspect.",
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
    priceValue: null,
    floorAreaSqm: 128.3,
    landAreaSqm: null,
    threePhasePower: false,
    hardstand: false,
    carSpaces: 1,
    zoning: "TBC",
    type: "showroom",
    featured: false,
    notes: "Brunswick pack: 288 Albert Street leasing pack. G02B is noted at 128.3 sqm with 1 secured car park. Sale schedule marks contracts prep and indicative gross market rent around $54,050 pa excluding GST. Vacant-lot photos labelled G02B.",
    description: [
      "G02B at 288 Albert Street, Brunswick, is a ground-floor suite of about 128.3 sqm with one secured car park.",
      "The current pack records the suite in contracts preparation and carries indicative rent/sale schedule figures only. Confirm live availability, final deal structure and outgoings with our desk before you present it as available.",
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
    priceValue: null,
    floorAreaSqm: 90.9,
    landAreaSqm: null,
    threePhasePower: false,
    hardstand: false,
    carSpaces: 1,
    zoning: "TBC",
    type: "showroom",
    featured: false,
    notes: "Brunswick pack: 288 Albert Street leasing pack. G05B is noted vacant at 90.9 sqm with 1 secured car park and Sydney Road laneway exposure. Vacant-lot photos labelled G05B.",
    description: [
      "G05B at 288 Albert Street, Brunswick, is a vacant ground-floor suite of about 90.9 sqm with one secured car park and Sydney Road laneway exposure.",
      "The current leasing pack includes plan drawings and suite photography for this tenancy. Confirm the final rent, term and outgoings with our desk before you inspect.",
      confirm,
    ].join("\n\n"),
  }),
  listing({
    slug: "2-17-felstead-drive-truganina",
    address: "2/17 Felstead Drive",
    suburb: "Truganina",
    postcode: "3029",
    status: "for-sale",
    transactionSide: "sale",
    priceLabel: "Contact agent",
    priceValue: null,
    floorAreaSqm: 858,
    landAreaSqm: 938,
    threePhasePower: true,
    hardstand: false,
    carSpaces: 10,
    zoning: "IN2Z",
    type: "warehouse",
    featured: true,
    yieldPercent: null,
    leaseTermYears: 3,
    outgoingsPa: null,
    evidenceLine: "Leased to Macy's Motors | $105,000 pa net",
    brochureUrl: "https://www.bosisto.com.au/realestate-commercial-truganina-14413.aspx",
    notes: "Felstead Drive pack and Bosisto listing. Modern industrial investment leased to Macy's Motors. Net rental income $105,000 pa, lease term 3+3+3 from 4 May 2026, annual 4% increases, security deposit 3 months rent.",
    description: [
      "2/17 Felstead Drive, Truganina, is a modern industrial investment within an established western logistics precinct, securely leased to Macy's Motors.",
      "Property features include 858 sqm total building area, two-level office of about 122 sqm, high-clearance warehouse of about 736 sqm, 8-metre-wide roller-door access, kitchenette, staff amenities, heating/cooling to the office area, ten on-title car spaces, three-phase power and Industrial 2 zoning.",
      "The current campaign advises net rent of $105,000 per annum, a 3 + 3 + 3 year lease from 4 May 2026, fixed 4% annual increases and security equal to three months' rent. Confirm the contract, tenant covenant and all due diligence material with our desk before you offer.",
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
