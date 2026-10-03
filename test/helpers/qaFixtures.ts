import { AGENCY } from "@kestrel/shared";

/** Force localhost for prelaunch UI tests even if FRONTEND_URL points at production. */
export const LOCAL_SITE = "http://localhost:3000";
export const LOCAL_API = "http://localhost:4000";

export function qaListingPayload(slug: string, overrides: Record<string, unknown> = {}) {
  return {
    slug,
    address: "QA Test Warehouse",
    suburb: "Truganina",
    state: "VIC",
    postcode: "3029",
    status: "for-sale",
    transactionSide: "sale",
    assetCategory: "commercial",
    propertyType: "warehouse",
    priceLabel: "$990,000 + GST",
    priceValue: 990000,
    zoning: "IN1Z",
    description: "Prelaunch QA test listing.",
    agentLicenceNumber: AGENCY.licenceNumber,
    images: [{ publicId: "kestrel/listings/node-test-hero", isHero: true, alt: "QA test" }],
    featured: false,
    ...overrides,
  };
}

export function qaEnquiryPayload(source: string, email: string, extra: Record<string, unknown> = {}) {
  return {
    name: `QA ${source}`,
    email,
    phone: "0412345678",
    message: `Prelaunch test from ${source}`,
    intent: "enquire",
    source,
    ...extra,
  };
}
