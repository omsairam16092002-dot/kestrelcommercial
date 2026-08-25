import assert from "node:assert/strict";
import { test } from "node:test";
import {
  auWhatsAppDigits,
  listingCaption,
  mailtoHref,
  smsHref,
  telHref,
  whatsappToLead,
} from "../lib/contactLinks";

test("AU phones become wa.me/61, tel links, and sms links", () => {
  assert.equal(auWhatsAppDigits("0477702442"), "61477702442");
  assert.equal(auWhatsAppDigits("7477024421"), "617477024421");
  assert.equal(auWhatsAppDigits("+61 477 024 421"), "61477024421");
  assert.equal(whatsappToLead("7477024421", "Hi Romeesh"), "https://wa.me/617477024421?text=Hi%20Romeesh");
  assert.equal(telHref("7477024421"), "tel:+617477024421");
  assert.equal(smsHref("0431 000 038"), "sms:+61431000038");
  assert.equal(smsHref("0431 000 038", "Hello"), "sms:+61431000038?body=Hello");
  assert.equal(telHref("0431 000 038"), "tel:+61431000038");
  assert.equal(mailtoHref("romeesh@gmail.com"), "mailto:romeesh@gmail.com");
});

test("listing caption is address · suburb · price, not Public/Desk", () => {
  assert.equal(
    listingCaption({ address: "1 Test Drive", suburb: "Truganina", priceLabel: "$1.25m + GST" }),
    "1 Test Drive · Truganina · $1.25m + GST",
  );
  assert.equal(listingCaption(null, "some-slug"), "some-slug");
});
