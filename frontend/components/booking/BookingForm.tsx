"use client";

import { FormEvent, useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { AGENCY, MEETING_MODE_OPTIONS, formatBookingWhen, type BookingKind, type BookingMode } from "@kestrel/shared";
import { bookingIcsUrl, createBooking, getBookingSlots, type PublicBooking } from "@/lib/api";
import { track } from "@/lib/analytics";
import { unlockDocuments } from "@/lib/documents";
import { SlotPicker } from "./SlotPicker";

type Props = {
  kind: BookingKind;
  propertySlug?: string;
  propertyLabel?: string;
  formId?: string;
  tone?: "white" | "paper";
  submitLabel?: string;
};

export function BookingForm({ kind, propertySlug, propertyLabel, formId = `book-${kind}`, tone = "white", submitLabel }: Props) {
  const page = usePathname();
  const [start, setStart] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [done, setDone] = useState<{ booking: PublicBooking; manageToken: string } | null>(null);
  const [onlineOk, setOnlineOk] = useState(false);
  const [officeAddress, setOfficeAddress] = useState("");
  const [pickedMode, setPickedMode] = useState<BookingMode | null>(null);
  const isMeeting = kind === "meeting";
  const mode: BookingMode = !isMeeting ? "onsite" : pickedMode ?? (onlineOk ? "online" : "office");
  const modeOptions = MEETING_MODE_OPTIONS.filter((o) => o.value !== "online" || onlineOk);

  const loadSlots = useCallback(async () => {
    const res = await getBookingSlots({ days: 21 });
    setOnlineOk(Boolean(res.onlineMeetings));
    setOfficeAddress(res.meetingLocation ?? "");
    return res;
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!start) return setError("Pick a time above first.");
    if (!name.trim()) return setError("Add your name so we know who is coming.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Add your email so we can send the confirmation.");
    if (phone.replace(/\D/g, "").length < 8) return setError("Add a mobile number in case plans change.");
    setPending(true);
    track({ event: "form_submit", id: formId, page, listing: propertySlug, source: kind });
    try {
      const result = await createBooking({
        kind,
        start,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        company: company.trim() || undefined,
        notes: notes.trim() || undefined,
        propertySlug: propertySlug ?? null,
        mode: isMeeting ? mode : undefined,
        website,
      });
      track({ event: "form_success", id: formId, page, listing: propertySlug, source: kind });
      if (propertySlug && result.enquiryId) unlockDocuments(propertySlug, result.enquiryId);
      setDone(result);
    } catch (err) {
      track({ event: "form_error", id: formId, page, listing: propertySlug, source: kind });
      const message = err instanceof Error ? err.message : `Something went wrong. Call ${AGENCY.phone}.`;
      setError(message);
      if (/just been taken|no longer available/i.test(message)) {
        setStart(null);
        setRefreshKey((k) => k + 1);
      }
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className={`${tone === "paper" ? "bg-paper" : "bg-white"} p-6`} role="status">
        <p className="t-caption text-oxblood">{done.booking.kindLabel} booked</p>
        <h3 className="t-h2 mt-2 text-ink">{formatBookingWhen(done.booking.startAt)}</h3>
        {done.booking.propertyLabel ? <p className="mt-2 text-sm font-semibold text-ink">{done.booking.propertyLabel}</p> : null}
        {isMeeting && done.booking.modeLabel ? <p className="mt-2 text-sm font-semibold text-ink">{done.booking.modeLabel}</p> : null}
        <p className="t-body mt-3 text-ink/80">
          A confirmation is on its way to {email.trim()} with a calendar invite. Jignesh has the booking in his diary.
          {done.booking.mode === "online" && !done.booking.meetingUrl ? " The video link will follow by email." : null}
          {done.booking.mode === "phone" ? ` Jignesh will call you on ${phone.trim()}.` : null}
        </p>
        {done.booking.meetingUrl ? (
          <div className="mt-4 border border-oxblood/15 bg-oxblood/5 px-4 py-3">
            <p className="t-caption text-oxblood">Your meeting link</p>
            <a href={done.booking.meetingUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-sm font-medium text-ink underline underline-offset-2">
              {done.booking.meetingUrl}
            </a>
            <p className="mt-1 text-xs text-mauve">Zoho Meeting — opens in your browser, no account needed.</p>
          </div>
        ) : null}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {done.booking.meetingUrl ? (
            <a href={done.booking.meetingUrl} target="_blank" rel="noopener noreferrer" className="btn-sharp bg-oxblood text-paper hover:bg-ink">
              Join meeting
            </a>
          ) : null}
          <a
            href={bookingIcsUrl(done.manageToken)}
            className={`btn-sharp ${done.booking.meetingUrl ? "bg-tan text-ink hover:bg-paper" : "bg-oxblood text-paper hover:bg-ink"}`}
          >
            Add to calendar
          </a>
          <a href={`/booking/${done.manageToken}`} className="btn-sharp bg-tan text-ink hover:bg-paper">
            Reschedule or cancel
          </a>
        </div>
      </div>
    );
  }

  const field = `kc-field w-full appearance-none px-4 py-3 t-body text-ink placeholder:text-mauve ${
    tone === "paper" ? "bg-paper" : "bg-white"
  }`;

  return (
    <form id={formId} onSubmit={onSubmit} className="min-w-0 space-y-4" noValidate>
      {propertyLabel ? (
        <p className="border-l-2 border-oxblood pl-3">
          <span className="t-caption text-oxblood">Property</span>
          <span className="mt-1 block text-sm font-semibold text-ink">{propertyLabel}</span>
        </p>
      ) : null}

      {isMeeting ? (
        <fieldset className="min-w-0">
          <legend className="mb-2 block text-sm font-medium text-ink">How would you like to meet?</legend>
          <div className={`grid min-w-0 gap-2 ${modeOptions.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`} role="radiogroup">
            {modeOptions.map((option) => {
              const active = mode === option.value;
              const hint = option.value === "office" && officeAddress ? officeAddress : option.hint;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  id={`${formId}-mode-${option.value}`}
                  onClick={() => setPickedMode(option.value)}
                  className={`min-w-0 border px-3 py-2.5 text-left transition-colors ${
                    active ? "border-oxblood bg-oxblood text-paper" : `border-oxblood/15 text-ink hover:border-oxblood ${tone === "paper" ? "bg-paper" : "bg-white"}`
                  }`}
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className={`mt-0.5 block text-xs leading-snug ${active ? "text-paper/80" : "text-mauve"}`}>{hint}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <fieldset className="min-w-0">
        <legend className="mb-2 block text-sm font-medium text-ink">
          Choose a time{isMeeting ? <span className="font-normal text-mauve"> — live from Jignesh&apos;s calendar</span> : null}
        </legend>
        <SlotPicker load={loadSlots} selected={start} onSelect={setStart} idPrefix={formId} tone={tone} refreshKey={refreshKey} />
      </fieldset>

      {start ? (
        <>
          <p className="bg-oxblood/5 px-4 py-3 text-sm text-ink" aria-live="polite">
            <span className="font-semibold">{formatBookingWhen(start)}</span>
            {isMeeting ? <span className="text-ink/70"> · {modeOptions.find((o) => o.value === mode)?.label ?? ""}</span> : null}
          </p>
          <label className="block" htmlFor={`${formId}-name`}>
            <span className="mb-1.5 block text-sm font-medium text-ink">Name</span>
            <input id={`${formId}-name`} className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Your name" required />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block" htmlFor={`${formId}-phone`}>
              <span className="mb-1.5 block text-sm font-medium text-ink">Mobile</span>
              <input
                id={`${formId}-phone`}
                className={`${field} t-mono`}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                inputMode="tel"
                placeholder="04xx xxx xxx"
                required
              />
            </label>
            <label className="block" htmlFor={`${formId}-email`}>
              <span className="mb-1.5 block text-sm font-medium text-ink">Email</span>
              <input
                id={`${formId}-email`}
                className={field}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@company.com"
                required
              />
            </label>
          </div>
          <label className="block" htmlFor={`${formId}-company`}>
            <span className="mb-1.5 block text-sm font-medium text-ink">Company</span>
            <input
              id={`${formId}-company`}
              className={field}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              autoComplete="organization"
              placeholder="Optional"
            />
          </label>
          <label className="block" htmlFor={`${formId}-notes`}>
            <span className="mb-1.5 block text-sm font-medium text-ink">Notes</span>
            <textarea
              id={`${formId}-notes`}
              className={`${field} min-h-20`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                kind === "inspection"
                  ? "Who is coming, vehicle type, any access needs."
                  : kind === "appraisal"
                    ? "Property address and what you are thinking of doing."
                    : "What would you like to cover?"
              }
            />
          </label>
          <label className="hidden" aria-hidden="true">
            Website
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
        </>
      ) : null}

      {error ? (
        <p className="bg-paper px-4 py-3 t-body text-oxblood" role="alert">
          {error}
        </p>
      ) : null}

      {start ? (
        <button type="submit" id={`${formId}-submit`} disabled={pending} className="btn-sharp w-full bg-oxblood text-paper hover:bg-ink disabled:opacity-60">
          {pending ? "Booking…" : submitLabel ?? "Confirm booking"}
        </button>
      ) : null}
      <p className="text-sm leading-relaxed text-mauve">
        You will get an email confirmation and calendar invite, with a link to reschedule.{" "}
        <a href="/privacy" className="font-medium text-oxblood underline underline-offset-2">
          Privacy
        </a>
        .
      </p>
    </form>
  );
}
