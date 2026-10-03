import { connectDb, isDbConnected } from "../db/mongoose";
import { PropertyModel } from "../models/Property";
import { invalidatePropertyListCache } from "../services/propertyCache";

/**
 * Sets `houseLandPackage` on the known house & land campaigns without re-running the full
 * Axtra seed (which would reset images). Package segments are left for the desk to tag.
 * Dry run by default; pass --apply to write.
 */
const APPLY = process.argv.includes("--apply");

const HOUSE_LAND_SLUGS = [
  "sparrowhawk-drive-beveridge-lot-526",
  "sparrowhawk-drive-beveridge-lot-527",
  "sparrowhawk-drive-beveridge-lot-532",
  "sparrowhawk-drive-beveridge-lot-533",
  "ceduna-estate-clyde-north-lot-3767",
  "ceduna-estate-clyde-north-lot-3768",
];

async function main() {
  await connectDb();
  if (!isDbConnected()) {
    console.error("Mongo required.");
    process.exit(1);
  }

  const docs = (await PropertyModel.find({ slug: { $in: HOUSE_LAND_SLUGS } })
    .select("slug houseLandPackage")
    .lean()) as unknown as { slug: string; houseLandPackage?: boolean }[];

  const found = new Set(docs.map((d) => d.slug));
  HOUSE_LAND_SLUGS.filter((slug) => !found.has(slug)).forEach((slug) => console.warn(`  not found ${slug}`));

  const pending = docs.filter((d) => !d.houseLandPackage).map((d) => d.slug);
  pending.forEach((slug) => console.info(`  flag ${slug}`));

  if (APPLY && pending.length) {
    await PropertyModel.updateMany({ slug: { $in: pending } }, { $set: { houseLandPackage: true } });
    await invalidatePropertyListCache();
  }

  console.info(
    APPLY
      ? `Done. flagged=${pending.length}`
      : `Dry run. ${pending.length} listing(s) would be flagged. Re-run with --apply to write.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
