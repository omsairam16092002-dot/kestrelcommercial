import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  ABOUT_BIO_PARAGRAPHS,
  ABOUT_CLOSING_LINE,
  ABOUT_PHILOSOPHY,
  ABOUT_SELECTED_EXPERIENCE_LABEL,
  ABOUT_WHY_CARDS,
  ABOUT_WHY_HEADING,
} from "@kestrel/shared";

test("About bio includes verbatim opening paragraph", () => {
  assert.match(ABOUT_BIO_PARAGRAPHS[0], /700 successful property transactions/);
});

test("philosophy line appears once in shared copy constants", () => {
  const combined = ABOUT_BIO_PARAGRAPHS.join(" ");
  assert.doesNotMatch(combined, /Understand the property/);
  assert.match(ABOUT_PHILOSOPHY, /Understand the property\. Understand the client\./);
});

test("Selected Sales and Leasing Experience uses explicit label", () => {
  assert.equal(ABOUT_SELECTED_EXPERIENCE_LABEL, "Selected Sales & Leasing Experience:");
});

test("About why section uses title plus description cards", () => {
  assert.match(ABOUT_WHY_HEADING, /Why We're the Choice/);
  assert.equal(ABOUT_WHY_CARDS.length, 3);
  assert.match(ABOUT_WHY_CARDS[0].title, /Spec-First Advice/);
  assert.match(ABOUT_WHY_CARDS[0].description, /Span, power, access/);
});

test("About closing line is the homepage teaser", () => {
  assert.match(ABOUT_CLOSING_LINE, /One experienced desk/);
});

test("About name/role line does not include the licence number", () => {
  const aboutBio = readFileSync(join(__dirname, "../components/about/AboutHeroBio.tsx"), "utf8");
  assert.doesNotMatch(aboutBio, /License \{agent\.licenceNumber\}/);
  assert.doesNotMatch(aboutBio, /Licence \{agent\.licenceNumber\}/);
  assert.match(aboutBio, /\{agent\.title\}/);
});

test("licence number remains on Privacy with American spelling", () => {
  const privacy = readFileSync(join(__dirname, "../app/privacy/page.tsx"), "utf8");
  assert.match(privacy, /License/);
  assert.match(privacy, /AGENCY\.licenceNumber/);
  assert.doesNotMatch(privacy, /Licence \{/);
});
