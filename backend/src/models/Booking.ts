import mongoose, { Schema } from "mongoose";
import { BOOKING_KINDS, BOOKING_MODES, BOOKING_STATUSES } from "@kestrel/shared";

const BookingSchema = new Schema(
  {
    kind: { type: String, enum: BOOKING_KINDS, required: true, index: true },
    status: { type: String, enum: BOOKING_STATUSES, default: "confirmed", index: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    name: { type: String, required: true },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    company: { type: String, default: "" },
    notes: { type: String, default: "" },
    propertySlug: { type: String, default: null, index: true },
    location: { type: String, default: "" },
    mode: { type: String, enum: BOOKING_MODES, default: "onsite" },
    /** Zoho Meeting session for online meetings. */
    zohoMeetingKey: { type: String, default: "" },
    meetingUrl: { type: String, default: "" },
    meetingHostUrl: { type: String, default: "" },
    enquiryId: { type: Schema.Types.ObjectId, ref: "Enquiry", default: null, index: true },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact", default: null, index: true },
    /** Capability token for the public reschedule / cancel page. */
    manageToken: { type: String, required: true, unique: true },
    zohoEventId: { type: String, default: "" },
    reminderSentAt: { type: Date, default: null },
    history: {
      type: [
        {
          text: { type: String, required: true },
          at: { type: Date, default: Date.now },
          by: { type: String, default: "" },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

/** One confirmed booking per start time — the desk is one person. Guards against double-booking races. */
BookingSchema.index({ startAt: 1 }, { unique: true, partialFilterExpression: { status: "confirmed" } });
BookingSchema.index({ status: 1, startAt: 1 });

export const BookingModel = mongoose.models.Booking || mongoose.model("Booking", BookingSchema);
