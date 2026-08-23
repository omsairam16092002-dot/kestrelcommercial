import type { ReactNode } from "react";
import { Container } from "@/components/brand/Container";
import { HeroBleed } from "@/components/brand/HeroBleed";
import { PhoneActionButtons } from "@/components/ui/PhoneActionButtons";

export function PageHero({
  kicker,
  title,
  description,
  page,
  cta,
  showPhoneActions = false,
  imageSrc,
  imageAlt = "",
}: {
  kicker: string;
  title: ReactNode;
  description?: ReactNode;
  page: string;
  cta?: ReactNode;
  showPhoneActions?: boolean;
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
          {showPhoneActions ? (
            <PhoneActionButtons page={page} variant="sharp" />
          ) : null}
          {cta}
        </div>
      </Container>
    </section>
  );
}
