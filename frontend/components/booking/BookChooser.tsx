"use client";

import { useState } from "react";
import { BOOKING_KIND_OPTIONS, type BookingKind } from "@kestrel/shared";
import { BookingForm } from "./BookingForm";

const KINDS = BOOKING_KIND_OPTIONS.filter((k) => k.value !== "inspection");

export function BookChooser({ initial }: { initial: BookingKind }) {
  const [kind, setKind] = useState<BookingKind>(KINDS.some((k) => k.value === initial) ? initial : "meeting");
  const active = KINDS.find((k) => k.value === kind) ?? KINDS[0];

  return (
    <div className="min-w-0">
      <div className="grid grid-cols-2 gap-1 bg-paper p-1" role="tablist" aria-label="Booking type">
        {KINDS.map((k) => (
          <button
            key={k.value}
            type="button"
            role="tab"
            aria-selected={kind === k.value}
            onClick={() => setKind(k.value)}
            className={`min-h-11 px-2 py-2.5 text-xs font-semibold transition-colors duration-150 ease-out ${
              kind === k.value ? "bg-oxblood text-paper" : "text-oxblood hover:bg-white"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm text-mauve">
        {active.blurb} <span className="whitespace-nowrap">({active.minutesHint})</span>
      </p>
      <div className="mt-5">
        <BookingForm key={kind} kind={kind} formId={`book-${kind}`} tone="white" submitLabel={`Book ${active.label.toLowerCase()}`} />
      </div>
    </div>
  );
}
