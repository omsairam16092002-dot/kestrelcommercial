import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, default: "" },
    name: { type: String, required: true },
    role: { type: String, enum: ["admin"], default: "admin" },
    googleId: { type: String, default: "", index: true },
    lastSeenAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const UserModel = mongoose.models.User || mongoose.model("User", UserSchema);
