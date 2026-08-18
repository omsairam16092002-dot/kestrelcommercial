import assert from "node:assert/strict";
import { test } from "node:test";
import { DEMO_LISTING_SLUGS, INFO_PACK_LISTINGS } from "../src/seed/infoPackListings";

test("information-pack import has unique slugs and no published Drive URLs", () => {
  const slugs = INFO_PACK_LISTINGS.map((p) => p.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.equal(INFO_PACK_LISTINGS.length, 6);
  for (const p of INFO_PACK_LISTINGS) {
    assert.ok(p.address);
    assert.ok(p.suburb);
    assert.match(p.postcode, /^\d{4}$/);
    assert.doesNotMatch(p.description, /drive\.google\.com/i);
    assert.ok(p.internalNotes.includes("drive.google.com"));
    assert.doesNotMatch(p.description, /commission/i);
    assert.equal(p.priceLabel, "Contact agent");
    assert.equal(p.priceValue, null);
  }
});

test("starter demo slugs are listed for purge", () => {
  assert.ok(DEMO_LISTING_SLUGS.includes("14-logistics-drive-truganina"));
  assert.ok(DEMO_LISTING_SLUGS.includes("sample-1-atlas-drive-truganina"));
});
