import assert from "node:assert/strict";
import { test } from "node:test";
import { geocodeQuery, pinLooksAustralian, streetFromAddress } from "../src/seed/geocodeAddress";

test("streetFromAddress strips unit and lot prefixes", () => {
  assert.equal(streetFromAddress("Unit 1, 26 Dudley Street"), "26 Dudley Street");
  assert.equal(streetFromAddress("Lot 1, 14 Launceston Street"), "14 Launceston Street");
  assert.equal(streetFromAddress("G01, 1 Vine Street"), "1 Vine Street");
  assert.equal(streetFromAddress("101, 1 Vine Street"), "1 Vine Street");
  assert.equal(streetFromAddress("16A Christina Street"), "16A Christina Street");
  assert.equal(streetFromAddress("Lot 526, Sparrowhawk Drive"), "Sparrowhawk Drive");
  assert.equal(streetFromAddress("Unit 2, Marshall Avenue (1 Eden Court development)"), "Marshall Avenue");
});

test("geocodeQuery includes suburb and postcode", () => {
  assert.equal(
    geocodeQuery({
      address: "Unit 3, 26 Dudley Street",
      suburb: "Mitcham",
      state: "VIC",
      postcode: "3132",
    }),
    "26 Dudley Street, Mitcham VIC 3132, Australia",
  );
  assert.equal(pinLooksAustralian(-37.82, 145.19), true);
  assert.equal(pinLooksAustralian(0, 0), false);
});
