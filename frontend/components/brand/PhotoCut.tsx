"use client";

import { useEffect, useState } from "react";

/**
 * The site's one image-change transition: crossfade with a slight scale-in.
 * Used only when a listing photo is replaced. Respects prefers-reduced-motion.
 */
export function PhotoCut({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [base, setBase] = useState(src);
  const [incoming, setIncoming] = useState<string | null>(null);

  useEffect(() => {
    if (src === base) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setBase(src);
      setIncoming(null);
      return;
    }
    setIncoming(src);
  }, [src, base]);

  return (
    <div className={`absolute inset-0 overflow-hidden bg-oxblood ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={base} alt={alt} data-listing-photo="" className="photo-cut" />
      {incoming ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={incoming}
          alt=""
          aria-hidden
          className="photo-cut photo-cut-enter"
          onAnimationEnd={() => {
            setBase(incoming);
            setIncoming(null);
          }}
        />
      ) : null}
    </div>
  );
}
