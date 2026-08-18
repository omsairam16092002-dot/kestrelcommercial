"use client";

import { FormEvent, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  AGENCY,
  type EnquiryIntent,
  type EnquirySource,
  type EnquiryTopic,
  type InspectionWindow,
} from "@kestrel/shared";
import { submitEnquiry, type EnquirySubmitResult } from "@/lib/api";
import { track } from "@/lib/analytics";
import { unlockDocuments } from "@/lib/documents";
import { IconWhatsApp } from "@/components/icons";

type Props = {
  source: EnquirySource;
  intent?: EnquiryIntent;
  propertySlug?: string;
  propertyId?: string;
  propertyLabel?: string;
  defaultTopic?: EnquiryTopic;
  submitLabel?: string;
  formId?: string;
  defaultMessage?: string;
  fieldTone?: "white" | "paper";
  onSuccess?: (result: EnquirySubmitResult) => void;
};

function listingSlugFromPath(path: string | null | undefined) {
  if (!path) return undefined;
  const match = path.match(/^\/listing\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

const WINDOW_OPTIONS: { id: InspectionWindow; label: string }[] = [
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" },
  { id: "flexible", label: "Flexible" },
];

export function EnquiryForm({
  source,
  intent = "enquire",
  propertySlug,
  propertyId,
  propertyLabel,
  defaultTopic = "other",
  submitLabel,
  formId = "enquiry-form",
  defaultMessage = "",
  fieldTone = "white",
  onSuccess,
}: Props) {
  const page = usePathname();
  const listingSlug = propertySlug?.trim() || listingSlugFromPath(page);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(defaultMessage);
  const [preferredDate, setPreferredDate] = useState("");
  const [windowSlot, setWindowSlot] = useState<InspectionWindow>("flexible");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<EnquirySubmitResult | null>(null);

  const label = useMemo(() => {
    if (submitLabel) return submitLabel;
    if (intent === "inspection") return "Request inspection";
    if (intent === "brochure") return "Unlock brochure";
    return "Enquire";
  }, [intent, submitLabel]);

  const waHref = useMemo(() => {
    const bits = [
      `Hi Jignesh — ${name || "a new enquiry"} just landed.`,
      propertyLabel ? `Property: ${propertyLabel}` : null,
      intent === "inspection" ? "They want an inspection." : null,
      intent === "brochure" ? "They requested the brochure / floorplan." : null,
      phone ? `Phone: ${phone}` : null,
      email ? `Email: ${email}` : null,
    ].filter(Boolean);
    return `${AGENCY.whatsappHref}?text=${encodeURIComponent(bits.join("\n"))}`;
  }, [name, phone, email, propertyLabel, intent]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Add your name so we know who to call back.");
    if (!phone.trim() && !email.trim()) {
      return setError("Add a phone number or an email so we can reach you.");
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setError("That email address looks incomplete.");
    }
    if (intent === "inspection" && !preferredDate && message.trim().length < 8) {
      return setError("Pick a preferred date or tell us when you can inspect.");
    }
    if (intent !== "inspection" && message.trim().length < 8) {
      return setError("Tell us a little about the property or what you are looking for.");
    }
    setPending(true);
    track({
      event: "form_submit",
      id: formId,
      page,
      listing: listingSlug,
      source: intent,
    });
    try {
      const listingLine = propertyLabel || listingSlug;
      const written =
        message.trim() ||
        (intent === "inspection"
          ? `Inspection request${preferredDate ? ` for ${preferredDate}` : ""}${listingLine ? ` at ${listingLine}` : ""}.`
          : intent === "brochure"
            ? `Please send the brochure and floorplan${listingLine ? ` for ${listingLine}` : ""}.`
            : listingLine
              ? `Enquiry on ${listingLine}.`
              : "");
      const finalMessage =
        listingLine && !written.toLowerCase().includes(listingLine.slice(0, 24).toLowerCase())
          ? `${written}\n\nProperty: ${listingLine}`
          : written;
      const payload = await submitEnquiry({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        company: company.trim() || undefined,
        message: finalMessage,
        topic: defaultTopic,
        intent,
        preferredInspectionAt: preferredDate || undefined,
        inspectionWindow: intent === "inspection" ? windowSlot : undefined,
        source,
        propertySlug: listingSlug,
        propertyId: propertyId || undefined,
      });
      if (listingSlug && payload.enquiry?.id) {
        unlockDocuments(listingSlug, payload.enquiry.id);
      }
      track({ event: "form_success", id: formId, page, listing: listingSlug, source: intent });
      setResult(payload);
      setDone(true);
      onSuccess?.(payload);
    } catch (err) {
      track({ event: "form_error", id: formId, page, listing: listingSlug, source: intent });
      setError(
        err instanceof Error
          ? err.message
          : `Something went wrong. Email ${AGENCY.email} or WhatsApp ${AGENCY.whatsapp}.`,
      );
    } finally {
      setPending(false);
    }
  }

  if (done) {
    const pinged = Boolean(result?.enquiry.notify?.delivered);
    return (
      <div className="bg-paper p-6" role="status">
        <p className="t-caption text-oxblood">
          {intent === "inspection"
            ? "Inspection requested"
            : intent === "brochure"
              ? "Brochure unlocked"
              : "Enquiry received"}
        </p>
        <h3 className="t-h2 mt-2 text-ink">
          {intent === "brochure" ? "Documents are on the listing." : "Got it. I will call you."}
        </h3>
        <p className="t-body mt-3 text-ink/80">
          {pinged
            ? "Jignesh has been pinged — email and the desk log are live."
            : "Logged on the desk. If it is urgent, WhatsApp now — most west-side deals still close on the phone."}
        </p>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-sharp mt-5 inline-flex items-center justify-center gap-2 bg-tan text-ink hover:bg-paper"
        >
          <IconWhatsApp className="h-4 w-4" />
          WhatsApp the desk
        </a>
        <a
          href={AGENCY.whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="t-mono-lg mt-4 block text-oxblood"
        >
          {AGENCY.whatsapp}
        </a>
        <p className="t-caption mt-3 text-mauve">Mon–Fri 8.30–5.30</p>
      </div>
    );
  }

  const field = `kc-field w-full appearance-none px-4 py-3 t-body text-ink placeholder:text-mauve ${
    fieldTone === "paper" ? "bg-paper" : "bg-white"
  }`;

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="topic" value={defaultTopic} />
      <input type="hidden" name="propertySlug" value={listingSlug ?? ""} />
      {propertyId ? <input type="hidden" name="propertyId" value={propertyId} /> : null}
      <input type="hidden" name="page" value={page} />

      {propertyLabel || listingSlug ? (
        <p className="border-l-2 border-oxblood pl-3">
          <span className="t-caption text-oxblood">Property</span>
          <span className="mt-1 block text-sm font-semibold text-ink">{propertyLabel || listingSlug}</span>
        </p>
      ) : null}

      <label className="block" htmlFor={`${formId}-name`}>
        <span className="mb-1.5 block text-sm font-medium text-ink">Name</span>
        <input
          id={`${formId}-name`}
          className={field}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="Your name"
          required
        />
      </label>
      <label className="block" htmlFor={`${formId}-company`}>
        <span className="mb-1.5 block text-sm font-medium text-ink">Company</span>
        <input
          id={`${formId}-company`}
          className={field}
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          autoComplete="organization"
          placeholder="Occupier / fund / trade"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block" htmlFor={`${formId}-phone`}>
          <span className="mb-1.5 block text-sm font-medium text-ink">Phone</span>
          <input
            id={`${formId}-phone`}
            className={`${field} t-mono`}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            inputMode="tel"
            placeholder="04xx xxx xxx"
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
          />
        </label>
      </div>

      {intent === "inspection" ? (
        <>
          <label className="block" htmlFor={`${formId}-date`}>
            <span className="mb-1.5 block text-sm font-medium text-ink">Preferred date</span>
            <input
              id={`${formId}-date`}
              className={field}
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
            />
          </label>
          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium text-ink">Window</legend>
            <div className="flex flex-wrap gap-2">
              {WINDOW_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={windowSlot === opt.id}
                  onClick={() => setWindowSlot(opt.id)}
                  className={`min-h-11 px-4 py-2 text-xs font-semibold transition-colors duration-150 ease-out active:scale-[0.985] ${
                    windowSlot === opt.id
                      ? "bg-oxblood text-paper"
                      : "bg-paper text-ink hover:bg-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>
        </>
      ) : null}

      <label className="block" htmlFor={`${formId}-message`}>
        <span className="mb-1.5 block text-sm font-medium text-ink">
          {intent === "brochure" ? "Anything we should know" : "Message"}
        </span>
        <textarea
          id={`${formId}-message`}
          className={`${field} min-h-20`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            intent === "inspection"
              ? "Who is inspecting, vehicle type, any access notes."
              : intent === "brochure"
                ? "Optional — SMSF, occupier, or fund."
                : "What are you looking for?"
          }
          required={intent !== "inspection" && intent !== "brochure"}
        />
      </label>
      {error ? (
        <p className="bg-paper px-4 py-3 t-body text-oxblood" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        id={`${formId}-submit`}
        disabled={pending}
        className="btn-sharp w-full bg-oxblood text-paper hover:bg-ink disabled:opacity-60"
        onClick={() =>
          track({ event: "cta_click", id: `${formId}-submit`, page, listing: propertySlug, source: intent })
        }
      >
        {pending ? "Sending…" : label}
      </button>
      <p className="text-sm leading-relaxed text-mauve">
        Used only to reply. The desk is pinged the moment this lands.{" "}
        <a href="/privacy" className="font-medium text-oxblood underline underline-offset-2">
          Privacy
        </a>
        .
      </p>
    </form>
  );
}
