import assert from "node:assert/strict";
import { test } from "node:test";
import { formatLandArea, listingPreviewSpecs, listingSearchSpecs } from "@kestrel/shared";
import { AXTRA_LISTINGS } from "../src/seed/axtraListings";

test("Axtra import has unique slugs and one Mitcham campaign", () => {
  const slugs = AXTRA_LISTINGS.map((p) => p.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  const mitcham = AXTRA_LISTINGS.filter((p) => p.slug.includes("26-dudley-street-mitcham"));
  assert.equal(mitcham.length, 3);
  assert.equal(AXTRA_LISTINGS.length, 155);
});

test("channel-list statuses match Sold, Reserved and Under contract", () => {
  const sold = AXTRA_LISTINGS.filter((p) => p.status === "sold");
  const reserved = AXTRA_LISTINGS.filter((p) => p.priceLabel === "Reserved");
  const underContract = AXTRA_LISTINGS.filter((p) => p.priceLabel === "Under contract");
  assert.equal(sold.length, 22);
  assert.ok(sold.every((p) => p.priceLabel === "Sold"));
  assert.equal(reserved.length, 2);
  assert.equal(underContract.length, 7);
  assert.ok(!AXTRA_LISTINGS.some((p) => p.status === "under-offer" && p.priceLabel === "Contact agent"));
  const mercury = AXTRA_LISTINGS.find((p) => p.slug === "lot-218-6-mercury-avenue-fraser-rise");
  assert.equal(mercury?.priceLabel, "Under contract");
  assert.equal(mercury?.priceValue, null);
});

test("spot-check asking prices from the current Axtra sheet", () => {
  const bySlug = Object.fromEntries(AXTRA_LISTINGS.map((p) => [p.slug, p]));
  assert.equal(bySlug["26-dudley-street-mitcham-unit-1"]?.priceValue, 1_450_000);
  assert.equal(bySlug["26-dudley-street-mitcham-unit-2"]?.priceValue, 1_360_000);
  assert.equal(bySlug["26-dudley-street-mitcham-unit-3"]?.priceValue, 1_250_000);
  assert.equal(bySlug["24-soderlund-drive-doncaster"]?.priceValue, 2_300_000);
  assert.equal(bySlug["18-almray-place-glen-waverley"]?.priceValue, 1_680_000);
  assert.equal(bySlug["1-vine-street-heidelberg-g03"]?.priceValue, 750_750);
  assert.equal(bySlug["9-eildon-street-pakenham"]?.priceValue, 810_000);
  assert.equal(bySlug["12-joyhill-avenue-box-hill-south"]?.priceValue, 3_150_000);
  assert.equal(bySlug["63-davis-street-burwood-east"]?.priceValue, 3_150_000);
  assert.equal(bySlug["32-walker-street-doncaster"]?.priceValue, 3_850_000);
  assert.equal(bySlug["413-manningham-road-doncaster"]?.priceValue, 2_450_000);
  assert.equal(bySlug["93-101-poath-road-murrumbeena-403"]?.priceValue, 680_000);
  assert.equal(bySlug["91-winfield-road-balwyn-north-unit-2"]?.priceValue, 2_280_000);
  assert.equal(bySlug["147-hull-road-croydon-unit-1"]?.priceValue, 2_100_000);
  assert.equal(bySlug["1-eden-court-doncaster-unit-1"]?.priceValue, 2_360_000);
  assert.equal(bySlug["8-finlay-street-frankston-unit-1"]?.priceValue, 1_280_000);
  assert.equal(bySlug["4-norman-court-ringwood-lot-1"]?.priceValue, 1_450_000);
  assert.equal(bySlug["30-32-clingin-street-reservoir-unit-1"]?.priceValue, 965_000);
  assert.equal(bySlug["775-point-nepean-road-rosebud-lot-8"]?.priceValue, 1_088_000);
  assert.equal(bySlug["118-corio-street-geelong"]?.priceValue, 3_000_000);
  assert.equal(bySlug["14-launceston-street-williamstown-north-lot-1"]?.priceLabel, "$905,982 + GST");
  assert.equal(bySlug["191-leakes-road-truganina-lot-39"]?.priceValue, 808_038);
  assert.equal(bySlug["387-myall-street-cardross"]?.landAreaSqm, 269_100);
  assert.equal(bySlug["ceduna-estate-clyde-north-lot-3767"]?.priceValue, 595_300);
  assert.equal(bySlug["12-wingate-avenue-mount-waverley-unit-1"]?.priceLabel, "Reserved");
  assert.equal(bySlug["lot-218-6-mercury-avenue-fraser-rise"]?.priceLabel, "Under contract");
  assert.ok(!AXTRA_LISTINGS.some((p) => /alway|novella|livingston|finley|willowvane/i.test(`${p.slug} ${p.address}`)));
});

test("every Axtra listing has required public fields and no leaked commission", () => {
  assert.ok(AXTRA_LISTINGS.length >= 150);
  for (const p of AXTRA_LISTINGS) {
    assert.ok(p.slug, `missing slug ${p.address}`);
    assert.ok(p.address);
    assert.ok(p.suburb);
    assert.match(p.postcode, /^\d{4}$/, `${p.slug} postcode`);
    assert.equal(p.state, "VIC");
    assert.ok(["for-sale", "under-offer", "sold"].includes(p.status), `${p.slug} status ${p.status}`);
    assert.equal(p.transactionSide, "sale");
    assert.ok(p.priceLabel);
    assert.ok(p.description.length > 80, `${p.slug} description too short`);
    assert.ok(p.internalNotes.includes("Commission:"));
    assert.ok(p.internalNotes.includes("Campaign pack: https://www.dropbox.com/"));
    assert.doesNotMatch(p.description, /commission/i, `${p.slug} published commission`);
    assert.doesNotMatch(p.description, /dropbox\.com/i, `${p.slug} public dropbox`);
    assert.equal(p.images.length, 0);
    assert.equal(p.featured, false);
    assert.equal(p.syndicateToRealcommercial, false);
    assert.equal(p.agentLicenceNumber.length > 0, true);
  }
});

test("commercial warehouses are typed and GST-exclusive; houses are not", () => {
  const warehouses = AXTRA_LISTINGS.filter((p) => p.propertyType === "warehouse");
  assert.ok(warehouses.length >= 10);
  for (const p of warehouses.filter((row) => row.status === "for-sale")) {
    assert.match(p.priceLabel, /\+ GST/);
  }
  const houses = AXTRA_LISTINGS.filter((p) => p.propertyType === "house" && p.status === "for-sale");
  assert.ok(houses.length > 10);
  for (const p of houses) {
    assert.doesNotMatch(p.priceLabel, /\+ GST/);
    assert.ok(p.bedrooms);
  }
  const geelong = AXTRA_LISTINGS.find((p) => p.slug === "118-corio-street-geelong");
  assert.equal(geelong?.propertyType, "development-land");
  const vineyard = AXTRA_LISTINGS.find((p) => p.slug === "387-myall-street-cardross");
  assert.equal(vineyard?.propertyType, "rural");
  assert.match(formatLandArea(vineyard?.landAreaSqm ?? 0), /ha/);
});

test("preview specs switch between residential and industrial", () => {
  const house = AXTRA_LISTINGS.find((p) => p.slug === "24-soderlund-drive-doncaster");
  assert.ok(house);
  const houseKeys = listingPreviewSpecs(house as never).map((r) => r.k);
  assert.deepEqual(houseKeys, ["Beds", "Baths", "Cars", "Size"]);
  const searchKeys = listingSearchSpecs(house as never).map((r) => r.k);
  assert.ok(searchKeys.includes("Beds"));
  assert.ok(!searchKeys.includes("Span"));

  const warehouse = AXTRA_LISTINGS.find((p) => p.slug.includes("launceston") && p.status === "for-sale");
  assert.ok(warehouse);
  const industrialKeys = listingPreviewSpecs(warehouse as never).map((r) => r.k);
  assert.ok(industrialKeys.includes("GFA"));
  assert.ok(industrialKeys.includes("Span"));
});
