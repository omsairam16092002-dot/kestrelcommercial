import { INTENT_LABELS, LEAD_SCORE_LABELS, weekdayOfDate, zonedDateString, zonedTimeString, type EnquiryIntent, type LeadScore } from "@kestrel/shared";
import { isValidObjectId } from "mongoose";
import { env } from "../config/env";
import { isDbConnected } from "../db/mongoose";
import { EnquiryModel } from "../models/Enquiry";
import { propertyLabelFor } from "./deskEnquiry";
import { renderEmail, siteUrl } from "./emailTemplates";
import { sendEmail } from "./sendEmail";
import { queueLeadStatusPush } from "./zoho";

/** A lead untouched for this long gets a second, louder alert. */
export const ESCALATE_AFTER_MINUTES = 15;

/** Escalations only go out Mon–Sat 7am–9pm Melbourne; overnight leads escalate first thing. */
function inEscalationHours(now: Date) {
  const day = weekdayOfDate(zonedDateString(now));
  const time = zonedTimeString(now);
  return day !== 0 && time >= "07:00" && time < "21:00";
}

/** Record the first desk touch on a lead (later touches are ignored) and mirror it to Zoho. */
export async function markFirstResponse(enquiryId: string, at = new Date()): Promise<boolean> {
  if (!isDbConnected() || !isValidObjectId(enquiryId)) return false;
  const res = await EnquiryModel.updateOne({ _id: enquiryId, firstResponseAt: null }, { firstResponseAt: at }).catch(() => null);
  if (!res?.modifiedCount) return false;
  queueLeadStatusPush(enquiryId);
  return true;
}

/** After a desk stage change: stamp the first response, and push the new status to Zoho either way. */
export async function afterDeskStageChange(enquiryId: string) {
  if (!(await markFirstResponse(enquiryId))) queueLeadStatusPush(enquiryId);
}

type LeadRow = {
  _id: unknown;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  message: string;
  intent?: EnquiryIntent;
  source: string;
  propertySlug?: string | null;
  leadScore?: LeadScore | null;
  createdAt: Date;
};

export async function runLeadEscalations(now = new Date()) {
  if (!isDbConnected() || !inEscalationHours(now)) return 0;
  const rows = (await EnquiryModel.find({
    firstResponseAt: null,
    escalatedAt: null,
    bookingId: null,
    source: { $ne: "newsletter" },
    crmStage: { $in: ["new", "inspecting"] },
    createdAt: {
      $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      $lte: new Date(now.getTime() - ESCALATE_AFTER_MINUTES * 60 * 1000),
    },
  })
    .sort({ createdAt: 1 })
    .limit(20)
    .lean()) as unknown as LeadRow[];

  let sent = 0;
  for (const row of rows) {
    const claimed = await EnquiryModel.updateOne({ _id: row._id, escalatedAt: null }, { escalatedAt: now });
    if (!claimed.modifiedCount) continue;
    const minutes = Math.round((now.getTime() - new Date(row.createdAt).getTime()) / 60000);
    const waited = minutes >= 120 ? `${Math.round(minutes / 60)} hours` : `${minutes} minutes`;
    const label = row.propertySlug ? ((await propertyLabelFor(row.propertySlug)) ?? row.propertySlug) : null;
    const score = row.leadScore ? LEAD_SCORE_LABELS[row.leadScore] : null;
    const { html, text } = renderEmail({
      eyebrow: "Lead waiting",
      heading: `${row.name} has waited ${waited}`,
      paragraphs: [
        "Nobody has touched this lead on the desk yet. Leads called within the first few minutes are far more likely to convert — call now, then mark it contacted.",
      ],
      details: [
        ["Lead", `${INTENT_LABELS[row.intent ?? "enquire"]}${score ? ` · ${score}` : ""}`],
        ["Property", label],
        ["Phone", row.phone || null],
        ["Email", row.email || null],
        ["Company", row.company || null],
        ["Message", row.message.slice(0, 400)],
      ],
      cta: { label: "Open the lead", href: siteUrl(`/admin/enquiries/${String(row._id)}`) },
      secondary: row.phone ? { label: `Call ${row.phone}`, href: `tel:${row.phone.replace(/[^\d+]/g, "")}` } : undefined,
    });
    await sendEmail({
      kind: "lead-escalation",
      to: env.notify.emailTo,
      replyTo: row.email || null,
      subject: `Still waiting: ${row.name}${label ? ` · ${label}` : ""} (${waited})`,
      text,
      html,
      enquiryId: String(row._id),
    });
    sent += 1;
  }
  return sent;
}

/** Response-time stats for leads the desk had to answer (self-booked leads excluded). */
export async function responseStats(days = 30) {
  if (!isDbConnected()) return { medianMinutes: null, within15Pct: null, responded: 0, awaiting: 0 };
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const base = { createdAt: { $gte: since }, bookingId: null, source: { $ne: "newsletter" } };
  const [rows, awaiting] = await Promise.all([
    EnquiryModel.find({ ...base, firstResponseAt: { $ne: null } }).select("createdAt firstResponseAt").lean() as unknown as Promise<
      { createdAt: Date; firstResponseAt: Date }[]
    >,
    EnquiryModel.countDocuments({ ...base, firstResponseAt: null, crmStage: "new" }),
  ]);
  const minutes = rows
    .map((r) => (new Date(r.firstResponseAt).getTime() - new Date(r.createdAt).getTime()) / 60000)
    .filter((m) => m >= 0)
    .sort((a, b) => a - b);
  if (!minutes.length) return { medianMinutes: null, within15Pct: null, responded: 0, awaiting };
  const mid = Math.floor(minutes.length / 2);
  const median = minutes.length % 2 ? minutes[mid] : (minutes[mid - 1] + minutes[mid]) / 2;
  const within = minutes.filter((m) => m <= ESCALATE_AFTER_MINUTES).length;
  return {
    medianMinutes: Math.round(median),
    within15Pct: Math.round((within / minutes.length) * 100),
    responded: minutes.length,
    awaiting,
  };
}
