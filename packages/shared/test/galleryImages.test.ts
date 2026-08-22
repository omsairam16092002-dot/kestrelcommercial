import assert from "node:assert/strict";
import { test } from "node:test";
import {
  galleryImages,
  isMarketingGalleryDimensions,
  isMarketingGalleryImage,
  publicListingParagraphs,
} from "../src/galleryImages";

test("isMarketingGalleryDimensions flags developer posters and banners", () => {
  assert.equal(isMarketingGalleryDimensions(4000, 3000), true);
  assert.equal(isMarketingGalleryDimensions(4130, 7207), true);
  assert.equal(isMarketingGalleryDimensions(4000, 2504), true);
  assert.equal(isMarketingGalleryDimensions(4000, 2400), false);
  assert.equal(isMarketingGalleryDimensions(1587, 2245), false);
});

test("isMarketingGalleryImage matches marketing filenames", () => {
  assert.equal(
    isMarketingGalleryImage({ publicId: "kestrel/listings/axtra/foo/completion-banner" }),
    true,
  );
  assert.equal(isMarketingGalleryImage({ publicId: "kestrel/listings/axtra/foo/01" }), false);
});

test("galleryImages removes marketing slides but keeps real photos", () => {
  const images = [
    { publicId: "kestrel/listings/axtra/pack/01", isHero: true },
    { publicId: "kestrel/listings/axtra/pack/02" },
    { publicId: "kestrel/listings/axtra/pack/03", width: 4000, height: 3000 },
    { publicId: "kestrel/listings/axtra/pack/04", width: 4000, height: 2504 },
    { publicId: "kestrel/listings/axtra/pack/05", width: 1587, height: 2245 },
  ];
  const out = galleryImages(images);
  assert.deepEqual(
    out.map((i) => i.publicId),
    [
      "kestrel/listings/axtra/pack/01",
      "kestrel/listings/axtra/pack/02",
      "kestrel/listings/axtra/pack/05",
    ],
  );
});

test("publicListingParagraphs removes campaign marketing and sold lines", () => {
  const text = [
    "Heidelberg Heights townhouse offered through Kestrel Commercial.",
    "2 bedrooms, 2 bathrooms.",
    "Campaign timing: Q4 2026.",
    "Promotion: 5% rental guarantee for 12 months.",
    "This listing is recorded as sold.",
    "Confirm title with our desk.",
  ].join("\n\n");
  const paras = publicListingParagraphs(text, "sold");
  assert.deepEqual(paras, [
    "Heidelberg Heights townhouse offered through Kestrel Commercial.",
    "2 bedrooms, 2 bathrooms.",
    "Confirm title with our desk.",
  ]);
});
