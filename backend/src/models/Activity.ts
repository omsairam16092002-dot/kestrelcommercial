import mongoose, { Schema } from "mongoose";

const ActivitySchema = new Schema(
  {
    type: { type: String, required: true, index: true },
    entityType: {
      type: String,
      required: true,
      enum: ["enquiry", "listing", "agent", "subscriber", "contact", "task"],
      index: true,
    },
    entityId: { type: String, required: true, index: true },
    summary: { type: String, required: true },
    by: { type: String, default: "desk" },
    at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

export const ActivityModel =
  mongoose.models.Activity || mongoose.model("Activity", ActivitySchema);
