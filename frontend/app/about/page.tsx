import type { Metadata } from "next";
import { AGENCY, AGENTS, SOCIAL } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { DuotoneImage } from "@/components/brand/DuotoneImage";
import { ReasonCards } from "@/components/brand/ReasonCards";
import { DualCtaBand } from "@/components/brand/DualCtaBand";
import { IconFacebook, IconInstagram, IconLinkedIn } from "@/components/icons";
import { getAgents, getProperties } from "@/lib/api";
import { agentPortraitSrc } from "@/lib/images";
import { corridorProof } from "@/lib/campaignPhoto";

export const metadata: Metadata = {
  title: "About",
  description:
    "Jignesh Jhanjaria, Director of Kestrel Commercial — 15+ years and 700+ transactions across industrial, commercial, residential and development property.",
};

export const revalidate = 60;

export default async function AboutPage() {
  const agent = (await getAgents())[0] ?? AGENTS[0];
  const portrait = agentPortraitSrc(agent.photoPublicId, 1400);
  const stock = await getProperties();
  const proof = corridorProof(stock);

  return (
    <div className="bg-paper">
      <SectionHeader
        kicker="About us"
        title={agent.name}
        description="Director. Industrial, commercial, residential and development property. Melbourne west first."
        page="about"
      />

      <ReasonCards />

      <section className="bg-ink text-paper">
        <Container className="section-pad">
          <p className="eyebrow-rule t-mono text-tan">Licence {agent.licenceNumber}</p>
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
              <div className="mt-8 flex flex-wrap gap-4 text-sm text-tan">
                <a
                  href={SOCIAL.facebook.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={SOCIAL.facebook.label}
                  className="inline-flex items-center gap-1.5 font-semibold hover:text-paper"
                >
                  <IconFacebook className="h-4 w-4" />
                  Facebook
                </a>
                <a
                  href={SOCIAL.linkedin.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={SOCIAL.linkedin.label}
                  className="inline-flex items-center gap-1.5 font-semibold hover:text-paper"
                >
                  <IconLinkedIn className="h-4 w-4" />
                  LinkedIn
                </a>
                <a
                  href={SOCIAL.instagram.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={SOCIAL.instagram.label}
                  className="inline-flex items-center gap-1.5 font-semibold hover:text-paper"
                >
                  <IconInstagram className="h-4 w-4" />
                  Instagram
                </a>
              </div>
            </div>
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
