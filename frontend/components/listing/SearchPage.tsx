import type { AssetCategory, Property, SpecFilters, TransactionSide } from "@kestrel/shared";
import {
  ASSET_CATEGORY_LABELS,
  COMMERCIAL_TYPE_OPTIONS,
  HOUSE_LAND_SECTION,
  filterProperties,
  specFiltersToSearchParams,
} from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { HeroBleed } from "@/components/brand/HeroBleed";
import { DualCtaBand } from "@/components/brand/DualCtaBand";
import { EmptyState, type EmptyStateAlternate } from "@/components/listing/EmptyState";
import { ListingCard } from "@/components/listing/ListingCard";
import { FlagshipCaseStudy } from "@/components/listing/FlagshipCaseStudy";
import { SpecSearchConsole } from "@/components/listing/SpecSearchConsole";
import { SearchResultsWorkspace } from "@/components/listing/SearchResultsWorkspace";
import { getProperties } from "@/lib/api";
import { campaignPhotos, compactEvidence, pickFlagship } from "@/lib/campaignPhoto";

function isAvailable(p: Property) {
  return p.status !== "sold" && p.status !== "leased";
}

async function countAvailable(filters: SpecFilters) {
  return filterProperties(await getProperties(filters), filters).filter(isAvailable).length;
}

const EMPTY_COPY: Record<AssetCategory | "house-land", { title: string; body: string }> = {
  commercial: {
    title: "Widen the span. Or call the desk.",
    body: "Nothing on the grid clears that combination of floor, span, zone and price. Most occupiers over-specify height — drop the span first.",
  },
  residential: {
    title: "Nothing matches that brief yet.",
    body: "Try fewer bedrooms, a smaller block or a higher price. Or call the desk — plenty of homes sell before they reach a portal.",
  },
  "development-site": {
    title: "No sites clear that brief.",
    body: "Drop the land size or zoning filter. Or call the desk — most development sites trade off-market.",
  },
  "house-land": {
    title: "No packages match that search.",
    body: "Try fewer filters or a higher price. Or call the desk — new releases often go before they reach a portal.",
  },
};

/**
 * The nearest search that has stock: every package when a buyer-type filter is empty,
 * otherwise the same spec on the other side (e.g. retail shops are often lease-only).
 */
async function findAlternate(
  merged: SpecFilters,
  side: TransactionSide,
  basePath: string,
  houseLand: boolean,
): Promise<EmptyStateAlternate | null> {
  if (houseLand) {
    if (!merged.packageSegment) return null;
    const count = await countAvailable({ ...merged, packageSegment: undefined });
    return count ? { href: HOUSE_LAND_SECTION.path, label: `See all ${count} house & land packages` } : null;
  }
  if (merged.assetCategory === "development-site") return null;
  const otherSide: TransactionSide = side === "sale" ? "lease" : "sale";
  const count = await countAvailable({ ...merged, side: otherSide, status: undefined });
  if (!count) return null;
  const typeLabel = COMMERCIAL_TYPE_OPTIONS.find((option) => option.value === merged.propertyType)?.label;
  const noun = typeLabel ? typeLabel.toLowerCase() : count === 1 ? "listing" : "listings";
  const qs = specFiltersToSearchParams({ ...merged, side: otherSide, status: undefined, assetCategory: undefined });
  return { href: `${basePath}${qs ? `?${qs}` : ""}`, label: `See ${count} ${noun} for ${otherSide}` };
}

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
  houseLand = false,
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
  houseLand?: boolean;
}) {
  const category = ASSET_CATEGORY_LABELS[assetCategory];
  const merged: SpecFilters = {
    ...filters,
    side,
    assetCategory,
    ...(houseLand ? { houseLandPackage: true } : {}),
  };
  const results = filterProperties(await getProperties(merged), merged);
  const available = results.filter(isAvailable);
  const basePath = resetHref ?? (houseLand ? HOUSE_LAND_SECTION.path : category.path);
  const emptyCopy = EMPTY_COPY[houseLand ? "house-land" : assetCategory];
  const alternate = available.length ? null : await findAlternate(merged, side, basePath, houseLand);
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
        <SpecSearchConsole initial={merged} variant="page" assetCategory={assetCategory} houseLand={houseLand} />
        {available.length ? (
          <SearchResultsWorkspace properties={available} side={side} />
        ) : (
          <EmptyState
            side={side}
            page={page}
            resetHref={basePath}
            title={emptyTitle ?? (houseLand && merged.packageSegment ? "No packages tagged for that buyer yet." : emptyCopy.title)}
            body={
              emptyBody ??
              (houseLand && merged.packageSegment
                ? "We are still matching each package to owner-occupier, investor, co-living and dual-occupancy buyers. Browse every package, or call the desk and we will point you to the right lots."
                : emptyCopy.body)
            }
            alternate={alternate}
          />
        )}
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
        title="Call, WA or text the desk. Half the west never hits a portal."
        lede="Or look at recent evidence first."
        phoneActions
      />
    </div>
  );
}
