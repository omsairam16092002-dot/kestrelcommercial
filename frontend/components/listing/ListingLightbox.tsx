"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { listingImageOriginal } from "@/lib/images";

type ListingLightboxProps = {
  publicId: string;
  alt: string;
  open: boolean;
  onClose: () => void;
};

export function ListingLightbox({ publicId, alt, open, onClose }: ListingLightboxProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const src = listingImageOriginal(publicId, 2400);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="relative max-h-[92svh] w-full max-w-6xl overflow-hidden bg-paper"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center bg-oxblood text-paper transition-colors hover:bg-ink"
          onClick={onClose}
          aria-label="Close full image view"
        >
          ×
        </button>
        <p id={titleId} className="sr-only">
          Full image — {alt}
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="mx-auto max-h-[92svh] w-full object-contain"
        />
      </div>
    </div>
  );
}
