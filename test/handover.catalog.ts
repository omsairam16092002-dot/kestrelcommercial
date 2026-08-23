/** Public marketing pages — path + HTML markers that must appear when the page renders. */
export const PUBLIC_PAGES = [
  { path: "/", markers: [/Kestrel|Industrial|Commercial/i] },
  { path: "/buy", markers: [/Sale|Search|Kestrel|Properties/i] },
  { path: "/lease", markers: [/Lease|Search|Kestrel/i] },
  { path: "/contact", markers: [/Contact|WhatsApp|Enquire/i] },
  { path: "/about", markers: [/About us|Jignesh Jhanjaria|700\+ transactions/i] },
  { path: "/services", markers: [/Sales|Leasing|Management|Advisory/i] },
  { path: "/sell", markers: [/appraisal|Sell|Kestrel/i] },
  { path: "/investing", markers: [/SMSF|AML|Compliance/i] },
  { path: "/privacy", markers: [/Privacy|policy|Kestrel/i] },
  { path: "/properties", markers: [/Properties|Commercial|Residential|Development/i] },
  { path: "/properties/commercial", markers: [/Commercial|Kestrel/i] },
  { path: "/properties/residential", markers: [/Residential|Kestrel/i] },
  { path: "/properties/development-sites", markers: [/Development|Kestrel/i] },
] as const;

export const ADMIN_PUBLIC_PAGES = [
  { path: "/admin/login", markers: [/Sign in|Desk|Email|password/i] },
  { path: "/admin/signup", markers: [/Sign up|Desk|Create|account/i] },
] as const;

/** Desk routes that require auth — checked after login in Playwright suite. */
export const ADMIN_AUTH_PAGES = [
  "/admin",
  "/admin/listings",
  "/admin/listings/new",
  "/admin/enquiries",
  "/admin/contacts",
  "/admin/tasks",
  "/admin/inspections",
  "/admin/subscribers",
  "/admin/settings",
] as const;

/** API property filter cases — each must return 200 and satisfy assert on every row. */
export type FilterCase = {
  label: string;
  query: string;
  assert: (row: Record<string, unknown>) => boolean;
};

export const PROPERTY_FILTER_CASES: FilterCase[] = [
  {
    label: "sale side",
    query: "side=sale",
    assert: (p) => p.transactionSide === "sale",
  },
  {
    label: "lease side",
    query: "side=lease",
    assert: (p) => p.transactionSide === "lease",
  },
  {
    label: "commercial category",
    query: "category=commercial",
    assert: (p) => p.assetCategory === "commercial",
  },
  {
    label: "residential category",
    query: "category=residential",
    assert: (p) => p.assetCategory === "residential",
  },
  {
    label: "development-site category",
    query: "category=development-site",
    assert: (p) => p.assetCategory === "development-site",
  },
  {
    label: "house type",
    query: "type=house&side=sale",
    assert: (p) => p.propertyType === "house",
  },
  {
    label: "warehouse type",
    query: "type=warehouse&side=sale",
    assert: (p) => p.propertyType === "warehouse",
  },
  {
    label: "development-land type",
    query: "type=development-land&side=sale",
    assert: (p) => p.propertyType === "development-land",
  },
  {
    label: "three-phase power",
    query: "power=1&side=sale",
    assert: (p) => p.threePhasePower === true,
  },
  {
    label: "hardstand",
    query: "hardstand=1&side=sale",
    assert: (p) => p.hardstand === true,
  },
  {
    label: "featured",
    query: "featured=1&side=sale",
    assert: (p) => p.featured === true,
  },
  {
    label: "min land area",
    query: "minLand=100000&category=development-site",
    assert: (p) => typeof p.landAreaSqm === "number" && (p.landAreaSqm as number) >= 100_000,
  },
  {
    label: "max price",
    query: "maxPrice=2000000&side=sale",
    assert: (p) => p.priceValue == null || (p.priceValue as number) <= 2_000_000,
  },
];

export const WARRAGUL_SLUG = "295-warragul-lardner-road-warragul";
