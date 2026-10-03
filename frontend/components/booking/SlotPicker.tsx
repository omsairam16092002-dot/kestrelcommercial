"use client";

import { useEffect, useMemo, useState } from "react";
import { formatBookingDay, formatBookingTime, zonedDateString, type BookingSlot } from "@kestrel/shared";

type Props = {
  load: () => Promise<{ enabled: boolean; slots: BookingSlot[] }>;
  selected: string | null;
  onSelect: (start: string) => void;
  idPrefix?: string;
  tone?: "white" | "paper";
  /** Changing this refetches (e.g. after a slot is taken). */
  refreshKey?: number;
};

export function SlotPicker({ load, selected, onSelect, idPrefix = "slot", tone = "white", refreshKey = 0 }: Props) {
  const [slots, setSlots] = useState<BookingSlot[] | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState("");
  const [day, setDay] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setError("");
    load()
      .then((data) => {
        if (!live) return;
        setEnabled(data.enabled);
        setSlots(data.slots);
      })
      .catch((err) => live && setError(err instanceof Error ? err.message : "Could not load available times."));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const byDay = useMemo(() => {
    const map = new Map<string, BookingSlot[]>();
    for (const slot of slots ?? []) {
      const key = zonedDateString(new Date(slot.start));
      map.set(key, [...(map.get(key) ?? []), slot]);
    }
    return map;
  }, [slots]);

  const days = Array.from(byDay.keys());
  const activeDay = day && byDay.has(day) ? day : (days[0] ?? null);
  const daySlots = activeDay ? (byDay.get(activeDay) ?? []) : [];
  const chip = tone === "paper" ? "bg-paper" : "bg-white";

  if (error) {
    return (
      <p className="bg-paper px-4 py-3 t-body text-oxblood" role="alert">
        {error}
      </p>
    );
  }
  if (!slots) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading available times">
        <div className={`h-14 animate-pulse ${chip}`} />
        <div className={`h-24 animate-pulse ${chip}`} />
      </div>
    );
  }
  if (!enabled || !days.length) {
    return (
      <p className={`${chip} px-4 py-3 t-body text-ink/80`} role="status">
        {enabled ? "No online times left in the next few weeks." : "Online booking is paused right now."} Send a request
        below and the desk will call you with a time.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="listbox" aria-label="Choose a day">
        {days.map((d) => {
          const [weekday, ...rest] = formatBookingDay(d).split(" ");
          const on = d === activeDay;
          return (
            <button
              key={d}
              id={`${idPrefix}-day-${d}`}
              type="button"
              role="option"
              aria-selected={on}
              onClick={() => setDay(d)}
              className={`min-w-[4.5rem] shrink-0 px-2 py-2 text-center transition-colors duration-150 ease-out ${
                on ? "bg-oxblood text-paper" : `${chip} text-ink hover:bg-tan`
              }`}
            >
              <span className="block text-[11px] font-semibold uppercase tracking-wide">{weekday.replace(",", "")}</span>
              <span className="block text-sm font-semibold">{rest.join(" ")}</span>
              <span className={`block text-[11px] ${on ? "text-paper/80" : "text-mauve"}`}>{byDay.get(d)!.length} times</span>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4" role="listbox" aria-label="Choose a time">
        {daySlots.map((slot) => {
          const on = selected === slot.start;
          return (
            <button
              key={slot.start}
              type="button"
              role="option"
              aria-selected={on}
              onClick={() => onSelect(slot.start)}
              className={`min-h-11 px-2 py-2 text-sm font-semibold transition-colors duration-150 ease-out active:scale-[0.985] ${
                on ? "bg-oxblood text-paper" : `${chip} text-ink hover:bg-tan`
              }`}
            >
              {formatBookingTime(slot.start)}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-mauve">Times shown in Melbourne time.</p>
    </div>
  );
}
