import mongoose, { Schema } from "mongoose";

const InboundEmailSchema = new Schema(
  {
    from: { type: String, default: "" },
    to: { type: String, default: "" },
    subject: { type: String, default: "" },
    text: { type: String, default: "" },
    html: { type: String, default: "" },
    receivedAt: { type: Date, default: Date.now, index: true },
    dedupeKey: { type: String, required: true, index: true },
    parseStatus: {
      type: String,
      enum: ["pending", "parsed", "needsReview", "duplicate"],
      default: "pending",
      index: true,
    },
    needsReview: { type: Boolean, default: false, index: true },
    portal: {
      type: String,
      enum: ["rea", "realcommercial", "unknown"],
      default: "unknown",
      index: true,
    },
    enquiryId: { type: Schema.Types.ObjectId, ref: "Enquiry", default: null, index: true },
    parseError: { type: String, default: "" },
    parsedFields: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      message: { type: String, default: "" },
      listingId: { type: String, default: "" },
      address: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

export const InboundEmailModel =
  mongoose.models.InboundEmail || mongoose.model("InboundEmail", InboundEmailSchema);
