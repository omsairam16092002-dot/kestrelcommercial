import { fullAddress, isStockImageId, type Property } from "@kestrel/shared";
import { listingImageSrc } from "@/lib/images";

export type CampaignPhoto = {
  src: string;
  alt: string;
  property: Property;
};

function firstRealImage(property: Property) {
  return property.images.find((img) => !isStockImageId(img.publicId)) ?? null;
}

/** First campaign photos that are real uploads, not Unsplash fixtures. */
export function campaignPhotos(properties: Property[], count = 6): CampaignPhoto[] {
  const out: CampaignPhoto[] = [];
  for (const property of properties) {
    const img = property.images.find((i) => i.isHero && !isStockImageId(i.publicId)) ?? firstRealImage(property);
    if (!img) continue;
    out.push({
      src: listingImageSrc(img.publicId, 2400),
      alt: img.alt ?? fullAddress(property),
      property,
    });
    if (out.length >= count) break;
  }
  return out;
}

export function pickFlagship(properties: Property[]): Property | null {
  const withPhoto = properties.filter((p) => firstRealImage(p));
  const pool = withPhoto.length ? withPhoto : properties;
  return (
    pool.find((p) => p.evidenceLine && (p.status === "sold" || p.status === "leased")) ??
    pool.find((p) => p.status === "sold" || p.status === "leased") ??
    pool[0] ??
    null
  );
}

export function corridorProof(properties: Property[]): string {
  const named = properties.filter((p) => p.status === "sold" || p.status === "leased");
  const suburbs = Array.from(new Set(named.map((p) => p.suburb).filter(Boolean))).slice(0, 5);
  if (suburbs.length < 2) {
    return "Repeat occupier and investor work on the Melbourne west corridor — Truganina, Laverton North, Derrimut — not one-off listings.";
  }
  if (suburbs.length === 2) {
    return `Named sold and leased files in ${suburbs[0]} and ${suburbs[1]} — the same desk, repeat.`;
  }
  return `Named sold and leased files in ${suburbs.slice(0, -1).join(", ")} and ${suburbs[suburbs.length - 1]} — the same desk, repeat.`;
}
