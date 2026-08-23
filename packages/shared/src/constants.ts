import type { AssetCategory } from "./types";

/** Agency identity — licence must appear on every page footer and every listing detail. */
export const SOCIAL = {
  facebook: {
    href: "https://www.facebook.com/profile.php?id=61582024322776",
    label: "Kestrel Commercial on Facebook",
  },
  linkedin: {
    href: "https://www.linkedin.com/in/jignesh-j-a93451190/",
    label: "Kestrel Commercial on LinkedIn",
  },
  instagram: {
    href: "https://www.instagram.com/jjcommercialrealestate",
    label: "Kestrel Commercial on Instagram",
  },
} as const;

/** Client-facing project marketing copy for /services. */
export const PROJECT_MARKETING = {
  kicker: "Project marketing",
  title: "Off the plan, business parks and land estates.",
  paragraphs: [
    "Project marketing and pre-sale — not a launch party. We work with developers on off-the-plan stock, business parks and land estates when the numbers and the buyer pool are real.",
    "With over 15 years across commercial, residential and off-the-plan property, the desk brings campaign structure, buyer qualification and settlement discipline from first release through to the last lot.",
    "Whether it is a staged industrial release, a residential precinct or a greenfield land estate, the method stays the same: understand the asset, understand the client, and run a campaign that converts — priced against real paper, not brochure theatre.",
  ],
} as const;

/** One-line lead on /about — not the full bio. */
export const ABOUT_LEAD_STATEMENT =
  "One desk from first enquiry through settlement — corridor knowledge and spec-first advice, not suburb marketing.";

export const AGENCY = {
  tradingName: "Kestrel Commercial",
  legalName: "RAJNIL PTY LTD T/A KESTREL COMMERCIAL",
  acn: "701 032 840",
  licenceNumber: "089481L",
  licenceHolder: "Jignesh Jhanjaria",
  phone: "0431 000 038",
  phoneHref: "tel:+61431000038",
  whatsapp: "0431 000 038",
  whatsappHref: "https://wa.me/61431000038",
  email: "jignesh@kestrelcommercial.com",
  addressLine1: "17 Jolimont Road",
  addressLine2: "Point Cook VIC 3030",
  hours: "Mon to Fri, 8.30am – 5.30pm",
  austrac: "AUSTRAC REPORTING ENTITY",
} as const;

export const BRAND = {
  oxblood: "#5C1F27",
  tan: "#D9A26B",
  paper: "#F3EDE8",
  mauve: "#A08B85",
  ink: "#2A1418",
} as const;

export const ZONING_OPTIONS = [
  "IN1Z",
  "IN2Z",
  "IN3Z",
  "C1Z",
  "C2Z",
  "SUZ",
  "GRZ",
  "RGZ",
  "NRZ",
  "MUZ",
  "FZ",
  "TBC",
] as const;

export const PROPERTY_TYPES = [
  "office-warehouse",
  "warehouse",
  "development-land",
  "showroom",
  "yard",
  "house",
  "townhouse",
  "apartment",
  "rural",
] as const;

export const INDUSTRIAL_PROPERTY_TYPES = [
  "office-warehouse",
  "warehouse",
  "showroom",
  "yard",
] as const;

export const COMMERCIAL_PROPERTY_TYPES = [...INDUSTRIAL_PROPERTY_TYPES] as const;

export const RESIDENTIAL_PROPERTY_TYPES = ["house", "townhouse", "apartment"] as const;

export const DEVELOPMENT_PROPERTY_TYPES = ["development-land", "rural"] as const;

export const ASSET_CATEGORY_LABELS: Record<
  AssetCategory,
  { title: string; short: string; description: string; path: string }
> = {
  commercial: {
    title: "Commercial & industrial",
    short: "Commercial",
    description: "Warehouses, yards, showrooms and office stock across Melbourne west.",
    path: "/properties/commercial",
  },
  residential: {
    title: "Residential",
    short: "Residential",
    description: "Houses, townhouses and apartments — sale and lease.",
    path: "/properties/residential",
  },
  "development-site": {
    title: "Development sites",
    short: "Development",
    description: "Land and development opportunities — zoning, area and price.",
    path: "/properties/development-sites",
  },
};

export const FLOOR_AREA_PRESETS = [
  { label: "Any size", value: "" },
  { label: "80 m²+", value: "80" },
  { label: "120 m²+", value: "120" },
  { label: "180 m²+", value: "180" },
  { label: "250 m²+", value: "250" },
  { label: "500 m²+", value: "500" },
  { label: "1,000 m²+", value: "1000" },
  { label: "2,000 m²+", value: "2000" },
  { label: "4,000 m²+", value: "4000" },
] as const;

export const CLEAR_SPAN_PRESETS = [
  { label: "Any span", value: "" },
  { label: "6 m+", value: "6" },
  { label: "7 m+", value: "7" },
  { label: "8 m+", value: "8" },
  { label: "10 m+", value: "10" },
] as const;

export const DOOR_HEIGHT_PRESETS = [
  { label: "Any door", value: "" },
  { label: "3.6 m+", value: "3.6" },
  { label: "4.0 m+", value: "4" },
  { label: "4.5 m+", value: "4.5" },
  { label: "5.0 m+", value: "5" },
] as const;

export const INTENT_LABELS = {
  enquire: "Enquiry",
  inspection: "Inspection request",
  brochure: "Brochure / floorplan",
} as const;

export const PRICE_PRESETS_SALE = [
  { label: "Any price", value: "" },
  { label: "Under $1.5m", value: "1500000" },
  { label: "Under $3m", value: "3000000" },
  { label: "Under $6m", value: "6000000" },
  { label: "Under $12m", value: "12000000" },
] as const;

export const PRICE_PRESETS_LEASE = [
  { label: "Any rent", value: "" },
  { label: "Under $80k pa", value: "80000" },
  { label: "Under $150k pa", value: "150000" },
  { label: "Under $300k pa", value: "300000" },
  { label: "Under $600k pa", value: "600000" },
] as const;

export const LAND_AREA_PRESETS = [
  { label: "Any land", value: "" },
  { label: "200 m²+", value: "200" },
  { label: "400 m²+", value: "400" },
  { label: "600 m²+", value: "600" },
  { label: "1,000 m²+", value: "1000" },
  { label: "2,000 m²+", value: "2000" },
  { label: "5,000 m²+", value: "5000" },
  { label: "1 ha+", value: "10000" },
] as const;

export const BEDROOM_PRESETS = [
  { label: "Any beds", value: "" },
  { label: "1+", value: "1" },
  { label: "2+", value: "2" },
  { label: "3+", value: "3" },
  { label: "4+", value: "4" },
  { label: "5+", value: "5" },
] as const;

export const BATHROOM_PRESETS = [
  { label: "Any baths", value: "" },
  { label: "1+", value: "1" },
  { label: "2+", value: "2" },
  { label: "3+", value: "3" },
] as const;

export const CAR_PRESETS = [
  { label: "Any cars", value: "" },
  { label: "1+", value: "1" },
  { label: "2+", value: "2" },
  { label: "3+", value: "3" },
  { label: "4+", value: "4" },
] as const;
