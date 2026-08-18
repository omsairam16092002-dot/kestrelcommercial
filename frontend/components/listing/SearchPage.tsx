import type { SpecFilters, TransactionSide } from "@kestrel/shared";
import { AGENCY, filterProperties } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { HeroBleed } from "@/components/brand/HeroBleed";
import { DualCtaBand } from "@/components/brand/DualCtaBand";
import { ListingCard } from "@/components/listing/ListingCard";
import { FlagshipCaseStudy } from "@/components/listing/FlagshipCaseStudy";
import { SpecSearchConsole } from "@/components/listing/SpecSearchConsole";
import { SearchResultsWorkspace } from "@/components/listing/SearchResultsWorkspace";
import { getProperties } from "@/lib/api";
import { campaignPhotos, pickFlagship } from "@/lib/campaignPhoto";

export async function SearchPage({
  side,
  filters,
}: {
  side: TransactionSide;
  filters: SpecFilters;
}) {
  const merged: SpecFilters = { ...filters, side };
  const results = filterProperties(await getProperties(merged), merged);
  const available = results.filter((p) => p.status !== "sold" && p.status !== "leased");
  const evidence = results.filter((p) => p.status === "sold" || p.status === "leased");
  const page = side === "lease" ? "lease" : "buy";
  const flagship = pickFlagship(evidence);
  const rest = evidence.filter((p) => p.id !== flagship?.id);
  const bleed = campaignPhotos(available.length ? available : results, 1)[0];

  return (
    <div>
      <section className="relative flex min-h-[70vh] flex-col justify-end overflow-hidden bg-oxblood text-paper lg:min-h-[82vh]">
        <HeroBleed alt={bleed?.alt ?? ""} src={bleed?.src} />
        <Container className="relative z-10 pb-16 pt-28 md:pb-24 md:pt-40">
          <p className="t-caption text-tan">
            {side === "lease" ? "Leasing" : "Sales"} · Melbourne west
          </p>
          <h1 className="t-h1 mt-5 max-w-3xl text-paper">
            {side === "lease" ? "Buildings for lease." : "Buildings for sale."}
          </h1>
          <p className="t-body-lg mt-6 max-w-2xl text-pretty text-paper/90">
            Floor, span, door, power, yard. Click a pin for the card. If it does not clear the spec, it
            is not on this grid.
          </p>
        </Container>
      </section>

      <Container className="space-y-8 py-14 md:py-20">
        <SpecSearchConsole initial={merged} variant="page" />
        <SearchResultsWorkspace properties={available} side={side} />
      </Container>

      {evidence.length && flagship ? (
        <section id="evidence" className="scroll-mt-24 bg-paper">
          <Container className="pb-8 pt-6 md:pb-10">
            <p className="t-caption text-oxblood">Evidence</p>
            <h2 className="t-h2 mt-5 text-ink">
              {side === "lease" ? "Recently leased" : "Recently sold"}
            </h2>
          </Container>
          <FlagshipCaseStudy property={flagship} />
          {rest.length ? (
            <Container className="py-10 md:py-14">
              <div className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((p) => (
                  <ListingCard key={p.id} property={p} />
                ))}
              </div>
            </Container>
          ) : null}
        </section>
      ) : null}

      <DualCtaBand
        page={page}
        kicker="Quiet grid?"
        title="WhatsApp the desk. Half the west never hits a portal."
        lede="Or look at recent evidence first."
        primaryHref={AGENCY.whatsappHref}
        primaryLabel={`WhatsApp ${AGENCY.whatsapp}`}
        primaryId={`cta-${page}-band-wa`}
        secondaryHref={evidence.length ? "#evidence" : "/sell"}
        secondaryLabel={evidence.length ? "See evidence" : "Request an appraisal"}
        secondaryId={`cta-${page}-band-secondary`}
      />
    </div>
  );
}
