import { HERO_SRCSET, HERO_STOCK } from "@/lib/images";

export const HERO_VIDEO_SRC = "/assets/hero/footscray-drone.mp4";

/** Full-bleed muted loop for the homepage hero. Still image is the fallback. */
export function HeroVideo({ alt }: { alt: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-oxblood">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HERO_STOCK}
        srcSet={HERO_SRCSET}
        sizes="100vw"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full scale-[1.02] object-cover object-center saturate-[0.92] contrast-[1.04] brightness-[0.98]"
      />
      <video
        className="hero-video absolute inset-0 h-full w-full object-cover object-center saturate-[0.92] contrast-[1.04] brightness-[0.98]"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={HERO_STOCK}
        aria-label={alt}
      >
        <source src={HERO_VIDEO_SRC} type="video/mp4" />
      </video>
      <div className="pointer-events-none absolute inset-0 bg-oxblood/15 mix-blend-multiply" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-oxblood/80 via-oxblood/10 to-oxblood/15" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-oxblood to-transparent" />
    </div>
  );
}
