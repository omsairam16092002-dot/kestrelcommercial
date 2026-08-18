import { HERO_SRCSET, HERO_STOCK } from "@/lib/images";

/** Native img for LCP — no /_next/image hop. Prefer a real campaign `src` when the page has one. */
export function HeroBleed({
  alt,
  className = "",
  src,
  srcSet,
}: {
  alt: string;
  className?: string;
  src?: string;
  srcSet?: string;
}) {
  const image = src || HERO_STOCK;
  return (
    <div
      className={`absolute inset-0 overflow-hidden bg-oxblood ${className}`}
      aria-hidden={alt ? undefined : true}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        srcSet={src ? undefined : srcSet || HERO_SRCSET}
        sizes="100vw"
        alt={alt}
        width={1920}
        height={1280}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full scale-[1.015] object-cover object-center saturate-[0.96] contrast-[1.04] brightness-[0.97]"
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,rgba(42,20,24,0.72),rgba(42,20,24,0.18)_42%,rgba(42,20,24,0.68))]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-oxblood/88 via-oxblood/22 to-oxblood/10" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/25 to-transparent" />
    </div>
  );
}
