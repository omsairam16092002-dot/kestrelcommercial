import type { PropertyImage, PropertyStatus } from "./types";

/** Developer campaign filenames — flyers, completion banners, incentive sheets. */
const MARKETING_NAME =
  /(?:^|[/_-])(?:flyer|banner|promo|promotion|completion|contemporary|option[-_]?[abc]|incentive|guarantee|rebate|firb|marketing|campaign[-_]?sheet)(?:[/_-]|$)/i;

export function isMarketingGalleryDimensions(width: number, height: number): boolean {
  if (!width || !height) return false;
  const ratio = width / height;
  const portrait = height / width;
  if (width >= 2500 && portrait > 1.35) return true;
  if (ratio >= 1.3 && ratio <= 1.36 && width >= 3000) return true;
  if (ratio >= 1.55 && ratio <= 1.62 && width >= 3500) return true;
  return false;
}

function isAxtraFloorPlanDocument(publicId: string, width: number, height: number): boolean {
  if (!publicId.includes("/axtra/")) return false;
  const portrait = height / width;
  return width >= 1500 && width <= 2100 && height >= 2200 && portrait >= 1.25 && portrait <= 1.5;
}

export function isMarketingGalleryImage(image: PropertyImage): boolean {
  if (image.excludeFromGallery) return true;
  const id = image.publicId.toLowerCase();
  if (MARKETING_NAME.test(id)) return true;
  const w = image.width;
  const h = image.height;
  if (w != null && h != null) {
    if (isMarketingGalleryDimensions(w, h)) return true;
    if (isAxtraFloorPlanDocument(id, w, h)) return true;
  }
  return false;
}

/** Real property photos only — drops developer campaign banners and incentive sheets. */
export function galleryImages(images: PropertyImage[]): PropertyImage[] {
  return images.filter((img) => !isMarketingGalleryImage(img));
}

export function isClosedListing(status: PropertyStatus): boolean {
  return status === "sold" || status === "leased";
}

/** Strip Axtra channel-partner marketing lines from public copy. */
export function publicListingParagraphs(description: string, status: PropertyStatus): string[] {
  const skip =
    /^(?:Campaign timing:|Promotion:|The campaign advises this stock is FIRB|School catchments advised:|This listing is recorded as (?:sold|leased))/i;
  return description
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !skip.test(p));
}
