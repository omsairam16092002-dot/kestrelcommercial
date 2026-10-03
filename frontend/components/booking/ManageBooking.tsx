"use client";

import { useCallback, useEffect, useState } from "react";
import { AGENCY, formatBookingWhen } from "@kestrel/shared";
import {
  bookingIcsUrl,
  cancelManagedBooking,
  getBookingSlots,
  getManagedBooking,
  rescheduleManagedBooking,
  type PublicBooking,
} from "@/lib/api";
import { SlotPicker } from "./SlotPicker";

export function ManageBooking({ token }: { token: string }) {
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<"view" | "reschedule" | "cancel">("view");
  const [start, setStart] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    getManagedBooking(token)
      .then((d) => setBooking(d.booking))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load that booking."));
  }, [token]);

  const loadSlots = useCallback(() => getBookingSlots({ token, days: 21 }), [token]);

  async function reschedule() {
    if (!start) return setError("Pick a new time first.");
    setPending(true);
    setError("");
    try {
      const d = await rescheduleManagedBooking(token, start);
      setBooking(d.booking);
      setMode("view");
      setStart(null);
      setNotice("Moved. A new calendar invite is on its way.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not move that booking.");
      setStart(null);
      setRefreshKey((k) => k + 1);
    } finally {
      setPending(false);
    }
  }

  async function cancel() {
    setPending(true);
    setError("");
    try {
      const d = await cancelManagedBooking(token);
      setBooking(d.booking);
      setMode("view");
      setNotice("Cancelled. Thanks for letting us know.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel that booking.");
    } finally {
      setPending(false);
    }
  }

  if (!booking) {
    return error ? (
      <div className="bg-white p-6" role="alert">
        <h2 className="t-h3 text-ink">Booking not found</h2>
        <p className="t-body mt-2 text-mauve">{error}</p>
        <a href="/book" className="btn-sharp mt-5 inline-flex bg-oxblood text-paper hover:bg-ink">
          Book a new time
        </a>
      </div>
    ) : (
      <div className="h-48 animate-pulse bg-white" aria-busy="true" />
    );
  }

  const upcoming = booking.status === "confirmed" && new Date(booking.startAt).getTime() > Date.now();
  const statusLine =
    booking.status === "cancelled"
      ? "Cancelled"
      : booking.status === "completed"
        ? "Completed"
        : booking.status === "no-show"
          ? "Missed"
          : upcoming
            ? "Confirmed"
            : "Past";

  return (
    <div className="bg-white p-6 md:p-8">
      <p className="t-caption text-oxblood">
        {booking.kindLabel} · {statusLine}
      </p>
      <h2 className={`t-h2 mt-2 text-ink ${booking.status === "cancelled" ? "line-through decoration-oxblood/50" : ""}`}>
        {formatBookingWhen(booking.startAt)}
      </h2>
      <dl className="mt-5 space-y-3 text-sm">
        {booking.propertyLabel ? (
          <div>
            <dt className="t-caption text-mauve">Property</dt>
            <dd className="mt-1 font-semibold text-ink">
              {booking.propertySlug ? (
                <a href={`/listing/${booking.propertySlug}`} className="hover:text-oxblood">
                  {booking.propertyLabel}
                </a>
              ) : (
                booking.propertyLabel
              )}
            </dd>
          </div>
        ) : null}
        {booking.location ? (
          <div>
            <dt className="t-caption text-mauve">Where</dt>
            <dd className="mt-1 text-ink">{booking.location}</dd>
          </div>
        ) : null}
        <div>
          <dt className="t-caption text-mauve">Name</dt>
          <dd className="mt-1 text-ink">{booking.name}</dd>
        </div>
      </dl>

      {notice ? (
        <p className="mt-5 bg-paper px-4 py-3 text-sm text-ink" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mt-5 bg-paper px-4 py-3 t-body text-oxblood" role="alert">
          {error}
        </p>
      ) : null}

      {upcoming && mode === "view" ? (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <a href={bookingIcsUrl(token)} className="btn-sharp bg-oxblood text-paper hover:bg-ink">
            Add to calendar
          </a>
          <button type="button" onClick={() => setMode("reschedule")} className="btn-sharp bg-tan text-ink hover:bg-paper">
            Reschedule
          </button>
          <button type="button" onClick={() => setMode("cancel")} className="btn-sharp bg-paper text-oxblood hover:bg-tan">
            Cancel
          </button>
        </div>
      ) : null}

      {mode === "reschedule" ? (
        <div className="mt-6 space-y-4">
          <h3 className="t-h3 text-ink">Pick a new time</h3>
          <SlotPicker load={loadSlots} selected={start} onSelect={setStart} idPrefix="reschedule" tone="paper" refreshKey={refreshKey} />
          {start ? <p className="text-sm font-semibold text-ink">New time: {formatBookingWhen(start)}</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" disabled={!start || pending} onClick={reschedule} className="btn-sharp bg-oxblood text-paper hover:bg-ink disabled:opacity-60">
              {pending ? "Moving…" : "Confirm new time"}
            </button>
            <button type="button" onClick={() => setMode("view")} className="btn-sharp bg-paper text-ink hover:bg-tan">
              Keep current time
            </button>
          </div>
        </div>
      ) : null}

      {mode === "cancel" ? (
        <div className="mt-6 bg-paper p-5">
          <p className="t-body text-ink">Cancel this {booking.kindLabel.toLowerCase()}? Jignesh will be told straight away.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button type="button" disabled={pending} onClick={cancel} className="btn-sharp bg-oxblood text-paper hover:bg-ink disabled:opacity-60">
              {pending ? "Cancelling…" : "Yes, cancel it"}
            </button>
            <button type="button" onClick={() => setMode("view")} className="btn-sharp bg-white text-ink hover:bg-tan">
              Keep it
            </button>
          </div>
        </div>
      ) : null}

      {booking.status === "cancelled" ? (
        <a href={booking.propertySlug ? `/listing/${booking.propertySlug}#inspect` : "/book"} className="btn-sharp mt-6 inline-flex bg-oxblood text-paper hover:bg-ink">
          Book another time
        </a>
      ) : null}

      <p className="mt-6 text-sm text-mauve">
        Questions? Call or WhatsApp{" "}
        <a href={AGENCY.whatsappHref} className="font-medium text-oxblood underline underline-offset-2">
          {AGENCY.whatsapp}
        </a>
        .
      </p>
    </div>
  );
}
