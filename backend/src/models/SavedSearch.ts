import mongoose, { Schema } from "mongoose";

const SavedSearchSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    name: { type: String, default: "" },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact", default: null, index: true },
    origin: { type: String, enum: ["public", "desk"], default: "public", index: true },
    label: { type: String, default: "" },
    /** Spec-filter query string, parsed with parseSpecFilters at match time. */
    query: { type: String, default: "" },
    confirmed: { type: Boolean, default: false, index: true },
    confirmedAt: { type: Date, default: null },
    active: { type: Boolean, default: true, index: true },
    emailAlerts: { type: Boolean, default: true },
    /** Capability token for confirm / manage / unsubscribe links. */
    token: { type: String, required: true, unique: true },
    alertCount: { type: Number, default: 0 },
    lastAlertAt: { type: Date, default: null },
    by: { type: String, default: "public" },
  },
  { timestamps: true },
);

export const SavedSearchModel = mongoose.models.SavedSearch || mongoose.model("SavedSearch", SavedSearchSchema);

/** One row per (search, listing) so nobody is alerted about the same listing twice. */
const ListingAlertSchema = new Schema(
  {
    searchId: { type: Schema.Types.ObjectId, ref: "SavedSearch", required: true },
    propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true },
    emailed: { type: Boolean, default: false },
    taskId: { type: Schema.Types.ObjectId, ref: "Task", default: null },
  },
  { timestamps: true },
);

ListingAlertSchema.index({ searchId: 1, propertyId: 1 }, { unique: true });

export const ListingAlertModel = mongoose.models.ListingAlert || mongoose.model("ListingAlert", ListingAlertSchema);
