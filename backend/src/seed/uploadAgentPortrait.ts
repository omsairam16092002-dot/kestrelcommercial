import { existsSync } from "node:fs";
import { join } from "node:path";
import { v2 as cloudinary } from "cloudinary";
import { connectDb, isDbConnected } from "../db/mongoose";
import { AgentModel } from "../models/Agent";
import { env } from "../config/env";

const FILE = join(process.cwd(), "..", "frontend", "public", "assets", "agent", "jignesh.jpeg");
const PUBLIC_ID = "kestrel/agents/jignesh";
const LEGACY_ID = "kestrel/agents/mfntqffneeizxmmfhqwi";

function requireCloudinary() {
  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
    throw new Error("Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in backend/.env.");
  }
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
}

async function uploadAs(publicId: string) {
  const result = await cloudinary.uploader.upload(FILE, {
    public_id: publicId,
    overwrite: true,
    invalidate: true,
    resource_type: "image",
    use_filename: false,
    unique_filename: false,
  });
  console.info(`Uploaded ${publicId} (${result.bytes} bytes)`);
}

async function main() {
  if (!existsSync(FILE)) {
    throw new Error(`Missing portrait file: ${FILE}`);
  }
  requireCloudinary();
  await cloudinary.api.ping();
  await uploadAs(PUBLIC_ID);
  await uploadAs(LEGACY_ID).catch((err) => {
    console.warn(`Legacy id ${LEGACY_ID} not overwritten: ${err instanceof Error ? err.message : err}`);
  });

  await connectDb();
  if (!isDbConnected()) {
    throw new Error("Mongo is required to point the agent at the new portrait.");
  }

  const updated = await AgentModel.updateMany({}, { $set: { photoPublicId: PUBLIC_ID } });
  console.info(`Agent portrait set to ${PUBLIC_ID} (${updated.modifiedCount} record(s)).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
