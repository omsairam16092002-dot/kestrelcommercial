import type { ContactRole, DeskContact, DeskTask, DeskTaskKind, EnquiryTopic } from "@kestrel/shared";
import { isDbConnected } from "../db/mongoose";
import { ContactModel } from "../models/Contact";
import { EnquiryModel } from "../models/Enquiry";
import { TaskModel } from "../models/Task";
import { logActivity } from "./activity";

export function phoneDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

export function roleFromTopic(topic?: string | null): ContactRole {
  switch (topic as EnquiryTopic | undefined) {
    case "selling":
    case "appraisal":
      return "vendor";
    case "leasing-out":
      return "landlord";
    case "buying-or-leasing":
      return "occupier";
    case "management":
      return "landlord";
    default:
      return "occupier";
  }
}

export function serializeContact(
  doc: Record<string, unknown>,
  extra?: { enquiryCount?: number; openTaskCount?: number },
): DeskContact {
  const notes = Array.isArray(doc.notes)
    ? (doc.notes as { text: string; at?: Date | string; by?: string }[]).map((n) => ({
        text: n.text,
        at: n.at ? new Date(n.at).toISOString() : new Date().toISOString(),
        by: n.by ?? "",
      }))
    : [];
  return {
    id: String(doc._id ?? doc.id ?? ""),
    name: String(doc.name ?? ""),
    company: String(doc.company ?? ""),
    email: String(doc.email ?? ""),
    phone: String(doc.phone ?? ""),
    role: (doc.role as ContactRole) || "occupier",
    source: String(doc.source ?? ""),
    notes,
    lastTouchAt: doc.lastTouchAt ? new Date(doc.lastTouchAt as string | Date).toISOString() : null,
    enquiryCount: extra?.enquiryCount,
    openTaskCount: extra?.openTaskCount,
    createdAt: doc.createdAt ? new Date(doc.createdAt as string | Date).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt as string | Date).toISOString() : new Date().toISOString(),
  };
}

export function serializeTask(doc: Record<string, unknown>, contactName?: string | null): DeskTask {
  return {
    id: String(doc._id ?? doc.id ?? ""),
    title: String(doc.title ?? ""),
    kind: (doc.kind as DeskTaskKind) || "follow-up",
    status: doc.status === "done" ? "done" : "open",
    dueAt: doc.dueAt ? new Date(doc.dueAt as string | Date).toISOString() : null,
    note: String(doc.note ?? ""),
    contactId: doc.contactId ? String(doc.contactId) : null,
    enquiryId: doc.enquiryId ? String(doc.enquiryId) : null,
    propertySlug: (doc.propertySlug as string | null) ?? null,
    contactName: contactName ?? null,
    doneAt: doc.doneAt ? new Date(doc.doneAt as string | Date).toISOString() : null,
    by: String(doc.by ?? "desk"),
    createdAt: doc.createdAt ? new Date(doc.createdAt as string | Date).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt as string | Date).toISOString() : new Date().toISOString(),
  };
}

export async function upsertContactFromLead(
  lead: {
    name: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    topic?: string | null;
    source?: string | null;
  },
  by = "public",
) {
  if (!isDbConnected()) return null;
  const email = String(lead.email || "")
    .trim()
    .toLowerCase();
  const digits = phoneDigits(String(lead.phone || ""));
  const or: Record<string, unknown>[] = [];
  if (email) or.push({ email });
  if (digits.length >= 8) or.push({ phoneDigits: digits });

  let doc = or.length ? await ContactModel.findOne({ $or: or }) : null;
  const role = roleFromTopic(lead.topic);

  if (!doc) {
    doc = await ContactModel.create({
      name: lead.name,
      email,
      phone: lead.phone || "",
      phoneDigits: digits,
      company: lead.company || "",
      role,
      source: lead.source || "web",
      lastTouchAt: new Date(),
    });
    await logActivity({
      type: "contact.created",
      entityType: "contact",
      entityId: String(doc._id),
      summary: `Contact · ${doc.name}`,
      by,
    });
    return doc;
  }

  const patch: Record<string, unknown> = { lastTouchAt: new Date() };
  if (lead.name && String(lead.name).length > String(doc.name || "").length) patch.name = lead.name;
  if (email && !doc.email) patch.email = email;
  if (digits && !doc.phoneDigits) {
    patch.phone = lead.phone || "";
    patch.phoneDigits = digits;
  }
  if (lead.company && !doc.company) patch.company = lead.company;
  await ContactModel.findByIdAndUpdate(doc._id, patch);
  return ContactModel.findById(doc._id);
}

export async function attachEnquiryContact(
  enquiryId: string,
  lead: {
    name: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    topic?: string | null;
    source?: string | null;
    intent?: string | null;
    preferredInspectionAt?: string | null;
    propertySlug?: string | null;
  },
  by = "public",
) {
  const contact = await upsertContactFromLead(lead, by);
  if (!contact) return null;
  const attendance =
    lead.intent === "inspection" || lead.preferredInspectionAt ? "booked" : undefined;
  await EnquiryModel.findByIdAndUpdate(enquiryId, {
    contactId: contact._id,
    ...(attendance ? { inspectionAttendance: attendance } : {}),
  });

  const kind: DeskTaskKind =
    lead.topic === "appraisal" || lead.source === "appraisal" || lead.source === "appraisal-quick"
      ? "appraisal"
      : lead.intent === "inspection"
        ? "inspect"
        : "follow-up";
  const shouldTask =
    kind === "appraisal" || kind === "inspect" || lead.source === "appraisal" || lead.source === "appraisal-quick";
  if (shouldTask) {
    const due =
      kind === "inspect" && lead.preferredInspectionAt
        ? new Date(`${lead.preferredInspectionAt}T09:00:00`)
        : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const title =
      kind === "appraisal"
        ? `Appraisal follow-up · ${lead.name}`
        : kind === "inspect"
          ? `Inspection · ${lead.name}`
          : `Follow up · ${lead.name}`;
    const existing = await TaskModel.findOne({ enquiryId, kind, status: "open" });
    if (!existing) {
      await TaskModel.create({
        title,
        kind,
        status: "open",
        dueAt: due,
        contactId: contact._id,
        enquiryId,
        propertySlug: lead.propertySlug || null,
        by,
      });
    }
  }
  return contact;
}

export async function backfillOrphanEnquiries(limit = 80) {
  if (!isDbConnected()) return 0;
  const orphans = await EnquiryModel.find({
    $or: [{ contactId: null }, { contactId: { $exists: false } }],
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  let n = 0;
  for (const row of orphans) {
    const lead = row as unknown as {
      _id: unknown;
      name: string;
      email?: string;
      phone?: string;
      company?: string;
      topic?: string;
      source?: string;
      intent?: string;
      preferredInspectionAt?: string;
      propertySlug?: string;
    };
    await attachEnquiryContact(String(lead._id), lead, "desk");
    n += 1;
  }
  return n;
}
