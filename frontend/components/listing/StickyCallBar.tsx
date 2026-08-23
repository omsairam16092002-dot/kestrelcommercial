"use client";

import { track } from "@/lib/analytics";
import { CallButton, TextButton, WhatsAppActionButton } from "@/components/ui/PhoneActionButtons";

export function StickyCallBar({
  page,
  listing,
  secondaryHref = "/contact#enquire",
  secondaryLabel = "Enquire",
}: {
  page: string;
  listing?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <nav
      aria-label="Contact the desk"
      id="sticky-call-bar"
      className="fixed inset-x-0 bottom-0 z-40 transition-opacity duration-150 md:hidden"
    >
      <div className="border-t-2 border-tan bg-paper pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4">
          <CallButton page={page} variant="sticky" listing={listing} className="text-[10px] sm:text-[11px]" />
          <WhatsAppActionButton page={page} variant="sticky" listing={listing} />
          <TextButton page={page} variant="sticky" listing={listing} />
          <a
            href={secondaryHref}
            id={`cta-enquire-${page}`}
            className="flex min-h-[56px] items-center justify-center px-1.5 text-[11px] font-semibold tracking-[0.03em] text-oxblood transition-colors duration-150 ease-out hover:bg-white active:bg-oxblood/5 sm:px-2 sm:text-[12px]"
            onClick={() =>
              track({ event: "cta_click", id: `cta-enquire-${page}`, page, listing, href: secondaryHref })
            }
          >
            {secondaryLabel}
          </a>
        </div>
      </div>
    </nav>
  );
}
