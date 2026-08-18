import { Router } from "express";
import { isDbConnected } from "../db/mongoose";
import { EnquiryModel } from "../models/Enquiry";
import { PropertyModel } from "../models/Property";
import { NewsletterSignupModel } from "../models/NewsletterSignup";
import { ContactModel } from "../models/Contact";
import { TaskModel } from "../models/Task";
import { ActivityModel } from "../models/Activity";
import { UserModel } from "../models/User";
import { requireAuth } from "../middleware/requireAuth";
import { isCloudinaryReady } from "../services/cloudinary";
import { isXeroConfigured } from "../services/xero";
import { isPexaConfigured } from "../services/pexa";
import { HttpError } from "../middleware/errorHandler";
import { serializeActivity } from "../services/activity";
import { env } from "../config/env";
import { lookupEnquiryProperties, pickEnquiryProperty } from "../utils/enquiryProperty";
import type { EnquiryPropertySummary } from "@kestrel/shared";
import { portalHealth } from "./inboundAdmin";

export const adminRouter = Router();

adminRouter.use(requireAuth);

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function serializeEnquiryLite(doc: Record<string, unknown>, property: EnquiryPropertySummary | null = null) {
  return {
    id: String(doc._id ?? doc.id ?? ""),
    name: String(doc.name ?? ""),
    email: String(doc.email ?? ""),
    phone: String(doc.phone ?? ""),
    propertySlug: (doc.propertySlug as string | null) ?? property?.slug ?? null,
    property,
    contactId: doc.contactId ? String(doc.contactId) : null,
    intent: doc.intent ?? "enquire",
    source: doc.source ?? "web",
    crmStage: doc.crmStage ?? "new",
    preferredInspectionAt: doc.preferredInspectionAt ?? null,
    inspectionWindow: doc.inspectionWindow || null,
    inspectionAttendance: doc.inspectionAttendance || null,
    followUpAt: doc.followUpAt ? new Date(doc.followUpAt as string | Date).toISOString() : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt as string | Date).toISOString() : null,
  };
}

adminRouter.get("/stats", async (_req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const now = new Date();
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const staleBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const inspectTo = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      leads7d,
      pingFailures,
      staleNew,
      dueFollowUps,
      liveSale,
      liveLease,
      subscribers,
      stageRows,
      listingRows,
      staleLeads,
      pingFailRows,
      noImageListings,
      upcomingInspect,
      listingHealth,
      recentActivity,
      contacts,
      dueTasks,
      dueTaskRows,
    ] = await Promise.all([
      EnquiryModel.countDocuments({ createdAt: { $gte: since7d } }),
      EnquiryModel.countDocuments({ notifiedAt: null, source: { $ne: "newsletter" } }),
      EnquiryModel.countDocuments({ crmStage: "new", createdAt: { $lt: staleBefore } }),
      EnquiryModel.countDocuments({ followUpAt: { $ne: null, $lte: now } }),
      PropertyModel.countDocuments({ archived: { $ne: true }, transactionSide: "sale" }),
      PropertyModel.countDocuments({ archived: { $ne: true }, transactionSide: "lease" }),
      NewsletterSignupModel.countDocuments(),
      EnquiryModel.aggregate([{ $group: { _id: "$crmStage", count: { $sum: 1 } } }]),
      PropertyModel.aggregate([
        { $match: { archived: { $ne: true } } },
        { $group: { _id: { side: "$transactionSide", status: "$status" }, count: { $sum: 1 } } },
      ]),
      EnquiryModel.find({ crmStage: "new", createdAt: { $lt: staleBefore } })
        .sort({ createdAt: 1 })
        .limit(8)
        .lean(),
      EnquiryModel.find({ notifiedAt: null, source: { $ne: "newsletter" } })
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      PropertyModel.find({
        archived: { $ne: true },
        $or: [{ images: { $size: 0 } }, { images: { $exists: false } }],
      })
        .limit(8)
        .lean(),
      EnquiryModel.find({
        $or: [{ intent: "inspection" }, { preferredInspectionAt: { $nin: [null, ""] } }],
        preferredInspectionAt: { $gte: now.toISOString().slice(0, 10), $lte: inspectTo.toISOString().slice(0, 10) },
      })
        .sort({ preferredInspectionAt: 1 })
        .limit(8)
        .lean(),
      PropertyModel.aggregate([
        { $match: { archived: { $ne: true } } },
        {
          $lookup: {
            from: "enquiries",
            localField: "slug",
            foreignField: "propertySlug",
            as: "leads",
          },
        },
        {
          $project: {
            slug: 1,
            address: 1,
            suburb: 1,
            transactionSide: 1,
            status: 1,
            imageCount: { $size: { $ifNull: ["$images", []] } },
            leadCount: { $size: "$leads" },
          },
        },
        { $sort: { leadCount: -1 } },
        { $limit: 12 },
      ]),
      ActivityModel.find().sort({ at: -1 }).limit(15).lean(),
      ContactModel.countDocuments(),
      TaskModel.countDocuments({ status: "open", dueAt: { $ne: null, $lte: now } }),
      TaskModel.find({ status: "open", dueAt: { $ne: null, $lte: now } })
        .sort({ dueAt: 1 })
        .limit(8)
        .lean(),
    ]);

    const byStage: Record<string, number> = {};
    for (const row of stageRows) byStage[String(row._id ?? "new")] = row.count;
    const listings = listingRows.map((row) => ({
      side: row._id?.side ?? "sale",
      status: row._id?.status ?? "for-sale",
      count: row.count,
    }));

    const attentionMaps = await lookupEnquiryProperties([
      ...(staleLeads as unknown[]),
      ...(pingFailRows as unknown[]),
      ...(upcomingInspect as unknown[]),
    ]);
    const portals = await portalHealth();

    res.json({
      ok: true,
      db: "mongo",
      cloudinary: isCloudinaryReady(),
      xero: isXeroConfigured(),
      pexa: isPexaConfigured(),
      redis: Boolean(env.redisUrl),
      leads7d,
      pingFailures,
      staleNew,
      dueFollowUps,
      liveSale,
      liveLease,
      subscribers,
      contacts,
      dueTasks,
      needsReviewCount: portals.needsReviewCount,
      byStage,
      listings,
      attention: {
        staleLeads: staleLeads.map((d) =>
          serializeEnquiryLite(d as Record<string, unknown>, pickEnquiryProperty(d, attentionMaps)),
        ),
        pingFailures: pingFailRows.map((d) =>
          serializeEnquiryLite(d as Record<string, unknown>, pickEnquiryProperty(d, attentionMaps)),
        ),
        noImages: noImageListings.map((d) => ({
          id: String(d._id),
          slug: d.slug,
          address: d.address,
          suburb: d.suburb,
        })),
        upcomingInspections: upcomingInspect.map((d) =>
          serializeEnquiryLite(d as Record<string, unknown>, pickEnquiryProperty(d, attentionMaps)),
        ),
        dueTasks: dueTaskRows.map((d) => ({
          id: String(d._id),
          title: d.title,
          kind: d.kind,
          dueAt: d.dueAt ? new Date(d.dueAt as Date).toISOString() : null,
          contactId: d.contactId ? String(d.contactId) : null,
          enquiryId: d.enquiryId ? String(d.enquiryId) : null,
        })),
        quietPortals: portals.portals.filter((p) => p.quiet),
      },
      listingHealth: listingHealth.map((row) => ({
        id: String(row._id),
        slug: row.slug,
        address: row.address,
        suburb: row.suburb,
        side: row.transactionSide,
        status: row.status,
        imageCount: row.imageCount,
        leadCount: row.leadCount,
      })),
      activity: recentActivity.map((d) => serializeActivity(d as Record<string, unknown>)),
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/activity", async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const filter: Record<string, unknown> = {};
    if (typeof req.query.entityType === "string") filter.entityType = req.query.entityType;
    if (typeof req.query.entityId === "string") filter.entityId = req.query.entityId;
    const docs = await ActivityModel.find(filter).sort({ at: -1 }).limit(limit).lean();
    res.json({ activity: docs.map((d) => serializeActivity(d as Record<string, unknown>)) });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/notifications", async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const user = (await UserModel.findById(req.user?.id).lean()) as { lastSeenAt?: Date } | null;
    const lastSeen = user?.lastSeenAt ? new Date(user.lastSeenAt) : new Date(0);
    const now = new Date();
    const [newLeads, dueFollowUps, dueTaskNotes, newCount, dueCount, dueTaskCount] = await Promise.all([
      EnquiryModel.find({ createdAt: { $gt: lastSeen }, source: { $ne: "newsletter" } })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      EnquiryModel.find({ followUpAt: { $ne: null, $lte: now } })
        .sort({ followUpAt: 1 })
        .limit(20)
        .lean(),
      TaskModel.find({ status: "open", dueAt: { $ne: null, $lte: now } })
        .sort({ dueAt: 1 })
        .limit(20)
        .lean(),
      EnquiryModel.countDocuments({ createdAt: { $gt: lastSeen }, source: { $ne: "newsletter" } }),
      EnquiryModel.countDocuments({ followUpAt: { $ne: null, $lte: now } }),
      TaskModel.countDocuments({ status: "open", dueAt: { $ne: null, $lte: now } }),
    ]);
    res.json({
      unread: newCount + dueCount + dueTaskCount,
      lastSeenAt: lastSeen.getTime() ? lastSeen.toISOString() : null,
      items: [
        ...newLeads.map((d) => ({
          id: `lead-${String(d._id)}`,
          kind: "enquiry" as const,
          href: `/admin/enquiries/${String(d._id)}`,
          title: `${d.name} · new lead`,
          detail: [d.intent, d.propertySlug].filter(Boolean).join(" · "),
          at: d.createdAt ? new Date(d.createdAt as Date).toISOString() : now.toISOString(),
        })),
        ...dueFollowUps.map((d) => ({
          id: `follow-${String(d._id)}`,
          kind: "follow-up" as const,
          href: `/admin/enquiries/${String(d._id)}`,
          title: `Follow up · ${d.name}`,
          detail: d.followUpNote || d.phone || d.email || "",
          at: d.followUpAt ? new Date(d.followUpAt as Date).toISOString() : now.toISOString(),
        })),
        ...dueTaskNotes.map((d) => ({
          id: `task-${String(d._id)}`,
          kind: "task" as const,
          href: d.contactId ? `/admin/contacts/${String(d.contactId)}` : "/admin/tasks",
          title: `Task due · ${d.title}`,
          detail: d.kind || "",
          at: d.dueAt ? new Date(d.dueAt as Date).toISOString() : now.toISOString(),
        })),
      ],
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/notifications/read", async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    await UserModel.findByIdAndUpdate(req.user?.id, { lastSeenAt: new Date() });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/inspections", async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const from = typeof req.query.from === "string" ? req.query.from : new Date().toISOString().slice(0, 10);
    const toDate = new Date(`${from}T00:00:00`);
    toDate.setDate(toDate.getDate() + (Number(req.query.days) || 7));
    const to = toDate.toISOString().slice(0, 10);
    const docs = await EnquiryModel.find({
      $or: [{ intent: "inspection" }, { preferredInspectionAt: { $nin: [null, ""] } }],
      preferredInspectionAt: { $gte: from, $lte: to },
    })
      .sort({ preferredInspectionAt: 1, createdAt: 1 })
      .lean();
    const maps = await lookupEnquiryProperties(docs as unknown[]);
    res.json({
      from,
      to,
      inspections: docs.map((d) =>
        serializeEnquiryLite(d as Record<string, unknown>, pickEnquiryProperty(d, maps)),
      ),
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/search", async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (q.length < 2) return res.json({ enquiries: [], listings: [], subscribers: [], contacts: [] });
    const rx = new RegExp(escapeRegex(q), "i");
    const digits = q.replace(/\D/g, "");
    const enquiryOr: Record<string, unknown>[] = [
      { name: rx },
      { email: rx },
      { phone: rx },
      { message: rx },
      { propertySlug: rx },
    ];
    if (digits.length >= 6) enquiryOr.push({ phone: new RegExp(escapeRegex(digits)) });
    const contactOr: Record<string, unknown>[] = [{ name: rx }, { email: rx }, { phone: rx }, { company: rx }];
    if (digits.length >= 6) contactOr.push({ phoneDigits: new RegExp(escapeRegex(digits)) });
    const [enquiries, listings, subscribers, contacts] = await Promise.all([
      EnquiryModel.find({ $or: enquiryOr })
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      PropertyModel.find({
        $or: [{ address: rx }, { suburb: rx }, { slug: rx }, { priceLabel: rx }],
      })
        .sort({ updatedAt: -1 })
        .limit(8)
        .lean(),
      NewsletterSignupModel.find({ email: rx }).sort({ createdAt: -1 }).limit(6).lean(),
      ContactModel.find({ $or: contactOr }).sort({ lastTouchAt: -1 }).limit(8).lean(),
    ]);
    const enquiryMaps = await lookupEnquiryProperties(enquiries as unknown[]);
    res.json({
      enquiries: enquiries.map((d) => {
        const property = pickEnquiryProperty(d, enquiryMaps);
        return {
          id: String(d._id),
          name: d.name,
          href: `/admin/enquiries/${String(d._id)}`,
          detail: [d.phone, d.email, property ? `${property.address}, ${property.suburb}` : d.propertySlug]
            .filter(Boolean)
            .join(" · "),
        };
      }),
      listings: listings.map((d) => ({
        id: String(d._id),
        name: `${d.address}, ${d.suburb}`,
        href: `/admin/listings/${String(d._id)}`,
        detail: `${d.transactionSide} · ${d.status}`,
      })),
      subscribers: subscribers.map((d) => ({
        id: String(d._id),
        name: d.email,
        href: "/admin/subscribers",
        detail: d.source || "newsletter",
      })),
      contacts: contacts.map((d) => ({
        id: String(d._id),
        name: d.name,
        href: `/admin/contacts/${String(d._id)}`,
        detail: [d.role, d.phone, d.email, d.company].filter(Boolean).join(" · "),
      })),
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/health", async (_req, res, next) => {
  try {
    res.json({
      db: isDbConnected() ? "mongo" : "fixtures",
      cloudinary: isCloudinaryReady(),
      xero: isXeroConfigured(),
      pexa: isPexaConfigured(),
      redis: Boolean(env.redisUrl),
    });
  } catch (err) {
    next(err);
  }
});
