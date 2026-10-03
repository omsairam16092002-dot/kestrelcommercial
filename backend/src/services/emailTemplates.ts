import { AGENCY } from "@kestrel/shared";
import { env } from "../config/env";

export function siteUrl(path = "") {
  return `${env.siteUrl.replace(/\/$/, "")}${path}`;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type EmailBlock = {
  eyebrow?: string;
  heading: string;
  paragraphs: string[];
  details?: [string, string | null | undefined][];
  cta?: { label: string; href: string };
  secondary?: { label: string; href: string };
  /** Extra plain-text lines appended after the main copy (e.g. unsubscribe). */
  footnote?: string;
};

/** Branded transactional email — returns matching HTML and plain-text bodies. */
export function renderEmail(block: EmailBlock) {
  const details = (block.details ?? []).filter((row): row is [string, string] => Boolean(row[1]));
  const html = `<!doctype html>
<html><body style="margin:0;background:#f6f1ec;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:20px;overflow:hidden">
    <div style="background:#5c1f27;color:#f6f1ec;padding:20px 24px">
      <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#d9a26b">${escapeHtml(block.eyebrow ?? AGENCY.tradingName)}</div>
      <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3">${escapeHtml(block.heading)}</h1>
    </div>
    <div style="padding:24px;color:#2a1418;font-size:15px;line-height:1.6">
      ${block.paragraphs.map((p) => `<p style="margin:0 0 14px">${escapeHtml(p)}</p>`).join("")}
      ${
        details.length
          ? `<table style="width:100%;border-collapse:collapse;margin:8px 0 18px">${details
              .map(
                ([label, value]) =>
                  `<tr><td style="padding:7px 0;color:#654f49;font-size:12px;letter-spacing:.12em;text-transform:uppercase;width:130px;vertical-align:top">${escapeHtml(label)}</td><td style="padding:7px 0;color:#2a1418">${escapeHtml(value)}</td></tr>`,
              )
              .join("")}</table>`
          : ""
      }
      ${
        block.cta
          ? `<p style="margin:20px 0 8px"><a href="${escapeHtml(block.cta.href)}" style="display:inline-block;background:#5c1f27;color:#f6f1ec;text-decoration:none;padding:12px 20px;font-family:Arial,sans-serif;font-size:14px;font-weight:bold">${escapeHtml(block.cta.label)}</a></p>`
          : ""
      }
      ${
        block.secondary
          ? `<p style="margin:8px 0 0"><a href="${escapeHtml(block.secondary.href)}" style="color:#5c1f27;font-size:14px">${escapeHtml(block.secondary.label)}</a></p>`
          : ""
      }
      <p style="margin:24px 0 0;color:#654f49;font-size:13px">Call or WhatsApp ${escapeHtml(AGENCY.phone)} · ${escapeHtml(AGENCY.email)}</p>
      <p style="margin:6px 0 0;color:#654f49;font-size:12px">${escapeHtml(AGENCY.licenceHolder)} · Licence ${escapeHtml(AGENCY.licenceNumber)} · ${escapeHtml(AGENCY.tradingName)}</p>
      ${block.footnote ? `<p style="margin:14px 0 0;color:#8a7570;font-size:12px">${escapeHtml(block.footnote)}</p>` : ""}
    </div>
  </div>
</body></html>`;

  const text = [
    block.heading,
    "",
    ...block.paragraphs.flatMap((p) => [p, ""]),
    ...details.map(([label, value]) => `${label}: ${value}`),
    details.length ? "" : null,
    block.cta ? `${block.cta.label}: ${block.cta.href}` : null,
    block.secondary ? `${block.secondary.label}: ${block.secondary.href}` : null,
    "",
    `Call or WhatsApp ${AGENCY.phone} · ${AGENCY.email}`,
    `${AGENCY.licenceHolder} · Licence ${AGENCY.licenceNumber}`,
    block.footnote ? `\n${block.footnote}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return { html, text };
}
