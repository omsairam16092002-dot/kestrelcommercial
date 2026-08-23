"use client";

import { useEffect, useRef, useState } from "react";
import { PLACEHOLDER_LISTING } from "@/lib/images";

function imageIsReady(img: HTMLImageElement | null) {
  return Boolean(img?.complete && img.naturalWidth > 0);
}

/** Native img so listing photography never depends on the Next image optimizer. */
export function DuotoneImage({
  src,
  alt,
  sizes,
  srcSet,
  priority = false,
  className = "",
  zoom = false,
  objectPosition = "center",
  fallbackSrc,
  lqipSrc,
  tone = "photo",
}: {
  src: string;
  alt: string;
  sizes: string;
  srcSet?: string;
  priority?: boolean;
  className?: string;
  zoom?: boolean;
  objectPosition?: "center" | "top" | "bottom";
  fallbackSrc?: string;
  lqipSrc?: string;
  /** `portrait` keeps facial detail; `photo` is a light oxblood grade only. */
  tone?: "photo" | "portrait";
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [current, setCurrent] = useState(src);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCurrent(src);
    setLoaded(false);
    if (imageIsReady(imgRef.current)) setLoaded(true);
  }, [src]);

  const grade =
    tone === "portrait"
      ? "saturate-[0.98] contrast-[1.02] brightness-[1]"
      : "saturate-[0.96] contrast-[1.02] brightness-[1.02]";

  return (
    <div className={`absolute inset-0 overflow-hidden bg-oxblood ${className}`}>
      {lqipSrc ? (
        <div
          aria-hidden
          className={`absolute inset-0 scale-110 bg-cover bg-center blur-xl transition-opacity duration-500 ${
            loaded ? "opacity-0" : "opacity-100"
          }`}
          style={{ backgroundImage: `url("${lqipSrc}")` }}
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={current}
        alt={alt}
        sizes={sizes}
        srcSet={srcSet}
        width={1200}
        height={900}
        data-listing-photo=""
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding={priority ? "sync" : "async"}
        onLoad={() => setLoaded(true)}
        onError={() => {
          const next = fallbackSrc === undefined ? PLACEHOLDER_LISTING : fallbackSrc;
          if (!next || current === next) {
            setLoaded(true);
            return;
          }
          setCurrent(next);
          setLoaded(imageIsReady(imgRef.current));
        }}
        className={`absolute inset-0 h-full w-full object-cover ${grade} ${
          objectPosition === "top" ? "object-top" : objectPosition === "bottom" ? "object-bottom" : "object-center"
        } ${zoom ? "img-zoom" : ""}`}
      />
      {tone === "portrait" ? null : (
        <div className="pointer-events-none absolute inset-0 bg-oxblood/[0.06] mix-blend-multiply" />
      )}
    </div>
  );
}
