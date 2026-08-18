import { AGENCY, AGENTS, isStockImageId } from "@kestrel/shared";
import { connectDb, isDbConnected } from "../db/mongoose";
import { PropertyModel } from "../models/Property";
import { AgentModel } from "../models/Agent";
import { DEMO_LISTING_SLUGS } from "./infoPackListings";

async function seed() {
  await connectDb();
  if (!isDbConnected()) {
    console.error("Cannot seed without MONGODB_URI. Copy backend/.env.example → backend/.env.");
    process.exit(1);
  }

  const migrated = await PropertyModel.updateMany(
    { status: "auction" },
    { $set: { status: "for-sale", transactionSide: "sale" } },
  );
  if (migrated.modifiedCount) {
    console.info(`Migrated ${migrated.modifiedCount} auction listing(s) to for-sale.`);
  }

  for (const agent of AGENTS) {
    const existing = (await AgentModel.findOne({ licenceNumber: agent.licenceNumber })
      .select("photoPublicId")
      .lean()) as { photoPublicId?: string } | null;
    const keepPhoto = Boolean(existing && !isStockImageId(String(existing.photoPublicId ?? "")));
    await AgentModel.findOneAndUpdate(
      { licenceNumber: agent.licenceNumber },
      {
        name: agent.name,
        licenceNumber: agent.licenceNumber,
        phone: AGENCY.phone,
        email: agent.email,
        title: agent.title,
        bio: agent.bio,
        ...(keepPhoto ? {} : { photoPublicId: agent.photoPublicId }),
      },
      { upsert: true },
    );
  }

  await AgentModel.updateMany({ phone: /0456/ }, { $set: { phone: AGENCY.phone } });

  const removed = await PropertyModel.deleteMany({
    $or: [{ slug: { $in: DEMO_LISTING_SLUGS } }, { slug: /^sample-/ }, { slug: /^node-test-/ }, { address: /^SAMPLE/ }],
  });
  if (removed.deletedCount) {
    console.info(`Removed ${removed.deletedCount} demo / sample listing(s).`);
  }

  console.info(`Seeded ${AGENTS.length} agent(s). Listings stay in Mongo (Axtra + information packs).`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
