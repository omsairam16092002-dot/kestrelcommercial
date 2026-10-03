import type { BookingKind, BookingMode, BookingSettings, BookingSlot } from "./types";

export const BOOKING_TIMEZONE = "Australia/Melbourne";

export const BOOKING_KIND_OPTIONS: { value: BookingKind; label: string; minutesHint: string; blurb: string }[] = [
  {
    value: "inspection",
    label: "Property inspection",
    minutesHint: "On site",
    blurb: "Walk the property with Jignesh. Bring whoever signs off.",
  },
  {
    value: "meeting",
    label: "Meeting",
    minutesHint: "Online, office or phone",
    blurb: "Talk through a requirement, an investment brief or a lease.",
  },
  {
    value: "appraisal",
    label: "Appraisal",
    minutesHint: "On site",
    blurb: "Price and leasing advice on a property you own.",
  },
];

export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  enabled: true,
  timezone: BOOKING_TIMEZONE,
  slotMinutes: 30,
  bufferMinutes: 15,
  minNoticeHours: 4,
  maxDaysAhead: 21,
  hours: [1, 2, 3, 4, 5].map((day) => ({ day, start: "09:00", end: "17:00" })),
  blackoutDates: [],
  meetingLocation: "17 Jolimont Road, Point Cook VIC 3030",
};

export const MEETING_MODE_OPTIONS: { value: Extract<BookingMode, "online" | "office" | "phone">; label: string; hint: string }[] = [
  { value: "online", label: "Online", hint: "Video call on Zoho Meeting — link sent straight away" },
  { value: "office", label: "At the office", hint: "Point Cook office" },
  { value: "phone", label: "Phone call", hint: "Jignesh calls your mobile" },
];

export const BOOKING_MODE_LABELS: Record<BookingMode, string> = {
  online: "Online (Zoho Meeting)",
  office: "At the office",
  phone: "Phone call",
  onsite: "On site",
};

export const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

const MINUTE = 60_000;

function offsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - at.getTime()) / MINUTE);
}

/** Wall-clock date + time in `timeZone` → the UTC instant. Handles daylight-saving changeovers. */
export function zonedTimeToUtc(date: string, time: string, timeZone: string = BOOKING_TIMEZONE): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = offsetMinutes(new Date(guess), timeZone);
  let result = guess - first * MINUTE;
  const second = offsetMinutes(new Date(result), timeZone);
  if (second !== first) result = guess - second * MINUTE;
  return new Date(result);
}

/** YYYY-MM-DD for the instant as seen in `timeZone`. */
export function zonedDateString(at: Date, timeZone: string = BOOKING_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

/** HH:MM (24h) for the instant as seen in `timeZone`. */
export function zonedTimeString(at: Date, timeZone: string = BOOKING_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at);
}

/** Local time with UTC offset, e.g. `2026-10-07T10:30:00+11:00` (minute precision). */
export function zonedIsoWithOffset(at: Date, timeZone: string = BOOKING_TIMEZONE): string {
  const offset = offsetMinutes(at, timeZone);
  const abs = Math.abs(offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${zonedDateString(at, timeZone)}T${zonedTimeString(at, timeZone)}:00${offset >= 0 ? "+" : "-"}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

export function addDaysToDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function weekdayOfDate(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export type BusyWindow = { start: Date; end: Date };

/**
 * Open slots between `from` (default today) and the booking horizon.
 * A slot is open when it starts after the notice period and sits at least `bufferMinutes`
 * clear of every busy window.
 */
export function computeBookingSlots(
  settings: BookingSettings,
  busy: BusyWindow[],
  now: Date,
  options: { from?: string; days?: number } = {},
): BookingSlot[] {
  if (!settings.enabled) return [];
  const tz = settings.timezone || BOOKING_TIMEZONE;
  const today = zonedDateString(now, tz);
  const horizon = addDaysToDate(today, settings.maxDaysAhead);
  const start = options.from && options.from > today ? options.from : today;
  const days = Math.min(Math.max(options.days ?? 14, 1), 42);
  const earliest = now.getTime() + settings.minNoticeHours * 60 * MINUTE;
  const slotMs = settings.slotMinutes * MINUTE;
  const bufferMs = settings.bufferMinutes * MINUTE;
  const blackout = new Set(settings.blackoutDates);
  const slots: BookingSlot[] = [];

  for (let i = 0; i < days; i += 1) {
    const date = addDaysToDate(start, i);
    if (date > horizon) break;
    if (blackout.has(date)) continue;
    const weekday = weekdayOfDate(date);
    for (const window of settings.hours.filter((h) => h.day === weekday)) {
      const close = zonedTimeToUtc(date, window.end, tz).getTime();
      for (let t = zonedTimeToUtc(date, window.start, tz).getTime(); t + slotMs <= close; t += slotMs) {
        if (t < earliest) continue;
        const end = t + slotMs;
        const clash = busy.some((b) => t < b.end.getTime() + bufferMs && end + bufferMs > b.start.getTime());
        if (!clash) slots.push({ start: new Date(t).toISOString(), end: new Date(end).toISOString() });
      }
    }
  }
  return slots.sort((a, b) => a.start.localeCompare(b.start));
}

export function formatBookingWhen(iso: string, timeZone: string = BOOKING_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function formatBookingTime(iso: string, timeZone: string = BOOKING_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-AU", { timeZone, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
}

export function formatBookingDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}
