import mongoose, { Schema } from "mongoose";

const AgentSchema = new Schema(
  {
    name: { type: String, required: true },
    licenceNumber: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    photoPublicId: { type: String, default: "" },
    title: { type: String, default: "" },
    bio: { type: String, default: "" },
  },
  { timestamps: true },
);

export const AgentModel = mongoose.models.Agent || mongoose.model("Agent", AgentSchema);
