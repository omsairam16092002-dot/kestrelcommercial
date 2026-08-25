import assert from "node:assert/strict";
import { test } from "node:test";
import { cloudinaryUrl, isStockImageId, resolveImageSrc } from "../src/images";

test("isStockImageId treats empty and unsplash: as stock", () => {
  assert.equal(isStockImageId(undefined), true);
  assert.equal(isStockImageId(null), true);
  assert.equal(isStockImageId(""), true);
  assert.equal(isStockImageId("   "), true);
  assert.equal(isStockImageId("unsplash:photo-1560250097-0b93528c311a"), true);
  assert.equal(isStockImageId("kestrel/agents/mfntqffneeizxmmfhqwi"), false);
  assert.equal(isStockImageId("local:axtra/mitcham/01.jpg"), false);
});

test("resolveImageSrc uses Unsplash only for stock ids", () => {
  const stock = resolveImageSrc("unsplash:photo-1560250097-0b93528c311a", "dne4fejan", { width: 800 });
  assert.match(stock, /images\.unsplash\.com\/photo-1560250097-0b93528c311a/);
  assert.doesNotMatch(stock, /res\.cloudinary\.com/);

  const empty = resolveImageSrc("", "dne4fejan");
  assert.match(empty, /images\.unsplash\.com/);
});

test("resolveImageSrc never maps a Cloudinary public id to Unsplash", () => {
  const id = "kestrel/agents/mfntqffneeizxmmfhqwi";
  const withCloud = resolveImageSrc(id, "dne4fejan", { width: 1400 });
  assert.equal(withCloud, cloudinaryUrl("dne4fejan", id, { width: 1400 }));
  assert.match(withCloud, /res\.cloudinary\.com\/dne4fejan/);
  assert.doesNotMatch(withCloud, /unsplash/);

  const withoutCloud = resolveImageSrc(id);
  assert.equal(withoutCloud, "");
  assert.doesNotMatch(withoutCloud, /unsplash/);
});

test("resolveImageSrc keeps absolute http urls", () => {
  const url = "https://res.cloudinary.com/dne4fejan/image/upload/v1/kestrel/agents/x.jpg";
  assert.equal(resolveImageSrc(url, "dne4fejan"), url);
});

test("resolveImageSrc serves local listing files from /listings", () => {
  assert.equal(resolveImageSrc("local:axtra/mitcham/01.jpg"), "/listings/axtra/mitcham/01.jpg");
});

test("resolveImageSrc gallery context uses smart crop at 16:9", () => {
  const id = "kestrel/listings/sample";
  const url = resolveImageSrc(id, "dne4fejan", { width: 1600, context: "gallery" });
  assert.match(url, /c_fill/);
  assert.match(url, /g_auto/);
  assert.match(url, /ar_16:9/);
  assert.match(url, /w_1600/);
});

test("resolveImageSrc original context uses c_limit without fill crop", () => {
  const id = "kestrel/listings/sample";
  const url = resolveImageSrc(id, "dne4fejan", { width: 2400, context: "original" });
  assert.match(url, /c_limit/);
  assert.doesNotMatch(url, /c_fill/);
  assert.match(url, /w_2400/);
});

test("resolveImageSrc card context uses 4:3 smart crop", () => {
  const id = "kestrel/listings/sample";
  const url = resolveImageSrc(id, "dne4fejan", { width: 1080, context: "card" });
  assert.match(url, /c_fill,g_auto,ar_4:3/);
});

test("resolveImageSrc portrait context uses face gravity at 4:5", () => {
  const id = "kestrel/agents/jignesh";
  const url = resolveImageSrc(id, "dne4fejan", { width: 1400, context: "portrait" });
  assert.match(url, /c_fill/);
  assert.match(url, /g_face/);
  assert.match(url, /ar_4:5/);
  assert.match(url, /w_1400/);
});
