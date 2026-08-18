import { Router } from "express";
import { z } from "zod";
import { isDbConnected } from "../db/mongoose";
import { NewsletterSignupModel } from "../models/NewsletterSignup";
import { pingPrincipal } from "../services/notify";
import { sendNewsletterWelcome } from "../services/emailAutomation";
import { requireAuth } from "../middleware/requireAuth";
import { HttpError } from "../middleware/errorHandler";

export const newsletterRouter = Router();

const schema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("That email address looks incomplete."),
});

const memoryStore: Record<string, unknown>[] = [];

newsletterRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      return res.json({ subscribers: memoryStore, persistence: "memory" });
    }
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const filter: Record<string, unknown> = {};
    if (q) filter.email = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const docs = await NewsletterSignupModel.find(filter).sort({ createdAt: -1 }).lean();
    const subscribers = docs.map((d) => ({
      id: String(d._id),
      email: d.email,
      source: d.source,
      createdAt: d.createdAt ? new Date(d.createdAt as Date).toISOString() : null,
    }));
    if (req.query.format === "csv") {
      const lines = ["email,source,createdAt", ...subscribers.map((s) => `${s.email},${s.source || ""},${s.createdAt || ""}`)];
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=\"kestrel-subscribers.csv\"");
      return res.send(lines.join("\n"));
    }
    res.json({ persistence: "mongo", subscribers });
  } catch (err) {
    next(err);
  }
});

newsletterRouter.post("/", async (req, res, next) => {
  try {
    const parsed = schema.parse(req.body);
    let record: Record<string, unknown>;
    let persistence: "mongo" | "memory" = "memory";

    if (!isDbConnected()) {
      const existing = memoryStore.find((row) => row.email === parsed.email);
      if (existing) {
        return res.status(200).json({ ok: true, persistence: "memory", duplicate: true });
      }
      record = {
        id: `nl-${Date.now()}`,
        email: parsed.email,
        source: "newsletter",
        createdAt: new Date().toISOString(),
      };
      memoryStore.unshift(record);
    } else {
      const existing = await NewsletterSignupModel.findOne({ email: parsed.email }).lean();
      if (existing && !Array.isArray(existing)) {
        if (!(existing as { welcomeSentAt?: Date }).welcomeSentAt) {
          const welcome = await sendNewsletterWelcome(parsed.email).catch(() => null);
          if (welcome?.status === "sent") {
            await NewsletterSignupModel.updateOne({ email: parsed.email }, { welcomeSentAt: new Date() }).catch(() => undefined);
          }
        }
        return res.status(200).json({ ok: true, persistence: "mongo", duplicate: true });
      }
      const created = await NewsletterSignupModel.create({ email: parsed.email, source: "newsletter" });
      record = { id: String(created._id), ...created.toObject() };
      persistence = "mongo";
    }

    await pingPrincipal({
      id: String(record.id),
      intent: "enquire",
      name: "Newsletter",
      email: parsed.email,
      message: "This month in the west — subscribe.",
      source: "newsletter",
    });

    const welcome = await sendNewsletterWelcome(parsed.email).catch((err) => {
      console.error("[newsletter] welcome failed", err);
      return null;
    });
    if (persistence === "mongo" && welcome?.status === "sent") {
      await NewsletterSignupModel.updateOne({ email: parsed.email }, { welcomeSentAt: new Date() }).catch(() => undefined);
    }

    res.status(201).json({ ok: true, persistence });
  } catch (err) {
    next(err);
  }
});
