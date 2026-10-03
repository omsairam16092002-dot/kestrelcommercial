import { Router } from "express";
import { z } from "zod";
import { canonicalSearchQuery } from "@kestrel/shared";
import { isDbConnected } from "../db/mongoose";
import { HttpError } from "../middleware/errorHandler";
import { rateLimit } from "../middleware/rateLimit";
import { requireAuth } from "../middleware/requireAuth";
import { ListingAlertModel, SavedSearchModel } from "../models/SavedSearch";
import {
  createDeskSearch,
  createPublicSearch,
  deleteSearchByToken,
  findSearchByToken,
  matchingListings,
  publicSearch,
  serializeSearch,
  updateSearchByToken,
} from "../services/alerts";

export const alertsRouter = Router();

const alertWriteLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: "Too many alert requests. Try again in a few minutes.",
});

const publicSchema = z.object({
  email: z.string().trim().toLowerCase().email("That email address looks incomplete."),
  name: z.string().trim().max(120).optional(),
  query: z.string().max(600).default(""),
  label: z.string().trim().max(160).optional(),
  website: z.string().optional(),
});

alertsRouter.post("/", alertWriteLimit, async (req, res, next) => {
  try {
    const parsed = publicSchema.parse(req.body);
    if (parsed.website) throw new HttpError(400, "Could not save that alert.");
    const result = await createPublicSearch(parsed);
    res.status(201).json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

alertsRouter.get("/manage/:token", async (req, res, next) => {
  try {
    const doc = await findSearchByToken(req.params.token);
    if (!doc) throw new HttpError(404, "We could not find that alert. It may have been removed.");
    res.setHeader("Cache-Control", "no-store");
    res.json({ alert: publicSearch(doc), matches: await matchingListings(doc.query, 6) });
  } catch (err) {
    next(err);
  }
});

alertsRouter.post("/manage/:token", alertWriteLimit, async (req, res, next) => {
  try {
    const patch = z.object({ confirm: z.boolean().optional(), active: z.boolean().optional() }).parse(req.body);
    const doc = await updateSearchByToken(req.params.token, patch);
    res.json({ alert: publicSearch(doc) });
  } catch (err) {
    next(err);
  }
});

alertsRouter.delete("/manage/:token", alertWriteLimit, async (req, res, next) => {
  try {
    await deleteSearchByToken(req.params.token);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* ---------- Desk ---------- */

alertsRouter.get("/admin", requireAuth, async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const filter: Record<string, unknown> = {};
    if (typeof req.query.contactId === "string" && req.query.contactId) filter.contactId = req.query.contactId;
    if (req.query.origin === "public" || req.query.origin === "desk") filter.origin = req.query.origin;
    const docs = await SavedSearchModel.find(filter).sort({ createdAt: -1 }).limit(500).lean();
    res.json({ searches: docs.map((d) => serializeSearch(d as unknown as Parameters<typeof serializeSearch>[0])) });
  } catch (err) {
    next(err);
  }
});

alertsRouter.get("/admin/preview", requireAuth, async (req, res, next) => {
  try {
    const query = canonicalSearchQuery(typeof req.query.query === "string" ? req.query.query : "");
    res.json({ query, matches: await matchingListings(query, 20) });
  } catch (err) {
    next(err);
  }
});

alertsRouter.post("/admin", requireAuth, async (req, res, next) => {
  try {
    const parsed = z
      .object({
        contactId: z.string().min(1),
        query: z.string().max(600).default(""),
        label: z.string().trim().max(160).optional(),
        emailAlerts: z.boolean().default(true),
      })
      .parse(req.body);
    const doc = await createDeskSearch(parsed, req.user?.name || req.user?.email || "desk");
    res.status(201).json({ search: serializeSearch(doc), matches: await matchingListings(doc.query, 20) });
  } catch (err) {
    next(err);
  }
});

alertsRouter.patch("/admin/:id", requireAuth, async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const parsed = z
      .object({
        active: z.boolean().optional(),
        emailAlerts: z.boolean().optional(),
        label: z.string().trim().max(160).optional(),
      })
      .parse(req.body);
    const doc = await SavedSearchModel.findByIdAndUpdate(req.params.id, parsed, { new: true }).lean();
    if (!doc) throw new HttpError(404, "Saved search not found");
    res.json({ search: serializeSearch(doc as unknown as Parameters<typeof serializeSearch>[0]) });
  } catch (err) {
    next(err);
  }
});

alertsRouter.delete("/admin/:id", requireAuth, async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    await Promise.all([SavedSearchModel.deleteOne({ _id: req.params.id }), ListingAlertModel.deleteMany({ searchId: req.params.id })]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

alertsRouter.get("/admin/:id/matches", requireAuth, async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const doc = (await SavedSearchModel.findById(req.params.id).lean()) as { query: string } | null;
    if (!doc) throw new HttpError(404, "Saved search not found");
    res.json({ matches: await matchingListings(doc.query, 20) });
  } catch (err) {
    next(err);
  }
});
