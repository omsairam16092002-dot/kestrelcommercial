import type { PortalKind } from "@kestrel/shared";

export type ParsedPortalEnquiry = {
  name: string;
  phone: string;
  email: string;
  message: string;
  listingId: string;
  address: string;
  portal: PortalKind;
};

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function emailBodyToText(text?: string | null, html?: string | null) {
  const plain = String(text || "").trim();
  if (plain.length >= 20) return plain;
  return htmlToText(String(html || ""));
}

function firstMatch(body: string, patterns: RegExp[]) {
  for (const rx of patterns) {
    const m = body.match(rx);
    const value = m?.[1]?.trim();
    if (value) return value.replace(/\s+/g, " ").trim();
  }
  return "";
}

function lookLikeEmail(value: string) {
  const m = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m?.[0] ?? "";
}

function lookLikePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8) return "";
  return value.trim();
}

export function detectPortal(from: string, subject: string, body: string): PortalKind {
  const hay = `${from} ${subject} ${body}`.toLowerCase();
  if (hay.includes("realcommercial.com.au") || hay.includes("real commercial")) return "realcommercial";
  if (hay.includes("realestate.com.au") || hay.includes("rea group") || /\brea\b/.test(hay)) return "rea";
  return "unknown";
}

export function parseReaEnquiry(body: string): ParsedPortalEnquiry {
  const name = firstMatch(body, [
    /(?:enquirer|enquiry from|from name|contact name|name)\s*[:\-]\s*([^\n]+)/i,
    /you have received (?:a |an )?new enquiry from\s+([^\n]+)/i,
  ]);
  const email = lookLikeEmail(
    firstMatch(body, [/(?:email|e-mail)\s*[:\-]\s*([^\n]+)/i]) || body,
  );
  const phone = lookLikePhone(
    firstMatch(body, [/(?:phone|mobile|tel|telephone)\s*[:\-]\s*([^\n]+)/i]),
  );
  const message = firstMatch(body, [
    /(?:message|comments|enquiry details|comments\/message)\s*[:\-]\s*([\s\S]{8,800}?)(?:\n(?:property|listing|address|id)\s*[:\-]|$)/i,
  ]);
  const listingId = firstMatch(body, [
    /(?:listing\s*(?:id|number|#)|property\s*id|rea\s*id|reference)\s*[:\-]\s*([A-Z0-9\-]+)/i,
  ]);
  const address = firstMatch(body, [
    /(?:property(?: address)?|address|listing)\s*[:\-]\s*([^\n]+)/i,
  ]);
  return {
    name,
    phone,
    email,
    message: message || body.slice(0, 600).trim(),
    listingId,
    address,
    portal: "rea",
  };
}

export function parseRealCommercialEnquiry(body: string): ParsedPortalEnquiry {
  const name = firstMatch(body, [
    /(?:contact name|enquirer name|name)\s*[:\-]\s*([^\n]+)/i,
  ]);
  const email = lookLikeEmail(
    firstMatch(body, [/(?:contact email|email)\s*[:\-]\s*([^\n]+)/i]) || body,
  );
  const phone = lookLikePhone(
    firstMatch(body, [/(?:contact phone|phone|mobile)\s*[:\-]\s*([^\n]+)/i]),
  );
  const message = firstMatch(body, [
    /(?:comments|message|enquiry)\s*[:\-]\s*([\s\S]{8,800}?)(?:\n(?:property|listing|address)\s*[:\-]|$)/i,
  ]);
  const listingId = firstMatch(body, [
    /(?:listing\s*(?:number|id|#)|property\s*id|rc\s*id)\s*[:\-]\s*([A-Z0-9\-]+)/i,
  ]);
  const address = firstMatch(body, [
    /(?:property address|address|property)\s*[:\-]\s*([^\n]+)/i,
  ]);
  return {
    name,
    phone,
    email,
    message: message || body.slice(0, 600).trim(),
    listingId,
    address,
    portal: "realcommercial",
  };
}

export function parsePortalEnquiry(from: string, subject: string, body: string): ParsedPortalEnquiry {
  const portal = detectPortal(from, subject, body);
  if (portal === "realcommercial") return parseRealCommercialEnquiry(body);
  if (portal === "rea") return parseReaEnquiry(body);
  const rea = parseReaEnquiry(body);
  const rc = parseRealCommercialEnquiry(body);
  const score = (p: ParsedPortalEnquiry) => Number(Boolean(p.name)) + Number(Boolean(p.email || p.phone));
  return score(rc) > score(rea) ? { ...rc, portal: "unknown" } : { ...rea, portal: "unknown" };
}

export function hasMinimumLeadFields(parsed: ParsedPortalEnquiry) {
  const name = parsed.name.trim();
  const phone = parsed.phone.replace(/\D/g, "");
  const email = parsed.email.trim();
  return name.length >= 2 && (email.length > 0 || phone.length >= 8);
}

export function sourceForPortal(portal: PortalKind): "portal-rea" | "portal-realcommercial" {
  return portal === "realcommercial" ? "portal-realcommercial" : "portal-rea";
}
