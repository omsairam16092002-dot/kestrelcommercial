import fs from "fs/promises";
import path from "path";
import nodemailer from "nodemailer";
import { AGENCY, INTENT_LABELS, type EnquiryIntent } from "@kestrel/shared";
import { env } from "../config/env";

export type LeadPing = {
  id: string;
  intent: EnquiryIntent;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  message: string;
  preferredInspectionAt?: string;
  inspectionWindow?: string;
  propertySlug?: string | null;
  propertyLabel?: string;
  source: string;
};

export type NotifyResult = {
  delivered: boolean;
  channels: string[];
};

function listingUrl(slug?: string | null): string | undefined {
  if (!slug) return undefined;
  return `${env.siteUrl.replace(/\/$/, "")}/listing/${slug}`;
}

export function formatLeadText(lead: LeadPing): string {
  const intent = INTENT_LABELS[lead.intent] ?? lead.intent;
  const lines = [
    `KESTREL LEAD — ${intent.toUpperCase()}`,
    lead.propertyLabel ? `Property: ${lead.propertyLabel}` : null,
    lead.propertySlug ? `Link: ${listingUrl(lead.propertySlug)}` : null,
    `Name: ${lead.name}`,
    lead.company ? `Company: ${lead.company}` : null,
    lead.phone ? `Phone: ${lead.phone}` : null,
    lead.email ? `Email: ${lead.email}` : null,
    lead.preferredInspectionAt ? `Preferred date: ${lead.preferredInspectionAt}` : null,
    lead.inspectionWindow ? `Window: ${lead.inspectionWindow}` : null,
    `Source: ${lead.source}`,
    "",
    lead.message,
  ].filter((line): line is string => Boolean(line));
  return lines.join("\n");
}

function formatLeadHtml(lead: LeadPing): string {
  const intent = INTENT_LABELS[lead.intent] ?? lead.intent;
  const url = listingUrl(lead.propertySlug);
  const row = (label: string, value?: string | null) =>
    value
      ? `<tr><td style="padding:8px 0;color:#654f49;font-size:12px;letter-spacing:.14em;text-transform:uppercase;width:140px">${label}</td><td style="padding:8px 0;color:#2a1418;font-size:15px">${value}</td></tr>`
      : "";

  return `<!doctype html>
<html><body style="margin:0;background:#f6f1ec;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:24px;overflow:hidden">
    <div style="background:#5c1f27;color:#f6f1ec;padding:20px 24px">
      <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#d9a26b">Kestrel Commercial</div>
      <h1 style="margin:8px 0 0;font-size:22px">${intent}</h1>
    </div>
    <div style="padding:24px">
      <table style="width:100%;border-collapse:collapse">
        ${row("Property", lead.propertyLabel)}
        ${row("Name", lead.name)}
        ${row("Company", lead.company)}
        ${row("Phone", lead.phone)}
        ${row("Email", lead.email)}
        ${row("Date", lead.preferredInspectionAt)}
        ${row("Window", lead.inspectionWindow)}
        ${row("Source", lead.source)}
      </table>
      <p style="margin:20px 0 0;color:#2a1418;line-height:1.6;white-space:pre-wrap">${escapeHtml(lead.message)}</p>
      ${url ? `<p style="margin:24px 0 0"><a href="${url}" style="color:#5c1f27">Open listing →</a></p>` : ""}
      <p style="margin:28px 0 0;color:#654f49;font-size:12px">Licence ${AGENCY.licenceNumber} · ${AGENCY.phone}</p>
    </div>
  </div>
</body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function appendLeadLog(lead: LeadPing, text: string): Promise<void> {
  try {
    const dir = path.resolve(__dirname, "../../data");
    await fs.mkdir(dir, { recursive: true });
    const line = JSON.stringify({ ...lead, pingedAt: new Date().toISOString(), text }) + "\n";
    await fs.appendFile(path.join(dir, "lead-pings.jsonl"), line, "utf8");
  } catch (err) {
    console.warn("[notify] could not write lead log", err);
  }
}

async function sendSmtp(lead: LeadPing, text: string, html: string): Promise<boolean> {
  const { smtpHost, smtpUser, smtpPass, smtpPort, smtpFrom, emailTo } = env.notify;
  if (!smtpHost || !smtpUser || !smtpPass) return false;
  const transport = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });
  await transport.sendMail({
    from: smtpFrom,
    to: emailTo,
    replyTo: lead.email || undefined,
    subject: `KESTREL LEAD — ${INTENT_LABELS[lead.intent]} — ${lead.propertyLabel || lead.name}`,
    text,
    html,
  });
  return true;
}

async function sendResend(lead: LeadPing, text: string, html: string): Promise<boolean> {
  if (!env.notify.resendApiKey) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.notify.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.notify.smtpFrom,
      to: [env.notify.emailTo],
      reply_to: lead.email || undefined,
      subject: `KESTREL LEAD — ${INTENT_LABELS[lead.intent]} — ${lead.propertyLabel || lead.name}`,
      text,
      html,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${body}`);
  }
  return true;
}

async function sendFormSubmit(lead: LeadPing, text: string): Promise<boolean> {
  if (!env.notify.formsubmit) return false;
  if (env.notify.smtpHost || env.notify.resendApiKey) return false;
  const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(env.notify.emailTo)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      _subject: `KESTREL LEAD — ${INTENT_LABELS[lead.intent]} — ${lead.propertyLabel || lead.name}`,
      _template: "box",
      name: lead.name,
      email: lead.email || "noreply@kestrelcommercial.com",
      phone: lead.phone || "",
      company: lead.company || "",
      intent: lead.intent,
      property: lead.propertyLabel || lead.propertySlug || "",
      message: text,
    }),
  });
  return res.ok;
}

async function sendWebhook(lead: LeadPing, text: string): Promise<boolean> {
  if (!env.notify.webhookUrl) return false;
  const res = await fetch(env.notify.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "kestrel.lead", lead, text }),
  });
  return res.ok;
}

async function sendTwilioWhatsApp(text: string): Promise<boolean> {
  const { twilioSid, twilioToken, twilioWhatsAppFrom, whatsappTo } = env.notify;
  if (!twilioSid || !twilioToken || !twilioWhatsAppFrom) return false;
  const body = new URLSearchParams({
    From: twilioWhatsAppFrom,
    To: whatsappTo,
    Body: text.slice(0, 1500),
  });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Twilio ${res.status}: ${err}`);
  }
  return true;
}

/**
 * Ping Jignesh the moment a form lands. Never throw — a failed ping must not lose the lead.
 */
export async function pingPrincipal(lead: LeadPing): Promise<NotifyResult> {
  const text = formatLeadText(lead);
  const html = formatLeadHtml(lead);
  const channels: string[] = [];

  console.info("\n========== KESTREL LEAD PING ==========\n" + text + "\n=======================================\n");
  await appendLeadLog(lead, text);

  const attempts: Array<[string, () => Promise<boolean>]> = [
    ["smtp", () => sendSmtp(lead, text, html)],
    ["resend", () => sendResend(lead, text, html)],
    ["formsubmit", () => sendFormSubmit(lead, text)],
    ["webhook", () => sendWebhook(lead, text)],
    ["whatsapp", () => sendTwilioWhatsApp(text)],
  ];

  for (const [name, run] of attempts) {
    try {
      if (await run()) channels.push(name);
    } catch (err) {
      console.error(`[notify] ${name} failed`, err);
    }
  }

  if (!channels.length) {
    console.warn(
      "[notify] No email/WhatsApp provider delivered. Lead is in Mongo + data/lead-pings.jsonl. Set SMTP_*, RESEND_API_KEY, TWILIO_* or NOTIFY_WEBHOOK_URL.",
    );
  }

  return { delivered: channels.length > 0, channels };
}
