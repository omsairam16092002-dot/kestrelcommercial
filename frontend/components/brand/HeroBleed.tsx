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
        className="absolute inset-0 h-full w-full object-cover object-center saturate-[0.94] contrast-[1.03] brightness-[1.02]"
      />
      <div className="pointer-events-none absolute inset-0 bg-oxblood/[0.12] mix-blend-multiply" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-oxblood/70 via-oxblood/15 to-oxblood/20" />
    </div>
  );
}
