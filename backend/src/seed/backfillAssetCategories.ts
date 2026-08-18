import { connectDb, isDbConnected } from "../db/mongoose";
import { PropertyModel } from "../models/Property";
import { deriveAssetCategory, type PropertyType } from "@kestrel/shared";

const ARCHIVE_SLUGS = ["118-corio-street-geelong", "387-myall-street-cardross"] as const;

async function backfillAssetCategories() {
  await connectDb();
  if (!isDbConnected()) {
    console.error("Cannot backfill asset categories without MONGODB_URI.");
    process.exit(1);
  }

  const docs = await PropertyModel.find({}).select("slug propertyType").lean();
  let updated = 0;

  for (const doc of docs) {
    const propertyType = doc.propertyType as PropertyType | undefined;
    if (!propertyType) continue;
    const assetCategory = deriveAssetCategory(propertyType);
    const archived = ARCHIVE_SLUGS.includes(String(doc.slug) as (typeof ARCHIVE_SLUGS)[number]);
    const result = await PropertyModel.updateOne(
      { _id: doc._id },
      { $set: { assetCategory, ...(archived ? { archived: true } : {}) } },
    );
    updated += result.modifiedCount;
  }

  console.info(`Backfilled assetCategory on ${docs.length} listing(s); ${updated} document(s) changed.`);
  if (ARCHIVE_SLUGS.length) {
    console.info(`Archived out-of-corridor records: ${ARCHIVE_SLUGS.join(", ")}`);
  }
  process.exit(0);
}

backfillAssetCategories().catch((err) => {
  console.error(err);
  process.exit(1);
});
