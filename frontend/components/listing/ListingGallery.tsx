"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fullAddress, type Property } from "@kestrel/shared";
import { PhotoCut } from "@/components/brand/PhotoCut";
import { listingImageSrc, listingPlaceholderSrc } from "@/lib/images";

export function ListingGallery({ property }: { property: Property }) {
  const images = property.images;
  const [active, setActive] = useState(0);
  const current = images[active];
  const startX = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const address = fullAddress(property);

  const prev = useCallback(() => {
    if (!images.length) return;
    setActive((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const next = useCallback(() => {
    if (!images.length) return;
    setActive((i) => (i + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [prev, next]);

  const src = current?.publicId ? listingImageSrc(current.publicId, 2400) : listingPlaceholderSrc(property, 2400);

  return (
    <div ref={rootRef} tabIndex={0} role="region" aria-label={`Photos of ${address}`}>
      <div
        className="relative h-[min(78svh,920px)] min-h-[22rem] overflow-hidden bg-oxblood touch-pan-y"
        onTouchStart={(e) => {
          startX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (startX.current == null || images.length < 2) return;
          const dx = (e.changedTouches[0]?.clientX ?? startX.current) - startX.current;
          startX.current = null;
          if (dx > 48) prev();
          else if (dx < -48) next();
        }}
      >
        <PhotoCut src={src} alt={current?.alt ?? address} />
        <div className="pointer-events-none absolute inset-0 bg-oxblood/[0.05] mix-blend-multiply" />
        {images.length > 1 ? (
          <>
            <button
              type="button"
              className="absolute left-3 top-1/2 z-10 min-h-11 -translate-y-1/2 bg-paper px-4 py-2 t-caption text-oxblood transition-colors duration-150 ease-out hover:bg-tan active:scale-[0.985] md:left-6"
              onClick={prev}
              aria-label="Previous image"
            >
              Prev
            </button>
            <button
              type="button"
              className="absolute right-3 top-1/2 z-10 min-h-11 -translate-y-1/2 bg-paper px-4 py-2 t-caption text-oxblood transition-colors duration-150 ease-out hover:bg-tan active:scale-[0.985] md:right-6"
              onClick={next}
              aria-label="Next image"
            >
              Next
            </button>
          </>
        ) : null}
        <p className="absolute bottom-4 right-4 t-mono text-[12px] tabular text-paper md:bottom-6 md:right-6">
          {images.length
            ? `${String(active + 1).padStart(2, "0")} / ${String(images.length).padStart(2, "0")}`
            : "Photos to follow"}
        </p>
      </div>
      {images.length > 1 ? (
        <div className="mx-auto mt-3 flex max-w-[1240px] snap-x gap-2 overflow-x-auto px-4 pb-1 sm:px-6 lg:px-8">
          {images.map((img, i) => (
            <button
              key={`${img.publicId}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`${address}, photo ${i + 1} of ${images.length}`}
              aria-current={i === active}
              className={`relative h-24 w-36 shrink-0 snap-start overflow-hidden sm:h-28 sm:w-44 ${
                i === active ? "ring-2 ring-oxblood ring-offset-2 ring-offset-paper" : "opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={listingImageSrc(img.publicId, 480)} alt="" className="absolute inset-0 h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
