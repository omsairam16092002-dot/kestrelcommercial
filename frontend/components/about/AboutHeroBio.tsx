import {
  ABOUT_BIO_PARAGRAPHS,
  ABOUT_CLOSING_LINE,
  ABOUT_PHILOSOPHY,
  ABOUT_POST_PHILOSOPHY,
  ABOUT_SELECTED_EXPERIENCE,
  ABOUT_SELECTED_EXPERIENCE_LABEL,
  AGENCY,
  SOCIAL,
  type Agent,
} from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { DuotoneImage } from "@/components/brand/DuotoneImage";
import { IconFacebook, IconInstagram, IconLinkedIn, IconMail } from "@/components/icons";
import { ContactDeskSummary } from "@/components/ui/PhoneActionButtons";
import { agentPortraitSrc, agentPortraitSrcSet } from "@/lib/images";

export function AboutHeroBio({ agent, portrait }: { agent: Agent; portrait: string }) {
  const portraitSet = agentPortraitSrcSet(agent.photoPublicId);

  return (
    <section className="relative overflow-hidden bg-oxblood text-paper">
      <div className="section-header-grid pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-tan/25 to-transparent"
        aria-hidden
      />
      <Container className="relative z-10 py-16 md:py-20 lg:py-24">
        <div className="grid items-stretch gap-8 lg:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)] lg:gap-14">
          <div className="relative isolate aspect-[4/5] overflow-hidden bg-oxblood sm:aspect-[5/6] lg:aspect-auto lg:min-h-[520px]">
            <DuotoneImage
              key={portrait}
              src={portrait}
              srcSet={portraitSet}
              alt={`${agent.name}, Director of Kestrel Commercial`}
              sizes="(min-width: 1024px) 34vw, 100vw"
              objectPosition="top"
              priority
              tone="portrait"
            />
          </div>
          <div className="flex min-h-0 flex-col justify-center">
            <p className="t-caption text-tan">About us</p>
            <h1 className="t-h1 mt-5 max-w-3xl">{agent.name}</h1>
            <p className="t-mono mt-3 text-tan">
              {agent.title} · License {agent.licenceNumber}
            </p>
            <div className="t-body mt-8 max-w-3xl space-y-4 text-pretty text-paper/90">
              {ABOUT_BIO_PARAGRAPHS.map((para) => (
                <p key={para.slice(0, 48)}>{para}</p>
              ))}
              <p>
                His philosophy is simple:{" "}
                <strong className="font-semibold text-paper">{ABOUT_PHILOSOPHY}</strong>
              </p>
              <p>{ABOUT_POST_PHILOSOPHY}</p>
              <div>
                <p className="font-semibold text-paper">{ABOUT_SELECTED_EXPERIENCE_LABEL}</p>
                <p className="mt-2 text-paper/85">{ABOUT_SELECTED_EXPERIENCE.join(" · ")}</p>
              </div>
              <p className="font-serif italic text-paper/90">{ABOUT_CLOSING_LINE}</p>
            </div>
            <ContactDeskSummary page="about" tone="light" className="mt-8" />
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-tan">
              <a
                href={`mailto:${AGENCY.email}`}
                className="inline-flex items-center gap-1.5 font-semibold hover:text-paper"
              >
                <IconMail className="h-4 w-4" />
                Email
              </a>
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
  );
}
