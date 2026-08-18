import assert from "node:assert/strict";
import { test } from "node:test";
import {
  detectPortal,
  hasMinimumLeadFields,
  parseReaEnquiry,
  parseRealCommercialEnquiry,
} from "../src/services/portalParsers";

export const REA_FIXTURE = `You have received a new enquiry from realestate.com.au

Name: Jane Occupier
Email: jane.occupier@example.com
Phone: 0412 345 678
Message: Looking at this warehouse for our west-side operation.
Property: 14 Logistics Drive, Truganina
Listing ID: REA-441122
`;

export const RC_FIXTURE = `realcommercial.com.au enquiry

Contact name: Sam Tenant
Contact email: sam.tenant@example.com
Contact phone: 0431 000 038
Comments: Can we inspect next week?
Property address: 9 Database Drive Truganina VIC 3029
Listing number: RC-998877
`;

test("REA parser extracts name, contact and listing id", () => {
  const parsed = parseReaEnquiry(REA_FIXTURE);
  assert.equal(parsed.name, "Jane Occupier");
  assert.equal(parsed.email, "jane.occupier@example.com");
  assert.match(parsed.phone.replace(/\s/g, ""), /0412345678/);
  assert.match(parsed.message, /warehouse/);
  assert.equal(parsed.listingId, "REA-441122");
  assert.ok(hasMinimumLeadFields(parsed));
});

test("realcommercial parser extracts separately from REA", () => {
  const parsed = parseRealCommercialEnquiry(RC_FIXTURE);
  assert.equal(parsed.name, "Sam Tenant");
  assert.equal(parsed.email, "sam.tenant@example.com");
  assert.equal(parsed.listingId, "RC-998877");
  assert.ok(hasMinimumLeadFields(parsed));
});

test("incomplete email fails the minimum-fields gate", () => {
  const parsed = parseReaEnquiry("Hello from a portal\nThis has no contact details.");
  assert.equal(hasMinimumLeadFields(parsed), false);
});

test("detectPortal reads sending domains", () => {
  assert.equal(detectPortal("leads@realestate.com.au", "New enquiry", ""), "rea");
  assert.equal(detectPortal("alerts@realcommercial.com.au", "Enquiry", ""), "realcommercial");
});
