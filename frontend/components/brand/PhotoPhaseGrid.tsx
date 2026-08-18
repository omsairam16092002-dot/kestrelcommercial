import type { ReactNode } from "react";
import { Container } from "@/components/brand/Container";

export type PhotoPhase = {
  n: string;
  t: string;
  d: string;
  img: string;
  alt: string;
  points?: readonly string[];
};

export function PhotoPhaseGrid({
  kicker,
  title,
  phases,
  columns = 3,
  tone = "ink",
}: {
  kicker: string;
  title: ReactNode;
  phases: readonly PhotoPhase[];
  columns?: 3 | 4;
  tone?: "ink" | "paper";
}) {
  const ink = tone === "ink";
  return (
    <section className={ink ? "bg-ink text-paper" : "bg-paper text-ink"}>
      <Container className="py-14 md:py-20">
        <p className={`t-caption ${ink ? "text-tan" : "text-oxblood"}`}>{kicker}</p>
        <h2 className={`t-h2 mt-5 ${ink ? "text-paper" : "text-ink"}`}>{title}</h2>
        <div className={`mt-10 grid gap-6 ${columns === 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3"}`}>
          {phases.map((phase) => (
            <article key={phase.n} className="overflow-hidden bg-oxblood">
              <div className="relative aspect-[16/10]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={phase.img}
                  alt={phase.alt}
                  className="absolute inset-0 h-full w-full object-cover saturate-[0.94] contrast-[1.03]"
                />
                <div className="pointer-events-none absolute inset-0 bg-oxblood/[0.08] mix-blend-multiply" />
              </div>
              <div className="bg-oxblood px-4 py-2">
                <p className="t-mono text-[12px] tracking-[0.16em] text-tan">{phase.n}</p>
              </div>
              <div className="bg-paper px-5 py-5 text-ink">
                <h3 className="t-h3">{phase.t}</h3>
                <p className="t-body mt-2 text-ink/80">{phase.d}</p>
                {phase.points?.length ? (
                  <ul className="t-body mt-4 space-y-2 text-ink/85">
                    {phase.points.map((point) => (
                      <li key={point} className="pl-3" style={{ borderLeft: "2px solid #5C1F27" }}>
                        {point}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
