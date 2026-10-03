import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_BOOKING_SETTINGS,
  computeBookingSlots,
  zonedDateString,
  zonedIsoWithOffset,
  zonedTimeString,
  zonedTimeToUtc,
} from "../src/booking";
import { scoreLead } from "../src/leads";
import type { BookingSettings } from "../src/types";

test("zonedTimeToUtc follows Melbourne daylight saving", () => {
  assert.equal(zonedTimeToUtc("2026-07-07", "10:00").toISOString(), "2026-07-07T00:00:00.000Z");
  assert.equal(zonedTimeToUtc("2026-10-07", "10:00").toISOString(), "2026-10-06T23:00:00.000Z");
  assert.equal(zonedTimeToUtc("2026-10-04", "03:00").toISOString(), "2026-10-03T16:00:00.000Z");
});

test("zoned date and time strings round-trip", () => {
  const at = zonedTimeToUtc("2026-12-24", "16:30");
  assert.equal(zonedDateString(at), "2026-12-24");
  assert.equal(zonedTimeString(at), "16:30");
  assert.equal(zonedIsoWithOffset(at), "2026-12-24T16:30:00+11:00");
  assert.equal(zonedIsoWithOffset(zonedTimeToUtc("2026-06-01", "09:00")), "2026-06-01T09:00:00+10:00");
});

const mondayMorning: BookingSettings = {
  ...DEFAULT_BOOKING_SETTINGS,
  slotMinutes: 30,
  bufferMinutes: 15,
  minNoticeHours: 0,
  maxDaysAhead: 14,
  hours: [{ day: 1, start: "09:00", end: "11:00" }],
  blackoutDates: [],
};

const sundayNoon = zonedTimeToUtc("2026-10-11", "12:00");

test("computeBookingSlots lists every slot in the weekly window", () => {
  const slots = computeBookingSlots(mondayMorning, [], sundayNoon, { days: 2 });
  assert.deepEqual(
    slots.map((s) => zonedTimeString(new Date(s.start))),
    ["09:00", "09:30", "10:00", "10:30"],
  );
  assert.ok(slots.every((s) => zonedDateString(new Date(s.start)) === "2026-10-12"));
});

test("computeBookingSlots keeps the buffer clear around existing bookings", () => {
  const busy = [{ start: zonedTimeToUtc("2026-10-12", "09:30"), end: zonedTimeToUtc("2026-10-12", "10:00") }];
  const slots = computeBookingSlots(mondayMorning, busy, sundayNoon, { days: 2 });
  assert.deepEqual(slots.map((s) => zonedTimeString(new Date(s.start))), ["10:30"]);
});

test("computeBookingSlots honours notice, blackout days and the off switch", () => {
  const mondayNine = zonedTimeToUtc("2026-10-12", "09:10");
  const noticed = computeBookingSlots({ ...mondayMorning, minNoticeHours: 1 }, [], mondayNine, { days: 1 });
  assert.deepEqual(noticed.map((s) => zonedTimeString(new Date(s.start))), ["10:30"]);

  assert.equal(computeBookingSlots({ ...mondayMorning, blackoutDates: ["2026-10-12"] }, [], sundayNoon, { days: 2 }).length, 0);
  assert.equal(computeBookingSlots({ ...mondayMorning, enabled: false }, [], sundayNoon, { days: 2 }).length, 0);
});

test("scoreLead ranks booked and seller leads hot", () => {
  assert.equal(scoreLead({ source: "web", booked: true }), "hot");
  assert.equal(scoreLead({ source: "web", intent: "inspection" }), "hot");
  assert.equal(scoreLead({ source: "appraisal" }), "hot");
  assert.equal(scoreLead({ source: "web", intent: "brochure" }), "warm");
  assert.equal(scoreLead({ source: "web", propertySlug: "x" }), "warm");
  assert.equal(scoreLead({ source: "contact" }), "cold");
});
