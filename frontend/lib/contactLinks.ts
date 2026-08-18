export type ListingCaptionInput = {
  address?: string;
  suburb?: string;
  priceLabel?: string;
} | null | undefined;

/** AU mobile/landline → digits for wa.me (61…). */
export function auWhatsAppDigits(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("61") && digits.length >= 10) return digits;
  if (digits.startsWith("0") && digits.length >= 8) return `61${digits.slice(1)}`;
  if (digits.length >= 8 && digits.length <= 10) return `61${digits}`;
  if (digits.length >= 11) return digits;
  return null;
}

export function telHref(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const href = trimmed.replace(/[^\d+]/g, "");
  return href ? `tel:${href}` : null;
}

export function mailtoHref(email: string, subject?: string, body?: string): string | null {
  const address = email.trim();
  if (!address.includes("@")) return null;
  const qs = new URLSearchParams();
  if (subject) qs.set("subject", subject);
  if (body) qs.set("body", body);
  const q = qs.toString();
  return q ? `mailto:${address}?${q}` : `mailto:${address}`;
}

export function whatsappToLead(phone: string, text?: string): string | null {
  const digits = auWhatsAppDigits(phone);
  if (!digits) return null;
  const href = `https://wa.me/${digits}`;
  return text ? `${href}?text=${encodeURIComponent(text)}` : href;
}

export function listingCaption(property?: ListingCaptionInput, slug?: string | null): string {
  if (property?.address) {
    return [property.address, property.suburb, property.priceLabel].filter(Boolean).join(" · ");
  }
  return slug?.trim() || "";
}

export function followUpWhatsAppText(name: string, listing?: string) {
  return listing
    ? `Hi ${name} — following up from Kestrel on ${listing}.`
    : `Hi ${name} — following up from Kestrel.`;
}

export function followUpEmailSubject(listing?: string) {
  return listing ? `Kestrel Commercial — ${listing}` : "Kestrel Commercial";
}

export function followUpEmailBody(name: string, listing?: string) {
  return listing ? `Hi ${name},\n\nFollowing up on ${listing}.\n\n` : `Hi ${name},\n\n`;
}
