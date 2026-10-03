import { randomBytes } from "crypto";
import {
  AGENCY,
  BOOKING_KIND_OPTIONS,
  DEFAULT_BOOKING_SETTINGS,
  computeBookingSlots,
  formatBookingWhen,
  zonedDateString,
  zonedTimeString,
  type Booking,
  type BookingKind,
  type BookingSettings,
  type BookingStatus,
  type EnquiryTopic,
} from "@kestrel/shared";
import { env } from "../config/env";
import { isDbConnected } from "../db/mongoose";
import { HttpError } from "../middleware/errorHandler";
import { BookingModel } from "../models/Booking";
import { BookingSettingsModel } from "../models/BookingSettings";
import { EnquiryModel } from "../models/Enquiry";
import { PropertyModel } from "../models/Property";
import { logActivity } from "./activity";
import { createDeskEnquiry, propertyLabelFor } from "./deskEnquiry";
import { renderEmail, siteUrl } from "./emailTemplates";
import { buildIcs } from "./ics";
import { sendEmail } from "./sendEmail";
import { markFirstResponse } from "./speedToLead";
import { queueBookingZohoUpdate } from "./zoho";

type BookingDoc = {
  _id: unknown;
  kind: BookingKind;
  status: BookingStatus;
  startAt: Date;
  endAt: Date;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  propertySlug?: string | null;
  location?: string;
  enquiryId?: unknown;
  contactId?: unknown;
  manageToken: string;
  zohoEventId?: string;
  history?: { text: string; at: Date; by?: string }[];
  createdAt?: Date;
  updatedAt?: Date;
};

const LIVE_STATUSES = ["for-sale", "for-lease", "under-offer"];

export function kindLabel(kind: BookingKind) {
  return BOOKING_KIND_OPTIONS.find((k) => k.value === kind)?.label ?? kind;
}

export async function getBookingSettings(): Promise<BookingSettings> {
  if (!isDbConnected()) return DEFAULT_BOOKING_SETTINGS;
  const doc = (await BookingSettingsModel.findOne({ key: "default" }).lean()) as Partial<BookingSettings> | null;
  if (!doc) return DEFAULT_BOOKING_SETTINGS;
  return {
    enabled: doc.enabled ?? DEFAULT_BOOKING_SETTINGS.enabled,
    timezone: doc.timezone || DEFAULT_BOOKING_SETTINGS.timezone,
    slotMinutes: doc.slotMinutes ?? DEFAULT_BOOKING_SETTINGS.slotMinutes,
    bufferMinutes: doc.bufferMinutes ?? DEFAULT_BOOKING_SETTINGS.bufferMinutes,
    minNoticeHours: doc.minNoticeHours ?? DEFAULT_BOOKING_SETTINGS.minNoticeHours,
    maxDaysAhead: doc.maxDaysAhead ?? DEFAULT_BOOKING_SETTINGS.maxDaysAhead,
    hours: (doc.hours ?? DEFAULT_BOOKING_SETTINGS.hours).map((h) => ({ day: h.day, start: h.start, end: h.end })),
    blackoutDates: doc.blackoutDates ?? [],
    meetingLocation: doc.meetingLocation || DEFAULT_BOOKING_SETTINGS.meetingLocation,
  };
}

export async function saveBookingSettings(input: BookingSettings, by: string) {
  if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
  await BookingSettingsModel.findOneAndUpdate(
    { key: "default" },
    { ...input, key: "default", updatedBy: by },
    { upsert: true, new: true },
  );
  await logActivity({ type: "booking.settings", entityType: "booking", entityId: "settings", summary: "Booking availability updated", by });
  return getBookingSettings();
}

async function busyWindows(from: Date, to: Date, excludeId?: string) {
  const filter: Record<string, unknown> = {
    status: "confirmed",
    startAt: { $lt: to },
    endAt: { $gt: from },
  };
  if (excludeId) filter._id = { $ne: excludeId };
  const rows = (await BookingModel.find(filter).select("startAt endAt").lean()) as unknown as { startAt: Date; endAt: Date }[];
  return rows.map((r) => ({ start: new Date(r.startAt), end: new Date(r.endAt) }));
}

export async function listOpenSlots(options: { from?: string; days?: number; excludeId?: string } = {}) {
  const settings = await getBookingSettings();
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + (settings.maxDaysAhead + 2) * 24 * 60 * 60 * 1000);
  const busy = isDbConnected() ? await busyWindows(from, to, options.excludeId) : [];
  const slots = computeBookingSlots(settings, busy, now, { from: options.from, days: options.days });
  return { settings, slots };
}

async function assertSlotOpen(start: Date, excludeId?: string) {
  const date = zonedDateString(start);
  const { settings, slots } = await listOpenSlots({ from: date, days: 1, excludeId });
  if (!settings.enabled) throw new HttpError(409, "Online booking is paused. Call or WhatsApp the desk to book.");
  const slot = slots.find((s) => new Date(s.start).getTime() === start.getTime());
  if (!slot) throw new HttpError(409, "That time has just been taken or is no longer available. Pick another time.");
  return { settings, slot };
}

function isDuplicateKey(err: unknown) {
  return Boolean(err && typeof err === "object" && (err as { code?: number }).code === 11000);
}

export function manageUrl(token: string) {
  return siteUrl(`/booking/${token}`);
}

export async function serializeBooking(doc: BookingDoc, label?: string | null): Promise<Booking> {
  const propertyLabel = label ?? (doc.propertySlug ? (await propertyLabelFor(doc.propertySlug)) ?? doc.propertySlug : null);
  return {
    id: String(doc._id),
    kind: doc.kind,
    status: doc.status,
    startAt: new Date(doc.startAt).toISOString(),
    endAt: new Date(doc.endAt).toISOString(),
    name: doc.name,
    email: doc.email ?? "",
    phone: doc.phone ?? "",
    company: doc.company ?? "",
    notes: doc.notes ?? "",
    propertySlug: doc.propertySlug ?? null,
    propertyLabel,
    location: doc.location ?? "",
    enquiryId: doc.enquiryId ? String(doc.enquiryId) : null,
    contactId: doc.contactId ? String(doc.contactId) : null,
    zohoEventId: doc.zohoEventId || null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

/** Public view for the manage page — no desk ids. */
export async function publicBooking(doc: BookingDoc) {
  const full = await serializeBooking(doc);
  return {
    kind: full.kind,
    kindLabel: kindLabel(full.kind),
    status: full.status,
    startAt: full.startAt,
    endAt: full.endAt,
    name: full.name,
    propertySlug: full.propertySlug,
    propertyLabel: full.propertyLabel,
    location: full.location,
  };
}

function calendarFile(doc: BookingDoc, label: string | null, opts: { cancelled?: boolean; sequence?: number } = {}) {
  const summary = `${kindLabel(doc.kind)}${label ? ` · ${label}` : ""} — ${AGENCY.tradingName}`;
  const description = [
    `${kindLabel(doc.kind)} with ${AGENCY.licenceHolder}, ${AGENCY.tradingName}.`,
    label ? `Property: ${label}` : null,
    `Reschedule or cancel: ${manageUrl(doc.manageToken)}`,
    `Phone / WhatsApp: ${AGENCY.phone}`,
  ]
    .filter(Boolean)
    .join("\n");
  return buildIcs({
    uid: `booking-${String(doc._id)}@kestrelcommercial.com.au`,
    start: new Date(doc.startAt),
    end: new Date(doc.endAt),
    summary,
    description,
    location: doc.location || undefined,
    url: manageUrl(doc.manageToken),
    sequence: opts.sequence ?? (doc.history?.length ?? 0),
    cancelled: opts.cancelled,
    organizerName: AGENCY.licenceHolder,
    organizerEmail: AGENCY.email,
  });
}

export function bookingIcs(doc: BookingDoc, label: string | null) {
  return calendarFile(doc, label, { cancelled: doc.status === "cancelled" });
}

type Notice = "confirmed" | "rescheduled" | "cancelled" | "reminder";

async function emailClient(doc: BookingDoc, label: string | null, notice: Notice) {
  if (!doc.email) return null;
  const when = formatBookingWhen(new Date(doc.startAt).toISOString());
  const first = doc.name.trim().split(/\s+/)[0] || doc.name;
  const kind = kindLabel(doc.kind);
  const headings: Record<Notice, string> = {
    confirmed: `You're booked in, ${first}`,
    rescheduled: `Your ${kind.toLowerCase()} has moved`,
    cancelled: `Your ${kind.toLowerCase()} is cancelled`,
    reminder: `See you ${zonedDateString(new Date()) === zonedDateString(new Date(doc.startAt)) ? "today" : "tomorrow"}, ${first}`,
  };
  const intro: Record<Notice, string> = {
    confirmed: `Your ${kind.toLowerCase()} with Jignesh Jhanjaria is confirmed. The calendar invite is attached.`,
    rescheduled: `Your ${kind.toLowerCase()} is now at the new time below. The updated calendar invite is attached.`,
    cancelled: "This booking has been cancelled. If that was a mistake, pick a new time below.",
    reminder: `A quick reminder of your ${kind.toLowerCase()} with Jignesh Jhanjaria.`,
  };
  const { html, text } = renderEmail({
    eyebrow: kind,
    heading: headings[notice],
    paragraphs: [intro[notice]],
    details: [
      ["When", when],
      ["Property", label],
      ["Where", doc.location || null],
    ],
    cta:
      notice === "cancelled"
        ? { label: "Book a new time", href: doc.propertySlug ? siteUrl(`/listing/${doc.propertySlug}#inspect`) : siteUrl("/book") }
        : { label: "Reschedule or cancel", href: manageUrl(doc.manageToken) },
  });
  const subjects: Record<Notice, string> = {
    confirmed: `Confirmed: ${kind} — ${when}`,
    rescheduled: `Updated: ${kind} — ${when}`,
    cancelled: `Cancelled: ${kind} — ${when}`,
    reminder: `Reminder: ${kind} — ${when}`,
  };
  return sendEmail({
    kind: notice === "reminder" ? "booking-reminder" : notice === "confirmed" ? "booking-confirmation" : "booking-update",
    to: doc.email,
    subject: subjects[notice],
    text,
    html,
    enquiryId: doc.enquiryId ? String(doc.enquiryId) : null,
    contactId: doc.contactId ? String(doc.contactId) : null,
    bookingId: String(doc._id),
    attachments:
      notice === "reminder"
        ? undefined
        : [{ filename: "booking.ics", content: calendarFile(doc, label, { cancelled: notice === "cancelled" }), contentType: "text/calendar" }],
  });
}

async function emailDesk(doc: BookingDoc, label: string | null, notice: Exclude<Notice, "reminder">, by: string) {
  const when = formatBookingWhen(new Date(doc.startAt).toISOString());
  const kind = kindLabel(doc.kind);
  const verbs = { confirmed: "New booking", rescheduled: "Booking moved", cancelled: "Booking cancelled" } as const;
  const { html, text } = renderEmail({
    eyebrow: verbs[notice],
    heading: `${kind} · ${doc.name}`,
    paragraphs: [
      notice === "confirmed"
        ? "Booked online. The calendar file is attached — open it to add this to your calendar."
        : `${notice === "cancelled" ? "Cancelled" : "Rescheduled"} by ${by === "public" ? "the client" : by}.`,
    ],
    details: [
      ["When", when],
      ["Property", label],
      ["Name", doc.name],
      ["Company", doc.company || null],
      ["Phone", doc.phone || null],
      ["Email", doc.email || null],
      ["Notes", doc.notes || null],
    ],
    cta: doc.enquiryId ? { label: "Open on the desk", href: siteUrl(`/admin/enquiries/${String(doc.enquiryId)}`) } : { label: "Open bookings", href: siteUrl("/admin/bookings") },
  });
  return sendEmail({
    kind: "booking-desk",
    to: env.notify.emailTo,
    replyTo: doc.email || null,
    subject: `${verbs[notice]}: ${kind} · ${doc.name} — ${when}`,
    text,
    html,
    enquiryId: doc.enquiryId ? String(doc.enquiryId) : null,
    bookingId: String(doc._id),
    attachments: [{ filename: "booking.ics", content: calendarFile(doc, label, { cancelled: notice === "cancelled" }), contentType: "text/calendar" }],
  });
}

export type CreateBookingInput = {
  kind: BookingKind;
  start: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  propertySlug?: string | null;
};

const TOPIC_FOR_KIND: Record<BookingKind, EnquiryTopic> = {
  inspection: "buying-or-leasing",
  meeting: "other",
  appraisal: "appraisal",
};

export async function createBooking(input: CreateBookingInput) {
  if (!isDbConnected()) throw new HttpError(503, "Booking is unavailable right now. Call or WhatsApp the desk.");
  const start = new Date(input.start);
  if (Number.isNaN(start.getTime())) throw new HttpError(400, "Pick a time from the calendar.");

  let propertySlug: string | null = null;
  let label: string | null = null;
  if (input.propertySlug) {
    const listing = (await PropertyModel.findOne({ slug: input.propertySlug, archived: { $ne: true } })
      .select("slug status")
      .lean()) as { slug: string; status: string } | null;
    if (!listing) throw new HttpError(404, "That listing is no longer available.");
    if (input.kind === "inspection" && !LIVE_STATUSES.includes(listing.status)) {
      throw new HttpError(409, "This property is no longer open for inspections.");
    }
    propertySlug = listing.slug;
    label = (await propertyLabelFor(propertySlug)) ?? propertySlug;
  } else if (input.kind === "inspection") {
    throw new HttpError(400, "Choose the property you want to inspect.");
  }

  const { settings, slot } = await assertSlotOpen(start);
  const location = input.kind === "meeting" ? settings.meetingLocation : label || "";

  let booking;
  try {
    booking = await BookingModel.create({
      kind: input.kind,
      status: "confirmed",
      startAt: new Date(slot.start),
      endAt: new Date(slot.end),
      name: input.name.trim(),
      email: (input.email || "").trim().toLowerCase(),
      phone: (input.phone || "").trim(),
      company: (input.company || "").trim(),
      notes: (input.notes || "").trim(),
      propertySlug,
      location,
      manageToken: randomBytes(24).toString("hex"),
    });
  } catch (err) {
    if (isDuplicateKey(err)) throw new HttpError(409, "That time has just been taken. Pick another time.");
    throw err;
  }

  const when = formatBookingWhen(slot.start);
  const startLocal = new Date(slot.start);
  const message = [
    `Booked online: ${kindLabel(input.kind)} — ${when}.`,
    label ? `Property: ${label}` : null,
    input.notes?.trim() ? `\n${input.notes.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const created = await createDeskEnquiry({
    name: input.name.trim(),
    email: input.email,
    phone: input.phone,
    company: input.company,
    message,
    topic: TOPIC_FOR_KIND[input.kind],
    intent: input.kind === "inspection" ? "inspection" : "enquire",
    preferredInspectionAt: input.kind === "inspection" ? zonedDateString(startLocal) : undefined,
    inspectionWindow: input.kind === "inspection" ? (zonedTimeString(startLocal) < "12:00" ? "morning" : "afternoon") : undefined,
    source: input.kind === "appraisal" ? "appraisal" : "web",
    propertySlug,
    bookingId: String(booking._id),
    skipAcknowledgement: true,
    by: "public",
  }).catch((err) => {
    console.error(`[booking] desk enquiry failed for booking ${String(booking._id)}`, err);
    return null;
  });

  if (created) {
    booking.enquiryId = created.record.id;
    booking.contactId = created.record.contactId ?? null;
  }
  booking.history.push({ text: `Booked online for ${when}`, at: new Date(), by: "public" });
  await booking.save();
  if (created && input.kind === "inspection") {
    await EnquiryModel.updateOne({ _id: booking.enquiryId }, { inspectionAttendance: "booked" }).catch(() => undefined);
  }

  const doc = booking.toObject() as BookingDoc;
  await Promise.all([
    emailClient(doc, label, "confirmed").catch((err) => console.error("[booking] client email failed", err)),
    emailDesk(doc, label, "confirmed", "public").catch((err) => console.error("[booking] desk email failed", err)),
    logActivity({
      type: "booking.created",
      entityType: "booking",
      entityId: String(booking._id),
      summary: `${kindLabel(input.kind)} booked · ${input.name.trim()} · ${when}`,
      by: "public",
    }),
  ]);

  return { booking: doc, label };
}

export async function findBookingByToken(token: string) {
  if (!isDbConnected() || !/^[a-f0-9]{48}$/.test(token)) return null;
  return BookingModel.findOne({ manageToken: token });
}

export async function rescheduleBooking(id: string, startIso: string, by: string) {
  const booking = await BookingModel.findById(id);
  if (!booking) throw new HttpError(404, "Booking not found");
  if (booking.status !== "confirmed") throw new HttpError(409, "Only confirmed bookings can be moved.");
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) throw new HttpError(400, "Pick a time from the calendar.");
  const { slot } = await assertSlotOpen(start, String(booking._id));
  const before = formatBookingWhen(new Date(booking.startAt).toISOString());
  booking.startAt = new Date(slot.start);
  booking.endAt = new Date(slot.end);
  booking.reminderSentAt = null;
  booking.history.push({ text: `Moved from ${before} to ${formatBookingWhen(slot.start)}`, at: new Date(), by });
  try {
    await booking.save();
  } catch (err) {
    if (isDuplicateKey(err)) throw new HttpError(409, "That time has just been taken. Pick another time.");
    throw err;
  }
  await afterChange(booking.toObject() as BookingDoc, "rescheduled", by);
  return booking.toObject() as BookingDoc;
}

export async function cancelBooking(id: string, by: string) {
  const booking = await BookingModel.findById(id);
  if (!booking) throw new HttpError(404, "Booking not found");
  if (booking.status === "cancelled") return booking.toObject() as BookingDoc;
  booking.status = "cancelled";
  booking.history.push({ text: "Cancelled", at: new Date(), by });
  await booking.save();
  await afterChange(booking.toObject() as BookingDoc, "cancelled", by);
  return booking.toObject() as BookingDoc;
}

export async function setBookingOutcome(id: string, status: "completed" | "no-show", by: string) {
  const booking = await BookingModel.findById(id);
  if (!booking) throw new HttpError(404, "Booking not found");
  booking.status = status;
  booking.history.push({ text: status === "completed" ? "Marked attended" : "Marked no-show", at: new Date(), by });
  await booking.save();
  if (booking.enquiryId) {
    await EnquiryModel.updateOne(
      { _id: booking.enquiryId },
      { inspectionAttendance: status === "completed" ? "attended" : "no-show" },
    ).catch(() => undefined);
    await markFirstResponse(String(booking.enquiryId));
  }
  await logActivity({
    type: "booking.outcome",
    entityType: "booking",
    entityId: String(booking._id),
    summary: `${booking.name}: ${status === "completed" ? "attended" : "no-show"}`,
    by,
  });
  return booking.toObject() as BookingDoc;
}

async function afterChange(doc: BookingDoc, notice: "rescheduled" | "cancelled", by: string) {
  const label = doc.propertySlug ? ((await propertyLabelFor(doc.propertySlug)) ?? doc.propertySlug) : null;
  if (doc.enquiryId) {
    const start = new Date(doc.startAt);
    await EnquiryModel.updateOne(
      { _id: doc.enquiryId },
      notice === "cancelled"
        ? { inspectionAttendance: doc.kind === "inspection" ? "cancelled" : "" }
        : doc.kind === "inspection"
          ? { preferredInspectionAt: zonedDateString(start), inspectionWindow: zonedTimeString(start) < "12:00" ? "morning" : "afternoon" }
          : {},
    ).catch(() => undefined);
    if (by !== "public") await markFirstResponse(String(doc.enquiryId));
  }
  queueBookingZohoUpdate(String(doc._id));
  await Promise.all([
    emailClient(doc, label, notice).catch((err) => console.error("[booking] client email failed", err)),
    emailDesk(doc, label, notice, by).catch((err) => console.error("[booking] desk email failed", err)),
    logActivity({
      type: `booking.${notice}`,
      entityType: "booking",
      entityId: String(doc._id),
      summary: `${kindLabel(doc.kind)} ${notice} · ${doc.name} · ${formatBookingWhen(new Date(doc.startAt).toISOString())}`,
      by,
    }),
  ]);
}

/** Day-before reminders for bookings made more than six hours ahead. */
export async function runBookingReminders(now = new Date()) {
  if (!isDbConnected()) return 0;
  const rows = (await BookingModel.find({
    status: "confirmed",
    reminderSentAt: null,
    email: { $nin: [null, ""] },
    startAt: { $gt: now, $lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
  })
    .limit(40)
    .lean()) as unknown as BookingDoc[];
  let sent = 0;
  for (const row of rows) {
    const leadTime = new Date(row.startAt).getTime() - new Date(row.createdAt ?? row.startAt).getTime();
    if (leadTime >= 6 * 60 * 60 * 1000) {
      const label = row.propertySlug ? ((await propertyLabelFor(row.propertySlug)) ?? row.propertySlug) : null;
      await emailClient(row, label, "reminder").catch((err) => console.error("[booking] reminder failed", err));
      sent += 1;
    }
    await BookingModel.updateOne({ _id: row._id }, { reminderSentAt: now });
  }
  return sent;
}
