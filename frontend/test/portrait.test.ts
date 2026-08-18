import assert from "node:assert/strict";
import { test } from "node:test";
import { agentPortraitSrc, AGENT_PORTRAIT } from "../lib/images";

test("agent portrait falls back to local JPEG when nothing is uploaded", () => {
  assert.equal(agentPortraitSrc(undefined), AGENT_PORTRAIT);
  assert.equal(agentPortraitSrc(""), AGENT_PORTRAIT);
  assert.equal(agentPortraitSrc("unsplash:photo-1560250097-0b93528c311a"), AGENT_PORTRAIT);
  assert.match(AGENT_PORTRAIT, /\/assets\/agent\/jignesh\.jpeg/);
});

test("uploaded Cloudinary public id is used instead of local fallback", () => {
  const src = agentPortraitSrc("kestrel/agents/jignesh", 1400);
  assert.match(src, /res\.cloudinary\.com\//);
  assert.match(src, /kestrel\/agents\/jignesh/);
  assert.doesNotMatch(src, /unsplash/);
  assert.notEqual(src, AGENT_PORTRAIT);
});
