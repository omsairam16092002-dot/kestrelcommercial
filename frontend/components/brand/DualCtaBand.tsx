import type { ReactNode } from "react";
import { Container } from "@/components/brand/Container";
import { CtaLink } from "@/components/ui/CtaLink";
import { ContactDeskSummary } from "@/components/ui/PhoneActionButtons";
import { IconMessage, IconWhatsApp } from "@/components/icons";

export function DualCtaBand({
  page,
  kicker,
  title,
  lede,
  phoneActions = false,
  primaryHref,
  primaryLabel,
  primaryId,
  secondaryHref,
  secondaryLabel,
  secondaryId,
  tone = "paper",
}: {
  page: string;
  kicker?: string;
  title: ReactNode;
  lede?: string;
  phoneActions?: boolean;
  primaryHref?: string;
  primaryLabel?: string;
  primaryId?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  secondaryId?: string;
  tone?: "paper" | "ink";
}) {
  const ink = tone === "ink";
  const primaryIsWa = primaryHref ? /whatsapp|wa\.me/i.test(primaryHref) || /whatsapp/i.test(primaryLabel ?? "") : false;
  const primaryIsSms = primaryHref?.startsWith("sms:") ?? false;
  const secondaryIsTel = secondaryHref?.startsWith("tel:") ?? false;
  const secondaryIsSms = secondaryHref?.startsWith("sms:") ?? false;

  return (
    <section className={ink ? "bg-ink text-paper" : "border-y border-oxblood/15 bg-paper text-ink"}>
      <Container className="flex flex-col gap-8 py-14 md:flex-row md:items-end md:justify-between md:py-20">
        <div className="max-w-xl">
          {kicker ? <p className={`t-caption ${ink ? "text-tan" : "text-oxblood"}`}>{kicker}</p> : null}
          <h2 className={`t-h1 ${kicker ? "mt-2" : ""} ${ink ? "text-paper" : "text-ink"}`}>{title}</h2>
          {lede ? <p className={`t-body-lg mt-4 ${ink ? "text-paper/80" : "text-ink/80"}`}>{lede}</p> : null}
        </div>
        {phoneActions ? (
          <ContactDeskSummary page={page} tone="paper" />
        ) : primaryHref && primaryLabel && primaryId && secondaryHref && secondaryLabel && secondaryId ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <CtaLink
              href={primaryHref}
              id={primaryId}
              page={page}
              className="btn-sharp inline-flex items-center justify-center gap-2 bg-tan text-ink hover:bg-oxblood hover:text-paper"
            >
              {primaryIsWa ? <IconWhatsApp className="h-4 w-4" /> : null}
              {primaryIsSms ? <IconMessage className="h-4 w-4" /> : null}
              {primaryLabel}
            </CtaLink>
            <CtaLink
              href={secondaryHref}
              id={secondaryId}
              page={page}
              className={
                ink
                  ? "btn-sharp inline-flex items-center justify-center gap-2 border border-paper bg-transparent text-paper hover:bg-paper hover:text-ink"
                  : "btn-sharp inline-flex items-center justify-center gap-2 border border-oxblood bg-transparent text-oxblood hover:bg-oxblood hover:text-paper"
              }
            >
              {secondaryIsSms ? <IconMessage className="h-4 w-4" /> : null}
              {secondaryLabel}
            </CtaLink>
          </div>
        ) : null}
      </Container>
    </section>
  );
}
