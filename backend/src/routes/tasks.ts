import { Router } from "express";
import { z } from "zod";
import { DESK_TASK_KINDS } from "@kestrel/shared";
import { isDbConnected } from "../db/mongoose";
import { ContactModel } from "../models/Contact";
import { TaskModel } from "../models/Task";
import { requireAuth } from "../middleware/requireAuth";
import { HttpError } from "../middleware/errorHandler";
import { logActivity } from "../services/activity";
import { serializeTask } from "../services/contacts";

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

tasksRouter.get("/", async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const filter: Record<string, unknown> = {};
    if (typeof req.query.status === "string" && req.query.status !== "all") filter.status = req.query.status;
    if (typeof req.query.kind === "string" && req.query.kind !== "all") filter.kind = req.query.kind;
    if (typeof req.query.contactId === "string" && req.query.contactId) filter.contactId = req.query.contactId;
    if (typeof req.query.enquiryId === "string" && req.query.enquiryId) filter.enquiryId = req.query.enquiryId;
    if (req.query.due === "1") {
      filter.status = "open";
      filter.dueAt = { $ne: null, $lte: new Date() };
    }
    const docs = await TaskModel.find(filter).sort({ status: 1, dueAt: 1, createdAt: -1 }).limit(300).lean();
    const contactIds = [...new Set(docs.map((d) => (d.contactId ? String(d.contactId) : "")).filter(Boolean))];
    const contacts = contactIds.length
      ? await ContactModel.find({ _id: { $in: contactIds } }).select("_id name").lean()
      : [];
    const names = Object.fromEntries(contacts.map((c) => [String(c._id), c.name]));
    res.json({
      tasks: docs.map((d) => serializeTask(d as Record<string, unknown>, names[String(d.contactId)] ?? null)),
    });
  } catch (err) {
    next(err);
  }
});

tasksRouter.post("/", async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const parsed = z
      .object({
        title: z.string().trim().min(1),
        kind: z.enum(DESK_TASK_KINDS).optional(),
        dueAt: z.string().nullable().optional(),
        note: z.string().optional(),
        contactId: z.string().nullable().optional(),
        enquiryId: z.string().nullable().optional(),
        propertySlug: z.string().nullable().optional(),
      })
      .parse(req.body);
    const by = req.user?.name || req.user?.email || "desk";
    const created = await TaskModel.create({
      title: parsed.title,
      kind: parsed.kind || "follow-up",
      status: "open",
      dueAt: parsed.dueAt ? new Date(parsed.dueAt) : null,
      note: parsed.note || "",
      contactId: parsed.contactId || null,
      enquiryId: parsed.enquiryId || null,
      propertySlug: parsed.propertySlug || null,
      by,
    });
    if (parsed.contactId) {
      await ContactModel.findByIdAndUpdate(parsed.contactId, { lastTouchAt: new Date() }).catch(() => undefined);
    }
    await logActivity({
      type: "task.created",
      entityType: "task",
      entityId: String(created._id),
      summary: `Task · ${created.title}`,
      by,
    });
    res.status(201).json(serializeTask(created.toObject()));
  } catch (err) {
    next(err);
  }
});

tasksRouter.patch("/:id", async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const parsed = z
      .object({
        title: z.string().trim().min(1).optional(),
        kind: z.enum(DESK_TASK_KINDS).optional(),
        status: z.enum(["open", "done"]).optional(),
        dueAt: z.string().nullable().optional(),
        note: z.string().optional(),
      })
      .parse(req.body);
    const patch: Record<string, unknown> = {};
    if (parsed.title) patch.title = parsed.title;
    if (parsed.kind) patch.kind = parsed.kind;
    if (parsed.note != null) patch.note = parsed.note;
    if (parsed.dueAt !== undefined) patch.dueAt = parsed.dueAt ? new Date(parsed.dueAt) : null;
    if (parsed.status === "done") {
      patch.status = "done";
      patch.doneAt = new Date();
    } else if (parsed.status === "open") {
      patch.status = "open";
      patch.doneAt = null;
    }
    const updated = await TaskModel.findByIdAndUpdate(req.params.id, patch, { new: true });
    if (!updated) throw new HttpError(404, "Task not found");
    await logActivity({
      type: parsed.status === "done" ? "task.done" : "task.update",
      entityType: "task",
      entityId: String(updated._id),
      summary: parsed.status === "done" ? `Done · ${updated.title}` : `Updated task · ${updated.title}`,
      by: req.user?.name || req.user?.email || "desk",
    });
    res.json(serializeTask(updated.toObject()));
  } catch (err) {
    next(err);
  }
});
