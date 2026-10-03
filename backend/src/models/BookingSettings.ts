import mongoose, { Schema } from "mongoose";

const BookingSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    enabled: { type: Boolean, default: true },
    timezone: { type: String, default: "Australia/Melbourne" },
    slotMinutes: { type: Number, default: 30 },
    bufferMinutes: { type: Number, default: 15 },
    minNoticeHours: { type: Number, default: 4 },
    maxDaysAhead: { type: Number, default: 21 },
    hours: {
      type: [{ day: { type: Number, required: true }, start: { type: String, required: true }, end: { type: String, required: true } }],
      default: [],
    },
    blackoutDates: { type: [String], default: [] },
    meetingLocation: { type: String, default: "" },
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true },
);

export const BookingSettingsModel =
  mongoose.models.BookingSettings || mongoose.model("BookingSettings", BookingSettingsSchema);
