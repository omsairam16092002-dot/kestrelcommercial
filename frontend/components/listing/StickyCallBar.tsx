"use client";

import { CallButton, TextButton, WhatsAppActionButton } from "@/components/ui/PhoneActionButtons";

/** Mobile-only sticky bar: icon-only Call · WA · Text in thumb zone. */
export function StickyCallBar({ page, listing }: { page: string; listing?: string }) {
  return (
    <nav
      aria-label="Contact the desk"
      id="sticky-call-bar"
      className="fixed inset-x-0 bottom-0 z-40 md:hidden"
    >
      <div className="border-t-2 border-tan bg-paper pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_32px_rgba(42,20,24,0.08)]">
        <div className="flex">
          <CallButton page={page} variant="sticky" listing={listing} />
          <WhatsAppActionButton page={page} variant="sticky" listing={listing} />
          <TextButton page={page} variant="sticky" listing={listing} />
        </div>
      </div>
    </nav>
  );
}
