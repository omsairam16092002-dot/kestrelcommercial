import { AGENCY } from "@kestrel/shared";
import { CtaLink } from "@/components/ui/CtaLink";
import { IconSearch, IconWhatsApp } from "@/components/icons";

export function EmptyState({
  side,
  page = side === "lease" ? "lease" : "buy",
  resetHref = side === "lease" ? "/lease" : "/buy",
  title = "Widen the span. Or WhatsApp the desk.",
  body = "Nothing on the grid clears that combination of floor, span, zone and price. Most occupiers over-specify height — drop the span first.",
}: {
  side: "sale" | "lease";
  page?: string;
  resetHref?: string;
  title?: string;
  body?: string;
}) {
  return (
    <div className="surface px-6 py-14 text-center md:px-10">
      <span className="mx-auto inline-flex h-12 w-12 items-center justify-center bg-oxblood text-tan">
        <IconSearch className="h-5 w-5" />
      </span>
      <p className="t-caption mt-5 text-oxblood">No match on that spec</p>
      <h2 className="t-h2 mt-3 text-ink">{title}</h2>
      <p className="t-body mx-auto mt-4 max-w-lg text-ink/75">{body}</p>
      <CtaLink
        href={AGENCY.whatsappHref}
        id={`cta-empty-${side}-wa`}
        page={page}
        className="btn-sharp mt-8 inline-flex items-center justify-center gap-2 bg-oxblood text-paper hover:bg-ink"
      >
        <IconWhatsApp className="h-4 w-4" />
        WhatsApp {AGENCY.whatsapp}
      </CtaLink>
      <p className="mt-4">
        <CtaLink
          href={resetHref}
          id={`cta-empty-${side}-reset`}
          page={page}
          className="text-sm font-semibold text-oxblood hover:underline"
        >
          Reset the spec →
        </CtaLink>
      </p>
    </div>
  );
}
