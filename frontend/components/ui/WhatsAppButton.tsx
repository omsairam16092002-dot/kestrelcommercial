"use client";

import { AGENCY } from "@kestrel/shared";
import { track } from "@/lib/analytics";
import { IconWhatsApp } from "@/components/icons";

export function WhatsAppButton({
  page,
  className = "btn-sharp inline-flex items-center justify-center gap-2 bg-tan t-mono text-[13px] tabular text-ink hover:bg-oxblood hover:text-paper",
  label,
}: {
  page: string;
  className?: string;
  label?: string;
}) {
  return (
    <a
      href={AGENCY.whatsappHref}
      id={`cta-whatsapp-${page}`}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() =>
        track({ event: "cta_click", id: `cta-whatsapp-${page}`, page, href: AGENCY.whatsappHref })
      }
    >
      <IconWhatsApp className="h-4 w-4 shrink-0" />
      {label ?? AGENCY.whatsapp}
    </a>
  );
}
