import type { Metadata } from "next";
import { AGENCY, AGENTS, SOCIAL, type Agent } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { AboutLeadIntro } from "@/components/about/AboutLeadIntro";
import { ReasonCards } from "@/components/brand/ReasonCards";
import { DualCtaBand } from "@/components/brand/DualCtaBand";
import { IconFacebook, IconInstagram, IconLinkedIn } from "@/components/icons";
import { getAgents } from "@/lib/api";
import { agentPortraitSrc } from "@/lib/images";

export const metadata: Metadata = {
  title: "About",
  description:
    "Jignesh Jhanjaria, Director of Kestrel Commercial — 15+ years and 700+ transactions across industrial, commercial, residential and development property.",
};

export const revalidate = 60;

function bioParagraphs(bio?: string | null) {
  return (
    bio
      ?.split(/\.\s+(?=[A-Z])/)
      .map((para) => para.replace(/\.$/, "") + ".")
      .filter(Boolean) ?? []
  );
}

function AboutFullStory({ agent }: { agent: Agent }) {
  return (
    <section className="bg-ink text-paper">
      <Container className="section-pad">
        <p className="eyebrow-rule t-mono text-tan">Licence {agent.licenceNumber}</p>
        <div className="t-body mt-8 max-w-3xl space-y-4 text-pretty text-paper/80">
          {bioParagraphs(agent.bio).map((para) => (
            <p key={para.slice(0, 48)}>{para}</p>
          ))}
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
      </Container>
    </section>
  );
}

export default async function AboutPage() {
  const agent = (await getAgents())[0] ?? AGENTS[0];
  const portrait = agentPortraitSrc(agent.photoPublicId, 1400);

  return (
    <div className="bg-paper">
      <AboutLeadIntro agent={agent} portrait={portrait} />
      <ReasonCards />
      <AboutFullStory agent={agent} />
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
