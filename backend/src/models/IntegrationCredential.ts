import mongoose, { Schema } from "mongoose";

/** OAuth credentials for third-party integrations. Server-only — never serialize to the frontend. */
const IntegrationCredentialSchema = new Schema(
  {
    integration: { type: String, required: true, unique: true, enum: ["zoho"] },
    /** AES-256-GCM ciphertext (iv.tag.data, base64). */
    refreshTokenEnc: { type: String, required: true },
    accountsServer: { type: String, required: true },
    apiDomain: { type: String, required: true },
    scope: { type: String, default: "" },
    orgName: { type: String, default: "" },
    connectedBy: { type: String, default: "" },
    connectedAt: { type: Date, default: Date.now },
    /** Watermark for pulling lead-status changes back from Zoho. */
    lastPolledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const IntegrationCredentialModel =
  mongoose.models.IntegrationCredential ||
  mongoose.model("IntegrationCredential", IntegrationCredentialSchema);
