import assert from "node:assert/strict";
import { test } from "node:test";
import { ABOUT_LEAD_STATEMENT } from "@kestrel/shared";
import { corridorProof } from "../lib/campaignPhoto";
import type { Property } from "@kestrel/shared";

const DUPLICATE_HEADLINE =
  "Understand the building. Understand the client. Write the strategy that gets it done.";

test("ABOUT_LEAD_STATEMENT is a single sentence for the lead intro", () => {
  assert.match(ABOUT_LEAD_STATEMENT, /One desk from first enquiry/);
  assert.equal(ABOUT_LEAD_STATEMENT.split(".").filter(Boolean).length, 1);
});

test("corridorProof tagline must not be reused on About page copy", () => {
  const sample = [
    { suburb: "Heidelberg Heights", status: "sold" },
    { suburb: "Ringwood", status: "leased" },
    { suburb: "Reservoir", status: "sold" },
    { suburb: "Williamstown North", status: "sold" },
    { suburb: "Fraser Rise", status: "sold" },
  ] as Property[];
  const proof = corridorProof(sample);
  assert.match(proof, /Named sold and leased files/);
  assert.notEqual(DUPLICATE_HEADLINE, ABOUT_LEAD_STATEMENT);
});
