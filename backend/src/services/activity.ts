import { isDbConnected } from "../db/mongoose";
import { ActivityModel } from "../models/Activity";

export async function logActivity(input: {
  type: string;
  entityType: "enquiry" | "listing" | "agent" | "subscriber" | "contact" | "task";
  entityId: string;
  summary: string;
  by?: string;
}) {
  if (!isDbConnected() || !input.entityId) return;
  try {
    await ActivityModel.create({
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary,
      by: input.by || "desk",
      at: new Date(),
    });
  } catch {
    /* never block the desk */
  }
}

export function serializeActivity(doc: Record<string, unknown>) {
  return {
    id: String(doc._id ?? doc.id ?? ""),
    type: String(doc.type ?? ""),
    entityType: String(doc.entityType ?? ""),
    entityId: String(doc.entityId ?? ""),
    summary: String(doc.summary ?? ""),
    by: String(doc.by ?? "desk"),
    at: doc.at ? new Date(doc.at as string | Date).toISOString() : new Date().toISOString(),
  };
}
