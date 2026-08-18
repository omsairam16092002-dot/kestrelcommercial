import assert from "node:assert/strict";
import { test } from "node:test";
import { agentPortraitSrc, AGENT_PORTRAIT } from "../lib/images";

test("agent portrait falls back to Unsplash only when nothing is uploaded", () => {
  assert.equal(agentPortraitSrc(undefined), AGENT_PORTRAIT);
  assert.equal(agentPortraitSrc(""), AGENT_PORTRAIT);
  assert.equal(agentPortraitSrc("unsplash:photo-1560250097-0b93528c311a"), AGENT_PORTRAIT);
  assert.match(AGENT_PORTRAIT, /images\.unsplash\.com\/photo-1560250097-0b93528c311a/);
});

test("uploaded Cloudinary public id is used instead of Unsplash", () => {
  const src = agentPortraitSrc("kestrel/agents/mfntqffneeizxmmfhqwi", 1400);
  assert.match(src, /res\.cloudinary\.com\//);
  assert.match(src, /kestrel\/agents\/mfntqffneeizxmmfhqwi/);
  assert.doesNotMatch(src, /unsplash/);
  assert.notEqual(src, AGENT_PORTRAIT);
});
