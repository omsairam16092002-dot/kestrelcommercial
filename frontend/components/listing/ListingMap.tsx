"use client";

import dynamic from "next/dynamic";
import { fullAddress, hasMapCoordinates, type Property } from "@kestrel/shared";

const ListingMapCanvas = dynamic(
  () => import("./ListingMapCanvas").then((m) => m.ListingMapCanvas),
  {
    ssr: false,
    loading: () => <div className="h-72 animate-pulse bg-paper" />,
  },
);

export function ListingMap({ property }: { property: Property }) {
  const pair = hasMapCoordinates(property);
  const mapsHref = pair
    ? `https://www.google.com/maps?q=${property.lat},${property.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress(property))}`;

  if (!pair) {
    return (
      <section className="premium-panel px-5 py-8">
        <p className="t-caption text-oxblood">Location</p>
        <h2 className="mt-2 text-base font-semibold text-ink">{fullAddress(property)}</h2>
        <p className="t-body mt-3 text-mauve">
          A street pin has not been recorded for this listing yet. Open the address in Google Maps
          rather than a blank map.
        </p>
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm font-semibold text-oxblood hover:underline"
        >
          Open in Maps →
        </a>
      </section>
    );
  }

  return (
    <section className="premium-panel overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 px-5 py-4">
        <div>
          <p className="t-caption text-oxblood">Location</p>
          <h2 className="mt-2 text-base font-semibold text-ink">{fullAddress(property)}</h2>
        </div>
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-oxblood hover:underline"
        >
          Open in Maps →
        </a>
      </div>
      <div className="h-72 border-t border-oxblood/10 sm:h-80">
        <ListingMapCanvas property={property} />
      </div>
    </section>
  );
}
