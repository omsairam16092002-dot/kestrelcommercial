"use client";

import { FormEvent, useState } from "react";
import { AGENCY } from "@kestrel/shared";
import { submitEnquiry } from "@/lib/api";
import { track } from "@/lib/analytics";
import { IconWhatsApp } from "@/components/icons";

const field =
  "kc-field-sharp w-full appearance-none border border-oxblood/15 bg-white px-3 py-3 t-body text-ink placeholder:text-mauve";

export function AppraisalQuickForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [thinking, setThinking] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

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
    if (!address.trim()) return setError("Add the building address.");
    if (thinking.trim().length < 8) {
      return setError("Tell us what you are thinking of doing with it.");
    }

    setPending(true);
    track({ event: "form_submit", id: "form-appraisal-quick", page: "/sell", source: "appraisal-quick" });
    try {
      await submitEnquiry({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        message: `Building: ${address.trim()}\n\n${thinking.trim()}`,
        topic: "appraisal",
        intent: "enquire",
        source: "appraisal-quick",
      });
      track({ event: "form_success", id: "form-appraisal-quick", page: "/sell", source: "appraisal-quick" });
      setDone(true);
    } catch (err) {
      track({ event: "form_error", id: "form-appraisal-quick", page: "/sell", source: "appraisal-quick" });
      setError(
        err instanceof Error
          ? err.message
          : `Something went wrong. WhatsApp ${AGENCY.whatsapp}.`,
      );
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div role="status">
        <p className="t-caption text-oxblood">Appraisal request</p>
        <h3 className="t-h3 mt-2 text-ink">Got it. I will call you.</h3>
        <p className="t-body mt-3 text-ink/80">Logged on the desk. WhatsApp if it is urgent.</p>
        <a
          href={AGENCY.whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-sharp mt-5 inline-flex items-center justify-center gap-2 bg-tan text-ink hover:bg-oxblood hover:text-paper"
        >
          <IconWhatsApp className="h-4 w-4" />
          WhatsApp the desk
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} id="form-appraisal-quick" className="space-y-3" noValidate>
      <label className="block" htmlFor="appraisal-name">
        <span className="mb-1.5 block text-xs font-medium text-mauve">Name</span>
        <input
          id="appraisal-name"
          className={field}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
      </label>
      <label className="block" htmlFor="appraisal-phone">
        <span className="mb-1.5 block text-xs font-medium text-mauve">Phone</span>
        <input
          id="appraisal-phone"
          className={field}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
        />
      </label>
      <label className="block" htmlFor="appraisal-email">
        <span className="mb-1.5 block text-xs font-medium text-mauve">Email</span>
        <input
          id="appraisal-email"
          className={field}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </label>
      <label className="block" htmlFor="appraisal-address">
        <span className="mb-1.5 block text-xs font-medium text-mauve">Building address</span>
        <input
          id="appraisal-address"
          className={field}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </label>
      <label className="block" htmlFor="appraisal-thinking">
        <span className="mb-1.5 block text-xs font-medium text-mauve">What are you thinking of doing with it?</span>
        <textarea
          id="appraisal-thinking"
          className={`${field} min-h-[88px] resize-y`}
          value={thinking}
          onChange={(e) => setThinking(e.target.value)}
        />
      </label>
      {error ? <p className="text-sm text-oxblood">{error}</p> : null}
      <button type="submit" disabled={pending} className="btn-sharp w-full bg-oxblood text-paper hover:bg-ink disabled:opacity-60">
        {pending ? "Sending…" : "Talk to the desk"}
      </button>
    </form>
  );
}
