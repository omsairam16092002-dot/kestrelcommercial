import { Router } from "express";
import { z } from "zod";
import { AGENCY, ENQUIRY_SOURCES, INTENT_LABELS, type EnquiryPropertySummary, type EnquirySource } from "@kestrel/shared";
import { isDbConnected } from "../db/mongoose";
import { EnquiryModel } from "../models/Enquiry";
import { InboundEmailModel } from "../models/InboundEmail";
import { requireAuth } from "../middleware/requireAuth";
import { HttpError } from "../middleware/errorHandler";
import { logActivity } from "../services/activity";
import {
  createDeskEnquiry,
  getMemoryEnquiries,
  publicEnquiry,
} from "../services/deskEnquiry";
import { serializeInbound } from "../services/inboundLeads";
import {
  lookupEnquiryProperties,
  pickEnquiryProperty,
  resolveListedProperty,
} from "../utils/enquiryProperty";

export const enquiriesRouter = Router();

const enquirySchema = z
  .object({
    propertyId: z.string().optional().nullable(),
    propertySlug: z
      .string()
      .optional()
      .nullable()
      .transform((v) => (v && v.trim() ? v.trim() : null)),
    name: z.string().min(1, "Add your name so we know who to call back."),
    company: z.string().optional(),
    email: z
      .string()
      .trim()
      .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "That email address looks incomplete.")
      .optional(),
    phone: z.string().trim().optional().default(""),
    message: z.string().min(8, "Tell us a little about the property or what you are looking for."),
    topic: z
      .enum([
        "selling",
        "leasing-out",
        "buying-or-leasing",
        "smsf",
        "management",
        "appraisal",
        "other",
      ])
      .optional(),
    intent: z.enum(["enquire", "inspection", "brochure"]).default("enquire"),
    preferredInspectionAt: z.string().optional(),
    inspectionWindow: z.enum(["morning", "afternoon", "flexible"]).optional(),
    source: z.enum(ENQUIRY_SOURCES as unknown as [EnquirySource, ...EnquirySource[]]).default("web"),
  })
  .refine((d) => (d.phone && d.phone.length >= 8) || (d.email && d.email.length > 0), {
    message: "Add a phone number or an email so we can reach you.",
    path: ["phone"],
  });

enquiriesRouter.post("/", async (req, res, next) => {
  try {
    const parsed = enquirySchema.parse(req.body);
    const created = await createDeskEnquiry({
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone,
      company: parsed.company,
      message: parsed.message,
      topic: parsed.topic,
      intent: parsed.intent,
      preferredInspectionAt: parsed.preferredInspectionAt,
      inspectionWindow: parsed.inspectionWindow,
      source: parsed.source,
      propertyId: parsed.propertyId,
      propertySlug: parsed.propertySlug,
      by: "public",
    });
    res.status(201).json({
      ok: true,
      persistence: created.persistence,
      enquiry: publicEnquiry(created.record, created.notify),
      intentLabel: INTENT_LABELS[parsed.intent],
      desk: { phone: AGENCY.phone, whatsapp: AGENCY.whatsappHref, email: AGENCY.email },
    });
  } catch (err) {
    next(err);
  }
});

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

enquiriesRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      return res.json({ enquiries: getMemoryEnquiries().map((d) => serializeEnquiry(d)), persistence: "memory" });
    }
    const filter: Record<string, unknown> = {};
    if (typeof req.query.stage === "string" && req.query.stage !== "all") filter.crmStage = req.query.stage;
    if (typeof req.query.source === "string" && req.query.source !== "all") filter.source = req.query.source;
    if (typeof req.query.intent === "string" && req.query.intent !== "all") filter.intent = req.query.intent;
    if (typeof req.query.slug === "string" && req.query.slug.trim()) filter.propertySlug = req.query.slug.trim();
    const createdAt: Record<string, Date> = {};
    if (typeof req.query.from === "string" && req.query.from) createdAt.$gte = new Date(req.query.from);
    if (typeof req.query.to === "string" && req.query.to) createdAt.$lte = new Date(`${req.query.to}T23:59:59`);
    if (Object.keys(createdAt).length) filter.createdAt = createdAt;
    if (typeof req.query.q === "string" && req.query.q.trim()) {
      const raw = req.query.q.trim();
      const rx = new RegExp(escapeRegex(raw), "i");
      const digits = raw.replace(/\D/g, "");
      const or: Record<string, unknown>[] = [
        { name: rx },
        { email: rx },
        { phone: rx },
        { message: rx },
        { propertySlug: rx },
        { company: rx },
      ];
      if (digits.length >= 6) or.push({ phone: new RegExp(escapeRegex(digits)) });
      filter.$or = or;
    }
    const docs = await EnquiryModel.find(filter).sort({ createdAt: -1 }).limit(400).lean();
    const maps = await lookupEnquiryProperties(docs as unknown[]);
    res.json({
      enquiries: docs.map((d) => serializeEnquiry(d as Record<string, unknown>, pickEnquiryProperty(d, maps))),
      persistence: "mongo",
    });
  } catch (err) {
    next(err);
  }
});

enquiriesRouter.post("/bulk-stage", requireAuth, async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const parsed = z
      .object({
        ids: z.array(z.string().min(1)).min(1).max(100),
        crmStage: z.enum(["new", "contacted", "qualified", "inspecting", "negotiating", "won", "lost"]),
      })
      .parse(req.body);
    const by = req.user?.name || req.user?.email || "desk";
    await EnquiryModel.updateMany({ _id: { $in: parsed.ids } }, { crmStage: parsed.crmStage });
    await Promise.all(
      parsed.ids.map((id) =>
        logActivity({
          type: "enquiry.stage",
          entityType: "enquiry",
          entityId: id,
          summary: `Stage → ${parsed.crmStage}`,
          by,
        }),
      ),
    );
    const docs = await EnquiryModel.find({ _id: { $in: parsed.ids } }).lean();
    res.json({ enquiries: await serializeEnquiries(docs as Record<string, unknown>[]) });
  } catch (err) {
    next(err);
  }
});

enquiriesRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const doc = await EnquiryModel.findById(req.params.id).lean();
    if (!doc || Array.isArray(doc)) throw new HttpError(404, "Enquiry not found");
    const base = await serializeEnquiryWithProperty(doc as Record<string, unknown>);
    let inboundEmail = null;
    if (doc.inboundEmailId) {
      const inbound = await InboundEmailModel.findById(doc.inboundEmailId).lean();
      if (inbound && !Array.isArray(inbound)) inboundEmail = serializeInbound(inbound as Record<string, unknown>);
    } else {
      const inbound = await InboundEmailModel.findOne({ enquiryId: doc._id }).lean();
      if (inbound && !Array.isArray(inbound)) inboundEmail = serializeInbound(inbound as Record<string, unknown>);
    }
    res.json({ ...base, inboundEmail });
  } catch (err) {
    next(err);
  }
});

enquiriesRouter.patch("/:id/stage", requireAuth, async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const stage = z
      .enum(["new", "contacted", "qualified", "inspecting", "negotiating", "won", "lost"])
      .parse(req.body.crmStage);
    const previous = await EnquiryModel.findById(req.params.id);
    if (!previous) throw new HttpError(404, "Enquiry not found");
    const updated = await EnquiryModel.findByIdAndUpdate(
      req.params.id,
      {
        crmStage: stage,
        $push: {
          notes: {
            text: `Stage ${previous.crmStage || "new"} → ${stage}`,
            at: new Date(),
            by: req.user?.name || req.user?.email || "desk",
          },
        },
      },
      { new: true },
    );
    if (!updated) throw new HttpError(404, "Enquiry not found");
    await logActivity({
      type: "enquiry.stage",
      entityType: "enquiry",
      entityId: String(updated._id),
      summary: `${updated.name}: ${previous.crmStage || "new"} → ${stage}`,
      by: req.user?.name || req.user?.email || "desk",
    });
    res.json(await serializeEnquiryWithProperty(updated.toObject()));
  } catch (err) {
    next(err);
  }
});

enquiriesRouter.patch("/:id/listing", requireAuth, async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const parsed = z
      .object({
        propertySlug: z.string().trim().min(1).optional(),
        propertyId: z.string().trim().optional(),
      })
      .refine((d) => Boolean(d.propertySlug || d.propertyId), { message: "Choose a listing." })
      .parse(req.body);
    const listed = await resolveListedProperty(parsed.propertySlug ?? null, parsed.propertyId ?? null);
    if (!listed) throw new HttpError(404, "Listing not found");
    const previous = await EnquiryModel.findById(req.params.id);
    if (!previous) throw new HttpError(404, "Enquiry not found");
    const updated = await EnquiryModel.findByIdAndUpdate(
      req.params.id,
      {
        propertySlug: listed.slug,
        propertyId: listed.id,
        $push: {
          notes: {
            text: `Listing attached: ${listed.address}, ${listed.suburb}`,
            at: new Date(),
            by: req.user?.name || req.user?.email || "desk",
          },
        },
      },
      { new: true },
    );
    if (!updated) throw new HttpError(404, "Enquiry not found");
    await logActivity({
      type: "enquiry.listing",
      entityType: "enquiry",
      entityId: String(updated._id),
      summary: `${updated.name} → ${listed.address}, ${listed.suburb}`,
      by: req.user?.name || req.user?.email || "desk",
    });
    res.json(await serializeEnquiryWithProperty(updated.toObject(), listed));
  } catch (err) {
    next(err);
  }
});

enquiriesRouter.patch("/:id/follow-up", requireAuth, async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const parsed = z
      .object({
        followUpAt: z.string().nullable().optional(),
        followUpNote: z.string().optional(),
      })
      .parse(req.body);
    const followUpAt = parsed.followUpAt ? new Date(parsed.followUpAt) : null;
    const updated = await EnquiryModel.findByIdAndUpdate(
      req.params.id,
      { followUpAt, followUpNote: parsed.followUpNote ?? "" },
      { new: true },
    );
    if (!updated) throw new HttpError(404, "Enquiry not found");
    await logActivity({
      type: "enquiry.followup",
      entityType: "enquiry",
      entityId: String(updated._id),
      summary: followUpAt
        ? `Follow-up set ${followUpAt.toISOString().slice(0, 10)} · ${updated.name}`
        : `Follow-up cleared · ${updated.name}`,
      by: req.user?.name || req.user?.email || "desk",
    });
    res.json(await serializeEnquiryWithProperty(updated.toObject()));
  } catch (err) {
    next(err);
  }
});

enquiriesRouter.patch("/:id/attendance", requireAuth, async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const inspectionAttendance = z.enum(["booked", "attended", "no-show", "cancelled"]).parse(req.body.inspectionAttendance);
    const previous = await EnquiryModel.findById(req.params.id);
    if (!previous) throw new HttpError(404, "Enquiry not found");
    const updated = await EnquiryModel.findByIdAndUpdate(
      req.params.id,
      {
        inspectionAttendance,
        $push: {
          notes: {
            text: `Inspection ${previous.inspectionAttendance || "unset"} → ${inspectionAttendance}`,
            at: new Date(),
            by: req.user?.name || req.user?.email || "desk",
          },
        },
      },
      { new: true },
    );
    if (!updated) throw new HttpError(404, "Enquiry not found");
    if (inspectionAttendance === "attended" && updated.crmStage !== "won" && updated.crmStage !== "lost") {
      await EnquiryModel.findByIdAndUpdate(updated._id, { crmStage: "inspecting" });
    }
    await logActivity({
      type: "enquiry.attendance",
      entityType: "enquiry",
      entityId: String(updated._id),
      summary: `${updated.name}: inspection ${inspectionAttendance}`,
      by: req.user?.name || req.user?.email || "desk",
    });
    const fresh = await EnquiryModel.findById(updated._id);
    res.json(await serializeEnquiryWithProperty((fresh || updated).toObject()));
  } catch (err) {
    next(err);
  }
});

enquiriesRouter.post("/:id/notes", requireAuth, async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const text = z.string().trim().min(1).parse(req.body.text);
    const updated = await EnquiryModel.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          notes: { text, at: new Date(), by: req.user?.name || req.user?.email || "desk" },
        },
      },
      { new: true },
    );
    if (!updated) throw new HttpError(404, "Enquiry not found");
    await logActivity({
      type: "enquiry.note",
      entityType: "enquiry",
      entityId: String(updated._id),
      summary: `Note on ${updated.name}`,
      by: req.user?.name || req.user?.email || "desk",
    });
    res.json(await serializeEnquiryWithProperty(updated.toObject()));
  } catch (err) {
    next(err);
  }
});

async function serializeEnquiries(docs: Record<string, unknown>[]) {
  const maps = await lookupEnquiryProperties(docs);
  return docs.map((d) => serializeEnquiry(d, pickEnquiryProperty(d, maps)));
}

async function serializeEnquiryWithProperty(doc: Record<string, unknown>, known?: EnquiryPropertySummary | null) {
  const property = known ?? pickEnquiryProperty(doc, await lookupEnquiryProperties([doc]));
  return serializeEnquiry(doc, property);
}

function serializeEnquiry(doc: Record<string, unknown>, property: EnquiryPropertySummary | null = null) {
  const notes = Array.isArray(doc.notes)
    ? (doc.notes as { text: string; at?: Date | string; by?: string }[]).map((n) => ({
        text: n.text,
        at: n.at ? new Date(n.at).toISOString() : new Date().toISOString(),
        by: n.by ?? "",
      }))
    : [];
  return {
    id: String(doc._id ?? doc.id ?? ""),
    propertyId: doc.propertyId ? String(doc.propertyId) : property?.id ?? null,
    propertySlug: (doc.propertySlug as string | null) ?? property?.slug ?? null,
    property,
    contactId: doc.contactId ? String(doc.contactId) : null,
    name: String(doc.name ?? ""),
    company: String(doc.company ?? ""),
    email: String(doc.email ?? ""),
    phone: String(doc.phone ?? ""),
    message: String(doc.message ?? ""),
    topic: doc.topic ?? "other",
    intent: doc.intent ?? "enquire",
    preferredInspectionAt: doc.preferredInspectionAt ?? null,
    inspectionWindow: doc.inspectionWindow || null,
    inspectionAttendance: doc.inspectionAttendance || null,
    source: doc.source ?? "web",
    crmStage: doc.crmStage ?? "new",
    followUpAt: doc.followUpAt ? new Date(doc.followUpAt as string | Date).toISOString() : null,
    followUpNote: String(doc.followUpNote ?? ""),
    notifiedAt: doc.notifiedAt ? new Date(doc.notifiedAt as string | Date).toISOString() : null,
    notifyChannels: Array.isArray(doc.notifyChannels) ? doc.notifyChannels : [],
    notes,
    inboundEmailId: doc.inboundEmailId ? String(doc.inboundEmailId) : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt as string | Date).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt as string | Date).toISOString() : new Date().toISOString(),
  };
}
