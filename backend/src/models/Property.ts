import mongoose, { Schema } from "mongoose";

const ImageSchema = new Schema(
  {
    publicId: { type: String, required: true },
    isHero: { type: Boolean, default: false },
    alt: { type: String },
  },
  { _id: false },
);

const PropertySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    address: { type: String, required: true },
    suburb: { type: String, required: true, index: true },
    state: { type: String, default: "VIC" },
    postcode: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["for-sale", "for-lease", "under-offer", "auction", "sold", "leased"],
      index: true,
    },
    transactionSide: { type: String, required: true, enum: ["sale", "lease"], index: true },
    priceLabel: { type: String, required: true },
    priceValue: { type: Number, default: null },
    floorAreaSqm: { type: Number, default: null },
    landAreaSqm: { type: Number, default: null },
    clearSpanM: { type: Number, default: null },
    rollerDoorM: { type: Number, default: null },
    threePhasePower: { type: Boolean, default: false },
    hardstand: { type: Boolean, default: false },
    bedrooms: { type: Number, default: null },
    bathrooms: { type: Number, default: null },
    carSpaces: { type: Number, default: null },
    zoning: { type: String, required: true },
    propertyType: {
      type: String,
      required: true,
      enum: [
        "office-warehouse",
        "warehouse",
        "development-land",
        "showroom",
        "yard",
        "house",
        "townhouse",
        "apartment",
        "rural",
      ],
    },
    assetCategory: {
      type: String,
      required: true,
      enum: ["commercial", "residential", "development-site"],
      index: true,
    },
    description: { type: String, required: true },
    images: { type: [ImageSchema], default: [] },
    floorplanPublicId: { type: String, default: null },
    brochureUrl: { type: String, default: null },
    agentLicenceNumber: { type: String, required: true },
    featured: { type: Boolean, default: false, index: true },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    yieldPercent: { type: Number, default: null },
    leaseTermYears: { type: Number, default: null },
    outgoingsPa: { type: Number, default: null },
    evidenceLine: { type: String, default: null },
    internalNotes: { type: String, default: "" },
    pexaWorkspaceId: { type: String, default: "" },
    portalListingId: { type: String, default: "", index: true },
    syndicateToRealcommercial: { type: Boolean, default: false },
    syndicateToCommercialRealEstate: { type: Boolean, default: false },
    externalListingIds: {
      realcommercial: { type: String, default: "" },
      commercialRealEstate: { type: String, default: "" },
    },
    archived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

PropertySchema.index({ floorAreaSqm: 1, clearSpanM: 1, rollerDoorM: 1, priceValue: 1 });
PropertySchema.index({ archived: 1, transactionSide: 1, status: 1, assetCategory: 1, featured: -1, updatedAt: -1 });
PropertySchema.index({ archived: 1, propertyType: 1, transactionSide: 1 });
PropertySchema.index({ archived: 1, zoning: 1, transactionSide: 1 });
PropertySchema.index({ archived: 1, priceValue: 1, transactionSide: 1 });
PropertySchema.index({ archived: 1, landAreaSqm: 1, assetCategory: 1 });

export const PropertyModel =
  mongoose.models.Property || mongoose.model("Property", PropertySchema);
