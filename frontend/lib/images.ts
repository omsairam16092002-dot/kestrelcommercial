import { isStockImageId, resolveImageSrc, type Property } from "@kestrel/shared";

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dne4fejan";

/** Request 2x source width so images fill their box on retina. */
export function listingImageSrc(publicId: string, width = 1200) {
  return resolveImageSrc(publicId, CLOUD, { width });
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
  return listingImageSrc(publicId, width);
}

export const AGENT_PORTRAIT = "/assets/agent/jignesh.jpeg";

/** Local portrait first, then Cloudinary, then stock Unsplash. */
export function agentPortraitSrc(photoPublicId?: string | null, _width = 1400) {
  if (!photoPublicId || isStockImageId(photoPublicId)) return AGENT_PORTRAIT;
  return portraitSrc(photoPublicId as string, _width);
}
