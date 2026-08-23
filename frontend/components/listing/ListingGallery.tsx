"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fullAddress, galleryImages, type Property } from "@kestrel/shared";
import { PhotoCut } from "@/components/brand/PhotoCut";
import { IconArrowRight } from "@/components/icons";
import { ListingLightbox } from "@/components/listing/ListingLightbox";
import { listingImageSrc, listingImageSrcSet, listingPlaceholderSrc } from "@/lib/images";

const GALLERY_WIDTH = 1600;
const THUMB_WIDTH = 480;

function gallerySrc(property: Property, publicId?: string) {
  return publicId
    ? listingImageSrc(publicId, GALLERY_WIDTH, "gallery")
    : listingPlaceholderSrc(property, GALLERY_WIDTH);
}

function gallerySrcSet(publicId?: string) {
  return publicId ? listingImageSrcSet(publicId, [640, 1080, 1920], "gallery") : undefined;
}

export function ListingGallery({ property }: { property: Property }) {
  const images = useMemo(() => galleryImages(property.images), [property.images]);
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
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

  useEffect(() => {
    setActive(0);
  }, [property.slug]);

  useEffect(() => {
    setActive((i) => (images.length ? Math.min(i, images.length - 1) : 0));
  }, [images.length]);

  useEffect(() => {
    setLightboxOpen(false);
  }, [property.slug, active]);

  useEffect(() => {
    if (images.length < 2) return;
    const neighbors = [images[(active + 1) % images.length], images[(active - 1 + images.length) % images.length]];
    const probes = neighbors.filter(Boolean).map((img) => {
      const probe = new Image();
      probe.decoding = "async";
      probe.srcset = listingImageSrcSet(img.publicId, [640, 1080, 1920], "gallery");
      probe.sizes = "100vw";
      probe.src = listingImageSrc(img.publicId, GALLERY_WIDTH, "gallery");
      return probe;
    });
    return () => {
      probes.forEach((probe) => {
        probe.src = "";
      });
    };
  }, [active, images]);

  const src = gallerySrc(property, current?.publicId);
  const srcSet = gallerySrcSet(current?.publicId);

  return (
    <div ref={rootRef} tabIndex={0} role="region" aria-label={`Photos of ${address}`}>
      <div
        className="relative mx-auto aspect-video w-full max-h-[min(78svh,920px)] min-h-[14rem] overflow-hidden bg-oxblood touch-pan-y"
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
        <PhotoCut
          src={src}
          srcSet={srcSet}
          sizes="100vw"
          alt={current?.alt ?? address}
          priority={active === 0}
        />
        <div className="pointer-events-none absolute inset-0 bg-oxblood/[0.05] mix-blend-multiply" />
        {current?.publicId ? (
          <button
            type="button"
            className="absolute bottom-4 left-4 z-10 bg-paper/95 px-3 py-2 text-xs font-medium uppercase tracking-wide text-oxblood transition-colors hover:bg-paper md:bottom-6 md:left-6"
            onClick={() => setLightboxOpen(true)}
          >
            View full image
          </button>
        ) : null}
        {images.length > 1 ? (
          <>
            <button
              type="button"
              className="absolute left-3 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center bg-paper text-oxblood transition-colors duration-150 ease-out hover:bg-tan active:scale-[0.985] md:left-6"
              onClick={prev}
              aria-label="Previous image"
            >
              <IconArrowRight className="h-5 w-5 rotate-180" />
            </button>
            <button
              type="button"
              className="absolute right-3 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center bg-paper text-oxblood transition-colors duration-150 ease-out hover:bg-tan active:scale-[0.985] md:right-6"
              onClick={next}
              aria-label="Next image"
            >
              <IconArrowRight className="h-5 w-5" />
            </button>
          </>
        ) : null}
        <p className="absolute bottom-4 right-4 t-mono text-[12px] tabular text-paper md:bottom-6 md:right-6">
          {images.length
            ? `${String(active + 1).padStart(2, "0")} / ${String(images.length).padStart(2, "0")}`
            : "Photos to follow"}
        </p>
      </div>
      {current?.publicId ? (
        <ListingLightbox
          publicId={current.publicId}
          alt={current.alt ?? address}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
      {images.length > 1 ? (
        <div className="mx-auto mt-3 flex max-w-[1240px] snap-x gap-2 overflow-x-auto px-4 pb-1 sm:px-6 lg:px-8">
          {images.map((img, i) => (
            <button
              key={`${img.publicId}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`${address}, photo ${i + 1} of ${images.length}`}
              aria-current={i === active}
              className={`relative aspect-[3/2] h-24 w-36 shrink-0 snap-start overflow-hidden sm:h-28 sm:w-44 ${
                i === active ? "ring-2 ring-oxblood ring-offset-2 ring-offset-paper" : "opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={listingImageSrc(img.publicId, THUMB_WIDTH, "thumb")}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
