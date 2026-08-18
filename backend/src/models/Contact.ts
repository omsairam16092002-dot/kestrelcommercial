import mongoose, { Schema } from "mongoose";

const ContactSchema = new Schema(
  {
    name: { type: String, required: true },
    company: { type: String, default: "" },
    email: { type: String, default: "", index: true },
    phone: { type: String, default: "" },
    phoneDigits: { type: String, default: "", index: true },
    role: {
      type: String,
      enum: ["buyer", "tenant", "vendor", "landlord", "occupier", "other"],
      default: "occupier",
      index: true,
    },
    source: { type: String, default: "web" },
    lastTouchAt: { type: Date, default: Date.now, index: true },
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

ContactSchema.index({ name: 1 });

export const ContactModel = mongoose.models.Contact || mongoose.model("Contact", ContactSchema);
