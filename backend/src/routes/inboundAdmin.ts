import { Router } from "express";
import { z } from "zod";
import { AGENCY } from "@kestrel/shared";
import { isDbConnected } from "../db/mongoose";
import { InboundEmailModel } from "../models/InboundEmail";
import { PropertyModel } from "../models/Property";
import { requireAuth } from "../middleware/requireAuth";
import { HttpError } from "../middleware/errorHandler";
import { env } from "../config/env";
import { createDeskEnquiry } from "../services/deskEnquiry";
import { serializeInbound } from "../services/inboundLeads";
import { sourceForPortal } from "../services/portalParsers";
import { runScheduledEmails } from "../services/emailAutomation";
import { syndicationStatus } from "../services/reaxml";
import { logActivity } from "../services/activity";

export const inboundAdminRouter = Router();
inboundAdminRouter.use(requireAuth);

const QUIET_DAYS = 14;

export async function portalHealth() {
  const since = new Date(Date.now() - QUIET_DAYS * 24 * 60 * 60 * 1000);
  const activeListings = isDbConnected()
    ? await PropertyModel.countDocuments({
        archived: { $ne: true },
        status: { $in: ["for-sale", "for-lease", "under-offer"] },
      })
    : 0;
  const portals = ["rea", "realcommercial"] as const;
  const rows = [];
  for (const portal of portals) {
    const lastParsed = await InboundEmailModel.findOne({ portal, parseStatus: "parsed" })
      .sort({ receivedAt: -1 })
      .lean();
    const lastAny = await InboundEmailModel.findOne({ portal }).sort({ receivedAt: -1 }).lean();
    const parsedRow = lastParsed && !Array.isArray(lastParsed) ? lastParsed : null;
    const anyRow = lastAny && !Array.isArray(lastAny) ? lastAny : null;
    const ever = Boolean(anyRow);
    const lastReceivedAt = anyRow?.receivedAt ? new Date(anyRow.receivedAt as Date).toISOString() : null;
    const lastParsedAt = parsedRow?.receivedAt ? new Date(parsedRow.receivedAt as Date).toISOString() : null;
    const quiet = ever && (!lastReceivedAt || new Date(lastReceivedAt) < since) && activeListings > 0;
    const source = portal === "rea" ? "portal-rea" : "portal-realcommercial";
    rows.push({
      portal,
      source,
      lastParsedAt,
      lastReceivedAt,
      quiet,
      warning: quiet
        ? portal === "rea"
          ? "No REA leads received in 14 days — check your portal notification settings"
          : "No realcommercial leads received in 14 days — check your portal notification settings"
        : null,
    });
  }
  const needsReviewCount = await InboundEmailModel.countDocuments({ needsReview: true });
  return { portals: rows, needsReviewCount, activeListings };
}

inboundAdminRouter.get("/lead-sources", async (_req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const health = await portalHealth();
    res.json({
      captureEmail: env.notify.leadCaptureEmail,
      agencyInbox: AGENCY.email,
      ...health,
      setup: [
        "Add the capture address as an extra notification email in realestate.com.au and realcommercial.com.au listing/uploader settings (comma-separated is fine).",
        `Or keep the portal pointed at ${AGENCY.email} and auto-forward mail from those sending domains to the capture address.`,
      ],
    });
  } catch (err) {
    next(err);
  }
});

inboundAdminRouter.get("/syndication", async (_req, res, next) => {
  try {
    res.json({
      realcommercial: {
        portal: "realcommercial.com.au",
        status: syndicationStatus(env.syndication.realcommercialKey),
      },
      commercialRealEstate: {
        portal: "commercialrealestate.com.au",
        status: syndicationStatus(env.syndication.commercialRealEstateKey),
      },
      note: "Syndication requires a certified feed provider or direct portal certification. Download REAXML today; automated push waits on that agreement.",
      bulkFeedUrl: "/api/properties/feed.xml",
    });
  } catch (err) {
    next(err);
  }
});

inboundAdminRouter.get("/inbound-emails", async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const filter: Record<string, unknown> = {};
    if (req.query.needsReview === "1" || req.query.needsReview === "true") filter.needsReview = true;
    const docs = await InboundEmailModel.find(filter).sort({ receivedAt: -1 }).limit(100).lean();
    res.json({ emails: docs.map((d) => serializeInbound(d as Record<string, unknown>)) });
  } catch (err) {
    next(err);
  }
});

inboundAdminRouter.post("/inbound-emails/:id/file", async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const parsed = z
      .object({
        name: z.string().trim().min(1),
        phone: z.string().optional(),
        email: z.string().optional(),
        message: z.string().optional(),
        propertySlug: z.string().optional(),
        portal: z.enum(["rea", "realcommercial", "unknown"]).optional(),
      })
      .refine((d) => (d.phone && d.phone.replace(/\D/g, "").length >= 8) || (d.email && d.email.includes("@")), {
        message: "Need a phone number or an email.",
      })
      .parse(req.body);
    const inbound = await InboundEmailModel.findById(req.params.id);
    if (!inbound) throw new HttpError(404, "Inbound email not found");
    const portal = parsed.portal || inbound.portal || "unknown";
    const created = await createDeskEnquiry({
      name: parsed.name,
      phone: parsed.phone,
      email: parsed.email,
      message: parsed.message || inbound.text || inbound.subject || "Portal enquiry (filed from review).",
      source: sourceForPortal(portal === "unknown" ? "rea" : portal),
      propertySlug: parsed.propertySlug || null,
      inboundEmailId: String(inbound._id),
      by: req.user?.name || req.user?.email || "desk",
    });
    inbound.parseStatus = "parsed";
    inbound.needsReview = false;
    inbound.enquiryId = created.record.id;
    inbound.parsedFields = {
      name: parsed.name,
      phone: parsed.phone || "",
      email: parsed.email || "",
      message: parsed.message || "",
      listingId: parsed.propertySlug || "",
      address: "",
    };
    await inbound.save();
    await logActivity({
      type: "inbound.filed",
      entityType: "enquiry",
      entityId: String(created.record.id),
      summary: `Filed inbound email · ${parsed.name}`,
      by: req.user?.name || req.user?.email || "desk",
    });
    res.json({
      enquiryId: created.record.id,
      inbound: serializeInbound(inbound.toObject()),
    });
  } catch (err) {
    next(err);
  }
});

inboundAdminRouter.post("/email-automations/run", async (_req, res, next) => {
  try {
    const result = await runScheduledEmails();
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});
