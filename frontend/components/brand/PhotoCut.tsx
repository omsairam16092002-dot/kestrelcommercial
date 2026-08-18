"use client";

import { useEffect, useState } from "react";

/**
 * Crossfade a listing photo only after the next file has loaded and decoded.
 * Starting the animation on an empty img made swaps look stalled, then snap.
 */
export function PhotoCut({
  src,
  alt,
  className = "",
  srcSet,
  sizes = "100vw",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  srcSet?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [shown, setShown] = useState(src);
  const [shownSet, setShownSet] = useState(srcSet);
  const [incoming, setIncoming] = useState<string | null>(null);
  const [incomingSet, setIncomingSet] = useState<string | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (src === shown) {
      setShownSet(srcSet);
      setIncoming(null);
      setIncomingSet(undefined);
      setReady(false);
      return;
    }

    setIncoming(src);
    setIncomingSet(srcSet);
    setReady(false);

    let cancelled = false;
    const probe = new Image();
    if (srcSet) probe.srcset = srcSet;
    probe.sizes = sizes;
    probe.src = src;

    const finish = () => {
      if (cancelled) return;
      const decode = probe.decode ? probe.decode() : Promise.resolve();
      decode.then(() => {
        if (!cancelled) setReady(true);
      }).catch(() => {
        if (!cancelled) setReady(true);
      });
    };

    if (probe.complete && probe.naturalWidth > 0) finish();
    else {
      probe.onload = finish;
      probe.onerror = () => {
        if (!cancelled) setReady(true);
      };
    }

    const fallback = window.setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 8000);

    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
    };
  }, [src, srcSet, sizes, shown]);

  useEffect(() => {
    if (!incoming || !ready) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(incoming);
      setShownSet(incomingSet);
      setIncoming(null);
      setIncomingSet(undefined);
      setReady(false);
    }
  }, [incoming, incomingSet, ready]);

  function commitIncoming() {
    if (!incoming) return;
    setShown(incoming);
    setShownSet(incomingSet);
    setIncoming(null);
    setIncomingSet(undefined);
    setReady(false);
  }

  return (
    <div className={`absolute inset-0 overflow-hidden bg-oxblood ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={shown}
        srcSet={shownSet}
        sizes={sizes}
        alt={alt}
        data-listing-photo=""
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className="photo-cut"
      />
      {incoming ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={incoming}
          src={incoming}
          srcSet={incomingSet}
          sizes={sizes}
          alt=""
          aria-hidden
          decoding="async"
          className={`photo-cut ${ready ? "photo-cut-enter" : "opacity-0"}`}
          onAnimationEnd={commitIncoming}
        />
      ) : null}
    </div>
  );
}
