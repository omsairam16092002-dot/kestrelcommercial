import assert from "node:assert/strict";
import { test } from "node:test";
import { AGENTS, type Property } from "@kestrel/shared";
import { propertyToReaxml, syndicationStatus } from "../src/services/reaxml";

const listing: Property = {
  id: "reaxml-fixture",
  slug: "19-23-paramount-road-west-footscray",
  address: "19-23 Paramount Road",
  suburb: "West Footscray",
  state: "VIC",
  postcode: "3012",
  status: "for-sale",
  transactionSide: "sale",
  priceLabel: "Contact agent",
  priceValue: null,
  floorAreaSqm: null,
  landAreaSqm: null,
  clearSpanM: null,
  rollerDoorM: null,
  threePhasePower: false,
  hardstand: false,
  zoning: "TBC",
  propertyType: "warehouse",
  description: "Yard 3012 information pack listing used only for REAXML shape tests.",
  images: [],
  agentLicenceNumber: AGENTS[0].licenceNumber,
  featured: false,
  createdAt: "2026-08-17T00:00:00.000Z",
  updatedAt: "2026-08-17T00:00:00.000Z",
};

test("REAXML for a listing contains address and is well-formed", () => {
  const xml = propertyToReaxml(listing, AGENTS[0]);
  assert.match(xml, /^<\?xml version="1.0"/);
  assert.match(xml, /<propertyList /);
  assert.match(xml, /<street>19-23 Paramount Road<\/street>/);
  assert.match(xml, /<suburb>West Footscray<\/suburb>/);
  assert.match(xml, /<commercialListingType value="sale"\/>/);
});

test("syndicationStatus is honest about missing credentials", () => {
  assert.equal(syndicationStatus(undefined), "not connected");
  assert.equal(syndicationStatus(""), "not connected");
  assert.equal(syndicationStatus("pending"), "pending setup");
  assert.equal(syndicationStatus("live-provider-key"), "active");
});
