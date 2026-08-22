import { connectDb, isDbConnected } from "../db/mongoose";
import { PropertyModel } from "../models/Property";
import { env } from "../config/env";
import {
  galleryImages,
  isMarketingGalleryDimensions,
  isMarketingGalleryImage,
  type PropertyImage,
} from "@kestrel/shared";

type ImageRow = PropertyImage & { publicId: string };

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

async function enrichImage(image: ImageRow): Promise<ImageRow> {
  if (image.width != null && image.height != null) return image;
  const dims = await cloudinaryDimensions(image.publicId);
  if (!dims) return image;
  return { ...image, width: dims.width, height: dims.height };
}

function normalizeHero(images: ImageRow[]): ImageRow[] {
  if (!images.length) return images;
  if (images.some((img) => img.isHero)) return images;
  return images.map((img, i) => ({ ...img, isHero: i === 0 }));
}

async function main() {
  await connectDb();
  if (!isDbConnected()) {
    console.error("Mongo required.");
    process.exit(1);
  }

  const docs = (await PropertyModel.find({ "images.0": { $exists: true } })
    .select("slug images")
    .lean()) as unknown as { slug: string; images: ImageRow[] }[];

  let updated = 0;
  let removed = 0;

  for (const doc of docs) {
    const enriched = await Promise.all((doc.images ?? []).map((img) => enrichImage(img)));
    const kept = galleryImages(enriched);
    const pruned = normalizeHero(kept);
    if (pruned.length !== doc.images.length || enriched.some((img, i) => img.width !== doc.images[i]?.width)) {
      await PropertyModel.updateOne({ slug: doc.slug }, { $set: { images: pruned } });
      updated += 1;
      removed += doc.images.length - pruned.length;
      if (doc.images.length !== pruned.length) {
        console.info(`${doc.slug}: ${doc.images.length} → ${pruned.length}`);
      }
    }
  }

  console.info(`Done. listingsUpdated=${updated} marketingImagesRemoved=${removed}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
