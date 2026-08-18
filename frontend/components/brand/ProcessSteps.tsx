import { Container } from "@/components/brand/Container";

export function ProcessSteps({
  kicker,
  title,
  steps,
}: {
  kicker: string;
  title: string;
  steps: string[];
}) {
  return (
    <section className="bg-ink text-paper">
      <Container className="py-16 md:py-24">
        <p className="t-caption text-tan">{kicker}</p>
        <h2 className="t-h2 mt-3 max-w-2xl text-paper">{title}</h2>
        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          {steps.map((item, i) => (
            <li key={item} className="border-t border-tan/35 pt-6">
              <span className="t-mono text-tan">{String(i + 1).padStart(2, "0")}</span>
              <p className="t-body mt-4 text-paper/85">{item}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
