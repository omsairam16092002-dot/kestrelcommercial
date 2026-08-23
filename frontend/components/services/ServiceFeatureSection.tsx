import type { ServiceFeatureCopy } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";

export function ServiceFeatureSection({ service, index }: { service: ServiceFeatureCopy; index: number }) {
  const altBg = index % 2 === 1;

  return (
    <section className={altBg ? "bg-ink text-paper" : "bg-paper text-ink"}>
      <Container className="section-pad">
        <p className={`t-caption ${altBg ? "text-tan" : "text-oxblood"}`}>{service.title}</p>
        <h2 className={`t-h2 mt-5 ${altBg ? "text-paper" : "text-ink"}`}>{service.tagline}</h2>
        {service.intro ? (
          <p className={`t-body mt-6 max-w-3xl text-pretty ${altBg ? "text-paper/85" : "text-ink/80"}`}>
            {service.intro}
          </p>
        ) : null}
        <ul className={`t-body mt-8 max-w-3xl space-y-5 ${altBg ? "text-paper/90" : "text-ink/85"}`}>
          {service.bullets.map((bullet) => (
            <li key={bullet.title} className={`border-l-2 pl-4 ${altBg ? "border-tan" : "border-oxblood"}`}>
              <p className={`font-semibold ${altBg ? "text-paper" : "text-ink"}`}>{bullet.title}</p>
              <p className={`mt-1 ${altBg ? "text-paper/80" : "text-ink/75"}`}>{bullet.description}</p>
            </li>
          ))}
        </ul>
        {service.standaloneParagraph ? (
          <p className={`t-body mt-8 max-w-3xl text-pretty ${altBg ? "text-paper/85" : "text-ink/80"}`}>
            {service.standaloneParagraph}
          </p>
        ) : null}
        {service.closingLine ? (
          <p className={`t-body mt-8 max-w-3xl font-serif italic ${altBg ? "text-paper/90" : "text-ink/85"}`}>
            {service.closingLine}
          </p>
        ) : null}
      </Container>
    </section>
  );
}
