"use client";

import { useEffect, useState } from "react";
import { PLACEHOLDER_LISTING } from "@/lib/images";

/** Native img so listing photography never depends on the Next image optimizer. */
export function DuotoneImage({
  src,
  alt,
  sizes,
  priority = false,
  className = "",
  zoom = false,
  objectPosition = "center",
  fallbackSrc,
  tone = "photo",
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  zoom?: boolean;
  objectPosition?: "center" | "top" | "bottom";
  fallbackSrc?: string;
  /** `portrait` keeps facial detail; `photo` is a light oxblood grade only. */
  tone?: "photo" | "portrait";
}) {
  const [current, setCurrent] = useState(src);

  useEffect(() => {
    setCurrent(src);
  }, [src]);

  const grade =
    tone === "portrait"
      ? "saturate-[0.98] contrast-[1.02] brightness-[1]"
      : "saturate-[0.96] contrast-[1.02] brightness-[1.02]";

  return (
    <div className={`absolute inset-0 overflow-hidden bg-oxblood ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current}
        alt={alt}
        sizes={sizes}
        width={1200}
        height={900}
        data-listing-photo=""
        fetchPriority={priority ? "high" : "auto"}
        decoding={priority ? "sync" : "async"}
        onError={() => {
          const next = fallbackSrc === undefined ? PLACEHOLDER_LISTING : fallbackSrc;
          if (!next || current === next) return;
          setCurrent(next);
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
