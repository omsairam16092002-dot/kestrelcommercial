"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  CLEAR_SPAN_PRESETS,
  DOOR_HEIGHT_PRESETS,
  FLOOR_AREA_PRESETS,
  PRICE_PRESETS_LEASE,
  PRICE_PRESETS_SALE,
  PROPERTY_TYPES,
  ZONING_OPTIONS,
  propertyTypeLabel,
  specFiltersToSearchParams,
  type SpecFilters,
  type TransactionSide,
} from "@kestrel/shared";
import { track } from "@/lib/analytics";
import { IconChevronDown, IconSearch } from "@/components/icons";

type Props = {
  initial?: SpecFilters;
  variant?: "hero" | "page";
};

function Dial({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-medium text-mauve">{label}</span>
      <span className="relative block">
        <select
          className="dial t-mono w-full cursor-pointer bg-white px-4 py-3.5 pr-9 text-ink"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mauve" aria-hidden>
          <IconChevronDown className="h-4 w-4" />
        </span>
      </span>
    </label>
  );
}

function SpecChip({
  pressed,
  onToggle,
  children,
}: {
  pressed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={`px-4 py-2.5 text-xs font-semibold transition-colors duration-150 ease-out active:scale-[0.985] ${
        pressed ? "bg-oxblood text-paper" : "bg-paper text-ink hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}

export function SpecSearchConsole({ initial, variant = "hero" }: Props) {
  const router = useRouter();
  const [side, setSide] = useState<TransactionSide>(
    initial?.side === "lease" ? "lease" : "sale",
  );
  const [minFloor, setMinFloor] = useState(initial?.minFloorAreaSqm ? String(initial.minFloorAreaSqm) : "");
  const [minSpan, setMinSpan] = useState(initial?.minClearSpanM ? String(initial.minClearSpanM) : "");
  const [minDoor, setMinDoor] = useState(initial?.minRollerDoorM ? String(initial.minRollerDoorM) : "");
  const [zoning, setZoning] = useState(initial?.zoning ?? "");
  const [propertyType, setPropertyType] = useState(initial?.propertyType ?? "");
  const [maxPrice, setMaxPrice] = useState(initial?.maxPrice ? String(initial.maxPrice) : "");
  const [power, setPower] = useState(Boolean(initial?.threePhasePower));
  const [hardstand, setHardstand] = useState(Boolean(initial?.hardstand));

  function filtersFor(next: TransactionSide, price = maxPrice): SpecFilters {
    return {
      side: next,
      minFloorAreaSqm: minFloor ? Number(minFloor) : undefined,
      minClearSpanM: minSpan ? Number(minSpan) : undefined,
      minRollerDoorM: minDoor ? Number(minDoor) : undefined,
      zoning: zoning || undefined,
      propertyType: (propertyType || undefined) as SpecFilters["propertyType"],
      maxPrice: price ? Number(price) : undefined,
      threePhasePower: power || undefined,
      hardstand: hardstand || undefined,
    };
  }

  function goToSide(next: TransactionSide, price = maxPrice) {
    const qs = specFiltersToSearchParams(filtersFor(next, price));
    track({ event: "spec_search", id: "spec-console", page: variant, source: next });
    router.push(`${next === "lease" ? "/lease" : "/buy"}${qs ? `?${qs}` : ""}`);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    goToSide(side, maxPrice);
  }

  const pricePresets = side === "lease" ? PRICE_PRESETS_LEASE : PRICE_PRESETS_SALE;

  return (
    <form
      onSubmit={onSubmit}
      className="surface p-4 sm:p-6 md:p-7"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="t-caption text-oxblood">Search by spec</p>
          <p className="t-body mt-1 text-ink/70">Floor, span, door, power, yard — not suburb pills.</p>
        </div>
        <div
          className="relative grid w-full max-w-[240px] grid-cols-2 bg-paper p-1"
          role="group"
          aria-label="Sale or lease"
        >
          <span
            className={`pointer-events-none absolute bottom-1 top-1 w-[calc(50%-4px)] transition-[left] duration-150 ease-out ${
              side === "lease" ? "left-[calc(50%+2px)] bg-tan" : "left-1 bg-oxblood"
            }`}
            aria-hidden
          />
          <button
            type="button"
            aria-pressed={side === "sale"}
            className={`relative z-10 min-h-11 py-2 text-xs font-semibold ${side === "sale" ? "text-paper" : "text-oxblood"}`}
            onClick={() => {
              setSide("sale");
              setMaxPrice("");
              goToSide("sale", "");
            }}
          >
            For sale
          </button>
          <button
            type="button"
            aria-pressed={side === "lease"}
            className={`relative z-10 min-h-11 py-2 text-xs font-semibold ${side === "lease" ? "text-ink" : "text-oxblood"}`}
            onClick={() => {
              setSide("lease");
              setMaxPrice("");
              goToSide("lease", "");
            }}
          >
            For lease
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
        <Dial label="Min floor" value={minFloor} onChange={setMinFloor}>
          {FLOOR_AREA_PRESETS.map((opt) => (
            <option key={opt.label} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Dial>
        <Dial label="Min span" value={minSpan} onChange={setMinSpan}>
          {CLEAR_SPAN_PRESETS.map((opt) => (
            <option key={opt.label} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Dial>
        <Dial label="Min door" value={minDoor} onChange={setMinDoor}>
          {DOOR_HEIGHT_PRESETS.map((opt) => (
            <option key={opt.label} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Dial>
        <Dial label="Type" value={propertyType} onChange={setPropertyType}>
          <option value="">All types</option>
          {PROPERTY_TYPES.map((t) => (
            <option key={t} value={t}>
              {propertyTypeLabel(t)}
            </option>
          ))}
        </Dial>
        <Dial label="Zoning" value={zoning} onChange={setZoning}>
          <option value="">All zones</option>
          {ZONING_OPTIONS.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </Dial>
        <Dial
          label={side === "lease" ? "Max rent" : "Max price"}
          value={maxPrice}
          onChange={setMaxPrice}
        >
          {pricePresets.map((opt) => (
            <option key={opt.label} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Dial>
        <div className="flex items-end">
          <button
            type="submit"
            id="cta-spec-search"
            className="btn-sharp inline-flex w-full items-center justify-center gap-2 bg-ink text-paper hover:bg-oxblood lg:w-auto"
          >
            <IconSearch className="h-4 w-4" />
            Search
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <p className="t-caption mr-2 text-mauve">Industrial</p>
        <SpecChip pressed={power} onToggle={() => setPower((v) => !v)}>
          3-phase power
        </SpecChip>
        <SpecChip pressed={hardstand} onToggle={() => setHardstand((v) => !v)}>
          Hardstand
        </SpecChip>
      </div>
    </form>
  );
}
