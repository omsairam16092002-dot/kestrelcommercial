#!/usr/bin/env node
/**
 * Phase 4 cleanup — remove all QA test data tracked in docs/qa/qa-manifest.json.
 * Usage:
 *   node scripts/qa/cleanup-test-data.mjs          # dry-run
 *   node scripts/qa/cleanup-test-data.mjs --execute
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");
const manifestPath = path.join(root, "docs/qa/qa-manifest.json");
const execute = process.argv.includes("--execute");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i <= 0) continue;
    const key = trimmed.slice(0, i).trim();
    const val = trimmed.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(path.join(root, "backend/.env"));

function loadManifest() {
  if (!existsSync(manifestPath)) {
    console.error("No manifest at", manifestPath);
    process.exit(1);
  }
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

async function main() {
  const manifest = loadManifest();
  console.log(`QA cleanup ${execute ? "EXECUTE" : "DRY-RUN"} — runId ${manifest.runId}`);
  console.log("Manifest:", JSON.stringify(manifest, null, 2));

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("Set MONGODB_URI (e.g. from backend/.env)");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;

  const collections = {
    properties: db.collection("properties"),
    enquiries: db.collection("enquiries"),
    contacts: db.collection("contacts"),
    tasks: db.collection("tasks"),
    newslettersignups: db.collection("newslettersignups"),
    inboundemails: db.collection("inboundemails"),
    users: db.collection("users"),
  };

  const qaSlugFilter = { slug: { $regex: /^qa-test-/ } };
  const qaEmailFilter = {
    $or: [
      { email: { $regex: /^qa-/ } },
      ...(manifest.enquiryEmails.length ? [{ email: { $in: manifest.enquiryEmails } }] : []),
      ...(manifest.contactEmails.length ? [{ email: { $in: manifest.contactEmails } }] : []),
      ...(manifest.subscriberEmails.length ? [{ email: { $in: manifest.subscriberEmails } }] : []),
    ],
  };

  const ops = [
    {
      name: "properties by manifest slug",
      filter: manifest.listingSlugs.length
        ? { slug: { $in: manifest.listingSlugs } }
        : qaSlugFilter,
      col: collections.properties,
    },
    {
      name: "properties qa-test-* prefix",
      filter: qaSlugFilter,
      col: collections.properties,
    },
    {
      name: "enquiries by manifest",
      filter: manifest.enquiryIds.length
        ? { _id: { $in: manifest.enquiryIds.map((id) => new mongoose.Types.ObjectId(id)) } }
        : qaEmailFilter,
      col: collections.enquiries,
    },
    {
      name: "enquiries by qa email",
      filter: qaEmailFilter,
      col: collections.enquiries,
    },
    {
      name: "contacts by manifest/qa email",
      filter: qaEmailFilter,
      col: collections.contacts,
    },
    {
      name: "newsletter signups",
      filter: manifest.subscriberEmails.length
        ? { email: { $in: manifest.subscriberEmails } }
        : { email: { $regex: /^qa-/ } },
      col: collections.newslettersignups,
    },
    {
      name: "tasks by manifest id",
      filter: manifest.taskIds.length
        ? { _id: { $in: manifest.taskIds.map((id) => new mongoose.Types.ObjectId(id)) } }
        : { title: { $regex: /^QA / } },
      col: collections.tasks,
    },
    {
      name: "inbound emails by manifest id",
      filter: manifest.inboundEmailIds.length
        ? { _id: { $in: manifest.inboundEmailIds.map((id) => new mongoose.Types.ObjectId(id)) } }
        : { subject: { $regex: /^QA / } },
      col: collections.inboundemails,
    },
    {
      name: "test users (not seed admin)",
      filter: manifest.userIds.length
        ? { _id: { $in: manifest.userIds.map((id) => new mongoose.Types.ObjectId(id)) } }
        : { email: { $regex: /^qa-admin-/ } },
      col: collections.users,
    },
  ];

  let total = 0;
  for (const op of ops) {
    const count = await op.col.countDocuments(op.filter);
    console.log(`  ${op.name}: ${count} document(s)`);
    if (execute && count > 0) {
      const result = await op.col.deleteMany(op.filter);
      console.log(`    deleted ${result.deletedCount}`);
      total += result.deletedCount;
    } else {
      total += count;
    }
  }

  const remainingQaListings = await collections.properties.countDocuments(qaSlugFilter);
  const remainingQaEnquiries = await collections.enquiries.countDocuments({ email: { $regex: /^qa-/ } });
  const commercialCount = await collections.properties.countDocuments({
    assetCategory: "commercial",
    archived: { $ne: true },
    status: { $in: ["for-sale", "for-lease"] },
  });

  console.log("\nPost-cleanup verification:");
  console.log(`  qa-test-* listings remaining: ${remainingQaListings}`);
  console.log(`  qa-* enquiry emails remaining: ${remainingQaEnquiries}`);
  console.log(`  active commercial listings: ${commercialCount}`);
  console.log(`  ${execute ? "Deleted" : "Would delete"} ~${total} document(s) total`);

  await mongoose.disconnect();
  if (!execute) {
    console.log("\nRe-run with --execute to delete.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
