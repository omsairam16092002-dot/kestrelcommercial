import { Router } from "express";
import { z } from "zod";
import { CONTACT_ROLES } from "@kestrel/shared";
import { isDbConnected } from "../db/mongoose";
import { ContactModel } from "../models/Contact";
import { EnquiryModel } from "../models/Enquiry";
import { TaskModel } from "../models/Task";
import { requireAuth } from "../middleware/requireAuth";
import { HttpError } from "../middleware/errorHandler";
import { logActivity } from "../services/activity";
import {
  backfillOrphanEnquiries,
  phoneDigits,
  serializeContact,
  serializeTask,
} from "../services/contacts";
import { lookupEnquiryProperties, pickEnquiryProperty } from "../utils/enquiryProperty";

export const contactsRouter = Router();
contactsRouter.use(requireAuth);

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

contactsRouter.get("/", async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    await backfillOrphanEnquiries(60);
    const filter: Record<string, unknown> = {};
    if (typeof req.query.role === "string" && req.query.role !== "all") filter.role = req.query.role;
    if (typeof req.query.q === "string" && req.query.q.trim()) {
      const raw = req.query.q.trim();
      const rx = new RegExp(escapeRegex(raw), "i");
      const digits = phoneDigits(raw);
      const or: Record<string, unknown>[] = [{ name: rx }, { email: rx }, { phone: rx }, { company: rx }];
      if (digits.length >= 6) or.push({ phoneDigits: new RegExp(escapeRegex(digits)) });
      filter.$or = or;
    }
    const docs = await ContactModel.find(filter).sort({ lastTouchAt: -1, updatedAt: -1 }).limit(300).lean();
    const ids = docs.map((d) => d._id);
    const [enquiryCounts, taskCounts] = await Promise.all([
      EnquiryModel.aggregate([{ $match: { contactId: { $in: ids } } }, { $group: { _id: "$contactId", count: { $sum: 1 } } }]),
      TaskModel.aggregate([
        { $match: { contactId: { $in: ids }, status: "open" } },
        { $group: { _id: "$contactId", count: { $sum: 1 } } },
      ]),
    ]);
    const enquiryMap = Object.fromEntries(enquiryCounts.map((r) => [String(r._id), r.count]));
    const taskMap = Object.fromEntries(taskCounts.map((r) => [String(r._id), r.count]));
    res.json({
      contacts: docs.map((d) =>
        serializeContact(d as Record<string, unknown>, {
          enquiryCount: enquiryMap[String(d._id)] ?? 0,
          openTaskCount: taskMap[String(d._id)] ?? 0,
        }),
      ),
    });
  } catch (err) {
    next(err);
  }
});

contactsRouter.post("/", async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const parsed = z
      .object({
        name: z.string().trim().min(1),
        company: z.string().optional(),
        email: z.string().trim().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        role: z.enum(CONTACT_ROLES).optional(),
      })
      .parse(req.body);
    const email = (parsed.email || "").toLowerCase();
    const digits = phoneDigits(parsed.phone || "");
    const created = await ContactModel.create({
      name: parsed.name,
      company: parsed.company || "",
      email,
      phone: parsed.phone || "",
      phoneDigits: digits,
      role: parsed.role || "occupier",
      source: "desk",
      lastTouchAt: new Date(),
    });
    await logActivity({
      type: "contact.created",
      entityType: "contact",
      entityId: String(created._id),
      summary: `Contact · ${created.name}`,
      by: req.user?.name || req.user?.email || "desk",
    });
    res.status(201).json(serializeContact(created.toObject()));
  } catch (err) {
    next(err);
  }
});

contactsRouter.get("/:id", async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const doc = await ContactModel.findById(req.params.id).lean();
    if (!doc || Array.isArray(doc)) throw new HttpError(404, "Contact not found");
    const contactId = doc._id;
    const [enquiries, tasks, enquiryCount, openTaskCount] = await Promise.all([
      EnquiryModel.find({ contactId }).sort({ createdAt: -1 }).limit(50).lean(),
      TaskModel.find({ contactId }).sort({ status: 1, dueAt: 1, createdAt: -1 }).limit(50).lean(),
      EnquiryModel.countDocuments({ contactId }),
      TaskModel.countDocuments({ contactId, status: "open" }),
    ]);
    const maps = await lookupEnquiryProperties(enquiries as unknown[]);
    res.json({
      contact: serializeContact(doc as Record<string, unknown>, { enquiryCount, openTaskCount }),
      enquiries: enquiries.map((d) => {
        const property = pickEnquiryProperty(d, maps);
        return {
          id: String(d._id),
          name: d.name,
          intent: d.intent,
          crmStage: d.crmStage,
          source: d.source,
          propertySlug: d.propertySlug,
          property,
          inspectionAttendance: d.inspectionAttendance || null,
          preferredInspectionAt: d.preferredInspectionAt || null,
          createdAt: d.createdAt ? new Date(d.createdAt as Date).toISOString() : null,
        };
      }),
      tasks: tasks.map((t) => serializeTask(t as Record<string, unknown>, String(doc.name))),
    });
  } catch (err) {
    next(err);
  }
});

contactsRouter.patch("/:id", async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const parsed = z
      .object({
        name: z.string().trim().min(1).optional(),
        company: z.string().optional(),
        email: z.string().trim().optional(),
        phone: z.string().optional(),
        role: z.enum(CONTACT_ROLES).optional(),
      })
      .parse(req.body);
    const patch: Record<string, unknown> = { lastTouchAt: new Date() };
    if (parsed.name) patch.name = parsed.name;
    if (parsed.company != null) patch.company = parsed.company;
    if (parsed.email != null) patch.email = parsed.email.trim().toLowerCase();
    if (parsed.phone != null) {
      patch.phone = parsed.phone;
      patch.phoneDigits = phoneDigits(parsed.phone);
    }
    if (parsed.role) patch.role = parsed.role;
    const updated = await ContactModel.findByIdAndUpdate(req.params.id, patch, { new: true });
    if (!updated) throw new HttpError(404, "Contact not found");
    await logActivity({
      type: "contact.update",
      entityType: "contact",
      entityId: String(updated._id),
      summary: `Updated ${updated.name}`,
      by: req.user?.name || req.user?.email || "desk",
    });
    res.json(serializeContact(updated.toObject()));
  } catch (err) {
    next(err);
  }
});

contactsRouter.post("/:id/notes", async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const text = z.string().trim().min(1).parse(req.body.text);
    const updated = await ContactModel.findByIdAndUpdate(
      req.params.id,
      {
        lastTouchAt: new Date(),
        $push: { notes: { text, at: new Date(), by: req.user?.name || req.user?.email || "desk" } },
      },
      { new: true },
    );
    if (!updated) throw new HttpError(404, "Contact not found");
    await logActivity({
      type: "contact.note",
      entityType: "contact",
      entityId: String(updated._id),
      summary: `Note on ${updated.name}`,
      by: req.user?.name || req.user?.email || "desk",
    });
    res.json(serializeContact(updated.toObject()));
  } catch (err) {
    next(err);
  }
});
