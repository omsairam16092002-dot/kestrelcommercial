/**
 * Zoho Meeting + Zoho Calendar, on the same Zoho connection as the CRM.
 *
 * - Online meetings get a Zoho Meeting session (join link for the client, start link for the desk),
 *   moved and deleted with the booking.
 * - Open booking slots skip anything busy in the owner's Zoho Calendar (free/busy) and CRM Meetings.
 *
 * Everything degrades quietly: if Zoho is down or the connection predates these scopes, bookings still
 * work — slots fall back to desk bookings only and online meetings get a "link to follow" note.
 */
import { BOOKING_TIMEZONE, zonedIsoWithOffset, zonedTimeToUtc, type BusyWindow } from "@kestrel/shared";
import { CALENDAR_SCOPES, MEETING_SCOPES, ZohoError, zohoContext, zohoCrmFetch } from "./zoho";

type Context = NonNullable<Awaited<ReturnType<typeof zohoContext>>>;
type MeetingIdentity = { zsoid: string; zuid: string; email: string };

const TIMEOUT_MS = 8000;
const BUSY_CACHE_MS = 2 * 60 * 1000;

let identity: { value: MeetingIdentity; at: number } | null = null;
let busyCache: { key: string; at: number; windows: BusyWindow[] } | null = null;
let lastCalendarError: { message: string; at: string } | null = null;
let lastMeetingError: { message: string; at: string } | null = null;

function hasScopes(scope: string, needed: string[]) {
  const granted = scope.split(/[\s,]+/).filter(Boolean);
  return needed.every((s) => granted.includes(s));
}

function serviceHost(ctx: Context, service: "meeting" | "calendar") {
  const accounts = new URL(ctx.accountsServer);
  return `${accounts.protocol}//${accounts.hostname.replace(/^accounts\./, `${service}.`)}`;
}

async function zohoJson(url: string, ctx: Context, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      Authorization: `Zoho-oauthtoken ${ctx.token}`,
      "X-ZSOURCE": "KestrelCommercial",
      ...(init.body && typeof init.body === "string" && init.body.startsWith("{") ? { "Content-Type": "application/json;charset=UTF-8" } : {}),
      ...(init.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { res, data };
}

function errorText(data: Record<string, unknown>, status: number) {
  const err = data.error as { message?: string } | string | undefined;
  const msg = typeof err === "string" ? err : err?.message || (data.message as string | undefined);
  return `${status}${msg ? ` ${msg}` : ""}`;
}

/* ---------- Capabilities ---------- */

export async function zohoWorkspaceStatus() {
  const ctx = await zohoContext().catch(() => null);
  const scope = ctx?.scope ?? "";
  const meeting = Boolean(ctx) && hasScopes(scope, MEETING_SCOPES);
  const calendar = Boolean(ctx) && hasScopes(scope, CALENDAR_SCOPES);
  let calendarEmail: string | null = null;
  if (ctx && meeting) calendarEmail = (await meetingIdentity(ctx).catch(() => null))?.email ?? null;
  return {
    meeting,
    calendar,
    needsReconnect: Boolean(ctx) && (!meeting || !calendar),
    calendarEmail,
    lastCalendarError,
    lastMeetingError,
  };
}

export async function onlineMeetingsAvailable() {
  const ctx = await zohoContext().catch(() => null);
  return Boolean(ctx && hasScopes(ctx.scope, MEETING_SCOPES));
}

async function meetingIdentity(ctx: Context): Promise<MeetingIdentity> {
  if (identity && Date.now() - identity.at < 6 * 60 * 60 * 1000) return identity.value;
  const { res, data } = await zohoJson(`${serviceHost(ctx, "meeting")}/api/v2/user.json`, ctx);
  const user = data.userDetails as { zsoid?: number | string; zuid?: number | string; primaryEmail?: string } | undefined;
  if (!res.ok || !user?.zsoid || !user.zuid) throw new ZohoError(`Zoho Meeting account lookup failed — ${errorText(data, res.status)}`);
  const value = { zsoid: String(user.zsoid), zuid: String(user.zuid), email: user.primaryEmail ?? "" };
  identity = { value, at: Date.now() };
  return value;
}

/* ---------- Calendar: busy windows ---------- */

function basicStamp(at: Date) {
  return at.toISOString().replace(/[-:]/g, "").slice(0, 15);
}

/** "20261005T013000Z" (UTC), "20261005T123000" (owner's local time) or "20261005" (all day). */
function parseZohoStamp(raw: string): Date | null {
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, hh, mm, ss, z] = m;
  if (!hh) return zonedTimeToUtc(`${y}-${mo}-${d}`, "00:00", BOOKING_TIMEZONE);
  if (z) return new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm, +ss));
  return zonedTimeToUtc(`${y}-${mo}-${d}`, `${hh}:${mm}`, BOOKING_TIMEZONE);
}

async function calendarBusy(ctx: Context, from: Date, to: Date): Promise<BusyWindow[]> {
  if (!hasScopes(ctx.scope, CALENDAR_SCOPES) || !hasScopes(ctx.scope, MEETING_SCOPES)) return [];
  const email = process.env.ZOHO_CALENDAR_EMAIL || (await meetingIdentity(ctx)).email;
  if (!email) return [];
  const pad = 24 * 60 * 60 * 1000;
  const params = new URLSearchParams({
    uemail: email,
    sdate: basicStamp(new Date(from.getTime() - pad)),
    edate: basicStamp(new Date(to.getTime() + pad)),
    ftype: "eventbased",
  });
  const { res, data } = await zohoJson(`${serviceHost(ctx, "calendar")}/api/v1/calendars/freebusy?${params}`, ctx);
  if (!res.ok) throw new ZohoError(`Zoho Calendar free/busy failed — ${errorText(data, res.status)}`);
  const rows = (data.freebusy as { startTime?: string; endTime?: string; fbtype?: string }[] | undefined) ?? [];
  const windows: BusyWindow[] = [];
  for (const row of rows) {
    if (row.fbtype && row.fbtype.toLowerCase() === "free") continue;
    const start = row.startTime ? parseZohoStamp(row.startTime) : null;
    let end = row.endTime ? parseZohoStamp(row.endTime) : null;
    if (!start) continue;
    if (!end || end <= start) end = new Date(start.getTime() + (/^\d{8}$/.test(row.startTime ?? "") ? pad : 30 * 60 * 1000));
    windows.push({ start, end });
  }
  return windows;
}

/** Meetings in Zoho CRM (Activities → Meetings) — covers anything booked straight into the CRM calendar. */
async function crmMeetingsBusy(ctx: Context, from: Date, to: Date, excludeEventIds: string[]): Promise<BusyWindow[]> {
  const criteria = `((Start_DateTime:less_than:${zonedIsoWithOffset(to)})and(End_DateTime:greater_than:${zonedIsoWithOffset(from)}))`;
  const windows: BusyWindow[] = [];
  for (let page = 1; page <= 3; page += 1) {
    const { res, data } = await zohoCrmFetch(
      ctx.apiDomain,
      ctx.token,
      `Events/search?criteria=${encodeURIComponent(criteria)}&per_page=200&page=${page}`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (res.status === 204) break;
    if (!res.ok) throw new ZohoError(`Zoho CRM meetings lookup failed — ${errorText(data, res.status)}`);
    const rows = (data.data as { id?: string; Start_DateTime?: string; End_DateTime?: string; All_day?: boolean }[] | undefined) ?? [];
    for (const row of rows) {
      if (row.id && excludeEventIds.includes(row.id)) continue;
      if (!row.Start_DateTime || !row.End_DateTime) continue;
      const start = new Date(row.Start_DateTime);
      const end = new Date(row.End_DateTime);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start) windows.push({ start, end });
    }
    if (!(data.info as { more_records?: boolean } | undefined)?.more_records) break;
  }
  return windows;
}

/**
 * Busy windows from the owner's Zoho Calendar and CRM Meetings between `from` and `to`.
 * Cached briefly for slot listings; `fresh` bypasses the cache when a booking is being confirmed.
 * `ignore` drops windows that are just the booking being rescheduled.
 */
export async function zohoBusyWindows(
  from: Date,
  to: Date,
  opts: { fresh?: boolean; excludeEventIds?: string[]; ignore?: BusyWindow[] } = {},
): Promise<BusyWindow[]> {
  const key = `${from.toISOString().slice(0, 13)}|${to.toISOString().slice(0, 13)}|${(opts.excludeEventIds ?? []).join(",")}`;
  let windows: BusyWindow[];
  if (!opts.fresh && busyCache && busyCache.key === key && Date.now() - busyCache.at < BUSY_CACHE_MS) {
    windows = busyCache.windows;
  } else {
    const ctx = await zohoContext().catch(() => null);
    if (!ctx) return [];
    const results = await Promise.allSettled([calendarBusy(ctx, from, to), crmMeetingsBusy(ctx, from, to, opts.excludeEventIds ?? [])]);
    windows = [];
    const failures: string[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") windows.push(...r.value);
      else failures.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
    }
    if (failures.length) {
      lastCalendarError = { message: failures.join(" · ").slice(0, 400), at: new Date().toISOString() };
      console.warn("[zoho-calendar]", lastCalendarError.message);
    } else {
      lastCalendarError = null;
    }
    busyCache = { key, at: Date.now(), windows };
  }
  const ignore = opts.ignore ?? [];
  if (!ignore.length) return windows;
  const near = (a: Date, b: Date) => Math.abs(a.getTime() - b.getTime()) < 60 * 1000;
  return windows.filter((w) => !ignore.some((i) => near(i.start, w.start) && near(i.end, w.end)));
}

export function clearZohoBusyCache() {
  busyCache = null;
}

/* ---------- Meeting: online sessions ---------- */

/** "Oct 07, 2026 01:00 PM" in Melbourne time — the format Zoho Meeting expects alongside `timezone`. */
function meetingStartTime(at: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: BOOKING_TIMEZONE,
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.month} ${parts.day}, ${parts.year} ${parts.hour}:${parts.minute} ${String(parts.dayPeriod).toUpperCase()}`;
}

async function sessionRequest(ctx: Context, path: string, method: "POST" | "PUT" | "DELETE", session?: Record<string, unknown>) {
  const url = `${serviceHost(ctx, "meeting")}/api/v2/${path}`;
  if (!session) return zohoJson(url, ctx, { method });
  const json = JSON.stringify({ session });
  const first = await zohoJson(url, ctx, { method, body: json });
  if (first.res.ok || first.res.status === 401 || first.res.status === 403) return first;
  return zohoJson(url, ctx, {
    method,
    body: new URLSearchParams({ JSONString: json }).toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
  });
}

type MeetingInput = { topic: string; agenda: string; start: Date; end: Date; participantEmail?: string };

function sessionPayload(me: MeetingIdentity, input: MeetingInput) {
  return {
    topic: input.topic.slice(0, 120),
    agenda: input.agenda.slice(0, 1000),
    presenter: Number(me.zuid),
    startTime: meetingStartTime(input.start),
    duration: Math.max(15 * 60 * 1000, input.end.getTime() - input.start.getTime()),
    timezone: BOOKING_TIMEZONE,
    ...(input.participantEmail ? { participants: [{ email: input.participantEmail }] } : {}),
  };
}

function recordMeetingError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  lastMeetingError = { message: message.slice(0, 400), at: new Date().toISOString() };
  console.error("[zoho-meeting]", message);
}

export async function createZohoMeeting(input: MeetingInput) {
  try {
    const ctx = await zohoContext();
    if (!ctx || !hasScopes(ctx.scope, MEETING_SCOPES)) return null;
    const me = await meetingIdentity(ctx);
    const { res, data } = await sessionRequest(ctx, `${me.zsoid}/sessions.json`, "POST", sessionPayload(me, input));
    const session = data.session as { meetingKey?: number | string; joinLink?: string; startLink?: string } | undefined;
    if (!res.ok || !session?.meetingKey || !session.joinLink) {
      throw new ZohoError(`Zoho Meeting create failed — ${errorText(data, res.status)}`);
    }
    lastMeetingError = null;
    return { meetingKey: String(session.meetingKey), joinUrl: session.joinLink, hostUrl: session.startLink ?? "" };
  } catch (err) {
    recordMeetingError(err);
    return null;
  }
}

export async function updateZohoMeeting(meetingKey: string, input: MeetingInput) {
  try {
    const ctx = await zohoContext();
    if (!ctx || !hasScopes(ctx.scope, MEETING_SCOPES)) return false;
    const me = await meetingIdentity(ctx);
    const { res, data } = await sessionRequest(ctx, `${me.zsoid}/sessions/${encodeURIComponent(meetingKey)}.json`, "PUT", sessionPayload(me, input));
    if (!res.ok) throw new ZohoError(`Zoho Meeting update failed — ${errorText(data, res.status)}`);
    return true;
  } catch (err) {
    recordMeetingError(err);
    return false;
  }
}

export async function deleteZohoMeeting(meetingKey: string) {
  try {
    const ctx = await zohoContext();
    if (!ctx || !hasScopes(ctx.scope, MEETING_SCOPES)) return false;
    const me = await meetingIdentity(ctx);
    const { res, data } = await sessionRequest(ctx, `${me.zsoid}/sessions/${encodeURIComponent(meetingKey)}.json`, "DELETE");
    if (!res.ok && res.status !== 404) throw new ZohoError(`Zoho Meeting delete failed — ${errorText(data, res.status)}`);
    return true;
  } catch (err) {
    recordMeetingError(err);
    return false;
  }
}
