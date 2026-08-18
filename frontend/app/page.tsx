import { AGENCY, AGENTS, SOCIAL, isAvailableStatus } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { DuotoneImage } from "@/components/brand/DuotoneImage";
import { HeroVideo } from "@/components/brand/HeroVideo";
import { ServicesGrid } from "@/components/brand/ServicesGrid";
import { SpecSearchConsole } from "@/components/listing/SpecSearchConsole";
import { ListingCard } from "@/components/listing/ListingCard";
import { EnquiryForm } from "@/components/forms/EnquiryForm";
import { Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";
import { CtaLink } from "@/components/ui/CtaLink";
import {
  IconClipboard,
  IconClock,
  IconFacebook,
  IconInstagram,
  IconLinkedIn,
  IconMail,
  IconMapPin,
  IconWhatsApp,
} from "@/components/icons";
import { getAgents, getFeaturedProperties, getProperties } from "@/lib/api";
import { agentPortraitSrc } from "@/lib/images";
import { campaignPhotos, corridorProof, hasCompleteCommercialShowcaseSpecs, pickFlagship } from "@/lib/campaignPhoto";
import { FlagshipCaseStudy } from "@/components/listing/FlagshipCaseStudy";

export const revalidate = 60;

const STATS = [
  { n: 700, suffix: "+", l: "Property transactions", decimals: 0 },
  { n: 15, suffix: "+", l: "Years in Australian property", decimals: 0 },
];

const WHY_POINTS = [
  "Spec-first advice — span, power, door and hardstand before suburb talk",
  "Priced against real west-side paper, not a CBD index",
  "One desk from first enquiry through settlement",
];

const TRANSFER_POINTS = [
  "Contract to settlement — who does what, and when",
  "Identity and beneficial ownership before we act (AML / Tranche 2)",
  "How PEXA and trust money sit in a commercial sale",
  "What stalls a deal — and how we keep it moving",
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
  const agent = (await getAgents())[0] ?? AGENTS[0];
  const portrait = agentPortraitSrc(agent.photoPublicId, 1400);

  return (
    <>
      {/* 1 — Hero */}
      <section className="relative overflow-hidden bg-oxblood text-paper">
        <HeroVideo alt="Drone footage over Footscray, Melbourne west" posterSrc={heroBleed?.src} />
        <Container className="relative z-10 flex min-h-[100svh] flex-col justify-end pb-20 pt-28 sm:pb-24 md:pb-28">
          <p className="hero-enter t-caption text-tan">Kestrel Commercial · Melbourne west</p>
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
            <a
              href={AGENCY.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2 text-sm font-semibold text-paper/85 hover:text-tan"
            >
              <IconWhatsApp className="h-4 w-4" />
              WhatsApp
            </a>
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
              {market.map((p) => (
                <ListingCard key={p.id} property={p} />
              ))}
            </div>
          ) : (
            <div className="border-t-2 border-oxblood bg-white/50 px-6 py-12 md:px-10">
              <p className="t-h3 text-ink">No live listings on the public grid</p>
              <p className="t-body mt-3 max-w-xl text-ink/75">
                Off-market and quietly marketed stock still moves through this desk. WhatsApp{" "}
                <a href={AGENCY.whatsappHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-oxblood hover:underline">
                  {AGENCY.whatsapp}
                </a>{" "}
                and we will tell you what is real.
              </p>
            </div>
          )}
        </Container>
      </section>

      {/* 4 — Spec search */}
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

      {/* 5 — Agent */}
      <section className="bg-ink text-paper">
        <Container className="section-pad">
          <div className="grid items-stretch gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
            <div className="relative isolate aspect-[4/5] overflow-hidden bg-oxblood sm:aspect-[5/6] lg:aspect-auto lg:min-h-[520px]">
              <DuotoneImage
                key={portrait}
                src={portrait}
                alt={`${agent.name}, Director of Kestrel Commercial`}
                sizes="(min-width: 1024px) 40vw, 100vw"
                objectPosition="top"
                fallbackSrc=""
                tone="portrait"
              />
            </div>
            <div className="flex min-h-0 flex-col justify-center">
              <p className="eyebrow-rule t-caption text-tan">Listing agent</p>
              <h2 className="t-h1 mt-5 text-paper">{agent.name}</h2>
              <p className="t-mono mt-3 text-tan">
                {agent.title} · Licence {agent.licenceNumber}
              </p>
              <div className="t-body mt-6 max-w-xl space-y-4 text-pretty text-paper/80">
                {agent.bio
                  ?.split(/\.\s+(?=[A-Z])/)
                  .map((para) => para.replace(/\.$/, "") + ".")
                  .slice(0, 3)
                  .map((para) => (
                    <p key={para.slice(0, 48)}>{para}</p>
                  ))}
                <p>{proof}</p>
              </div>
              <div className="mt-6 flex flex-wrap gap-4 text-sm">
                <a
                  href={AGENCY.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-semibold text-tan hover:text-paper"
                >
                  <IconWhatsApp className="h-4 w-4" />
                  WhatsApp
                </a>
                <a
                  href={`mailto:${AGENCY.email}`}
                  className="inline-flex items-center gap-1.5 font-semibold text-tan hover:text-paper"
                >
                  <IconMail className="h-4 w-4" />
                  Email
                </a>
                <CtaLink href="/about" id="cta-home-about" page="home" className="font-semibold text-tan hover:text-paper">
                  Full profile →
                </CtaLink>
                <a
                  href={SOCIAL.facebook.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={SOCIAL.facebook.label}
                  className="inline-flex items-center gap-1.5 font-semibold text-tan hover:text-paper"
                >
                  <IconFacebook className="h-4 w-4" />
                  Facebook
                </a>
                <a
                  href={SOCIAL.linkedin.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={SOCIAL.linkedin.label}
                  className="inline-flex items-center gap-1.5 font-semibold text-tan hover:text-paper"
                >
                  <IconLinkedIn className="h-4 w-4" />
                  LinkedIn
                </a>
                <a
                  href={SOCIAL.instagram.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={SOCIAL.instagram.label}
                  className="inline-flex items-center gap-1.5 font-semibold text-tan hover:text-paper"
                >
                  <IconInstagram className="h-4 w-4" />
                  Instagram
                </a>
              </div>
              <div className="mt-10 grid gap-5 sm:grid-cols-2">
                <div className="border-t border-tan/30 pt-4">
                  <h3 className="flex items-center gap-2 t-h3 text-paper">
                    <IconClipboard className="h-4 w-4 shrink-0 text-tan" />
                    Management
                  </h3>
                  <p className="mt-2 text-sm text-paper/70">
                    Rent, outgoings, reviews and practical reporting an owner can read.
                  </p>
                </div>
                <div className="border-t border-tan/30 pt-4">
                  <h3 className="t-h3 text-paper">Direct advice</h3>
                  <p className="mt-2 text-sm text-paper/70">
                    One desk from appraisal through negotiation and completion, without category mixing on the public site.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* 6 — What we do */}
      <section className="bg-paper">
        <Container className="section-pad">
          <p className="eyebrow-rule t-caption text-oxblood">Services</p>
          <h2 className="t-h2 mt-5 text-ink">What we do</h2>
          <p className="t-body mt-5 max-w-2xl text-ink/80">Sales. Leasing. Management. Advisory.</p>
          <div className="mt-10">
            <ServicesGrid columns={4} />
          </div>
        </Container>
      </section>

      {/* 7 — Two things worth knowing */}
      <section className="bg-paper pb-14 md:pb-20">
        <Container>
          <p className="eyebrow-rule t-caption text-oxblood">Straight talk</p>
          <h2 className="t-h2 mt-5 text-ink">Two things worth knowing</h2>
          <div className="mt-10 grid items-stretch gap-5 md:grid-cols-2">
            <article className="premium-panel-dark flex h-full flex-col px-6 py-8 text-paper md:px-8 md:py-10">
              <h3 className="t-h3 text-paper">Why we are the only choice for a straight deal in the west</h3>
              <p className="t-body mt-4 text-paper/85">
                Occupiers and investors come for corridor knowledge — not a marketing brochure. We price
                the building against what actually trades here, then stay on the file through settlement.
              </p>
              <ul className="t-body mt-6 flex-1 space-y-3 text-paper/85">
                {WHY_POINTS.map((item) => (
                  <li key={item} className="border-l-2 border-tan pl-3">
                    {item}
                  </li>
                ))}
              </ul>
              <CtaLink href="/about" id="cta-home-why" page="home" className="mt-8 text-sm font-semibold text-tan hover:text-paper">
                About the desk →
              </CtaLink>
            </article>
            <article className="premium-panel-dark flex h-full flex-col px-6 py-8 text-paper md:px-8 md:py-10">
              <h3 className="t-h3 text-paper">What the transfer of land process means for your transaction</h3>
              <p className="t-body mt-4 text-paper/85">
                Commercial sales are not residential auctions. Identity, funds and settlement paperwork
                need to be clear early — especially under AML Tranche 2.
              </p>
              <ul className="t-body mt-6 flex-1 space-y-3 text-paper/85">
                {TRANSFER_POINTS.map((item) => (
                  <li key={item} className="border-l-2 border-tan pl-3">
                    {item}
                  </li>
                ))}
              </ul>
              <CtaLink href="/investing" id="cta-home-transfer" page="home" className="mt-8 text-sm font-semibold text-tan hover:text-paper">
                SMSF &amp; AML notes →
              </CtaLink>
            </article>
          </div>
        </Container>
      </section>

      {/* 8 — Talk to us */}
      <section id="enquire" className="border-t border-oxblood/10 bg-paper">
        <Container className="grid gap-10 py-14 md:grid-cols-12 md:py-20">
          <div className="md:col-span-5">
            <p className="t-caption text-oxblood">Contact</p>
            <h2 className="t-h2 mt-5 text-ink">Talk to us</h2>
            <dl className="mt-8 space-y-5">
              <div className="border-t border-oxblood/15 pt-4">
                <dt className="flex items-center gap-2 t-caption text-mauve">
                  <IconWhatsApp className="h-3.5 w-3.5" />
                  Phone / WhatsApp
                </dt>
                <dd className="t-mono mt-1 text-ink">
                  <a href={AGENCY.whatsappHref} target="_blank" rel="noopener noreferrer" className="hover:text-oxblood">
                    {AGENCY.whatsapp}
                  </a>
                </dd>
              </div>
              <div className="border-t border-oxblood/15 pt-4">
                <dt className="flex items-center gap-2 t-caption text-mauve">
                  <IconMail className="h-3.5 w-3.5" />
                  Email
                </dt>
                <dd className="mt-1 text-ink">
                  <a href={`mailto:${AGENCY.email}`} className="hover:text-oxblood">
                    {AGENCY.email}
                  </a>
                </dd>
              </div>
              <div className="border-t border-oxblood/15 pt-4">
                <dt className="flex items-center gap-2 t-caption text-mauve">
                  <IconMapPin className="h-3.5 w-3.5" />
                  Office
                </dt>
                <dd className="mt-1 text-sm text-ink">
                  {AGENCY.addressLine1}
                  <br />
                  {AGENCY.addressLine2}
                </dd>
              </div>
              <div className="border-t border-oxblood/15 pt-4">
                <dt className="flex items-center gap-2 t-caption text-mauve">
                  <IconClock className="h-3.5 w-3.5" />
                  Hours
                </dt>
                <dd className="mt-1 text-sm text-ink">{AGENCY.hours}</dd>
              </div>
            </dl>
          </div>
          <div className="premium-panel border-t-2 border-t-oxblood p-6 text-ink md:col-span-7 md:p-9">
            <h3 className="t-h3 text-ink">Send a message</h3>
            <p className="t-body mt-2 text-ink/70">One business day. Sooner if you WhatsApp.</p>
            <div className="mt-6">
              <EnquiryForm source="contact" defaultTopic="other" submitLabel="Send message" formId="form-home-contact" />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
