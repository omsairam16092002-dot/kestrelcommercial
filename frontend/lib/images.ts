import {
  isStockImageId,
  resolveImageSrc,
  type ListingImageContext,
  type Property,
} from "@kestrel/shared";

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dne4fejan";

/** Widths allowed by next.config images.deviceSizes — required for /_next/image. */
const NEXT_IMAGE_WIDTHS = [390, 640, 750, 828, 1080, 1200, 1920];

function nearestNextWidth(width: number) {
  return NEXT_IMAGE_WIDTHS.reduce((best, n) =>
    Math.abs(n - width) < Math.abs(best - width) ? n : best,
  );
}

function optimizedLocalSrc(path: string, width: number) {
  const w = nearestNextWidth(width);
  return `/_next/image?url=${encodeURIComponent(path)}&w=${w}&q=70`;
}

/** Request a bounded width so gallery/list photos are not original 8–20MB files. */
export function listingImageSrc(
  publicId: string,
  width = 1200,
  context: ListingImageContext = "card",
) {
  const src = resolveImageSrc(publicId, CLOUD, { width, context });
  if (src.startsWith("/")) return optimizedLocalSrc(src, width);
  return src;
}

export function listingImageSrcSet(
  publicId: string,
  widths = [640, 1080, 1920],
  context: ListingImageContext = "card",
) {
  return widths.map((width) => `${listingImageSrc(publicId, width, context)} ${width}w`).join(", ");
}

/** Uncropped delivery for lightbox and floorplans. */
export function listingImageOriginal(publicId: string, width = 2400) {
  return listingImageSrc(publicId, width, "original");
}

const HERO_ID = "photo-1586528116311-ad8dd3c8310d";

export function unsplash(id: string, width: number, q = 55) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=${q}`;
}

export const HERO_STOCK = unsplash(HERO_ID, 1600, 65);
export const HERO_SRCSET = [
  `${unsplash(HERO_ID, 640, 55)} 640w`,
  `${unsplash(HERO_ID, 1200, 60)} 1200w`,
  `${unsplash(HERO_ID, 1920, 65)} 1920w`,
].join(", ");
export const YARD_STOCK = unsplash("photo-1553413077-190dd305871c", 1400, 70);
export const PLACEHOLDER_LISTING = unsplash("photo-1586528116311-ad8dd3c8310d", 1200, 60);

export function listingPlaceholderSrc(property: Pick<Property, "propertyType">, width = 1200) {
  switch (property.propertyType) {
    case "house":
    case "townhouse":
      return unsplash("photo-1568605114967-8130f13c1486", width, 60);
    case "apartment":
      return unsplash("photo-1545324418-cc1a3fa10c00", width, 60);
    case "rural":
      return unsplash("photo-1500382017468-9049fed747ef", width, 60);
    case "development-land":
      return unsplash("photo-1486406146926-c627a92ad1ab", width, 60);
    default:
      return unsplash("photo-1586528116311-ad8dd3c8310d", width, 60);
  }
}

/** Face-first crop so the portrait is not a chin-and-suit crop. */
export function portraitSrc(publicId: string, width = 1400) {
  if (isStockImageId(publicId) || publicId.startsWith("unsplash:")) {
    const id = publicId.startsWith("unsplash:") ? publicId.slice("unsplash:".length) : "photo-1560250097-0b93528c311a";
    return `https://images.unsplash.com/${id}?auto=format&fit=crop&crop=faces,top&w=${width}&q=80`;
  }
  return listingImageSrc(publicId, width, "original");
}

export const AGENT_PORTRAIT = "/assets/agent/jignesh.jpeg";

/** Always serve the committed local JPEG — reliable on production without Cloudinary. */
export function agentPortraitSrc(_photoPublicId?: string | null, _width = 1400) {
  return AGENT_PORTRAIT;
}

/** Optional Cloudinary srcSet for high-DPI when a real upload id exists. */
export function agentPortraitSrcSet(photoPublicId?: string | null, widths = [640, 1080, 1400]) {
  if (!photoPublicId || isStockImageId(photoPublicId)) return undefined;
  return widths.map((width) => `${portraitSrc(photoPublicId, width)} ${width}w`).join(", ");
}

/** Low-quality image placeholder for Cloudinary listing URLs. */
export function listingLqipSrc(publicId: string, context: ListingImageContext = "card") {
  if (isStockImageId(publicId) || publicId.startsWith("local:")) return undefined;
  const base = resolveImageSrc(publicId, CLOUD, { width: 40, context });
  if (!base.includes("res.cloudinary.com")) return undefined;
  return base.replace("/upload/", "/upload/e_blur:1000,q_1,w_40/");
}
