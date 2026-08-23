import { AGENCY, isAvailableStatus } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { HeroVideo } from "@/components/brand/HeroVideo";
import { SpecSearchConsole } from "@/components/listing/SpecSearchConsole";
import { ListingCard } from "@/components/listing/ListingCard";
import { Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";
import { CtaLink } from "@/components/ui/CtaLink";
import { ContactDeskLine } from "@/components/ui/PhoneActionButtons";
import { getFeaturedProperties, getProperties } from "@/lib/api";
import { campaignPhotos, corridorProof, hasCompleteCommercialShowcaseSpecs, pickFlagship } from "@/lib/campaignPhoto";
import { FlagshipCaseStudy } from "@/components/listing/FlagshipCaseStudy";

export const revalidate = 60;

export const metadata = {
  title: "Industrial property, Melbourne west",
  description:
    "Search by spec, not by suburb. Industrial and commercial sales, leasing and management across Melbourne's west and north-west.",
  alternates: { canonical: "/" },
};

const STATS = [
  { n: 700, suffix: "+", l: "Property transactions", decimals: 0 },
  { n: 15, suffix: "+", l: "Years in Australian property", decimals: 0 },
];

export default async function HomePage() {
  const commercial = await getProperties({ assetCategory: "commercial" });
  const featured = (await getFeaturedProperties()).filter(
    (p) => isAvailableStatus(p.status) && p.assetCategory === "commercial" && hasCompleteCommercialShowcaseSpecs(p),
  );
  const availableCommercial = commercial.filter(
    (p) => isAvailableStatus(p.status) && p.assetCategory === "commercial",
  );
  const completeAvailable = availableCommercial.filter(hasCompleteCommercialShowcaseSpecs);
  const marketPool = featured.length ? featured : completeAvailable.length ? completeAvailable : availableCommercial;
  const market = marketPool.slice(0, 3);
  const evidence = commercial.filter(
    (p) => p.status === "sold" || p.status === "leased",
  );
  const flagship = pickFlagship(evidence);
  const proof = corridorProof(evidence);
  const heroBleed = campaignPhotos(marketPool.length ? marketPool : completeAvailable, 1)[0];

  return (
    <>
      {/* 1 — Hero */}
      <section className="relative overflow-hidden bg-oxblood text-paper">
        <HeroVideo alt="Drone footage over Footscray, Melbourne west" posterSrc={heroBleed?.src} />
        <Container className="relative z-10 flex min-h-[100svh] flex-col justify-end pb-20 pt-28 sm:pb-24 md:pb-28">
          <p className="hero-enter text-base font-medium uppercase tracking-[0.14em] text-tan sm:text-lg md:text-xl">
            Kestrel Commercial · Melbourne west
          </p>
          <h1 className="hero-enter t-display mt-4 max-w-4xl uppercase tracking-[-0.02em] text-paper sm:mt-5">
            Buildings that{" "}
            <em className="font-serif font-normal italic normal-case tracking-normal text-tan">work</em>{" "}
            for the business inside them
          </h1>
          <p className="hero-enter-delay mt-5 max-w-xl text-base leading-relaxed text-paper/90 sm:mt-6 sm:text-lg">
            Industrial and commercial assets across Melbourne’s west — sales, leasing and management,
            priced properly the first time.
          </p>
          <div className="hero-enter-delay mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
            <CtaLink
              href="/buy"
              id="cta-home-hero-listings"
              page="home"
              className="btn-sharp bg-tan px-7 py-3.5 text-ink hover:bg-paper"
            >
              View listings
            </CtaLink>
            <CtaLink
              href="/sell"
              id="cta-home-hero-appraisal"
              page="home"
              className="btn-sharp border border-tan/70 bg-transparent px-6 py-3.5 text-tan hover:bg-tan hover:text-ink"
            >
              Request appraisal
            </CtaLink>
            <ContactDeskLine page="home-hero" className="hero-enter-delay mt-5 t-body text-paper/75" />
          </div>
        </Container>
      </section>

      {/* 2 — Stats bar */}
      <section className="border-t border-paper/10 bg-oxblood text-paper">
        <Container className="py-10 md:py-12">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-paper/15">
            {STATS.map((stat, i) => (
              <Reveal key={stat.l} delay={i * 40} className="lg:px-8 first:lg:pl-0 last:lg:pr-0">
                <p className="t-mono-lg text-paper">
                  <CountUp value={stat.n} suffix={stat.suffix} decimals={stat.decimals} />
                </p>
                <p className="mt-2 text-sm text-paper/75">{stat.l}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* 3 — Named result, full-bleed */}
      {flagship ? (
        <section className="bg-paper">
          <Container className="pb-8 pt-16 md:pb-10 md:pt-24">
            <p className="t-caption text-oxblood">Evidence</p>
            <h2 className="t-h2 mt-5 text-ink">A named result, not a brochure statistic</h2>
            <p className="t-body mt-5 max-w-2xl text-pretty text-ink/80">{proof}</p>
          </Container>
          <FlagshipCaseStudy property={flagship} priority />
        </section>
      ) : null}

      {/* 4 — On the market now */}
      <section className="bg-paper">
        <Container className="section-pad">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow-rule t-caption text-oxblood">Stock</p>
              <h2 className="t-h2 mt-5 text-ink">On the market now</h2>
            </div>
            <CtaLink href="/buy" id="cta-home-market-all" page="home" className="text-sm font-semibold text-oxblood hover:underline">
              All listings →
            </CtaLink>
          </div>
          {market.length ? (
            <div className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {market.map((p, i) => (
                <ListingCard key={p.id} property={p} priority={i === 0} />
              ))}
            </div>
          ) : (
            <div className="border-t-2 border-oxblood bg-white/50 px-6 py-12 md:px-10">
              <p className="t-h3 text-ink">No live listings on the public grid</p>
              <p className="t-body mt-3 max-w-xl text-ink/75">
                Off-market and quietly marketed stock still moves through this desk. Call, WA or text{" "}
                <a href={AGENCY.phoneHref} className="font-semibold text-oxblood hover:underline">
                  {AGENCY.phone}
                </a>{" "}
                and we will tell you what is real.
              </p>
            </div>
          )}
        </Container>
      </section>

      {/* 5 — Spec search */}
      <section className="border-y border-oxblood/10 bg-white/50">
        <Container className="section-pad">
          <p className="eyebrow-rule t-caption text-oxblood">Find stock</p>
          <h2 className="t-h2 mt-5 text-ink">Search by spec, not by suburb</h2>
          <p className="t-body mt-5 max-w-2xl text-pretty text-ink/80">
            Floor area, clear span, door height, power and yard — the filters industrial buyers actually use.
          </p>
          <div className="mt-8">
            <SpecSearchConsole assetCategory="commercial" />
          </div>
        </Container>
      </section>
    </>
  );
}
