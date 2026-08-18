import mongoose, { Schema } from "mongoose";

const SyncLogSchema = new Schema(
  {
    integration: { type: String, required: true, enum: ["xero", "pexa"] },
    recordRef: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["pending", "running", "success", "failed", "skipped"],
    },
    lastAttempt: { type: Date, default: Date.now },
    error: { type: String, default: "" },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

SyncLogSchema.index({ integration: 1, recordRef: 1, createdAt: -1 });

export const SyncLogModel =
  mongoose.models.SyncLog || mongoose.model("SyncLog", SyncLogSchema);
