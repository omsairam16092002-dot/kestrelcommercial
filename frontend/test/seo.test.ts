import assert from "node:assert/strict";
import { test } from "node:test";
import { hasHeavySearchFilters, hubCanonicalPath, listingTitle } from "../lib/seo";

test("hasHeavySearchFilters detects spec filters but not side alone", () => {
  assert.equal(hasHeavySearchFilters({ side: "lease" }), false);
  assert.equal(hasHeavySearchFilters({ side: "sale", suburb: "Truganina" }), true);
  assert.equal(hasHeavySearchFilters({ side: "sale", minFloorAreaSqm: 500 }), true);
});

test("hubCanonicalPath keeps clean lease variant", () => {
  assert.equal(hubCanonicalPath("/properties/commercial", { side: "lease" }), "/properties/commercial?side=lease");
  assert.equal(hubCanonicalPath("/properties/commercial", { side: "sale" }), "/properties/commercial");
});

test("listingTitle includes address, suburb, type and side", () => {
  const title = listingTitle({
    address: "19 Paramount Road",
    suburb: "West Footscray",
    transactionSide: "sale",
    propertyType: "warehouse",
  });
  assert.match(title, /19 Paramount Road/);
  assert.match(title, /West Footscray/);
  assert.match(title, /Warehouse For Sale/i);
});
