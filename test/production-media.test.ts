import assert from "node:assert/strict";
import { test } from "node:test";

const SITE = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL;

async function headOk(url: string) {
  const res = await fetch(url, { method: "HEAD", redirect: "follow" });
  return res.ok;
}

test("production static media assets return 200", async (t) => {
  if (!SITE || SITE.includes("localhost")) {
    t.skip("Set FRONTEND_URL to production (e.g. https://www.kestrelcommercial.com)");
    return;
  }
  const base = SITE.replace(/\/$/, "");
  assert.equal(await headOk(`${base}/assets/hero/footscray-drone.mp4`), true);
  assert.equal(await headOk(`${base}/assets/agent/jignesh.jpeg`), true);
});

test("production About page serves local portrait in HTML", async (t) => {
  if (!SITE || SITE.includes("localhost")) {
    t.skip("Set FRONTEND_URL to production");
    return;
  }
  const res = await fetch(`${SITE.replace(/\/$/, "")}/about`);
  assert.equal(res.ok, true);
  const html = await res.text();
  assert.match(html, /\/assets\/agent\/jignesh\.jpeg/);
});

test("production homepage references hero video with poster", async (t) => {
  if (!SITE || SITE.includes("localhost")) {
    t.skip("Set FRONTEND_URL to production");
    return;
  }
  const res = await fetch(`${SITE.replace(/\/$/, "")}/`);
  assert.equal(res.ok, true);
  const html = await res.text();
  assert.match(html, /footscray-drone\.mp4/);
  assert.match(html, /poster=/);
});
