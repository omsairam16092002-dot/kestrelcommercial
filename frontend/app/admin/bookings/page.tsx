"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BOOKING_KIND_OPTIONS,
  BOOKING_MODE_LABELS,
  WEEKDAY_LABELS,
  formatBookingDay,
  formatBookingTime,
  zonedDateString,
  type Booking,
  type BookingHours,
  type BookingSettings,
} from "@kestrel/shared";
import {
  getAdminBookingSlots,
  getAdminBookings,
  getBookingSettings,
  patchAdminBooking,
  saveBookingSettings,
  type ZohoWorkspaceStatus,
} from "@/lib/adminApi";
import { useDesk } from "@/components/admin/DeskContext";
import { SlotPicker } from "@/components/booking/SlotPicker";
import { telHref, whatsappToLead } from "@/lib/contactLinks";

type View = "upcoming" | "past" | "cancelled";

const KIND_LABEL = Object.fromEntries(BOOKING_KIND_OPTIONS.map((k) => [k.value, k.label])) as Record<string, string>;

function rangeFor(view: View) {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (view === "past") return { from: new Date(now - 45 * day).toISOString(), to: new Date(now).toISOString() };
  if (view === "cancelled") return { from: new Date(now - 45 * day).toISOString(), to: new Date(now + 90 * day).toISOString(), status: "cancelled" };
  return { from: new Date(now - 2 * 60 * 60 * 1000).toISOString(), to: new Date(now + 90 * day).toISOString(), status: "confirmed" };
}

export default function AdminBookingsPage() {
  const { refreshDesk } = useDesk();
  const [view, setView] = useState<View>("upcoming");
  const [rows, setRows] = useState<Booking[] | null>(null);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [moving, setMoving] = useState<{ id: string; start: string | null } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState("");

  const reload = useCallback(async (next: View = view) => {
    const data = await getAdminBookings(rangeFor(next));
    setRows(next === "past" ? [...data.bookings].reverse() : data.bookings);
  }, [view]);

  useEffect(() => {
    setRows(null);
    reload(view).catch((err) => setError(err instanceof Error ? err.message : "Could not load bookings."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const grouped = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const row of rows ?? []) {
      const key = zonedDateString(new Date(row.startAt));
      map.set(key, [...(map.get(key) ?? []), row]);
    }
    return Array.from(map.entries());
  }, [rows]);

  async function act(id: string, body: Parameters<typeof patchAdminBooking>[1]) {
    setPendingId(id);
    setError("");
    try {
      await patchAdminBooking(id, body);
      setMoving(null);
      setConfirmCancel("");
      await reload();
      await refreshDesk();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update that booking.");
    } finally {
      setPendingId("");
    }
  }

  const today = zonedDateString(new Date());

  return (
    <div>
      <p className="t-caption text-oxblood">Diary</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="t-h1 text-ink">Bookings</h1>
        <a href="/book" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-oxblood hover:underline">
          Public booking page →
        </a>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-mauve">
        Inspections, meetings and appraisals booked online. Every booking lands here, in Zoho as a meeting, and in the
        client&apos;s calendar.
      </p>

      <div className="mt-6 inline-flex gap-1 bg-paper p-1" role="tablist">
        {(["upcoming", "past", "cancelled"] as View[]).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`px-4 py-2 text-xs font-semibold capitalize ${view === v ? "bg-oxblood text-paper" : "text-oxblood hover:bg-white"}`}
          >
            {v}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-4 bg-paper px-4 py-3 text-sm text-oxblood" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 space-y-8">
        {!rows ? (
          <div className="h-32 animate-pulse bg-paper" />
        ) : grouped.length ? (
          grouped.map(([day, items]) => (
            <section key={day}>
              <h2 className="t-h3 text-ink">
                {day === today ? "Today · " : ""}
                {formatBookingDay(day)}
              </h2>
              <ul className="mt-3 divide-y divide-oxblood/10 border border-oxblood/10 bg-paper">
                {items.map((b) => {
                  const past = new Date(b.endAt).getTime() < Date.now();
                  const tel = b.phone ? telHref(b.phone) : null;
                  const wa = b.phone ? whatsappToLead(b.phone, `Hi ${b.name.split(" ")[0]}, Jignesh from Kestrel Commercial about your ${KIND_LABEL[b.kind]?.toLowerCase() ?? "booking"} on ${formatBookingDay(day)} at ${formatBookingTime(b.startAt)}.`) : null;
                  return (
                    <li key={b.id} className="px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="t-mono text-sm text-ink">
                            {formatBookingTime(b.startAt)}–{formatBookingTime(b.endAt)}
                            <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-oxblood">{KIND_LABEL[b.kind] ?? b.kind}</span>
                            {b.status !== "confirmed" ? <span className="ml-2 text-xs uppercase text-mauve">{b.status}</span> : null}
                          </p>
                          <p className="mt-1 font-semibold text-ink">
                            {b.enquiryId ? (
                              <Link href={`/admin/enquiries/${b.enquiryId}`} className="text-oxblood hover:underline">
                                {b.name}
                              </Link>
                            ) : (
                              b.name
                            )}
                            {b.company ? <span className="font-normal text-mauve"> · {b.company}</span> : null}
                          </p>
                          {b.propertyLabel ? (
                            <p className="mt-1 text-sm text-ink">
                              {b.propertySlug ? (
                                <a href={`/listing/${b.propertySlug}`} target="_blank" rel="noopener noreferrer" className="hover:text-oxblood">
                                  {b.propertyLabel}
                                </a>
                              ) : (
                                b.propertyLabel
                              )}
                            </p>
                          ) : b.kind === "meeting" ? (
                            <p className="mt-1 text-sm text-ink">
                              {BOOKING_MODE_LABELS[b.mode ?? "office"]}
                              {b.mode === "online" && !b.meetingUrl && b.status === "confirmed" ? (
                                <span className="ml-2 text-xs font-semibold text-oxblood">No meeting link — send one manually</span>
                              ) : b.mode !== "online" && b.location ? (
                                <span className="text-mauve"> · {b.location}</span>
                              ) : null}
                            </p>
                          ) : (
                            <p className="mt-1 text-sm text-mauve">{b.location}</p>
                          )}
                          <p className="mt-1 text-xs text-mauve">
                            {[b.phone, b.email].filter(Boolean).join(" · ")}
                            {b.zohoEventId ? " · In Zoho CRM" : ""}
                            {b.meetingUrl ? " · Zoho Meeting" : ""}
                          </p>
                          {b.notes ? <p className="mt-2 max-w-xl whitespace-pre-line text-sm text-ink/80">“{b.notes}”</p> : null}
                        </div>
                        {b.status === "confirmed" ? (
                          <div className="flex flex-wrap gap-2">
                            {!past && (b.meetingHostUrl || b.meetingUrl) ? (
                              <a
                                href={b.meetingHostUrl || b.meetingUrl || "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-sharp bg-oxblood text-paper hover:bg-ink"
                                title="Opens Zoho Meeting as the host"
                              >
                                Start meeting
                              </a>
                            ) : null}
                            {!past && b.meetingUrl ? (
                              <button
                                type="button"
                                onClick={() => void navigator.clipboard?.writeText(b.meetingUrl ?? "")}
                                className="btn-sharp border border-oxblood/20 text-ink hover:border-oxblood"
                                title={b.meetingUrl}
                              >
                                Copy join link
                              </button>
                            ) : null}
                            {tel ? (
                              <a href={tel} className="btn-sharp border border-oxblood text-oxblood hover:bg-oxblood hover:text-paper">
                                Call
                              </a>
                            ) : null}
                            {wa ? (
                              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-sharp bg-tan text-ink hover:bg-oxblood hover:text-paper">
                                WhatsApp
                              </a>
                            ) : null}
                            {past ? (
                              <>
                                <button type="button" disabled={pendingId === b.id} onClick={() => void act(b.id, { status: "completed" })} className="btn-sharp bg-oxblood text-paper hover:bg-ink disabled:opacity-50">
                                  Attended
                                </button>
                                <button type="button" disabled={pendingId === b.id} onClick={() => void act(b.id, { status: "no-show" })} className="btn-sharp border border-oxblood/20 text-ink hover:border-oxblood disabled:opacity-50">
                                  No-show
                                </button>
                              </>
                            ) : (
                              <>
                                <button type="button" onClick={() => setMoving(moving?.id === b.id ? null : { id: b.id, start: null })} className="btn-sharp border border-oxblood text-oxblood hover:bg-oxblood hover:text-paper">
                                  Reschedule
                                </button>
                                <button type="button" onClick={() => setConfirmCancel(confirmCancel === b.id ? "" : b.id)} className="btn-sharp border border-oxblood/20 text-ink hover:border-oxblood">
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        ) : null}
                      </div>

                      {confirmCancel === b.id ? (
                        <div className="mt-4 flex flex-wrap items-center gap-3 bg-white px-4 py-3">
                          <p className="text-sm text-ink">Cancel and email {b.name.split(" ")[0]} a cancellation?</p>
                          <button type="button" disabled={pendingId === b.id} onClick={() => void act(b.id, { status: "cancelled" })} className="btn-sharp bg-oxblood text-paper hover:bg-ink disabled:opacity-50">
                            Yes, cancel
                          </button>
                          <button type="button" onClick={() => setConfirmCancel("")} className="text-sm font-semibold text-mauve hover:text-ink">
                            Keep
                          </button>
                        </div>
                      ) : null}

                      {moving && moving.id === b.id ? (
                        <div className="mt-4 space-y-3 bg-white p-4">
                          <p className="text-sm font-semibold text-ink">Pick a new time — {b.name.split(" ")[0]} gets an updated invite.</p>
                          <SlotPicker
                            load={() => getAdminBookingSlots(b.id).then((d) => ({ enabled: true, slots: d.slots }))}
                            selected={moving.start}
                            onSelect={(start) => setMoving({ id: b.id, start })}
                            idPrefix={`move-${b.id}`}
                            tone="paper"
                          />
                          <button
                            type="button"
                            disabled={!moving.start || pendingId === b.id}
                            onClick={() => {
                              if (moving.start) void act(b.id, { start: moving.start });
                            }}
                            className="btn-sharp bg-oxblood text-paper hover:bg-ink disabled:opacity-50"
                          >
                            Move booking
                          </button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        ) : (
          <p className="border border-oxblood/10 bg-paper px-4 py-8 text-sm text-mauve">
            {view === "upcoming" ? "No upcoming bookings yet. Share the booking page or listing links." : `No ${view} bookings.`}
          </p>
        )}
      </div>

      <AvailabilityEditor />
    </div>
  );
}

function ZohoLinkPanel({ zoho }: { zoho: ZohoWorkspaceStatus | null }) {
  if (!zoho) return null;
  const row = (on: boolean, title: string, detail: string, warn?: string | null) => (
    <li className="flex items-start gap-3">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${on && !warn ? "bg-emerald-600" : on ? "bg-amber-500" : "bg-mauve/50"}`} aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="block text-xs text-mauve">{detail}</span>
        {warn ? <span className="mt-0.5 block break-words text-xs text-oxblood">{warn}</span> : null}
      </span>
    </li>
  );
  return (
    <div className="mt-6 border border-oxblood/10 bg-paper p-4">
      <ul className="grid gap-4 sm:grid-cols-2">
        {row(
          zoho.calendar,
          zoho.calendar ? "Checking your Zoho Calendar" : "Zoho Calendar not linked",
          zoho.calendar
            ? `Busy times in ${zoho.calendarEmail ?? "your Zoho Calendar"} and Zoho CRM meetings are hidden from clients.`
            : "Only website bookings block times. Reconnect Zoho to also hide your calendar's busy times.",
          zoho.lastCalendarError?.message,
        )}
        {row(
          zoho.meeting,
          zoho.meeting ? "Online meetings on Zoho Meeting" : "Zoho Meeting not linked",
          zoho.meeting
            ? "Clients can pick “Online” — a Zoho Meeting link is created, moved and cancelled with the booking."
            : "The “Online” option is hidden on the website until Zoho Meeting is linked.",
          zoho.lastMeetingError?.message,
        )}
      </ul>
      {zoho.needsReconnect ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-oxblood/10 pt-4">
          <p className="text-sm text-ink">Zoho needs one more permission for Calendar and Meeting.</p>
          <a href="/api/integrations/zoho/connect" className="btn-sharp bg-oxblood text-paper hover:bg-ink">
            Reconnect Zoho
          </a>
        </div>
      ) : null}
    </div>
  );
}

function AvailabilityEditor() {
  const [settings, setSettings] = useState<BookingSettings | null>(null);
  const [blackout, setBlackout] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [zoho, setZoho] = useState<ZohoWorkspaceStatus | null>(null);

  useEffect(() => {
    getBookingSettings()
      .then((d) => {
        setSettings(d.settings);
        setZoho(d.zoho ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load availability."));
  }, []);

  if (!settings) {
    return (
      <section id="availability" className="mt-14 scroll-mt-24">
        <h2 className="t-h2 text-ink">Availability</h2>
        {error ? <p className="mt-3 text-sm text-oxblood">{error}</p> : <div className="mt-4 h-40 animate-pulse bg-paper" />}
      </section>
    );
  }

  const set = (patch: Partial<BookingSettings>) => {
    setStatus("");
    setSettings({ ...settings, ...patch });
  };
  const setHour = (i: number, patch: Partial<BookingHours>) =>
    set({ hours: settings.hours.map((h, j) => (j === i ? { ...h, ...patch } : h)) });
  const sortedHours = settings.hours.map((h, i) => ({ ...h, i })).sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7) || a.start.localeCompare(b.start));

  async function save() {
    if (!settings) return;
    setSaving(true);
    setError("");
    try {
      const d = await saveBookingSettings(settings);
      setSettings(d.settings);
      setStatus("Saved. New slots are live.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save availability.");
    } finally {
      setSaving(false);
    }
  }

  const num = (key: "slotMinutes" | "bufferMinutes" | "minNoticeHours" | "maxDaysAhead", label: string, hint: string) => (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-ink">{label}</span>
      <input
        type="number"
        min={0}
        className="kc-field w-full bg-white px-3 py-2"
        value={settings[key]}
        onChange={(e) => set({ [key]: Number(e.target.value) } as Partial<BookingSettings>)}
      />
      <span className="mt-1 block text-xs text-mauve">{hint}</span>
    </label>
  );

  return (
    <section id="availability" className="mt-14 scroll-mt-24 border-t border-oxblood/10 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="t-caption text-oxblood">Settings</p>
          <h2 className="t-h2 mt-2 text-ink">Availability</h2>
          <p className="mt-2 text-sm text-mauve">Melbourne time. Clients only see times that are free, inside these hours.</p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
          <input type="checkbox" checked={settings.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="h-4 w-4 accent-oxblood" />
          Online booking on
        </label>
      </div>

      <ZohoLinkPanel zoho={zoho} />

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink">Weekly hours</h3>
          <ul className="mt-3 space-y-2">
            {sortedHours.map((h) => (
              <li key={h.i} className="flex flex-wrap items-center gap-2 bg-paper px-3 py-2">
                <select className="kc-field bg-white px-2 py-1.5 text-sm" value={h.day} onChange={(e) => setHour(h.i, { day: Number(e.target.value) })}>
                  {WEEKDAY_LABELS.map((label, day) => (
                    <option key={label} value={day}>
                      {label}
                    </option>
                  ))}
                </select>
                <input type="time" className="kc-field bg-white px-2 py-1.5 text-sm" value={h.start} step={900} onChange={(e) => setHour(h.i, { start: e.target.value })} />
                <span className="text-mauve">to</span>
                <input type="time" className="kc-field bg-white px-2 py-1.5 text-sm" value={h.end} step={900} onChange={(e) => setHour(h.i, { end: e.target.value })} />
                <button
                  type="button"
                  onClick={() => set({ hours: settings.hours.filter((_, j) => j !== h.i) })}
                  className="ml-auto text-xs font-semibold text-mauve hover:text-oxblood"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => set({ hours: [...settings.hours, { day: 6, start: "10:00", end: "13:00" }] })}
            className="mt-3 text-sm font-semibold text-oxblood hover:underline"
          >
            + Add hours
          </button>

          <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-ink">Days off</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {settings.blackoutDates.length ? (
              settings.blackoutDates.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => set({ blackoutDates: settings.blackoutDates.filter((x) => x !== d) })}
                  className="bg-paper px-3 py-1.5 text-xs font-semibold text-ink hover:bg-tan"
                  title="Remove"
                >
                  {formatBookingDay(d)} ×
                </button>
              ))
            ) : (
              <p className="text-sm text-mauve">None — add holidays or days away.</p>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <input type="date" className="kc-field bg-white px-3 py-2 text-sm" value={blackout} onChange={(e) => setBlackout(e.target.value)} />
            <button
              type="button"
              disabled={!blackout}
              onClick={() => {
                if (!settings.blackoutDates.includes(blackout)) set({ blackoutDates: [...settings.blackoutDates, blackout].sort() });
                setBlackout("");
              }}
              className="btn-sharp border border-oxblood text-oxblood hover:bg-oxblood hover:text-paper disabled:opacity-50"
            >
              Add day off
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {num("slotMinutes", "Booking length (min)", "How long each booking runs.")}
            {num("bufferMinutes", "Gap between (min)", "Travel or prep time kept clear.")}
            {num("minNoticeHours", "Minimum notice (hours)", "No surprise bookings at short notice.")}
            {num("maxDaysAhead", "Book up to (days ahead)", "How far out clients can book.")}
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">Meeting location</span>
            <input className="kc-field w-full bg-white px-3 py-2" value={settings.meetingLocation} onChange={(e) => set({ meetingLocation: e.target.value })} />
            <span className="mt-1 block text-xs text-mauve">Shown for meetings. Inspections use the listing address; appraisals happen on site.</span>
          </label>
        </div>
      </div>

      {error ? (
        <p className="mt-6 bg-paper px-4 py-3 text-sm text-oxblood" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-6 flex items-center gap-4">
        <button type="button" disabled={saving} onClick={() => void save()} className="btn-sharp bg-oxblood text-paper hover:bg-ink disabled:opacity-50">
          {saving ? "Saving…" : "Save availability"}
        </button>
        {status ? <p className="text-sm text-ink">{status}</p> : null}
      </div>
    </section>
  );
}
