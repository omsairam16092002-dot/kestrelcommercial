"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { hasMapCoordinates, type Property, type TransactionSide } from "@kestrel/shared";
import { EmptyState } from "@/components/listing/EmptyState";
import { SearchResultRow } from "@/components/listing/SearchResultRow";

const SearchMap = dynamic(
  () => import("@/components/listing/SearchMap").then((m) => m.SearchMap),
  {
    ssr: false,
    loading: () => (
      <div className="surface h-full min-h-[420px] animate-pulse" />
    ),
  },
);

export function SearchResultsWorkspace({
  properties,
  side,
}: {
  properties: Property[];
  side: TransactionSide;
}) {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    () => properties.find(hasMapCoordinates)?.slug ?? null,
  );
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [listQuery, setListQuery] = useState("");
  const rowRefs = useRef<Record<string, HTMLElement | null>>({});

  const visible = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter((p) =>
      `${p.address} ${p.suburb} ${p.postcode} ${p.slug}`.toLowerCase().includes(q),
    );
  }, [properties, listQuery]);

  const mappedCount = useMemo(
    () => visible.filter(hasMapCoordinates).length,
    [visible],
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (selectedSlug && visible.some((p) => p.slug === selectedSlug)) return;
    setSelectedSlug(visible.find(hasMapCoordinates)?.slug ?? null);
  }, [visible, selectedSlug]);

  useEffect(() => {
    if (!selectedSlug) return;
    const el = rowRefs.current[selectedSlug];
    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
  }, [selectedSlug]);

  function select(slug: string) {
    setSelectedSlug(slug);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setMobileView("map");
    }
  }

  if (!properties.length) {
    return <EmptyState side={side} />;
  }

  return (
    <div>
      <div className="premium-panel mb-5 flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="t-mono text-oxblood">
            {String(visible.length).padStart(2, "0")} of {String(properties.length).padStart(2, "0")} building
            {properties.length === 1 ? "" : "s"}
            {mappedCount ? ` · ${String(mappedCount).padStart(2, "0")} on the map` : ""}
          </p>
          <label className="mt-3 block max-w-md">
            <span className="sr-only">Filter this list by suburb or street</span>
            <input
              className="dial t-mono w-full bg-white px-4 py-3 text-ink placeholder:text-mauve"
              value={listQuery}
              onChange={(e) => setListQuery(e.target.value)}
              placeholder="Filter by suburb or street"
            />
          </label>
        </div>
        <div
          className="grid grid-cols-2 bg-white p-1 lg:hidden"
          role="group"
          aria-label="List or map"
        >
          {(["list", "map"] as const).map((view) => (
            <button
              key={view}
              type="button"
              aria-pressed={mobileView === view}
              className={`min-h-11 px-4 py-2 text-xs font-semibold transition-colors duration-150 ease-out active:scale-[0.985] ${
                mobileView === view ? "bg-oxblood text-paper" : "text-oxblood hover:bg-paper"
              }`}
              onClick={() => setMobileView(view)}
            >
              {view === "list" ? "List" : "Map"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,42%)]">
        <div className={mobileView === "map" ? "hidden lg:block" : ""}>
          <div className="max-h-[calc(100dvh-12rem)] space-y-3 overflow-y-auto pr-1 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)]">
            {visible.length ? (
              visible.map((property, i) => (
              <SearchResultRow
                key={property.id}
                property={property}
                selected={property.slug === selectedSlug}
                index={i + 1}
                onSelect={select}
                onHover={setHoveredSlug}
                register={(el) => {
                  rowRefs.current[property.slug] = el;
                }}
              />
              ))
            ) : (
              <p className="t-body text-mauve">No buildings in this list match that suburb or street.</p>
            )}
          </div>
        </div>

        <div className={mobileView === "list" ? "hidden lg:block" : ""}>
          <div className="surface h-[calc(100dvh-12rem)] overflow-hidden shadow-[0_24px_60px_rgba(42,20,24,0.08)] lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]">
            {isDesktop === true || mobileView === "map" ? (
              <SearchMap
                properties={visible}
                selectedSlug={selectedSlug}
                hoveredSlug={hoveredSlug}
                onSelect={setSelectedSlug}
              />
            ) : (
              <div className="h-full min-h-[420px] bg-paper" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
