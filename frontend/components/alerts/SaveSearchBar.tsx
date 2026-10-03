"use client";

import { FormEvent, useState } from "react";
import { usePathname } from "next/navigation";
import { createPropertyAlert } from "@/lib/api";
import { track } from "@/lib/analytics";

export function SaveSearchBar({ query, label, emptyResults = false }: { query: string; label: string; emptyResults?: boolean }) {
  const page = usePathname();
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<"idle" | "pending" | "sent" | "active">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("That email address looks incomplete.");
    setState("pending");
    track({ event: "form_submit", id: "save-search", page, source: "alert" });
    try {
      const result = await createPropertyAlert({ email: email.trim(), query, label, website });
      track({ event: "form_success", id: "save-search", page, source: "alert" });
      setState(result.status === "confirm-sent" ? "sent" : "active");
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "Could not save that alert.");
    }
  }

  if (state === "sent" || state === "active") {
    return (
      <div className="border-l-2 border-oxblood bg-white px-5 py-4" role="status">
        <p className="text-sm font-semibold text-ink">
          {state === "sent" ? "Check your inbox to confirm your alert." : "You are already getting alerts for this search."}
        </p>
        <p className="mt-1 text-sm text-mauve">
          {state === "sent"
            ? `One click in the email we just sent to ${email.trim()} and new matches come straight to you.`
            : "New matching listings will keep landing in your inbox."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 bg-white px-5 py-4 md:flex-row md:items-center md:gap-5" noValidate>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">
          {emptyResults ? "Be first when one comes up." : "Get new listings like these by email."}
        </p>
        <p className="mt-0.5 truncate text-sm text-mauve" title={label}>
          {label}
        </p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
        <label className="sr-only" htmlFor="save-search-email">
          Email
        </label>
        <input
          id="save-search-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@company.com"
          className="kc-field min-w-0 bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-mauve sm:w-64"
        />
        <input
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
        <button
          type="submit"
          disabled={state === "pending"}
          className="btn-sharp shrink-0 bg-oxblood text-paper hover:bg-ink disabled:opacity-60"
        >
          {state === "pending" ? "Saving…" : "Alert me"}
        </button>
      </div>
      {error ? (
        <p className="text-sm text-oxblood md:basis-full" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
