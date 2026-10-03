import mongoose, { Schema } from "mongoose";
import { COMMUNICATION_KINDS } from "@kestrel/shared";

const CommunicationSchema = new Schema(
  {
    kind: {
      type: String,
      required: true,
      enum: COMMUNICATION_KINDS,
      index: true,
    },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", default: null, index: true },
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
