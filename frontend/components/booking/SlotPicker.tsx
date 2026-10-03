"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const stripRef = useRef<HTMLDivElement>(null);

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

  const idle = `${chip} border border-oxblood/15 text-ink hover:border-oxblood hover:bg-tan/40`;
  const scrollDays = (dir: 1 | -1) => stripRef.current?.scrollBy({ left: dir * stripRef.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <div className="w-full min-w-0 space-y-3">
      <div className="flex min-w-0 items-stretch gap-1.5">
        <button
          type="button"
          aria-label="Earlier days"
          onClick={() => scrollDays(-1)}
          className={`hidden w-8 shrink-0 items-center justify-center text-oxblood sm:flex ${idle}`}
        >
          ‹
        </button>
        <div
          ref={stripRef}
          className="flex min-w-0 flex-1 snap-x gap-1.5 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:thin]"
          role="listbox"
          aria-label="Choose a day"
        >
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
                onClick={(e) => {
                  setDay(d);
                  e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
                }}
                className={`w-[4.25rem] shrink-0 snap-start px-1 py-2 text-center transition-colors duration-150 ease-out ${
                  on ? "border border-oxblood bg-oxblood text-paper" : idle
                }`}
              >
                <span className="block text-[11px] font-semibold uppercase tracking-wide">{weekday.replace(",", "")}</span>
                <span className="block whitespace-nowrap text-sm font-semibold">{rest.join(" ")}</span>
                <span className={`block text-[10px] ${on ? "text-paper/80" : "text-mauve"}`}>{byDay.get(d)!.length} times</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-label="Later days"
          onClick={() => scrollDays(1)}
          className={`hidden w-8 shrink-0 items-center justify-center text-oxblood sm:flex ${idle}`}
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-1.5" role="listbox" aria-label="Choose a time">
        {daySlots.map((slot) => {
          const on = selected === slot.start;
          return (
            <button
              key={slot.start}
              type="button"
              role="option"
              aria-selected={on}
              onClick={() => onSelect(slot.start)}
              className={`min-h-11 whitespace-nowrap px-2 py-2 text-sm font-semibold transition-colors duration-150 ease-out active:scale-[0.985] ${
                on ? "border border-oxblood bg-oxblood text-paper" : idle
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
