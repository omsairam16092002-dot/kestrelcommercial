import { Container } from "@/components/brand/Container";
import { DuotoneImage } from "@/components/brand/DuotoneImage";

const PHASES = [
  {
    n: "01",
    t: "Appraisal & method",
    d: "Market appraisal, then private treaty or EOI — the method that suits the asset, not a Saturday open.",
  },
  {
    n: "02",
    t: "Campaign",
    d: "Off-market when the buyer pool is known, or a full campaign. Buyer qualification before the offer.",
  },
  {
    n: "03",
    t: "Close",
    d: "Negotiation through to settlement. The desk stays on the file until the keys change hands.",
  },
];

export function SalePhases({ photo }: { photo?: { src: string; alt: string } }) {
  return (
    <section className="bg-ink text-paper">
      <Container className="grid items-center gap-10 py-16 md:grid-cols-12 md:py-24 lg:min-h-[80vh] lg:gap-16">
        <div className="md:col-span-5">
          <p className="t-caption text-tan">How a sale runs here</p>
          <h2 className="t-h2 mt-5">Three phases. No theatre.</h2>
          <ol className="mt-12 space-y-8">
            {PHASES.map((phase) => (
              <li key={phase.n} className="border-t border-tan/25 pt-5">
                <p className="t-mono text-[12px] text-tan">{phase.n}</p>
                <h3 className="t-h3 mt-2 text-paper">{phase.t}</h3>
                <p className="t-body mt-2 text-pretty text-paper/80">{phase.d}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="relative min-h-[46vh] overflow-hidden bg-oxblood md:col-span-7 lg:min-h-[70vh]">
          {photo ? (
            <DuotoneImage src={photo.src} alt={photo.alt} sizes="(min-width: 1024px) 55vw, 100vw" tone="photo" />
          ) : (
            <div className="absolute inset-0 bg-oxblood" />
          )}
        </div>
      </Container>
    </section>
  );
}
