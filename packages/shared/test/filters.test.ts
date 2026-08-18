import assert from "node:assert/strict";
import { test } from "node:test";
import { hasMapCoordinates, latLngPair } from "../src/filters";

test("latLngPair rejects missing, NaN and non-finite pins", () => {
  assert.equal(latLngPair({ lat: null, lng: null }), null);
  assert.equal(latLngPair({ lat: undefined, lng: 144.7 }), null);
  assert.equal(latLngPair({ lat: Number.NaN, lng: 144.7 }), null);
  assert.equal(latLngPair({ lat: -37.8, lng: Number.POSITIVE_INFINITY }), null);
  assert.deepEqual(latLngPair({ lat: -37.82, lng: 144.76 }), [-37.82, 144.76]);
});

test("hasMapCoordinates is false for Axtra stock with no pin", () => {
  assert.equal(hasMapCoordinates({ lat: null, lng: null }), false);
  assert.equal(hasMapCoordinates({ lat: Number.NaN, lng: Number.NaN }), false);
  assert.equal(hasMapCoordinates({ lat: 0, lng: 0 }), false);
  assert.equal(latLngPair({ lat: 0, lng: 0 }), null);
  assert.equal(hasMapCoordinates({ lat: -37.82, lng: 144.76 }), true);
});
