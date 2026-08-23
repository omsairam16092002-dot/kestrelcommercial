import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isPropertySlugFound,
  isPropertySlugUnavailable,
  type PropertyBySlugResult,
} from "../lib/api";
import type { Property, Agent } from "@kestrel/shared";

const sample = {
  property: { slug: "test", address: "1 Test St" } as Property,
  agent: { name: "Agent" } as Agent,
};

test("isPropertySlugUnavailable identifies API outage sentinel", () => {
  assert.equal(isPropertySlugUnavailable("unavailable"), true);
  assert.equal(isPropertySlugUnavailable(null), false);
  assert.equal(isPropertySlugUnavailable(sample), false);
});

test("isPropertySlugFound accepts listing payloads only", () => {
  assert.equal(isPropertySlugFound(sample), true);
  assert.equal(isPropertySlugFound(null), false);
  assert.equal(isPropertySlugFound("unavailable"), false);
});

test("metadata guard: unavailable must not destructure as listing", () => {
  const cases: PropertyBySlugResult[] = ["unavailable", null, sample];
  for (const data of cases) {
    if (isPropertySlugUnavailable(data)) {
      assert.equal(data, "unavailable");
      continue;
    }
    if (!isPropertySlugFound(data)) {
      assert.equal(data, null);
      continue;
    }
    assert.ok(data.property.slug);
  }
});
