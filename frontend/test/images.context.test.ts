import assert from "node:assert/strict";
import { test } from "node:test";
import {
  listingImageOriginal,
  listingImageSrc,
  listingImageSrcSet,
} from "../lib/images";

test("listingImageSrc passes gallery context through to Cloudinary URL", () => {
  const url = listingImageSrc("kestrel/listings/sample", 1600, "gallery");
  assert.match(url, /c_fill/);
  assert.match(url, /g_auto/);
  assert.match(url, /ar_16:9/);
});

test("listingImageSrc defaults to card context", () => {
  const url = listingImageSrc("kestrel/listings/sample", 1080);
  assert.match(url, /ar_4:3/);
});

test("listingImageSrcSet includes context on every width", () => {
  const srcset = listingImageSrcSet("kestrel/listings/sample", [640, 1080], "thumb");
  assert.match(srcset, /ar_3:2/);
  assert.match(srcset, /640w/);
  assert.match(srcset, /1080w/);
});

test("listingImageOriginal uses uncropped delivery", () => {
  const url = listingImageOriginal("kestrel/listings/sample", 2400);
  assert.match(url, /c_limit/);
  assert.doesNotMatch(url, /c_fill/);
});

test("local listing paths stay on /listings with gallery context", () => {
  const url = listingImageSrc("local:axtra/mitcham/01.jpg", 1600, "gallery");
  assert.match(url, /^\/_next\/image\?url=/);
  assert.match(url, /listings%2Faxtra%2Fmitcham%2F01.jpg/);
});
