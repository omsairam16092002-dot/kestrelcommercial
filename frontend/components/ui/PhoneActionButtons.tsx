"use client";

import { AGENCY } from "@kestrel/shared";
import { track } from "@/lib/analytics";
import { agencySmsHref } from "@/lib/contactLinks";
import { IconMessage, IconWhatsApp } from "@/components/icons";

const SHARP =
  "btn-sharp inline-flex items-center justify-center gap-2 bg-tan t-mono text-[13px] tabular text-ink hover:bg-oxblood hover:text-paper";
const GHOST = "inline-flex items-center gap-1.5 text-sm font-semibold transition-colors duration-150 ease-out";
const HEADER =
  "hidden items-center gap-1.5 rounded-sm border border-oxblood/15 px-3 py-2 text-[12px] font-semibold tracking-[0.04em] transition-colors duration-150 ease-out lg:inline-flex";
const STICKY =
  "flex min-h-[56px] items-center justify-center gap-1.5 px-2 text-[12px] font-semibold tracking-[0.03em] transition-colors duration-150 ease-out sm:px-3 sm:text-[13px]";
const FOOTER_ICON =
  "inline-flex h-10 w-10 items-center justify-center border border-paper/15 bg-paper/[0.03] text-tan transition-colors duration-150 ease-out hover:border-tan/40 hover:text-paper";

type Variant = "sharp" | "ghost" | "header" | "sticky" | "footer-icon";

function listingMessage(listing?: string) {
  if (!listing) return undefined;
  return `Hi Jignesh — I'm looking at ${listing.replace(/-/g, " ")}.`;
}

function listingWhatsAppHref(listing?: string) {
  const text = listingMessage(listing);
  return text ? `${AGENCY.whatsappHref}?text=${encodeURIComponent(text)}` : AGENCY.whatsappHref;
}

/** AU desk contact: Call (number) · WA · Text — same 0431 number. */
export function CallButton({
  page,
  variant = "sharp",
  className,
  label = AGENCY.phone,
  listing,
}: {
  page: string;
  variant?: Variant;
  className?: string;
  label?: string;
  listing?: string;
}) {
  const styles = {
    sharp: SHARP,
    ghost: `${GHOST} t-mono tabular text-paper/85 hover:text-tan`,
    header: `${HEADER} t-mono tabular text-ink/80 hover:border-oxblood/30 hover:text-oxblood`,
    sticky: `${STICKY} t-mono tabular border-r border-oxblood/15 bg-oxblood text-paper hover:bg-ink active:bg-ink/90`,
    "footer-icon": `${GHOST} t-mono tabular text-paper/80 hover:text-tan`,
  } as const;

  return (
    <a
      href={AGENCY.phoneHref}
      id={`cta-call-${page}`}
      className={className ? `${styles[variant]} ${className}` : styles[variant]}
      aria-label={`Call ${AGENCY.phone}`}
      onClick={() => track({ event: "cta_click", id: `cta-call-${page}`, page, listing, href: AGENCY.phoneHref })}
    >
      {label}
    </a>
  );
}

export function WhatsAppActionButton({
  page,
  variant = "sharp",
  className,
  label = "WA",
  listing,
}: {
  page: string;
  variant?: Variant;
  className?: string;
  label?: string;
  listing?: string;
}) {
  const href = listingWhatsAppHref(listing);
  const styles = {
    sharp: SHARP,
    ghost: `${GHOST} text-paper/85 hover:text-tan`,
    header: `${HEADER} border-oxblood/20 text-ink/80 hover:border-oxblood/40 hover:text-oxblood`,
    sticky: `${STICKY} border-r border-oxblood/15 bg-tan text-ink hover:bg-oxblood hover:text-paper active:bg-ink active:text-paper`,
    "footer-icon": FOOTER_ICON,
  } as const;

  return (
    <a
      href={href}
      id={`cta-whatsapp-${page}`}
      target="_blank"
      rel="noopener noreferrer"
      className={className ? `${styles[variant]} ${className}` : styles[variant]}
      aria-label={`WhatsApp ${AGENCY.whatsapp}`}
      onClick={() => track({ event: "cta_click", id: `cta-whatsapp-${page}`, page, listing, href })}
    >
      <IconWhatsApp className="h-4 w-4 shrink-0" />
      {variant === "footer-icon" ? <span className="sr-only">WhatsApp</span> : label}
    </a>
  );
}

export function TextButton({
  page,
  variant = "sharp",
  className,
  label = "Text",
  listing,
}: {
  page: string;
  variant?: Variant;
  className?: string;
  label?: string;
  listing?: string;
}) {
  const href = agencySmsHref(listingMessage(listing));
  const styles = {
    sharp: SHARP,
    ghost: `${GHOST} text-paper/85 hover:text-tan`,
    header: `${HEADER} border-tan/40 text-ink/80 hover:border-tan hover:text-oxblood`,
    sticky: `${STICKY} bg-oxblood text-paper hover:bg-ink active:bg-ink/90`,
    "footer-icon": FOOTER_ICON,
  } as const;

  return (
    <a
      href={href}
      id={`cta-text-${page}`}
      className={className ? `${styles[variant]} ${className}` : styles[variant]}
      aria-label={`Text ${AGENCY.phone}`}
      onClick={() => track({ event: "cta_click", id: `cta-text-${page}`, page, listing, href })}
    >
      <IconMessage className="h-4 w-4 shrink-0" />
      {variant === "footer-icon" ? <span className="sr-only">Text</span> : label}
    </a>
  );
}

export function PhoneActionButtons({
  page,
  variant = "sharp",
  className = "flex flex-wrap items-center gap-2 sm:gap-3",
  listing,
}: {
  page: string;
  variant?: Variant;
  className?: string;
  listing?: string;
}) {
  return (
    <div className={className}>
      <CallButton page={page} variant={variant} listing={listing} />
      <WhatsAppActionButton page={page} variant={variant} listing={listing} />
      <TextButton page={page} variant={variant} listing={listing} />
    </div>
  );
}
