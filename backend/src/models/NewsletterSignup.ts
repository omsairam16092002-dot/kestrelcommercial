import mongoose, { Schema } from "mongoose";

const NewsletterSignupSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
    source: { type: String, default: "newsletter" },
    welcomeSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const NewsletterSignupModel =
  mongoose.models.NewsletterSignup || mongoose.model("NewsletterSignup", NewsletterSignupSchema);
