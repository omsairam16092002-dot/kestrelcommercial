import { connectDb, isDbConnected } from "../db/mongoose";
import { PropertyModel } from "../models/Property";

const SLUGS = [
  "14-launceston-street-williamstown-north-lot-1",
  "14-launceston-street-williamstown-north-lot-2",
  "14-launceston-street-williamstown-north-lot-4",
  "14-launceston-street-williamstown-north-lot-5",
  "14-launceston-street-williamstown-north-lot-8",
  "191-leakes-road-truganina-lot-39",
  "191-leakes-road-truganina-lot-40",
  "191-leakes-road-truganina-lot-50",
  "191-leakes-road-truganina-lot-55",
];

async function main() {
  await connectDb();
  if (!isDbConnected()) {
    throw new Error("Mongo is required to feature these campaigns.");
  }
  const result = await PropertyModel.updateMany(
    { slug: { $in: SLUGS } },
    { $set: { featured: true } },
  );
  console.info(`Featured ${result.modifiedCount} listing(s): ${SLUGS.join(", ")}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
