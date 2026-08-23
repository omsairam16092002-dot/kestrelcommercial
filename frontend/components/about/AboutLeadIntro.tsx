import { ABOUT_LEAD_STATEMENT, type Agent } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { DuotoneImage } from "@/components/brand/DuotoneImage";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";

export function AboutLeadIntro({ agent, portrait }: { agent: Agent; portrait: string }) {
  return (
    <section className="relative overflow-hidden bg-oxblood text-paper">
      <div className="section-header-grid pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-tan/25 to-transparent"
        aria-hidden
      />
      <Container className="relative z-10 py-16 md:py-20 lg:py-24">
        <div className="grid items-stretch gap-8 lg:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)] lg:gap-14">
          <div className="relative isolate aspect-[4/5] overflow-hidden bg-oxblood sm:aspect-[5/6] lg:aspect-auto lg:min-h-[480px]">
            <DuotoneImage
              key={portrait}
              src={portrait}
              alt={`${agent.name}, Director of Kestrel Commercial`}
              sizes="(min-width: 1024px) 38vw, 100vw"
              objectPosition="top"
              fallbackSrc=""
              tone="portrait"
            />
          </div>
          <div className="flex min-h-0 flex-col justify-center">
            <p className="t-caption text-tan">About us</p>
            <h1 className="t-h1 mt-5 max-w-3xl">{agent.name}</h1>
            <p className="t-mono mt-3 text-tan">
              {agent.title} · Licence {agent.licenceNumber}
            </p>
            <p className="t-body-lg mt-6 max-w-xl text-pretty text-paper/90">{ABOUT_LEAD_STATEMENT}</p>
            <div className="mt-10">
              <WhatsAppButton
                page="about"
                className="btn-sharp inline-flex items-center justify-center gap-2 bg-tan text-ink hover:bg-paper"
                label={`WhatsApp ${agent.phone}`}
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
