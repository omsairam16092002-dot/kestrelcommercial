import { env } from "../config/env";
import { galleryImages, isMarketingGalleryImage, type PropertyImage } from "@kestrel/shared";

const CLOUD = env.cloudinary.cloudName || "dne4fejan";
const dimCache = new Map<string, { width: number; height: number }>();

async function cloudinaryDimensions(publicId: string): Promise<{ width: number; height: number } | null> {
  if (publicId.startsWith("local:") || publicId.startsWith("unsplash:")) return null;
  const cached = dimCache.get(publicId);
  if (cached) return cached;
  const url = `https://res.cloudinary.com/${CLOUD}/image/upload/fl_getinfo/${publicId}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const body = (await res.json()) as { input?: { width?: number; height?: number } };
  const width = body.input?.width;
  const height = body.input?.height;
  if (!width || !height) return null;
  const dims = { width, height };
  dimCache.set(publicId, dims);
  return dims;
}

export async function enrichGalleryImages(images: PropertyImage[]): Promise<PropertyImage[]> {
  const enriched = await Promise.all(
    images.map(async (image) => {
      if (image.width != null && image.height != null) return image;
      if (isMarketingGalleryImage(image)) return image;
      const dims = await cloudinaryDimensions(image.publicId);
      return dims ? { ...image, width: dims.width, height: dims.height } : image;
    }),
  );
  return galleryImages(enriched);
}
