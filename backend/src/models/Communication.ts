import mongoose, { Schema } from "mongoose";

const CommunicationSchema = new Schema(
  {
    kind: {
      type: String,
      required: true,
      enum: ["acknowledgement", "stale-follow-up", "inspection-reminder", "newsletter-welcome"],
      index: true,
    },
    to: { type: String, required: true },
    subject: { type: String, required: true },
    enquiryId: { type: Schema.Types.ObjectId, ref: "Enquiry", default: null, index: true },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact", default: null },
    providerMessageId: { type: String, default: "" },
    status: {
      type: String,
      enum: ["sent", "skipped", "failed"],
      default: "skipped",
      index: true,
    },
    error: { type: String, default: "" },
  },
  { timestamps: true },
);

export const CommunicationModel =
  mongoose.models.Communication || mongoose.model("Communication", CommunicationSchema);
