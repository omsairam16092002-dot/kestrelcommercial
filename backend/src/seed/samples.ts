import { connectDb, isDbConnected } from "../db/mongoose";
import { PropertyModel } from "../models/Property";
import { DEMO_LISTING_SLUGS } from "./infoPackListings";

/** Starter Unsplash samples are gone. This script only deletes them if they reappear. */
async function removeSamples() {
  await connectDb();
  if (!isDbConnected()) {
    console.error("Mongo is not connected. Check backend/.env MONGODB_URI.");
    process.exit(1);
  }

  const result = await PropertyModel.deleteMany({
    $or: [{ slug: { $in: DEMO_LISTING_SLUGS } }, { slug: /^sample-/ }, { slug: /^node-test-/ }, { address: /^SAMPLE/ }],
  });
  console.info(`Removed ${result.deletedCount} demo / sample listing(s).`);
  process.exit(0);
}

removeSamples().catch((err) => {
  console.error(err);
  process.exit(1);
});
