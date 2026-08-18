import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { extname, join } from "node:path";
import { connectDb, isDbConnected } from "../db/mongoose";
import { PropertyModel } from "../models/Property";
import { DEMO_LISTING_SLUGS, INFO_PACK_LISTINGS } from "./infoPackListings";
import { geocodeQuery, pinLooksAustralian, suburbQuery } from "./geocodeAddress";

type Pin = { lat: number; lng: number; label: string };
let geocodeCache: Record<string, Pin> = {};
try {
  geocodeCache = JSON.parse(readFileSync(join(__dirname, "geocodeCache.json"), "utf8")) as Record<string, Pin>;
} catch {
  geocodeCache = {};
}

const FRONTEND = join(process.cwd(), "..", "frontend", "public", "listings", "infopacks");
const TMP_JPEG = join(process.cwd(), "tmp", "info-packs", "pdf-jpegs");
const MAX_IMAGES = 8;
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

type DriveFile = { id: string; name: string; thumbnail?: boolean };

const MEDIA: Record<string, DriveFile[]> = {
  "19-23-paramount-road-west-footscray": [
    { id: "1tqW1Hg1TXOSw163C7xNK-x6yFTUpVBwm", name: "01.jpg" },
    { id: "16KP0AnsOQ1FCl2uVkfIKsAT0vB9n4hji", name: "02.jpg" },
    { id: "1IXOdXQAc9AwBlQr_iiTrxTIbne1uIXBS", name: "03.jpg" },
    { id: "1xbaj7WaqWvmt3RVuRLKtTKRURfwfim1D", name: "04.jpg" },
    { id: "1E5Sm5ZHvyKnxqkeIHUoC1dsDthXW62OS", name: "05.jpg" },
    { id: "1WIhb3Al-96JMcwY7uCo0qhBgHgmUB3rO", name: "06.jpg" },
    { id: "1M7pwOdpLwk8UN6QrkN4Uoao3UwRTZ0UI", name: "07.jpg" },
    { id: "1GUxta31x4d0lzzkWy-uazvGykt5t2eLs", name: "08.jpg" },
  ],
  "g03-288-albert-street-brunswick": [
    { id: "1AwbgPrQcSPZI3efkVk0MrX6o-qepRokx", name: "01.jpg", thumbnail: true },
    { id: "1LCV7Ki3GiaCtjFnj94HkiVZQFe1KhyOM", name: "02.jpg", thumbnail: true },
    { id: "1PhsAZ7qi4aUyOf0GXhSq64RAuw5v98Ol", name: "03.jpg", thumbnail: true },
    { id: "11_5xWBZFCV9owofmep82L5Vj8O-Nb8KN", name: "04.jpg", thumbnail: true },
    { id: "1hAEWfj-JkUJQSo0lZvZ5Qzc2tqi0wlwT", name: "05.jpg", thumbnail: true },
  ],
  "g02b-288-albert-street-brunswick": [
    { id: "1ZJkdPbBSaerAvUF2xEAYfXc364_VtJka", name: "01.jpg" },
    { id: "1oBSLF5dO0UHGrxcCX9aYjZd2v4_6kgl9", name: "02.jpg" },
    { id: "1B7I_y8qaj2J-JrPGF6b1LABbYWPztNVo", name: "03.jpg" },
    { id: "12MWSIXBj0--Lqe6x1Ty-HyKoClzmbhn7", name: "04.jpg" },
  ],
  "g05b-288-albert-street-brunswick": [
    { id: "1cac5o-LydznVAkoXgAOL51SpdCX4dhlh", name: "01.jpg" },
    { id: "1Z9shYozAoRYLqH4y31Kkl9s6K-Z7jCAM", name: "02.jpg" },
    { id: "1ltepyqQecfJ-B51h6VP3dowVb04ByhnT", name: "03.jpg" },
    { id: "1FdeHR3Js2OUHhFKFk1hj8QoEXun9RIqK", name: "04.jpg" },
  ],
};

const PACK_PAGES: Record<string, { dir: string; files: string[] }> = {
  "20-lecky-road-officer": {
    dir: join(TMP_JPEG, "officer-20-lecky-proposal"),
    files: ["03.jpg", "06.jpg", "05.jpg", "02.jpg"],
  },
  "34-mitchell-street-kalkallo": {
    dir: join(TMP_JPEG, "kalkallo-cp01a"),
    files: ["01.jpg", "02.jpg", "03.jpg"],
  },
};

function cachedPin(listing: { address: string; suburb: string; state?: string; postcode: string }) {
  const hit = geocodeCache[geocodeQuery(listing)] ?? geocodeCache[suburbQuery(listing)];
  if (!hit || !pinLooksAustralian(hit.lat, hit.lng)) return { lat: null, lng: null };
  return { lat: hit.lat, lng: hit.lng };
}

function looksLikeImage(file: string) {
  if (!existsSync(file)) return false;
  const buf = readFileSync(file);
  if (buf.length < 20_000) return false;
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const png = buf[0] === 0x89 && buf[1] === 0x50;
  const webp = buf.length > 12 && buf.subarray(8, 12).toString("ascii") === "WEBP";
  return jpeg || png || webp;
}

function downloadDrive(id: string, dest: string, thumbnail = false) {
  mkdirSync(join(dest, ".."), { recursive: true });
  const url = thumbnail
    ? `https://drive.google.com/thumbnail?id=${id}&sz=w2400`
    : `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;
  execFileSync(
    "curl.exe",
    ["-L", "--fail", "--retry", "4", "--retry-delay", "3", "--connect-timeout", "20", "--max-time", "300", "-o", dest, url],
    { stdio: "inherit" },
  );
}

function attachFolder(slug: string, alt: string) {
  const dest = join(FRONTEND, slug);
  mkdirSync(dest, { recursive: true });
  const rows: { publicId: string; isHero?: boolean; alt?: string }[] = [];

  for (const file of MEDIA[slug] ?? []) {
    if (rows.length >= MAX_IMAGES) break;
    const destFile = join(dest, file.name);
    if (!looksLikeImage(destFile)) {
      try {
        downloadDrive(file.id, destFile, Boolean(file.thumbnail));
      } catch (err) {
        console.warn(`Drive download failed ${file.id}:`, err);
        continue;
      }
    }
    if (!looksLikeImage(destFile)) {
      try {
        unlinkSync(destFile);
      } catch {
        /* ignore */
      }
      continue;
    }
    rows.push({
      publicId: `local:infopacks/${slug}/${file.name}`,
      isHero: rows.length === 0,
      alt,
    });
  }

  const pages = PACK_PAGES[slug];
  if (pages && existsSync(pages.dir)) {
    for (const name of pages.files) {
      if (rows.length >= MAX_IMAGES) break;
      const src = join(pages.dir, name);
      if (!looksLikeImage(src)) continue;
      const destName = `${String(rows.length + 1).padStart(2, "0")}.jpg`;
      copyFileSync(src, join(dest, destName));
      rows.push({
        publicId: `local:infopacks/${slug}/${destName}`,
        isHero: rows.length === 0,
        alt,
      });
    }
  }

  if (!rows.length) {
    const leftover = existsSync(dest)
      ? readdirSync(dest).filter((n) => IMAGE_EXT.has(extname(n).toLowerCase()))
      : [];
    leftover.sort().slice(0, MAX_IMAGES).forEach((name, i) => {
      rows.push({
        publicId: `local:infopacks/${slug}/${name}`,
        isHero: i === 0,
        alt,
      });
    });
  }

  return rows;
}

async function seedInfoPacks() {
  await connectDb();
  if (!isDbConnected()) {
    console.error("Cannot import information packs without MONGODB_URI.");
    process.exit(1);
  }

  const slugs = INFO_PACK_LISTINGS.map((p) => p.slug);
  if (new Set(slugs).size !== slugs.length) throw new Error("Duplicate information-pack slugs");

  const demo = await PropertyModel.deleteMany({ slug: { $in: DEMO_LISTING_SLUGS } });
  const junk = await PropertyModel.deleteMany({
    $or: [{ slug: /^sample-/ }, { slug: /^node-test-/ }, { address: /^SAMPLE/ }],
  });
  console.info(`Removed ${demo.deletedCount} demo listing(s) and ${junk.deletedCount} test listing(s).`);

  let created = 0;
  let updated = 0;
  for (const listing of INFO_PACK_LISTINGS) {
    const existing = (await PropertyModel.findOne({ slug: listing.slug })
      .select("images floorplanPublicId lat lng")
      .lean()) as {
      images?: { publicId: string; isHero?: boolean; alt?: string }[];
      floorplanPublicId?: string | null;
      lat?: number | null;
      lng?: number | null;
    } | null;

    const attached = attachFolder(listing.slug, listing.address);
    const keepImages = Boolean(existing?.images?.length) && attached.length === 0;
    const keepFloorplan = Boolean(existing?.floorplanPublicId);
    const keepPin = Boolean(
      existing &&
        existing.lat != null &&
        existing.lng != null &&
        Number.isFinite(Number(existing.lat)) &&
        Number.isFinite(Number(existing.lng)) &&
        !(Number(existing.lat) === 0 && Number(existing.lng) === 0),
    );
    const cached = cachedPin(listing);

    const result = await PropertyModel.updateOne(
      { slug: listing.slug },
      {
        $set: {
          ...listing,
          images: keepImages ? existing?.images ?? [] : attached,
          floorplanPublicId: keepFloorplan ? existing?.floorplanPublicId ?? null : listing.floorplanPublicId,
          lat: keepPin ? existing?.lat ?? null : cached.lat,
          lng: keepPin ? existing?.lng ?? null : cached.lng,
        },
        $setOnInsert: { archived: false },
      },
      { upsert: true },
    );
    if (result.upsertedCount) created += 1;
    else updated += 1;
    console.info(`${listing.slug}: ${attached.length} image(s)`);
  }

  writeFileSync(
    join(process.cwd(), "tmp", "info-packs", "seed-log.json"),
    JSON.stringify({ created, updated, slugs, removedDemos: demo.deletedCount }, null, 2),
  );
  console.info(`Information packs: ${INFO_PACK_LISTINGS.length} listings (${created} created, ${updated} updated).`);
  process.exit(0);
}

seedInfoPacks().catch((err) => {
  console.error(err);
  process.exit(1);
});
