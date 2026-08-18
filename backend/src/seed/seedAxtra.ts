import { readFileSync } from "node:fs";
import { join } from "node:path";
import { connectDb, isDbConnected } from "../db/mongoose";
import { PropertyModel } from "../models/Property";
import { AXTRA_LISTINGS } from "./axtraListings";
import { geocodeQuery, pinLooksAustralian, suburbQuery } from "./geocodeAddress";

type Pin = { lat: number; lng: number; label: string };
let geocodeCache: Record<string, Pin> = {};
try {
  geocodeCache = JSON.parse(readFileSync(join(__dirname, "geocodeCache.json"), "utf8")) as Record<string, Pin>;
} catch {
  geocodeCache = {};
}

function cachedPin(listing: { address: string; suburb: string; state?: string; postcode: string }) {
  const hit = geocodeCache[geocodeQuery(listing)] ?? geocodeCache[suburbQuery(listing)];
  if (!hit || !pinLooksAustralian(hit.lat, hit.lng)) return { lat: null, lng: null };
  return { lat: hit.lat, lng: hit.lng };
}

async function seedAxtra() {
  await connectDb();
  if (!isDbConnected()) {
    console.error("Cannot import Axtra listings without MONGODB_URI.");
    process.exit(1);
  }

  const slugs = AXTRA_LISTINGS.map((p) => p.slug);
  const unique = new Set(slugs);
  if (unique.size !== slugs.length) {
    const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
    throw new Error(`Duplicate slugs: ${[...new Set(dupes)].join(", ")}`);
  }

  let created = 0;
  let updated = 0;
  for (const listing of AXTRA_LISTINGS) {
    const existing = (await PropertyModel.findOne({ slug: listing.slug })
      .select("images floorplanPublicId lat lng")
      .lean()) as {
      images?: { publicId: string; isHero?: boolean; alt?: string }[];
      floorplanPublicId?: string | null;
      lat?: number | null;
      lng?: number | null;
    } | null;
    const keepImages = Boolean(existing?.images?.length);
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
          images: keepImages ? existing?.images ?? [] : [],
          floorplanPublicId: keepFloorplan ? existing?.floorplanPublicId ?? null : null,
          lat: keepPin ? existing?.lat ?? null : cached.lat,
          lng: keepPin ? existing?.lng ?? null : cached.lng,
        },
        $setOnInsert: { archived: false },
      },
      { upsert: true },
    );
    if (result.upsertedCount) created += 1;
    else updated += 1;
  }

  console.info(
    `Axtra import: ${AXTRA_LISTINGS.length} listings (${created} created, ${updated} updated). Photos left empty unless already uploaded.`,
  );
  process.exit(0);
}

seedAxtra().catch((err) => {
  console.error(err);
  process.exit(1);
});
