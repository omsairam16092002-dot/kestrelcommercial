import type { AssetCategory, SpecFilters, TransactionSide } from "@kestrel/shared";
import { AGENCY, ASSET_CATEGORY_LABELS, filterProperties } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { HeroBleed } from "@/components/brand/HeroBleed";
import { DualCtaBand } from "@/components/brand/DualCtaBand";
import { ListingCard } from "@/components/listing/ListingCard";
import { FlagshipCaseStudy } from "@/components/listing/FlagshipCaseStudy";
import { SpecSearchConsole } from "@/components/listing/SpecSearchConsole";
import { SearchResultsWorkspace } from "@/components/listing/SearchResultsWorkspace";
import { getProperties } from "@/lib/api";
import { campaignPhotos, compactEvidence, pickFlagship } from "@/lib/campaignPhoto";

export async function SearchPage({
  side,
  filters,
  assetCategory = "commercial",
  pageKey,
  heroKicker,
  heroTitle,
  heroDescription,
  evidenceTitle,
  emptyTitle,
  emptyBody,
  resetHref,
}: {
  side: TransactionSide;
  filters: SpecFilters;
  assetCategory?: AssetCategory;
  pageKey?: string;
  heroKicker?: string;
  heroTitle?: string;
  heroDescription?: string;
  evidenceTitle?: string;
  emptyTitle?: string;
  emptyBody?: string;
  resetHref?: string;
}) {
  const category = ASSET_CATEGORY_LABELS[assetCategory];
  const merged: SpecFilters = { ...filters, side, assetCategory };
  const results = filterProperties(await getProperties(merged), merged);
  const available = results.filter((p) => p.status !== "sold" && p.status !== "leased");
  const evidence = compactEvidence(results.filter((p) => p.status === "sold" || p.status === "leased"));
  const page = pageKey ?? (side === "lease" ? "lease" : "buy");
  const flagship = pickFlagship(evidence);
  const rest = evidence.filter((p) => p.id !== flagship?.id);
  const bleed = campaignPhotos(available.length ? available : results, 1)[0];

  return (
    <div>
      <section className="relative flex min-h-[76vh] flex-col justify-end overflow-hidden bg-oxblood text-paper lg:min-h-[88vh]">
        <HeroBleed alt={bleed?.alt ?? ""} src={bleed?.src} />
        <Container className="relative z-10 pb-16 pt-28 md:pb-24 md:pt-40">
          <p className="t-caption text-tan">
            {heroKicker ?? `${category.short} · ${side === "lease" ? "Leasing" : "Sales"}`}
          </p>
          <h1 className="t-h1 mt-5 max-w-3xl text-paper">
            {heroTitle ?? (side === "lease" ? `${category.short} for lease.` : `${category.short} for sale.`)}
          </h1>
          <p className="t-body-lg mt-6 max-w-2xl text-pretty text-paper/90">
            {heroDescription ??
              (assetCategory === "commercial"
                ? "Floor, span, door, power, yard. Click a pin for the card. If it does not clear the spec, it is not on this grid."
                : assetCategory === "residential"
                  ? "Beds, baths, cars, land and price. Use the map and list together to narrow the right home or investment."
                  : "Land area, zoning, permit status and price. Development stock stays separate from operational buildings for a reason.")}
          </p>
        </Container>
      </section>

      <Container className="space-y-8 py-14 md:py-20">
        <SpecSearchConsole initial={merged} variant="page" assetCategory={assetCategory} />
        <SearchResultsWorkspace properties={available} side={side} />
      </Container>

      {evidence.length && flagship ? (
        <section id="evidence" className="scroll-mt-24 bg-paper">
          <Container className="pb-8 pt-6 md:pb-10">
            <p className="t-caption text-oxblood">Evidence</p>
            <h2 className="t-h2 mt-5 text-ink">
              {evidenceTitle ?? (side === "lease" ? "Recently leased" : "Recently sold")}
            </h2>
          </Container>
          <FlagshipCaseStudy property={flagship} imageMode="varied" />
          {rest.length ? (
            <Container className="py-10 md:py-14">
              <div className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((p) => (
                  <ListingCard key={p.id} property={p} imageMode="varied" />
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
