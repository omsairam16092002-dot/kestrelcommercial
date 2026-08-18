import { YARD_STOCK } from "@/lib/images";

const PLACES = [
  "Truganina",
  "Laverton North",
  "Derrimut",
  "Sunshine West",
  "Keilor East",
  "Altona North",
  "West Footscray",
  "Point Cook",
  "Brooklyn",
  "Hoppers Crossing",
  "Laverton",
  "Tottenham",
];

export function CorridorMarquee() {
  const items = [...PLACES, ...PLACES];

  return (
    <div className="relative overflow-hidden bg-oxblood">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={YARD_STOCK}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover object-center saturate-[0.55] contrast-[1.08]"
      />
      <div className="absolute inset-0 bg-oxblood/55" />
      <div
        className="relative overflow-hidden py-8 sm:py-10"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, #000 3rem, #000 calc(100% - 3rem), transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, #000 3rem, #000 calc(100% - 3rem), transparent)",
        }}
      >
        <p className="t-caption mb-3 px-5 text-tan sm:px-8">Melbourne west corridor</p>
        <p className="marquee whitespace-nowrap t-mono text-[12px] uppercase tracking-[0.22em] text-paper" aria-hidden>
          {items.map((place, i) => (
            <span key={`${place}-${i}`} className="inline-block px-4">
              {place}
              <span className="px-4 text-tan/70">·</span>
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
