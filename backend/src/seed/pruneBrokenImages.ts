import { existsSync } from "node:fs";
import { join } from "node:path";
import { connectDb, isDbConnected } from "../db/mongoose";
import { PropertyModel } from "../models/Property";
import { env } from "../config/env";
import type { PropertyImage } from "@kestrel/shared";

/** Dry run by default. Pass --apply to write the pruned image lists back to Mongo. */
const APPLY = process.argv.includes("--apply");
const CLOUD = env.cloudinary.cloudName || "dne4fejan";
const LISTINGS_ROOT = join(process.cwd(), "..", "frontend", "public", "listings");
const CONCURRENCY = 8;

type ImageRow = PropertyImage & { publicId: string };

const status = new Map<string, boolean>();

async function exists(publicId: string): Promise<boolean> {
  const cached = status.get(publicId);
  if (cached !== undefined) return cached;
  let ok: boolean;
  if (publicId.startsWith("local:")) {
    ok = existsSync(join(LISTINGS_ROOT, ...publicId.slice("local:".length).split("/")));
  } else if (publicId.startsWith("unsplash:") || /^https?:\/\//.test(publicId)) {
    ok = true;
  } else {
    const res = await fetch(`https://res.cloudinary.com/${CLOUD}/image/upload/w_64/${publicId}`, { method: "HEAD" });
    // Only a definite 404 counts as missing; network blips and 5xx keep the image.
    ok = res.status !== 404;
  }
  status.set(publicId, ok);
  return ok;
}

async function checkAll(ids: string[]) {
  let i = 0;
  async function next(): Promise<void> {
    const idx = i++;
    if (idx >= ids.length) return;
    await exists(ids[idx]);
    await next();
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, () => next()));
}

function normalizeHero(images: ImageRow[]): ImageRow[] {
  if (!images.length || images.some((img) => img.isHero)) return images;
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

  const ids = [...new Set(docs.flatMap((d) => d.images.map((img) => img.publicId)))];
  console.info(`Checking ${ids.length} unique image(s) across ${docs.length} listing(s)...`);
  await checkAll(ids);

  const missing = ids.filter((id) => status.get(id) === false);
  console.info(`Missing: ${missing.length}`);
  missing.forEach((id) => console.info(`  404 ${id}`));

  let updated = 0;
  for (const doc of docs) {
    const kept = normalizeHero(doc.images.filter((img) => status.get(img.publicId) !== false));
    if (kept.length === doc.images.length) continue;
    updated += 1;
    console.info(`${doc.slug}: ${doc.images.length} → ${kept.length}`);
    if (APPLY) await PropertyModel.updateOne({ slug: doc.slug }, { $set: { images: kept } });
  }

  console.info(
    APPLY
      ? `Done. listingsUpdated=${updated}`
      : `Dry run. ${updated} listing(s) would change. Re-run with --apply to write.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
