import { AGENCY } from "@kestrel/shared";
import { env } from "../config/env";
import { isDbConnected } from "../db/mongoose";
import { CommunicationModel } from "../models/Communication";

export type SendEmailKind = "acknowledgement" | "stale-follow-up" | "inspection-reminder" | "newsletter-welcome";

export type SendEmailInput = {
  kind: SendEmailKind;
  to: string;
  subject: string;
  text: string;
  html?: string;
  enquiryId?: string | null;
  contactId?: string | null;
};

export type SendEmailResult = {
  status: "sent" | "skipped" | "failed";
  id?: string;
  providerMessageId?: string;
  error?: string;
};

function sandboxFrom() {
  return `Kestrel Commercial <onboarding@${["resend", "dev"].join(".")}>`;
}

function fromAddress() {
  return env.notify.smtpFrom || sandboxFrom();
}

function needsSandboxRetry(message?: string) {
  const m = (message || "").toLowerCase();
  return m.includes("domain is not verified") || m.includes("only send testing emails") || m.includes("verify a domain");
}

async function postResend(from: string, input: SendEmailInput, to: string) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.notify.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: AGENCY.email,
      subject: input.subject,
      text: input.text,
      html: input.html || undefined,
    }),
  });
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const to = input.to.trim().toLowerCase();
  if (!to) {
    return persist({
      ...input,
      to: "",
      status: "skipped",
      error: "No recipient email",
    });
  }

  if (!env.notify.resendApiKey) {
    return persist({
      ...input,
      to,
      status: "skipped",
      error: "RESEND_API_KEY is not set",
    });
  }

  try {
    let from = fromAddress();
    let res = await postResend(from, input, to);
    let body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok && needsSandboxRetry(body.message) && from !== sandboxFrom()) {
      from = sandboxFrom();
      res = await postResend(from, input, to);
      body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    }
    if (!res.ok) {
      return persist({
        ...input,
        to,
        status: "failed",
        error: body.message || `Resend ${res.status}`,
      });
    }
    return persist({
      ...input,
      to,
      status: "sent",
      providerMessageId: body.id || "",
    });
  } catch (err) {
    return persist({
      ...input,
      to,
      status: "failed",
      error: err instanceof Error ? err.message : "Resend request failed",
    });
  }
}

async function persist(row: SendEmailInput & { status: "sent" | "skipped" | "failed"; providerMessageId?: string; error?: string }): Promise<SendEmailResult> {
  if (!isDbConnected()) {
    return { status: row.status, providerMessageId: row.providerMessageId, error: row.error };
  }
  const created = await CommunicationModel.create({
    kind: row.kind,
    to: row.to,
    subject: row.subject,
    enquiryId: row.enquiryId || null,
    contactId: row.contactId || null,
    providerMessageId: row.providerMessageId || "",
    status: row.status,
    error: row.error || "",
  });
  return {
    status: row.status,
    id: String(created._id),
    providerMessageId: row.providerMessageId,
    error: row.error,
  };
}
