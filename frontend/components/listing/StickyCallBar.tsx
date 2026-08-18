"use client";

import { AGENCY } from "@kestrel/shared";
import { track } from "@/lib/analytics";
import { IconWhatsApp } from "@/components/icons";

function whatsappHref(listing?: string) {
  if (!listing) return AGENCY.whatsappHref;
  const text = `Hi Jignesh — I'm looking at ${listing.replace(/-/g, " ")}.`;
  return `${AGENCY.whatsappHref}?text=${encodeURIComponent(text)}`;
}

export function StickyCallBar({
  page,
  listing,
  secondaryHref = "/contact#enquire",
  secondaryLabel = "Request info",
}: {
  page: string;
  listing?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  const wa = whatsappHref(listing);

  return (
    <nav
      aria-label="Contact the desk"
      id="sticky-call-bar"
      className="fixed inset-x-0 bottom-0 z-40 transition-opacity duration-150 md:hidden"
    >
      <div className="border-t-2 border-tan bg-paper pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <a
            href={secondaryHref}
            id={`cta-enquire-${page}`}
            className="flex min-h-[56px] items-center justify-center border-r border-oxblood/15 px-3 text-[13px] font-semibold tracking-[0.04em] text-oxblood transition-colors duration-150 ease-out hover:bg-white active:bg-oxblood/5"
            onClick={() =>
              track({ event: "cta_click", id: `cta-enquire-${page}`, page, listing, href: secondaryHref })
            }
          >
            {secondaryLabel}
          </a>
          <a
            href={wa}
            id={`cta-wa-${page}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[56px] items-center justify-center gap-2 bg-tan px-3 text-[13px] font-semibold tracking-[0.04em] text-ink transition-colors duration-150 ease-out hover:bg-oxblood hover:text-paper active:bg-ink active:text-paper"
            onClick={() => track({ event: "cta_click", id: `cta-wa-${page}`, page, listing, href: wa })}
          >
            <IconWhatsApp className="h-4 w-4 shrink-0" />
            WhatsApp
          </a>
        </div>
      </div>
    </nav>
  );
}
