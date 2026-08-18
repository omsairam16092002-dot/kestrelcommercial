import mongoose, { Schema } from "mongoose";

const EnquirySchema = new Schema(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: "Property", default: null },
    propertySlug: { type: String, default: null },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact", default: null, index: true },
    name: { type: String, required: true },
    company: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    message: { type: String, required: true },
    topic: {
      type: String,
      enum: [
        "selling",
        "leasing-out",
        "buying-or-leasing",
        "smsf",
        "management",
        "appraisal",
        "other",
      ],
      default: "other",
    },
    intent: {
      type: String,
      enum: ["enquire", "inspection", "brochure"],
      default: "enquire",
      index: true,
    },
    preferredInspectionAt: { type: String, default: "" },
    inspectionWindow: {
      type: String,
      enum: ["morning", "afternoon", "flexible", ""],
      default: "",
    },
    inspectionAttendance: {
      type: String,
      enum: ["booked", "attended", "no-show", "cancelled", ""],
      default: "",
      index: true,
    },
    inboundEmailId: { type: Schema.Types.ObjectId, ref: "InboundEmail", default: null, index: true },
    source: {
      type: String,
      required: true,
      enum: [
        "web",
        "phone",
        "eoi",
        "appraisal",
        "appraisal-quick",
        "contact",
        "newsletter",
        "portal-rea",
        "portal-realcommercial",
      ],
    },
    crmStage: {
      type: String,
      default: "new",
      enum: [
        "new",
        "contacted",
        "qualified",
        "inspecting",
        "negotiating",
        "won",
        "lost",
      ],
    },
    followUpAt: { type: Date, default: null },
    followUpNote: { type: String, default: "" },
    notifiedAt: { type: Date, default: null },
    notifyChannels: { type: [String], default: [] },
    notes: {
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

export const EnquiryModel =
  mongoose.models.Enquiry || mongoose.model("Enquiry", EnquirySchema);
