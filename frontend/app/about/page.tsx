import type { Metadata } from "next";
import { AGENCY, AGENTS } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { PageHero } from "@/components/brand/PageHero";
import { DuotoneImage } from "@/components/brand/DuotoneImage";
import { ReasonCards } from "@/components/brand/ReasonCards";
import { DualCtaBand } from "@/components/brand/DualCtaBand";
import { IconBuilding, IconFile, IconHome, IconWarehouse } from "@/components/icons";
import { getAgents, getProperties } from "@/lib/api";
import { agentPortraitSrc } from "@/lib/images";
import { campaignPhotos, corridorProof } from "@/lib/campaignPhoto";

export const metadata: Metadata = {
  title: "About",
  description:
    "Jignesh Jhanjaria, Director of Kestrel Commercial — 15+ years and 700+ transactions across industrial, commercial and off-the-plan property.",
};

const ASSET_CLASSES = [
  {
    t: "Commercial",
    d: "Offices, showrooms, retail investments. Covenant first.",
    Icon: IconBuilding,
  },
  {
    t: "Industrial",
    d: "Warehouses, yards, distribution. Span, power, hardstand.",
    Icon: IconWarehouse,
  },
  {
    t: "Residential",
    d: "Houses, apartments, development sites — when the numbers work.",
    Icon: IconHome,
  },
  {
    t: "Off the plan",
    d: "Project marketing and pre-sale. Not a launch party.",
    Icon: IconFile,
  },
];

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AboutPage() {
  const agent = (await getAgents())[0] ?? AGENTS[0];
  const portrait = agentPortraitSrc(agent.photoPublicId, 1400);
  const stock = await getProperties();
  const bleed = campaignPhotos(stock, 1)[0];
  const proof = corridorProof(stock);

  return (
    <div className="bg-paper">
      <PageHero
        kicker="About us"
        title={agent.name}
        description="Director. Industrial, commercial, residential and off-the-plan. Melbourne west first."
        page="about"
        imageSrc={bleed?.src}
        imageAlt={bleed?.alt}
      />

      <ReasonCards />

      <section className="bg-ink text-paper">
        <Container className="py-14 md:py-20">
          <p className="t-mono text-tan">Licence {agent.licenceNumber}</p>
          <div className="mt-8 grid items-stretch gap-8 lg:grid-cols-2 lg:gap-14">
            <div className="relative isolate aspect-[4/5] overflow-hidden bg-oxblood sm:aspect-[5/6] lg:aspect-auto lg:min-h-[520px]">
              <DuotoneImage
                key={portrait}
                src={portrait}
                alt={`${agent.name}, Director of Kestrel Commercial`}
                sizes="(min-width: 1024px) 50vw, 100vw"
                objectPosition="top"
                fallbackSrc=""
                tone="portrait"
              />
            </div>
            <div className="flex min-h-0 flex-col justify-center">
              <p className="t-h2 text-paper">
                Understand the building. Understand the client. Write the strategy that gets it done.
              </p>
              <div className="t-body mt-8 space-y-4 text-pretty text-paper/80">
                {agent.bio
                  ?.split(/\.\s+(?=[A-Z])/)
                  .map((para) => para.replace(/\.$/, "") + ".")
                  .map((para) => (
                    <p key={para.slice(0, 48)}>{para}</p>
                  ))}
                <p>{proof}</p>
              </div>
              <p className="t-caption mt-10 text-tan">Singapore · India · Malaysia · China · Australia</p>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-14 md:py-20">
        <Container>
          <p className="t-caption text-oxblood">Asset classes</p>
          <h2 className="t-h2 mt-5 text-ink">Four lines. One standard.</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ASSET_CLASSES.map((item) => {
              const Icon = item.Icon;
              return (
                <article key={item.t} className="border-t-2 border-oxblood bg-paper pt-5">
                  <span className="inline-flex h-9 w-9 items-center justify-center bg-oxblood text-tan">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h2 className="t-h3 mt-4 text-ink">{item.t}</h2>
                  <p className="t-body mt-2 text-ink/75">{item.d}</p>
                </article>
              );
            })}
          </div>
        </Container>
      </section>

      <DualCtaBand
        page="about"
        title={
          <>
            Talk to the desk. <em className="font-serif font-normal italic text-oxblood">Direct.</em>
          </>
        }
        lede="WhatsApp first. Or write an enquiry."
        primaryHref={AGENCY.whatsappHref}
        primaryLabel={`WhatsApp ${AGENCY.whatsapp}`}
        primaryId="cta-about-band-wa"
        secondaryHref="/contact#enquire"
        secondaryLabel="Send an enquiry"
        secondaryId="cta-about-band-enquire"
      />
    </div>
  );
}
