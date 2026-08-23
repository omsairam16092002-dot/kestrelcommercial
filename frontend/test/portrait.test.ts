import assert from "node:assert/strict";
import { test } from "node:test";
import { agentPortraitSrc, agentPortraitSrcSet, AGENT_PORTRAIT } from "../lib/images";

test("agent portrait always serves local JPEG for reliability", () => {
  assert.equal(agentPortraitSrc(undefined), AGENT_PORTRAIT);
  assert.equal(agentPortraitSrc(""), AGENT_PORTRAIT);
  assert.equal(agentPortraitSrc("unsplash:photo-1560250097-0b93528c311a"), AGENT_PORTRAIT);
  assert.equal(agentPortraitSrc("kestrel/agents/jignesh", 1400), AGENT_PORTRAIT);
  assert.match(AGENT_PORTRAIT, /\/assets\/agent\/jignesh\.jpeg/);
});

test("agent portrait srcSet uses Cloudinary when a real upload id exists", () => {
  const srcset = agentPortraitSrcSet("kestrel/agents/jignesh", [640, 1400]);
  assert.match(srcset!, /res\.cloudinary\.com\//);
  assert.match(srcset!, /640w/);
  assert.equal(agentPortraitSrcSet(undefined), undefined);
});
