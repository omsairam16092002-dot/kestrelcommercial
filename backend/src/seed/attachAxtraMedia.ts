import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, extname, basename } from "node:path";
import { tmpdir } from "node:os";
import { connectDb, isDbConnected } from "../db/mongoose";
import { PropertyModel } from "../models/Property";
import { AXTRA_LISTINGS } from "./axtraListings";

const MAX_IMAGES = 8;
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const FRONTEND_LISTINGS = join(process.cwd(), "..", "frontend", "public", "listings", "axtra");

/** How many remaining packs to pull this run. 0 = all. */
const LIMIT = Number(process.env.AXTRA_MEDIA_LIMIT ?? "0");

function packUrl(notes: string) {
  const match = notes.match(/Campaign pack: (https:\/\/www\.dropbox\.com\/\S+)/);
  return match?.[1]?.replace(/[.,;]+$/, "") ?? "";
}

function downloadable(url: string) {
  const u = new URL(url);
  u.searchParams.set("dl", "1");
  return u.toString();
}

function walkFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkFiles(p));
    else out.push(p);
  }
  return out;
}

function pickImages(files: string[]) {
  const images = files.filter((f) => IMAGE_EXT.has(extname(f).toLowerCase()));
  const scored = images
    .map((file) => {
      const n = basename(file).toLowerCase();
      let score = 0;
      if (/(hero|front|facade|street|external|elevat)/.test(n)) score += 5;
      if (/(living|kitchen|bedroom|interior|bathroom)/.test(n)) score += 2;
      if (/(flyer|banner|promo|promotion|completion|contemporary|option|incentive|guarantee|rebate|marketing|campaign)/.test(n))
        score -= 20;
      if (/(plan|site|lot)/.test(n)) score -= 1;
      const size = statSync(file).size;
      if (size < 40_000 || size > 12_000_000) score -= 8;
      return { file, score, size };
    })
    .filter((row) => row.size >= 40_000 && row.size <= 12_000_000)
    .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));
  const picked: string[] = [];
  for (const row of scored) {
    if (picked.length >= MAX_IMAGES) break;
    picked.push(row.file);
  }
  return picked;
}

function folderKey(slugs: string[]) {
  return (slugs[0] ?? "pack").replace(/-(unit|lot)-\d+.*$/i, "").replace(/-g0\d.*$/i, "").slice(0, 60);
}

function alreadyAttached(key: string) {
  const dest = join(FRONTEND_LISTINGS, key);
  if (!existsSync(dest)) return false;
  return readdirSync(dest).some((name) => IMAGE_EXT.has(extname(name).toLowerCase()));
}

async function attachPack(url: string, slugs: string[], key: string) {
  const work = join(tmpdir(), `axtra-${key}`);
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  const zip = join(work, "pack.zip");
  execFileSync(
    "curl.exe",
    [
      "-L",
      "--fail",
      "--retry",
      "5",
      "--retry-delay",
      "5",
      "--retry-all-errors",
      "--connect-timeout",
      "30",
      "--max-time",
      "1200",
      "-o",
      zip,
      downloadable(url),
    ],
    { stdio: "inherit" },
  );
  execFileSync("tar", ["-xf", zip, "-C", work], { stdio: "inherit" });
  const images = pickImages(walkFiles(work));
  if (!images.length) {
    console.warn(`No usable images in pack ${key}`);
    rmSync(work, { recursive: true, force: true });
    return 0;
  }
  const dest = join(FRONTEND_LISTINGS, key);
  mkdirSync(dest, { recursive: true });
  const rows: { publicId: string; isHero?: boolean; alt?: string }[] = [];
  images.forEach((file, i) => {
    const ext = extname(file).toLowerCase() || ".jpg";
    const name = `${String(i + 1).padStart(2, "0")}${ext}`;
    copyFileSync(file, join(dest, name));
    rows.push({
      publicId: `local:axtra/${key}/${name}`,
      isHero: i === 0,
      alt: slugs[0] ?? key,
    });
  });
  await PropertyModel.updateMany({ slug: { $in: slugs } }, { $set: { images: rows } });
  rmSync(work, { recursive: true, force: true });
  console.info(`Attached ${rows.length} image(s) from ${key} → ${slugs.length} listing(s)`);
  return slugs.length;
}

async function main() {
  await connectDb();
  if (!isDbConnected()) {
    console.error("Mongo required.");
    process.exit(1);
  }

  const grouped = new Map<string, { url: string; slugs: string[] }>();
  for (const listing of AXTRA_LISTINGS) {
    const url = packUrl(listing.internalNotes);
    if (!url) continue;
    const bucket = grouped.get(url) ?? { url, slugs: [] };
    bucket.slugs.push(listing.slug);
    grouped.set(url, bucket);
  }

  const preferred = [
    "leakes",
    "corio",
    "soderlund",
    "vine-street",
    "waverley",
    "almray",
  ];
  const queued = [...grouped.values()]
    .map((pack) => ({ ...pack, key: folderKey(pack.slugs) }))
    .filter((pack) => {
      if (alreadyAttached(pack.key)) {
        console.info(`Skip ${pack.key} — photos already on disk`);
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const rank = (item: { slugs: string[] }) => {
        const sample = item.slugs.join(" ");
        const idx = preferred.findIndex((p) => sample.includes(p));
        return idx === -1 ? 99 : idx;
      };
      return rank(a) - rank(b);
    });

  const batch = LIMIT > 0 ? queued.slice(0, LIMIT) : queued;
  mkdirSync(FRONTEND_LISTINGS, { recursive: true });
  writeFileSync(join(FRONTEND_LISTINGS, "..", ".gitkeep"), "");

  console.info(`Pulling ${batch.length} remaining pack(s).`);
  let listings = 0;
  const failed: string[] = [];
  for (const [i, pack] of batch.entries()) {
    console.info(`[${i + 1}/${batch.length}] ${pack.key} (${pack.slugs.length} listings)`);
    try {
      listings += await attachPack(pack.url, pack.slugs, pack.key);
    } catch (err) {
      failed.push(pack.key);
      console.warn(`Pack failed for ${pack.key}:`, err instanceof Error ? err.message : err);
    }
  }
  console.info(`Finished. Listings updated: ${listings}. Failed packs: ${failed.length}${failed.length ? ` (${failed.join(", ")})` : ""}. Still queued after this run: ${queued.length - batch.length}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
