import {
  ABOUT_WHY_CARDS,
  ABOUT_WHY_CLOSING,
  ABOUT_WHY_HEADING,
  ABOUT_WHY_INTRO,
  ABOUT_WHY_SUBHEADING,
} from "@kestrel/shared";
import { Container } from "@/components/brand/Container";

export function AboutWhyChoose() {
  return (
    <section className="bg-paper text-ink">
      <Container className="section-pad">
        <p className="t-caption text-oxblood">Why we&apos;re the choice</p>
        <h2 className="t-h2 mt-5 max-w-3xl text-ink">{ABOUT_WHY_HEADING}</h2>
        <p className="t-h3 mt-4 text-oxblood">{ABOUT_WHY_SUBHEADING}</p>
        <p className="t-body mt-6 max-w-3xl text-pretty text-ink/80">{ABOUT_WHY_INTRO}</p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {ABOUT_WHY_CARDS.map((card) => (
            <article key={card.title} className="border-t-2 border-oxblood bg-paper pt-5">
              <h3 className="t-h3 text-ink">{card.title}</h3>
              <p className="t-body mt-3 text-ink/80">{card.description}</p>
            </article>
          ))}
        </div>
        <p className="t-body mt-10 font-serif italic text-ink/85">{ABOUT_WHY_CLOSING}</p>
      </Container>
    </section>
  );
}
