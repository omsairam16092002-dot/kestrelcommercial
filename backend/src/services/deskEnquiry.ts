import {
  INTENT_LABELS,
  PROPERTIES,
  fullAddress,
  type EnquiryIntent,
  type EnquirySource,
  type EnquiryTopic,
  type InspectionWindow,
} from "@kestrel/shared";
import { isDbConnected } from "../db/mongoose";
import { EnquiryModel } from "../models/Enquiry";
import { PropertyModel } from "../models/Property";
import { pingPrincipal, type LeadPing } from "./notify";
import { serializeProperty } from "../utils/serialize";
import { logActivity } from "./activity";
import { attachEnquiryContact } from "./contacts";
import { sendEnquiryAcknowledgement } from "./emailAutomation";

export type CreateDeskEnquiryInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  message: string;
  topic?: EnquiryTopic | string | null;
  intent?: EnquiryIntent;
  preferredInspectionAt?: string | null;
  inspectionWindow?: InspectionWindow | string | null;
  source: EnquirySource;
  propertyId?: string | null;
  propertySlug?: string | null;
  portalListingId?: string | null;
  inboundEmailId?: string | null;
  by?: string;
};

export type CreateDeskEnquiryResult = {
  record: Record<string, unknown>;
  persistence: "mongo" | "memory";
  notify: { delivered: boolean; channels: string[] };
};

const memoryStore: Record<string, unknown>[] = [];

export function getMemoryEnquiries() {
  return memoryStore;
}

export async function propertyLabelFor(slug?: string | null): Promise<string | undefined> {
  if (!slug) return undefined;
  if (!isDbConnected()) {
    const found = PROPERTIES.find((p) => p.slug === slug);
    return found ? fullAddress(found) : slug;
  }
  const doc = await PropertyModel.findOne({ slug }).lean();
  if (!doc) {
    const found = PROPERTIES.find((p) => p.slug === slug);
    return found ? fullAddress(found) : slug;
  }
  return fullAddress(serializeProperty(doc as Record<string, unknown>));
}

export async function resolveListingRefs(input: {
  propertyId?: string | null;
  propertySlug?: string | null;
  portalListingId?: string | null;
}) {
  let propertySlug = input.propertySlug?.trim() || null;
  let propertyId =
    input.propertyId && /^[a-f0-9]{24}$/i.test(input.propertyId) ? input.propertyId : null;
  const portalListingId = input.portalListingId?.trim() || null;
  if (!isDbConnected()) return { propertySlug, propertyId };

  if (portalListingId) {
    const byPortal = await PropertyModel.findOne({ portalListingId })
      .select("_id slug")
      .lean();
    if (byPortal && !Array.isArray(byPortal)) {
      return { propertyId: String(byPortal._id), propertySlug: String(byPortal.slug || propertySlug || "") };
    }
  }

  if (propertySlug || propertyId) {
    const listed = await PropertyModel.findOne(propertyId ? { _id: propertyId } : { slug: propertySlug })
      .select("_id slug")
      .lean();
    if (listed && !Array.isArray(listed)) {
      propertyId = String(listed._id);
      propertySlug = String(listed.slug || propertySlug || "");
    }
  }
  return { propertySlug, propertyId };
}

export async function createDeskEnquiry(input: CreateDeskEnquiryInput): Promise<CreateDeskEnquiryResult> {
  const intent = input.intent ?? "enquire";
  const source = input.source;
  const by = input.by || (source.startsWith("portal-") ? "portal" : "public");
  const { propertySlug, propertyId } = await resolveListingRefs(input);
  const label = (await propertyLabelFor(propertySlug)) || propertySlug || undefined;
  const crmStage = intent === "inspection" ? "inspecting" : "new";
  const message =
    label && !String(input.message || "").toLowerCase().includes(String(label).slice(0, 20).toLowerCase())
      ? `${input.message}\n\nProperty: ${label}`
      : input.message;

  let record: Record<string, unknown>;
  let persistence: "mongo" | "memory" = "memory";

  if (!isDbConnected()) {
    record = {
      id: `enq-${Date.now()}`,
      name: input.name,
      email: input.email || "",
      phone: input.phone || "",
      company: input.company || "",
      message,
      topic: input.topic || "other",
      intent,
      preferredInspectionAt: input.preferredInspectionAt || "",
      inspectionWindow: input.inspectionWindow || "",
      source,
      propertySlug,
      propertyId,
      inboundEmailId: input.inboundEmailId || null,
      crmStage,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryStore.unshift(record);
  } else {
    const created = await EnquiryModel.create({
      name: input.name,
      email: input.email || "",
      phone: input.phone || "",
      company: input.company || "",
      message,
      topic: input.topic || "other",
      intent,
      preferredInspectionAt: input.preferredInspectionAt || "",
      inspectionWindow: input.inspectionWindow || "",
      source,
      propertySlug: propertySlug || null,
      propertyId: propertyId || null,
      inboundEmailId: input.inboundEmailId || null,
      crmStage,
    });
    record = { id: String(created._id), ...created.toObject() };
    persistence = "mongo";
    await logActivity({
      type: "enquiry.created",
      entityType: "enquiry",
      entityId: String(record.id),
      summary: `New ${intent} lead · ${input.name}${label ? ` · ${label}` : ""}`,
      by,
    });
    const contact = await attachEnquiryContact(
      String(record.id),
      {
        name: input.name,
        email: input.email,
        phone: input.phone,
        company: input.company,
        topic: input.topic,
        source,
        intent,
        preferredInspectionAt: input.preferredInspectionAt || undefined,
        propertySlug,
      },
      by,
    );
    if (contact) record.contactId = String(contact._id);
  }

  const lead: LeadPing = {
    id: String(record.id),
    intent,
    name: input.name,
    company: input.company || undefined,
    email: input.email || undefined,
    phone: input.phone || undefined,
    message: input.message,
    preferredInspectionAt: input.preferredInspectionAt || undefined,
    inspectionWindow: input.inspectionWindow || undefined,
    propertySlug,
    propertyLabel: label,
    source,
  };

  const notify = await pingPrincipal(lead);

  if (persistence === "mongo" && notify.channels.length) {
    await EnquiryModel.findByIdAndUpdate(record.id, {
      notifiedAt: new Date(),
      notifyChannels: notify.channels,
    }).catch(() => undefined);
  }

  await sendEnquiryAcknowledgement({
    id: String(record.id),
    name: input.name,
    email: input.email,
    propertySlug,
    contactId: record.contactId ? String(record.contactId) : null,
  }).catch((err) => console.error("[deskEnquiry] acknowledgement failed", err));

  return { record, persistence, notify };
}

export function documentUrls(slug: string | null | undefined, enquiryId: string) {
  if (!slug) return { brochureUrl: null, floorplanUrl: null };
  return {
    brochureUrl: `/api/properties/${encodeURIComponent(slug)}/brochure?lead=${encodeURIComponent(enquiryId)}`,
    floorplanUrl: `/api/properties/${encodeURIComponent(slug)}/floorplan?lead=${encodeURIComponent(enquiryId)}`,
  };
}

export function publicEnquiry(
  record: Record<string, unknown>,
  notify: { delivered: boolean; channels: string[] },
) {
  const id = String(record.id ?? record._id ?? "");
  const slug = (record.propertySlug as string | null) ?? null;
  return {
    id,
    propertySlug: slug,
    intent: record.intent ?? "enquire",
    name: record.name,
    crmStage: record.crmStage ?? "new",
    documents: documentUrls(slug, id),
    notify,
  };
}

export function intentLabel(intent: EnquiryIntent) {
  return INTENT_LABELS[intent];
}
