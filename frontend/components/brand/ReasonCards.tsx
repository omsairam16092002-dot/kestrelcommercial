import type { ComponentType, ReactNode } from "react";
import { Container } from "@/components/brand/Container";
import { IconBadge, IconCompass, IconTrending } from "@/components/icons";

export type ReasonIcon = ComponentType<{ className?: string; strokeWidth?: number }>;

export type Reason = {
  n: string;
  t: string;
  d: string;
  Icon?: ReasonIcon;
  /** Replaces the decorative icon square — e.g. tappable Call / WA / Text cluster. */
  media?: ReactNode;
};

export const KESTREL_REASONS: Reason[] = [
  {
    n: "01",
    t: "700+ transactions",
    d: "The track record is already on the board — industrial, commercial and off-the-plan, priced against real west-side paper.",
    Icon: IconTrending,
  },
  {
    n: "02",
    t: "15 years on this side of the river",
    d: "Melbourne west first. Corridor knowledge, not a CBD index dressed up as local advice.",
    Icon: IconCompass,
  },
  {
    n: "03",
    t: "Spec-first, not suburb-first",
    d: "Span, power, door height, hardstand. The building has to work for the business inside it.",
    Icon: IconBadge,
  },
];

export function ReasonCards({
  kicker = "Why appoint Kestrel",
  title = "Evidence. Corridor. Spec.",
  reasons = KESTREL_REASONS,
  tone = "paper",
}: {
  kicker?: string;
  title?: ReactNode;
  reasons?: readonly Reason[];
  tone?: "paper" | "ink";
}) {
  const ink = tone === "ink";
  return (
    <section className={ink ? "bg-ink text-paper" : "bg-paper text-ink"}>
      <Container className="py-14 md:py-20">
        <p className={`t-caption ${ink ? "text-tan" : "text-oxblood"}`}>{kicker}</p>
        <h2 className={`t-h2 mt-5 ${ink ? "text-paper" : "text-ink"}`}>{title}</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {reasons.map((item) => {
            const Icon = item.Icon;
            return (
              <article
                key={item.n}
                className={`border-t-2 pt-5 ${ink ? "border-tan bg-ink" : "border-oxblood bg-paper"}`}
              >
                {item.media ? (
                  <div className="min-h-9">{item.media}</div>
                ) : Icon ? (
                  <span className="inline-flex h-9 w-9 items-center justify-center bg-oxblood text-tan">
                    <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </span>
                ) : (
                  <span className="inline-flex h-9 w-9 items-center justify-center bg-oxblood t-mono text-[12px] text-tan">
                    {item.n}
                  </span>
                )}
                <h3 className={`t-h3 mt-4 ${ink ? "text-paper" : "text-ink"}`}>{item.t}</h3>
                <p className={`t-body mt-2 ${ink ? "text-paper/80" : "text-ink/80"}`}>{item.d}</p>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
