import type { ReactNode } from "react";
import { AGENCY } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { HeroBleed } from "@/components/brand/HeroBleed";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";

export function PageHero({
  kicker,
  title,
  description,
  page,
  cta,
  showWhatsApp = true,
  imageSrc,
  imageAlt = "",
}: {
  kicker: string;
  title: ReactNode;
  description?: ReactNode;
  page: string;
  cta?: ReactNode;
  showWhatsApp?: boolean;
  imageSrc?: string;
  imageAlt?: string;
}) {
  return (
    <section className="relative flex min-h-[76vh] flex-col justify-end overflow-hidden bg-oxblood text-paper lg:min-h-[88vh]">
      <HeroBleed alt={imageAlt} src={imageSrc} />
      <Container className="relative z-10 pb-16 pt-28 md:pb-24 md:pt-40">
        <p className="t-caption text-tan">{kicker}</p>
        <h1 className="t-h1 mt-5 max-w-3xl">{title}</h1>
        {description ? <div className="t-body-lg mt-6 max-w-xl text-pretty text-paper/90">{description}</div> : null}
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
