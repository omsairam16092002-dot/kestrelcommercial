"use client";

import { isClosedListing, listingSearchSpecs, type Property } from "@kestrel/shared";
import { StatusStamp } from "@/components/brand/StatusStamp";
import { PrefetchLink } from "@/components/ui/PrefetchLink";
import { listingImageSrc, listingImageSrcSet, listingPlaceholderSrc } from "@/lib/images";

export function SearchResultRow({
  property,
  selected,
  index,
  onSelect,
  onHover,
  register,
}: {
  property: Property;
  selected: boolean;
  index: number;
  onSelect: (slug: string) => void;
  onHover: (slug: string | null) => void;
  register: (el: HTMLElement | null) => void;
}) {
  const hero = property.images.find((i) => i.isHero) ?? property.images[0];
  const href = `/listing/${property.slug}`;
  const imageSrc = hero ? listingImageSrc(hero.publicId, 640) : listingPlaceholderSrc(property, 640);
  const imageSrcSet = hero ? listingImageSrcSet(hero.publicId, [320, 640, 800]) : undefined;

  return (
    <article
      ref={register}
      onMouseEnter={() => onHover(property.slug)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(property.slug)}
      className={`surface flex cursor-pointer gap-4 overflow-hidden p-3 transition duration-150 ease-out ${
        selected
          ? "ring-2 ring-oxblood ring-offset-2 ring-offset-paper shadow-[0_16px_42px_rgba(42,20,24,0.08)]"
          : "hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_16px_42px_rgba(42,20,24,0.06)]"
      }`}
    >
      <PrefetchLink
        href={href}
        className="relative h-28 w-32 shrink-0 overflow-hidden bg-oxblood sm:h-32 sm:w-40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          srcSet={imageSrcSet}
          sizes="160px"
          alt={hero?.alt ?? property.address}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
        <span className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center bg-oxblood t-mono text-[10px] text-paper">
          {String(index).padStart(2, "0")}
        </span>
      </PrefetchLink>

      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex flex-wrap items-center gap-2">
          {!isClosedListing(property.status) ? (
            <>
              <StatusStamp status={property.status} side={property.transactionSide} size="sm" />
              <p className="t-mono tabular text-[12px] uppercase tracking-[0.12em] text-oxblood">{property.priceLabel}</p>
            </>
          ) : null}
        </div>
        <h3 className="t-h3 mt-1.5 text-ink">
          <PrefetchLink href={href} className="hover:text-oxblood" onClick={(e) => e.stopPropagation()}>
            {property.address}
          </PrefetchLink>
        </h3>
        <p className="mt-0.5 text-sm text-mauve">
          {property.suburb} · {property.postcode}
        </p>
        <button
          type="button"
          className="mt-2 text-left text-xs font-semibold text-oxblood underline-offset-2 hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(property.slug);
          }}
        >
          Show on map
        </button>
        <dl className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {listingSearchSpecs(property).map((row) => (
            <div key={row.k} className="min-w-0">
              <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-mauve">{row.k}</dt>
              <dd className="t-mono mt-0.5 truncate text-[12px] text-ink">{row.v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}
