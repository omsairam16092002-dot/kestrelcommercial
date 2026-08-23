import { fullAddress, galleryImages, isStockImageId, type Property } from "@kestrel/shared";
import { listingImageSrc } from "@/lib/images";

export type CampaignPhoto = {
  src: string;
  alt: string;
  property: Property;
};

function firstRealImage(property: Property) {
  return galleryImages(property.images).find((img) => !isStockImageId(img.publicId)) ?? null;
}

function heroImage(property: Property) {
  return property.images.find((i) => i.isHero && !isStockImageId(i.publicId)) ?? firstRealImage(property);
}

function showcaseCampaignKey(property: Property) {
  return property.address.replace(/^(?:Lot|Unit)\s+[^,]+,\s*/i, "").trim().toLowerCase();
}

function slugHash(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  return hash;
}

export function hasCompleteCommercialShowcaseSpecs(property: Property): boolean {
  if (property.assetCategory !== "commercial") return true;
  return (
    property.floorAreaSqm != null &&
    property.clearSpanM != null &&
    property.rollerDoorM != null &&
    Boolean(property.zoning.trim()) &&
    property.zoning.trim().toUpperCase() !== "TBC"
  );
}

export function showcaseImage(
  property: Property,
  mode: "hero" | "varied" = "hero",
): { src: string; alt: string } | null {
  const realImages = galleryImages(property.images).filter((img) => !isStockImageId(img.publicId));
  if (!realImages.length) return null;
  const image =
    mode === "varied"
      ? realImages[slugHash(property.slug) % realImages.length] ?? heroImage(property) ?? realImages[0]
      : heroImage(property) ?? realImages[0];
  if (!image) return null;
  return {
    src: listingImageSrc(image.publicId, 2400, "flagship"),
    alt: image.alt ?? fullAddress(property),
  };
}

/** First campaign photos that are real uploads, not Unsplash fixtures. */
export function campaignPhotos(properties: Property[], count = 6): CampaignPhoto[] {
  const out: CampaignPhoto[] = [];
  for (const property of properties) {
    const image = showcaseImage(property);
    if (!image) continue;
    out.push({ ...image, property });
    if (out.length >= count) break;
  }
  return out;
}

export function pickFlagship(properties: Property[]): Property | null {
  const complete = properties.filter(hasCompleteCommercialShowcaseSpecs);
  const credible = complete.length ? complete : properties;
  const withPhoto = credible.filter((p) => firstRealImage(p));
  const pool = withPhoto.length ? withPhoto : credible;
  return (
    pool.find((p) => p.evidenceLine && (p.status === "sold" || p.status === "leased")) ??
    pool.find((p) => p.status === "sold" || p.status === "leased") ??
    pool[0] ??
    null
  );
}

export function compactEvidence(properties: Property[], maxPerCampaign = 2): Property[] {
  const counts = new Map<string, number>();
  const out: Property[] = [];
  for (const property of properties) {
    const key = showcaseCampaignKey(property);
    const seen = counts.get(key) ?? 0;
    if (seen >= maxPerCampaign) continue;
    counts.set(key, seen + 1);
    out.push(property);
  }
  return out;
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
