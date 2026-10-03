import { Router } from "express";
import { z } from "zod";
import { BOOKING_KINDS, BOOKING_MODES, BOOKING_STATUSES } from "@kestrel/shared";
import { isDbConnected } from "../db/mongoose";
import { HttpError } from "../middleware/errorHandler";
import { rateLimit } from "../middleware/rateLimit";
import { requireAuth } from "../middleware/requireAuth";
import { BookingModel } from "../models/Booking";
import { propertyLabelFor } from "../services/deskEnquiry";
import {
  bookingIcs,
  cancelBooking,
  createBooking,
  findBookingByToken,
  getBookingSettings,
  listOpenSlots,
  manageUrl,
  publicBooking,
  rescheduleBooking,
  saveBookingSettings,
  serializeBooking,
  setBookingOutcome,
} from "../services/bookings";
import { onlineMeetingsAvailable, zohoWorkspaceStatus } from "../services/zohoWorkspace";

export const bookingsRouter = Router();

const dateParam = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();

const bookingWriteLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  message: "Too many booking attempts. Call or WhatsApp the desk instead.",
});

bookingsRouter.get("/slots", async (req, res, next) => {
  try {
    const from = dateParam.parse(typeof req.query.from === "string" ? req.query.from : undefined);
    const days = Math.min(Math.max(Number(req.query.days) || 14, 1), 42);
    const [{ settings, slots }, onlineMeetings] = await Promise.all([listOpenSlots({ from, days }), onlineMeetingsAvailable()]);
    res.setHeader("Cache-Control", "no-store");
    res.json({
      enabled: settings.enabled,
      timezone: settings.timezone,
      slotMinutes: settings.slotMinutes,
      maxDaysAhead: settings.maxDaysAhead,
      meetingLocation: settings.meetingLocation.replace(/\s*[—–-]\s*or by phone\s*$/i, ""),
      onlineMeetings,
      slots,
    });
  } catch (err) {
    next(err);
  }
});

const createSchema = z
  .object({
    kind: z.enum(BOOKING_KINDS),
    start: z.string().min(10),
    name: z.string().trim().min(1, "Add your name so we know who is coming."),
    email: z
      .string()
      .trim()
      .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "That email address looks incomplete.")
      .optional()
      .default(""),
    phone: z.string().trim().optional().default(""),
    company: z.string().trim().max(160).optional().default(""),
    notes: z.string().trim().max(1500).optional().default(""),
    propertySlug: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((v) => (v ? v : null)),
    mode: z.enum(BOOKING_MODES).optional(),
    /** Honeypot — real people never fill this in. */
    website: z.string().optional(),
  })
  .refine((d) => d.email.length > 0, { message: "Add your email so we can send the confirmation.", path: ["email"] })
  .refine((d) => d.phone.replace(/\D/g, "").length >= 8, { message: "Add a mobile number in case plans change.", path: ["phone"] });

bookingsRouter.post("/", bookingWriteLimit, async (req, res, next) => {
  try {
    const parsed = createSchema.parse(req.body);
    if (parsed.website) throw new HttpError(400, "Could not book that time.");
    const { booking, label } = await createBooking(parsed);
    res.status(201).json({
      ok: true,
      booking: { ...(await publicBooking(booking)), propertyLabel: label },
      manageToken: booking.manageToken,
      manageUrl: manageUrl(booking.manageToken),
      enquiryId: booking.enquiryId ? String(booking.enquiryId) : null,
    });
  } catch (err) {
    next(err);
  }
});

async function tokenBooking(token: string) {
  const booking = await findBookingByToken(token);
  if (!booking) throw new HttpError(404, "We could not find that booking. It may have been removed.");
  return booking;
}

bookingsRouter.get("/manage/:token", async (req, res, next) => {
  try {
    const booking = await tokenBooking(req.params.token);
    res.setHeader("Cache-Control", "no-store");
    res.json({ booking: await publicBooking(booking.toObject()) });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.get("/manage/:token/ics", async (req, res, next) => {
  try {
    const booking = await tokenBooking(req.params.token);
    const doc = booking.toObject();
    const label = doc.propertySlug ? ((await propertyLabelFor(doc.propertySlug)) ?? doc.propertySlug) : null;
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="kestrel-booking.ics"');
    res.send(bookingIcs(doc, label));
  } catch (err) {
    next(err);
  }
});

bookingsRouter.get("/manage/:token/slots", async (req, res, next) => {
  try {
    const booking = await tokenBooking(req.params.token);
    const from = dateParam.parse(typeof req.query.from === "string" ? req.query.from : undefined);
    const { settings, slots } = await listOpenSlots({ from, days: Number(req.query.days) || 14, excludeId: String(booking._id) });
    res.setHeader("Cache-Control", "no-store");
    res.json({ enabled: settings.enabled, timezone: settings.timezone, slotMinutes: settings.slotMinutes, slots });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.post("/manage/:token/reschedule", bookingWriteLimit, async (req, res, next) => {
  try {
    const booking = await tokenBooking(req.params.token);
    const start = z.string().min(10).parse(req.body.start);
    const updated = await rescheduleBooking(String(booking._id), start, "public");
    res.json({ booking: await publicBooking(updated) });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.post("/manage/:token/cancel", bookingWriteLimit, async (req, res, next) => {
  try {
    const booking = await tokenBooking(req.params.token);
    const updated = await cancelBooking(String(booking._id), "public");
    res.json({ booking: await publicBooking(updated) });
  } catch (err) {
    next(err);
  }
});

/* ---------- Desk ---------- */

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM times.");

const settingsSchema = z
  .object({
    enabled: z.boolean(),
    timezone: z.literal("Australia/Melbourne").default("Australia/Melbourne"),
    slotMinutes: z.number().int().min(15).max(180),
    bufferMinutes: z.number().int().min(0).max(120),
    minNoticeHours: z.number().int().min(0).max(168),
    maxDaysAhead: z.number().int().min(1).max(90),
    hours: z
      .array(z.object({ day: z.number().int().min(0).max(6), start: hhmm, end: hhmm }))
      .max(28)
      .refine((rows) => rows.every((r) => r.start < r.end), "Each window must end after it starts."),
    blackoutDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(200),
    meetingLocation: z.string().trim().max(200),
  });

bookingsRouter.get("/admin/settings", requireAuth, async (_req, res, next) => {
  try {
    const [settings, zoho] = await Promise.all([getBookingSettings(), zohoWorkspaceStatus()]);
    res.json({ settings, zoho });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.put("/admin/settings", requireAuth, async (req, res, next) => {
  try {
    const parsed = settingsSchema.parse(req.body);
    const settings = await saveBookingSettings(parsed, req.user?.name || req.user?.email || "desk");
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.get("/admin", requireAuth, async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const filter: Record<string, unknown> = {};
    const from = typeof req.query.from === "string" && req.query.from ? new Date(req.query.from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const to = typeof req.query.to === "string" && req.query.to ? new Date(req.query.to) : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) filter.startAt = { $gte: from, $lte: to };
    if (typeof req.query.status === "string" && (BOOKING_STATUSES as readonly string[]).includes(req.query.status)) {
      filter.status = req.query.status;
    }
    if (typeof req.query.enquiryId === "string" && req.query.enquiryId) {
      delete filter.startAt;
      filter.enquiryId = req.query.enquiryId;
    }
    const docs = await BookingModel.find(filter).sort({ startAt: 1 }).limit(300).lean();
    res.json({ bookings: await Promise.all(docs.map((d) => serializeBooking(d as unknown as Parameters<typeof serializeBooking>[0]))) });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.get("/admin/:id/slots", requireAuth, async (req, res, next) => {
  try {
    const from = dateParam.parse(typeof req.query.from === "string" ? req.query.from : undefined);
    const { slots } = await listOpenSlots({ from, days: Number(req.query.days) || 14, excludeId: req.params.id });
    res.json({ slots });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.patch("/admin/:id", requireAuth, async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const by = req.user?.name || req.user?.email || "desk";
    const body = z
      .object({
        status: z.enum(["cancelled", "completed", "no-show"]).optional(),
        start: z.string().min(10).optional(),
      })
      .refine((d) => d.status || d.start, "Nothing to change.")
      .parse(req.body);
    const doc = body.start
      ? await rescheduleBooking(req.params.id, body.start, by)
      : body.status === "cancelled"
        ? await cancelBooking(req.params.id, by)
        : await setBookingOutcome(req.params.id, body.status as "completed" | "no-show", by);
    res.json({ booking: await serializeBooking(doc) });
  } catch (err) {
    next(err);
  }
});
