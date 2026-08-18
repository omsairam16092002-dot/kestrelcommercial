import {
  followUpEmailBody,
  followUpEmailSubject,
  followUpWhatsAppText,
  listingCaption,
  mailtoHref,
  telHref,
  whatsappToLead,
  type ListingCaptionInput,
} from "@/lib/contactLinks";
import { IconMail, IconPhone, IconWhatsApp } from "@/components/icons";

export function LeadContactStrip({
  name,
  phone,
  email,
  property,
  propertySlug,
  compact = false,
}: {
  name: string;
  phone?: string | null;
  email?: string | null;
  property?: ListingCaptionInput;
  propertySlug?: string | null;
  compact?: boolean;
}) {
  const listing = listingCaption(property, propertySlug);
  const tel = phone ? telHref(phone) : null;
  const mail = email
    ? mailtoHref(email, followUpEmailSubject(listing), followUpEmailBody(name, listing))
    : null;
  const wa = phone ? whatsappToLead(phone, followUpWhatsAppText(name, listing)) : null;
  const iconClass = compact ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <div className={compact ? "mt-1 space-y-1" : "mt-3 space-y-2"}>
      <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${compact ? "text-xs" : "text-sm"}`}>
        {tel ? (
          <a href={tel} className="inline-flex items-center gap-1.5 t-mono text-oxblood hover:underline">
            <IconPhone className={iconClass} />
            {phone}
          </a>
        ) : phone ? (
          <span className="inline-flex items-center gap-1.5 t-mono text-ink">
            <IconPhone className={iconClass} />
            {phone}
          </span>
        ) : null}
        {mail ? (
          <a href={mail} className="inline-flex items-center gap-1.5 text-oxblood hover:underline">
            <IconMail className={iconClass} />
            {email}
          </a>
        ) : email ? (
          <span className="inline-flex items-center gap-1.5 text-ink">
            <IconMail className={iconClass} />
            {email}
          </span>
        ) : null}
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-oxblood hover:underline"
          >
            <IconWhatsApp className={iconClass} />
            WhatsApp
          </a>
        ) : null}
        {!phone && !email ? <span className="text-mauve">No contact</span> : null}
      </p>
      {listing ? <p className={compact ? "text-xs text-mauve" : "text-sm text-mauve"}>{listing}</p> : null}
    </div>
  );
}
