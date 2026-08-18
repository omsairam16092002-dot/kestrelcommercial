import { AGENCY } from "@kestrel/shared";
import { isDbConnected } from "../db/mongoose";
import { EnquiryModel } from "../models/Enquiry";
import { CommunicationModel } from "../models/Communication";
import { sendEmail } from "./sendEmail";

function listingLine(slug?: string | null) {
  if (!slug) return "";
  return `\nListing: ${envSite()}/listing/${slug}`;
}

function envSite() {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function sendEnquiryAcknowledgement(enquiry: {
  id: string;
  name: string;
  email?: string | null;
  propertySlug?: string | null;
  contactId?: string | null;
}) {
  const email = String(enquiry.email || "").trim().toLowerCase();
  if (!email) return null;
  if (isDbConnected() && enquiry.id) {
    const already = await CommunicationModel.exists({ enquiryId: enquiry.id, kind: "acknowledgement", status: { $in: ["sent", "skipped"] } });
    if (already) return null;
  }
  const listing = listingLine(enquiry.propertySlug);
  const text = `Hello ${enquiry.name},\n\nThis is Kestrel Commercial. We have your enquiry and will come back within one business day. If it is urgent, WhatsApp ${AGENCY.whatsapp}.${listing}\n\n${AGENCY.licenceHolder} · Licence ${AGENCY.licenceNumber}`;
  return sendEmail({
    kind: "acknowledgement",
    to: email,
    enquiryId: enquiry.id,
    contactId: enquiry.contactId,
    subject: `Kestrel Commercial — we have your enquiry`,
    text,
    html: `<p>Hello ${escapeHtml(enquiry.name)},</p><p>This is Kestrel Commercial. We have your enquiry and will come back within one business day. If it is urgent, WhatsApp ${escapeHtml(AGENCY.whatsapp)}.</p>${enquiry.propertySlug ? `<p>Listing: ${escapeHtml(envSite())}/listing/${escapeHtml(enquiry.propertySlug)}</p>` : ""}<p>${escapeHtml(AGENCY.licenceHolder)} · Licence ${escapeHtml(AGENCY.licenceNumber)}</p>`,
  });
}

export async function sendNewsletterWelcome(email: string) {
  const to = email.trim().toLowerCase();
  if (!to) return null;
  if (isDbConnected()) {
    const already = await CommunicationModel.exists({ to, kind: "newsletter-welcome", status: { $in: ["sent", "skipped"] } });
    if (already) return null;
  }
  const text = `You're on the Kestrel Commercial list.\n\nWe'll send the occasional west-side note — stock, evidence, and what it means for owners. This is the only confirmation for this address. Reply or WhatsApp ${AGENCY.whatsapp} to talk to the desk.\n\n${AGENCY.licenceHolder} · Licence ${AGENCY.licenceNumber}`;
  return sendEmail({
    kind: "newsletter-welcome",
    to,
    subject: `You're on the Kestrel west-side list`,
    text,
    html: `<p>You're on the Kestrel Commercial list.</p><p>We'll send the occasional west-side note — stock, evidence, and what it means for owners. This is the only confirmation for this address.</p><p>Reply or WhatsApp ${escapeHtml(AGENCY.whatsapp)} to talk to the desk.</p><p>${escapeHtml(AGENCY.licenceHolder)} · Licence ${escapeHtml(AGENCY.licenceNumber)}</p>`,
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function runScheduledEmails() {
  if (!isDbConnected()) return { stale: 0, reminders: 0 };
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const stale = await EnquiryModel.find({
    crmStage: "new",
    createdAt: { $lte: staleBefore },
    email: { $nin: [null, ""] },
  })
    .limit(40)
    .lean();

  let staleSent = 0;
  for (const row of stale) {
    const enquiryId = String(row._id);
    const already = await CommunicationModel.exists({ enquiryId, kind: "stale-follow-up" });
    if (already) continue;
    const email = String(row.email || "").trim();
    if (!email) continue;
    await sendEmail({
      kind: "stale-follow-up",
      to: email,
      enquiryId,
      contactId: row.contactId ? String(row.contactId) : null,
      subject: `Following up — Kestrel Commercial`,
      text: `Hello ${row.name},\n\nJust checking you still need a reply on your enquiry. WhatsApp ${AGENCY.whatsapp} if it is easier.${listingLine(row.propertySlug as string | null)}\n\n${AGENCY.licenceHolder}`,
    });
    staleSent += 1;
  }

  const inspections = await EnquiryModel.find({
    preferredInspectionAt: { $in: [today, tomorrow] },
    email: { $nin: [null, ""] },
  })
    .limit(40)
    .lean();

  let reminders = 0;
  for (const row of inspections) {
    const enquiryId = String(row._id);
    const already = await CommunicationModel.exists({ enquiryId, kind: "inspection-reminder" });
    if (already) continue;
    const email = String(row.email || "").trim();
    if (!email) continue;
    await sendEmail({
      kind: "inspection-reminder",
      to: email,
      enquiryId,
      contactId: row.contactId ? String(row.contactId) : null,
      subject: `Inspection reminder — Kestrel Commercial`,
      text: `Hello ${row.name},\n\nReminder: inspection ${row.preferredInspectionAt}${row.inspectionWindow ? ` (${row.inspectionWindow})` : ""}.${listingLine(row.propertySlug as string | null)}\n\nWhatsApp ${AGENCY.whatsapp} if you need to change the window.\n\n${AGENCY.licenceHolder}`,
    });
    reminders += 1;
  }

  return { stale: staleSent, reminders };
}
