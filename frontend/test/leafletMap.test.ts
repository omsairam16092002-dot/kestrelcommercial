import assert from "node:assert/strict";
import { test } from "node:test";
import { mapTileLayerConfig } from "../lib/leafletMap";

test("mapTileLayerConfig uses Carto light tiles when NEXT_PUBLIC_CARTO_API_KEY is set", () => {
  const prev = process.env.NEXT_PUBLIC_CARTO_API_KEY;
  process.env.NEXT_PUBLIC_CARTO_API_KEY = "test-carto-key";
  try {
    const cfg = mapTileLayerConfig();
    assert.match(cfg.url, /basemaps\.cartocdn\.com\/light_all/);
    assert.match(cfg.url, /key=test-carto-key/);
    assert.match(cfg.url, /\{r\}/);
    assert.equal(cfg.subdomains, "abcd");
    assert.equal(cfg.maxZoom, 20);
    assert.equal(cfg.usesCarto, true);
    assert.match(cfg.attribution, /CARTO/);
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_CARTO_API_KEY;
    else process.env.NEXT_PUBLIC_CARTO_API_KEY = prev;
  }
});

test("mapTileLayerConfig falls back to OpenStreetMap without a Carto key", () => {
  const prev = process.env.NEXT_PUBLIC_CARTO_API_KEY;
  delete process.env.NEXT_PUBLIC_CARTO_API_KEY;
  try {
    const cfg = mapTileLayerConfig();
    assert.match(cfg.url, /tile\.openstreetmap\.org/);
    assert.equal(cfg.usesCarto, false);
    assert.doesNotMatch(cfg.attribution, /CARTO/);
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_CARTO_API_KEY;
    else process.env.NEXT_PUBLIC_CARTO_API_KEY = prev;
  }
});
