import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { connectDb, isDbConnected } from "../db/mongoose";
import { PropertyModel } from "../models/Property";
import {
  geocodeQuery,
  pinLooksAustralian,
  suburbQuery,
} from "./geocodeAddress";

type CacheFile = Record<string, { lat: number; lng: number; label: string }>;
const CACHE_PATH = join(__dirname, "geocodeCache.json");
const pins: CacheFile = JSON.parse(readFileSync(CACHE_PATH, "utf8") || "{}");
const UA = "KestrelCommercial/1.0 (listing-map geocode; melbourne)";

type Hit = { lat: string; lon: string; display_name?: string };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function nominatim(q: string): Promise<{ lat: number; lng: number; label: string } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "au");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("q", q);
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) {
    console.warn(`Nominatim ${res.status} for ${q}`);
    return null;
  }
  const rows = (await res.json()) as Hit[];
  const hit = rows[0];
  if (!hit) return null;
  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !pinLooksAustralian(lat, lng)) return null;
  return { lat, lng, label: hit.display_name ?? q };
}

async function lookup(q: string): Promise<{ lat: number; lng: number; label: string } | null> {
  if (pins[q]) return pins[q];
  await sleep(1100);
  const hit = await nominatim(q);
  if (hit) pins[q] = hit;
  return hit;
}

type Row = {
  _id: unknown;
  slug: string;
  address: string;
  suburb: string;
  state?: string;
  postcode: string;
  lat?: number | null;
  lng?: number | null;
};

async function main() {
  await connectDb();
  if (!isDbConnected()) {
    console.error("Mongo is required to write map pins.");
    process.exit(1);
  }

  const docs = (await PropertyModel.find({ archived: { $ne: true } })
    .select("slug address suburb state postcode lat lng")
    .lean()) as unknown as Row[];

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  for (const doc of docs) {
    const hasPin =
      doc.lat != null &&
      doc.lng != null &&
      Number.isFinite(Number(doc.lat)) &&
      Number.isFinite(Number(doc.lng)) &&
      !(Number(doc.lat) === 0 && Number(doc.lng) === 0) &&
      pinLooksAustralian(Number(doc.lat), Number(doc.lng));
    if (hasPin) {
      skipped += 1;
      continue;
    }

    const streetQ = geocodeQuery(doc);
    const suburbQ = suburbQuery(doc);
    const pin = (await lookup(streetQ)) ?? (await lookup(suburbQ));
    if (!pin) {
      failed += 1;
      console.warn(`No pin: ${doc.slug} (${streetQ})`);
      continue;
    }
    await PropertyModel.updateOne({ _id: doc._id }, { $set: { lat: pin.lat, lng: pin.lng } });
    updated += 1;
    console.info(`Pinned ${doc.slug} -> ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`);
  }

  writeFileSync(CACHE_PATH, `${JSON.stringify(pins, null, 2)}\n`);
  console.info(`Done. Updated ${updated}, already had pins ${skipped}, failed ${failed}. Cache keys ${Object.keys(pins).length}.`);
  process.exit(failed && !updated ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
