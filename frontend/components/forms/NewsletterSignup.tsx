"use client";

import { FormEvent, useState } from "react";
import { subscribeNewsletter } from "@/lib/api";
import { track } from "@/lib/analytics";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setError("That email address looks incomplete.");
    }
    setPending(true);
    track({ event: "form_submit", id: "form-newsletter", page: "footer", source: "newsletter" });
    try {
      await subscribeNewsletter(email.trim());
      track({ event: "form_success", id: "form-newsletter", page: "footer", source: "newsletter" });
      setDone(true);
    } catch (err) {
      track({ event: "form_error", id: "form-newsletter", page: "footer", source: "newsletter" });
      setError(err instanceof Error ? err.message : "Could not subscribe. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return <p className="text-sm text-tan">On the list. Check your inbox for a one-time confirmation — we will not mail that address again just for subscribing.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <p className="text-sm leading-relaxed text-paper/80">
        This month in the west — six sales, two leases, and what it means for owners. Monthly, no spam.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          Email
        </label>
        <input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "newsletter-error" : undefined}
          className="kc-field-sharp min-w-0 flex-1 border border-paper/25 bg-ink px-3 py-3 text-sm text-paper placeholder:text-paper/80"
        />
        <button
          type="submit"
          disabled={pending}
          className="btn-sharp shrink-0 bg-tan text-ink hover:bg-paper disabled:opacity-60"
        >
          {pending ? "Sending…" : "Subscribe"}
        </button>
      </div>
      {error ? (
        <p id="newsletter-error" className="text-sm text-tan" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
