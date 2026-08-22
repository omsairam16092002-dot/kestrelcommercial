import type { ReactNode } from "react";
import { AGENCY } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";

export function SectionHeader({
  kicker,
  title,
  description,
  page,
  cta,
  showWhatsApp = true,
}: {
  kicker: string;
  title: ReactNode;
  description?: ReactNode;
  page: string;
  cta?: ReactNode;
  showWhatsApp?: boolean;
}) {
  return (
    <section className="relative overflow-hidden bg-oxblood text-paper">
      <div className="section-header-grid pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-tan/25 to-transparent"
        aria-hidden
      />
      <Container className="relative z-10 py-16 md:py-20 lg:py-24">
        <p className="t-caption text-tan">{kicker}</p>
        <h1 className="t-h1 mt-5 max-w-3xl">{title}</h1>
        {description ? (
          <div className="t-body-lg mt-6 max-w-xl text-pretty text-paper/90">{description}</div>
        ) : null}
        <div className="mt-10 flex flex-wrap items-center gap-3">
          {showWhatsApp ? (
            <WhatsAppButton
              page={page}
              className="btn-sharp inline-flex items-center justify-center gap-2 bg-tan text-ink hover:bg-paper"
              label={`WhatsApp ${AGENCY.whatsapp}`}
            />
          ) : null}
          {cta}
        </div>
      </Container>
    </section>
  );
}
