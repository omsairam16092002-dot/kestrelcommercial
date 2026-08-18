import mongoose, { Schema } from "mongoose";

const TaskSchema = new Schema(
  {
    title: { type: String, required: true },
    kind: {
      type: String,
      enum: ["follow-up", "call", "inspect", "appraisal", "other"],
      default: "follow-up",
      index: true,
    },
    status: { type: String, enum: ["open", "done"], default: "open", index: true },
    dueAt: { type: Date, default: null, index: true },
    note: { type: String, default: "" },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact", default: null, index: true },
    enquiryId: { type: Schema.Types.ObjectId, ref: "Enquiry", default: null, index: true },
    propertySlug: { type: String, default: null },
    doneAt: { type: Date, default: null },
    by: { type: String, default: "desk" },
  },
  { timestamps: true },
);

export const TaskModel = mongoose.models.Task || mongoose.model("Task", TaskSchema);
