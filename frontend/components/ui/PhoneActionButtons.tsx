"use client";

import { AGENCY } from "@kestrel/shared";
import { track } from "@/lib/analytics";
import { agencySmsHref } from "@/lib/contactLinks";
import { IconMessage, IconPhone, IconWhatsApp } from "@/components/icons";

const SHARP =
  "btn-sharp inline-flex items-center justify-center gap-2 bg-tan t-mono text-[13px] tabular text-ink hover:bg-oxblood hover:text-paper";
const GHOST = "inline-flex items-center gap-1.5 text-sm font-semibold transition-colors duration-150 ease-out";
const HEADER_LINK =
  "hidden t-mono tabular text-[13px] font-semibold text-ink/85 transition-colors duration-150 ease-out hover:text-oxblood lg:inline-flex";
const HEADER_ICON =
  "inline-flex h-9 w-9 items-center justify-center text-ink/75 transition-colors duration-150 ease-out hover:bg-oxblood/5 hover:text-oxblood";
const STICKY =
  "flex min-h-[52px] flex-1 items-center justify-center transition-colors duration-150 ease-out sm:min-h-[56px]";
const FOOTER_ICON =
  "inline-flex h-10 w-10 items-center justify-center border border-paper/15 bg-paper/[0.03] text-tan transition-colors duration-150 ease-out hover:border-tan/40 hover:text-paper";
const CLUSTER_WA =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center bg-tan text-ink transition-colors duration-150 ease-out hover:bg-oxblood hover:text-paper";
const CLUSTER_SECONDARY =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center bg-paper text-oxblood transition-colors duration-150 ease-out hover:bg-oxblood/5";
const MENU_CALL =
  "btn-sharp inline-flex w-full items-center justify-center t-mono tabular border border-oxblood bg-white text-oxblood hover:bg-oxblood hover:text-paper";
const MENU_ACTION =
  "btn-sharp inline-flex items-center justify-center gap-2 border border-oxblood/20 bg-white text-oxblood hover:bg-oxblood hover:text-paper";

export type ContactVariant =
  | "sharp"
  | "ghost"
  | "header-link"
  | "header-icon"
  | "sticky"
  | "footer-icon"
  | "cluster-wa"
  | "cluster-secondary"
  | "menu-call"
  | "menu-action";

function listingMessage(listing?: string) {
  if (!listing) return undefined;
  return `Hi Jignesh — I'm looking at ${listing.replace(/-/g, " ")}.`;
}

function listingWhatsAppHref(listing?: string) {
  const text = listingMessage(listing);
  return text ? `${AGENCY.whatsappHref}?text=${encodeURIComponent(text)}` : AGENCY.whatsappHref;
}

export function CallButton({
  page,
  variant = "sharp",
  className,
  label = AGENCY.phone,
  listing,
  onAction,
}: {
  page: string;
  variant?: ContactVariant;
  className?: string;
  label?: string;
  listing?: string;
  onAction?: () => void;
}) {
  const styles = {
    sharp: SHARP,
    ghost: `${GHOST} t-mono tabular text-paper/85 hover:text-tan`,
    "header-link": HEADER_LINK,
    "header-icon": HEADER_ICON,
    sticky: `${STICKY} border-r border-oxblood/10 bg-oxblood text-paper hover:bg-ink active:bg-ink/90`,
    "footer-icon": FOOTER_ICON,
    "cluster-wa": CLUSTER_WA,
    "cluster-secondary": CLUSTER_SECONDARY,
    "menu-call": MENU_CALL,
    "menu-action": MENU_ACTION,
  } as const;

  const iconOnly =
    variant === "header-icon" ||
    variant === "footer-icon" ||
    variant === "sticky" ||
    variant === "cluster-wa" ||
    variant === "cluster-secondary";

  return (
    <a
      href={AGENCY.phoneHref}
      id={`cta-call-${page}`}
      className={className ? `${styles[variant]} ${className}` : styles[variant]}
      aria-label={`Call ${AGENCY.phone}`}
      onClick={() => {
        track({ event: "cta_click", id: `cta-call-${page}`, page, listing, href: AGENCY.phoneHref });
        onAction?.();
      }}
    >
      {iconOnly ? (
        <>
          <IconPhone className={`${variant === "sticky" ? "h-5 w-5" : "h-4 w-4"} shrink-0`} />
          <span className="sr-only">Call</span>
        </>
      ) : (
        label
      )}
    </a>
  );
}

export function WhatsAppActionButton({
  page,
  variant = "sharp",
  className,
  label = "WA",
  listing,
  onAction,
}: {
  page: string;
  variant?: ContactVariant;
  className?: string;
  label?: string;
  listing?: string;
  onAction?: () => void;
}) {
  const href = listingWhatsAppHref(listing);
  const styles = {
    sharp: SHARP,
    ghost: `${GHOST} text-paper/85 hover:text-tan`,
    "header-link": HEADER_LINK,
    "header-icon": HEADER_ICON,
    sticky: `${STICKY} border-r border-oxblood/10 bg-tan text-ink hover:bg-oxblood hover:text-paper active:bg-ink active:text-paper`,
    "footer-icon": FOOTER_ICON,
    "cluster-wa": CLUSTER_WA,
    "cluster-secondary": CLUSTER_SECONDARY,
    "menu-call": MENU_CALL,
    "menu-action": MENU_ACTION,
  } as const;
  const iconOnly =
    variant === "header-icon" ||
    variant === "footer-icon" ||
    variant === "sticky" ||
    variant === "cluster-wa" ||
    variant === "cluster-secondary";

  return (
    <a
      href={href}
      id={`cta-whatsapp-${page}`}
      target="_blank"
      rel="noopener noreferrer"
      className={className ? `${styles[variant]} ${className}` : styles[variant]}
      aria-label={`WhatsApp ${AGENCY.whatsapp}`}
      onClick={() => {
        track({ event: "cta_click", id: `cta-whatsapp-${page}`, page, listing, href });
        onAction?.();
      }}
    >
      <IconWhatsApp className={`${variant === "sticky" ? "h-5 w-5" : "h-4 w-4"} shrink-0`} />
      {iconOnly ? <span className="sr-only">WhatsApp</span> : label}
    </a>
  );
}

export function TextButton({
  page,
  variant = "sharp",
  className,
  label = "Text",
  listing,
  onAction,
}: {
  page: string;
  variant?: ContactVariant;
  className?: string;
  label?: string;
  listing?: string;
  onAction?: () => void;
}) {
  const href = agencySmsHref(listingMessage(listing));
  const styles = {
    sharp: SHARP,
    ghost: `${GHOST} text-paper/85 hover:text-tan`,
    "header-link": HEADER_LINK,
    "header-icon": HEADER_ICON,
    sticky: `${STICKY} bg-paper text-oxblood hover:bg-white active:bg-oxblood/5`,
    "footer-icon": FOOTER_ICON,
    "cluster-wa": CLUSTER_WA,
    "cluster-secondary": CLUSTER_SECONDARY,
    "menu-call": MENU_CALL,
    "menu-action": MENU_ACTION,
  } as const;
  const iconOnly =
    variant === "header-icon" ||
    variant === "footer-icon" ||
    variant === "sticky" ||
    variant === "cluster-wa" ||
    variant === "cluster-secondary";

  return (
    <a
      href={href}
      id={`cta-text-${page}`}
      className={className ? `${styles[variant]} ${className}` : styles[variant]}
      aria-label={`Text ${AGENCY.phone}`}
      onClick={() => {
        track({ event: "cta_click", id: `cta-text-${page}`, page, listing, href });
        onAction?.();
      }}
    >
      <IconMessage className={`${variant === "sticky" ? "h-5 w-5" : "h-4 w-4"} shrink-0`} />
      {iconOnly ? <span className="sr-only">Text</span> : label}
    </a>
  );
}

/** Same ContactClusterBar as the header — used on About, Investing, Contact, listing desk. */
export function ContactDeskSummary({
  page,
  tone = "paper",
  listing,
  onAction,
  className,
}: {
  page: string;
  tone?: "dark" | "light" | "paper";
  listing?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <ContactClusterBar
      page={page}
      listing={listing}
      onAction={onAction}
      className={className}
      surface={tone === "paper" ? "paper" : "dark"}
    />
  );
}

/** One sharp unit: spaced mono phone (tel link) + WhatsApp + Text. */
export function ContactClusterBar({
  page,
  listing,
  onAction,
  className = "",
  fullWidth = false,
  surface = "paper",
}: {
  page: string;
  listing?: string;
  onAction?: () => void;
  className?: string;
  fullWidth?: boolean;
  /** `paper` = oxblood on paper (header). `dark` = tan/paper on ink or oxblood bands. */
  surface?: "paper" | "dark";
}) {
  const dark = surface === "dark";
  return (
    <div
      className={`inline-flex items-stretch border divide-x ${
        dark ? "border-tan/50 divide-tan/50" : "border-oxblood divide-oxblood"
      } ${fullWidth ? "w-full" : "w-fit max-w-full shrink-0 self-start"} ${className}`.trim()}
      role="group"
      aria-label="Contact the desk"
    >
      <a
        href={AGENCY.phoneHref}
        id={`cta-call-${page}-cluster`}
        className={`t-mono flex items-center px-3 py-2 text-[13px] font-semibold tabular transition-colors duration-150 ease-out ${
          dark
            ? "text-tan hover:bg-paper/10 hover:text-paper"
            : "text-oxblood hover:bg-oxblood/5"
        } ${fullWidth ? "min-w-0 flex-1" : ""}`}
        aria-label={`Call ${AGENCY.phone}`}
        onClick={() => {
          track({ event: "cta_click", id: `cta-call-${page}-cluster`, page, listing, href: AGENCY.phoneHref });
          onAction?.();
        }}
      >
        {AGENCY.phone}
      </a>
      <WhatsAppActionButton page={page} variant="cluster-wa" listing={listing} onAction={onAction} />
      <TextButton page={page} variant="cluster-secondary" listing={listing} onAction={onAction} />
    </div>
  );
}

/** Navbar contact: mobile = Call + WhatsApp icons; desktop = full cluster. Text stays in the drawer. */
export function HeaderContactCluster({ page }: { page: string }) {
  return (
    <>
      <div
        className="inline-flex items-stretch border border-oxblood divide-x divide-oxblood lg:hidden"
        role="group"
        aria-label="Contact the desk"
      >
        <CallButton page={`${page}-nav`} variant="cluster-secondary" />
        <WhatsAppActionButton page={`${page}-nav`} variant="cluster-wa" />
      </div>
      <div className="hidden lg:block">
        <ContactClusterBar page={page} />
      </div>
    </>
  );
}

/** Mobile nav drawer: same ContactClusterBar as desktop. */
export function MobileContactPanel({ page, onNavigate }: { page: string; onNavigate?: () => void }) {
  return (
    <div className="mx-1 mt-4 border-t border-oxblood/10 pt-5">
      <p className="px-3 t-caption text-mauve">Contact the desk</p>
      <div className="mt-3 px-3">
        <ContactClusterBar page={`${page}-mobile`} onAction={onNavigate} fullWidth />
      </div>
    </div>
  );
}

export function PhoneActionButtons({
  page,
  variant = "sharp",
  className = "flex flex-wrap items-center gap-2 sm:gap-3",
  listing,
}: {
  page: string;
  variant?: ContactVariant;
  className?: string;
  listing?: string;
}) {
  return (
    <div className={className}>
      <CallButton page={page} variant={variant} label="Call" listing={listing} />
      <WhatsAppActionButton page={page} variant={variant} listing={listing} />
      <TextButton page={page} variant={variant} listing={listing} />
    </div>
  );
}

/** Hero / secondary WhatsApp CTA — tan button with number, never louder than primary. */
export function ContactDeskLine({
  page,
  className = "",
}: {
  page: string;
  className?: string;
}) {
  return (
    <WhatsAppActionButton
      page={page}
      variant="sharp"
      label={`WhatsApp ${AGENCY.phone}`}
      className={`px-5 py-3.5 ${className}`.trim()}
    />
  );
}
