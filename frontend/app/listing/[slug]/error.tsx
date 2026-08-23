"use client";

import { AGENCY } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { CtaLink } from "@/components/ui/CtaLink";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";

export default function ListingError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Container className="py-20 md:py-28">
      <div className="surface mx-auto max-w-xl p-10 text-center">
        <p className="t-mono text-oxblood">Temporarily unavailable</p>
        <h1 className="t-h1 mt-3 text-ink">This listing could not load</h1>
        <p className="t-body mx-auto mt-4 max-w-md text-mauve">
          The desk is still online. Try again in a moment, search stock, or WhatsApp us directly.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button type="button" onClick={reset} className="btn-sharp bg-oxblood text-paper hover:bg-ink">
            Try again
          </button>
          <WhatsAppButton
            page="listing-error"
            className="btn-sharp bg-tan text-ink hover:bg-oxblood hover:text-paper"
            label={`WhatsApp ${AGENCY.whatsapp}`}
          />
          <CtaLink href="/properties/commercial" id="cta-listing-error-stock" page="listing-error" className="text-sm font-semibold text-oxblood hover:underline">
            Search stock →
          </CtaLink>
        </div>
      </div>
    </Container>
  );
}
