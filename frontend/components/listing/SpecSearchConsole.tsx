"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  BEDROOM_PRESETS,
  BATHROOM_PRESETS,
  CAR_PRESETS,
  CLEAR_SPAN_PRESETS,
  DOOR_HEIGHT_PRESETS,
  FLOOR_AREA_PRESETS,
  LAND_AREA_PRESETS,
  PRICE_PRESETS_LEASE,
  PRICE_PRESETS_SALE,
  PROPERTY_TYPES,
  ZONING_OPTIONS,
  type AssetCategory,
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
  assetCategory?: AssetCategory;
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

export function SpecSearchConsole({ initial, variant = "hero", assetCategory = "commercial" }: Props) {
  const router = useRouter();
  const allowLease = assetCategory !== "development-site";
  const defaultSide: TransactionSide =
    allowLease && initial?.side === "lease" ? "lease" : "sale";
  const [side, setSide] = useState<TransactionSide>(defaultSide);
  const [minFloor, setMinFloor] = useState(initial?.minFloorAreaSqm ? String(initial.minFloorAreaSqm) : "");
  const [minSpan, setMinSpan] = useState(initial?.minClearSpanM ? String(initial.minClearSpanM) : "");
  const [minDoor, setMinDoor] = useState(initial?.minRollerDoorM ? String(initial.minRollerDoorM) : "");
  const [minLand, setMinLand] = useState(initial?.minLandAreaSqm ? String(initial.minLandAreaSqm) : "");
  const [minBeds, setMinBeds] = useState(initial?.minBedrooms ? String(initial.minBedrooms) : "");
  const [minBaths, setMinBaths] = useState(initial?.minBathrooms ? String(initial.minBathrooms) : "");
  const [minCars, setMinCars] = useState(initial?.minCarSpaces ? String(initial.minCarSpaces) : "");
  const [zoning, setZoning] = useState(initial?.zoning ?? "");
  const [propertyType, setPropertyType] = useState(initial?.propertyType ?? "");
  const [maxPrice, setMaxPrice] = useState(initial?.maxPrice ? String(initial.maxPrice) : "");
  const [power, setPower] = useState(Boolean(initial?.threePhasePower));
  const [hardstand, setHardstand] = useState(Boolean(initial?.hardstand));
  const [suburb, setSuburb] = useState(initial?.suburb ?? "");

  function filtersFor(next: TransactionSide, price = maxPrice): SpecFilters {
    return {
      side: allowLease ? next : "sale",
      assetCategory,
      minFloorAreaSqm: minFloor ? Number(minFloor) : undefined,
      minClearSpanM: minSpan ? Number(minSpan) : undefined,
      minRollerDoorM: minDoor ? Number(minDoor) : undefined,
      minLandAreaSqm: minLand ? Number(minLand) : undefined,
      minBedrooms: minBeds ? Number(minBeds) : undefined,
      minBathrooms: minBaths ? Number(minBaths) : undefined,
      minCarSpaces: minCars ? Number(minCars) : undefined,
      zoning: zoning || undefined,
      suburb: suburb.trim() || undefined,
      propertyType: (propertyType || undefined) as SpecFilters["propertyType"],
      maxPrice: price ? Number(price) : undefined,
      threePhasePower: power || undefined,
      hardstand: hardstand || undefined,
    };
  }

  function goToSide(next: TransactionSide, price = maxPrice) {
    const qs = specFiltersToSearchParams(filtersFor(next, price));
    track({ event: "spec_search", id: "spec-console", page: variant, source: next });
    const base =
      assetCategory === "commercial"
        ? "/properties/commercial"
        : assetCategory === "residential"
          ? "/properties/residential"
          : "/properties/development-sites";
    router.push(`${base}${qs ? `?${qs}` : ""}`);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    goToSide(side, maxPrice);
  }

  const pricePresets = allowLease && side === "lease" ? PRICE_PRESETS_LEASE : PRICE_PRESETS_SALE;
  const isCommercial = assetCategory === "commercial";
  const isResidential = assetCategory === "residential";

  return (
    <form
      onSubmit={onSubmit}
      className="surface p-4 sm:p-6 md:p-7"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="t-caption text-oxblood">Search by spec</p>
          <p className="t-body mt-1 text-ink/70">
            {isCommercial
              ? "Floor, span, door, power — then suburb if you already know the corridor."
              : isResidential
                ? "Beds, baths, cars, land and price — then suburb if you already know the pocket."
                : "Land, zoning, permit status and price — then suburb once the shortlist is real."}
          </p>
        </div>
        {allowLease ? (
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
        ) : (
          <div className="bg-paper px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-oxblood">
            Sale listings
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
        {isCommercial ? (
          <>
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
              {PROPERTY_TYPES.filter((t) => ["office-warehouse", "warehouse", "showroom", "yard"].includes(t)).map((t) => (
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
          </>
        ) : isResidential ? (
          <>
            <Dial label="Beds" value={minBeds} onChange={setMinBeds}>
              {BEDROOM_PRESETS.map((opt) => (
                <option key={opt.label} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Dial>
            <Dial label="Baths" value={minBaths} onChange={setMinBaths}>
              {BATHROOM_PRESETS.map((opt) => (
                <option key={opt.label} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Dial>
            <Dial label="Cars" value={minCars} onChange={setMinCars}>
              {CAR_PRESETS.map((opt) => (
                <option key={opt.label} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Dial>
            <Dial label="Land" value={minLand} onChange={setMinLand}>
              {LAND_AREA_PRESETS.map((opt) => (
                <option key={opt.label} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Dial>
            <Dial label="Type" value={propertyType} onChange={setPropertyType}>
              <option value="">All homes</option>
              {PROPERTY_TYPES.filter((t) => ["house", "townhouse", "apartment"].includes(t)).map((t) => (
                <option key={t} value={t}>
                  {propertyTypeLabel(t)}
                </option>
              ))}
            </Dial>
          </>
        ) : (
          <>
            <Dial label="Land area" value={minLand} onChange={setMinLand}>
              {LAND_AREA_PRESETS.map((opt) => (
                <option key={opt.label} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Dial>
            <Dial label="Type" value={propertyType} onChange={setPropertyType}>
              <option value="">All sites</option>
              {PROPERTY_TYPES.filter((t) => ["development-land", "rural"].includes(t)).map((t) => (
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
          </>
        )}
        <Dial
          label={allowLease && side === "lease" ? "Max rent" : "Max price"}
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

      <label className="mt-4 block max-w-md">
        <span className="mb-1.5 block text-xs font-medium text-mauve">Suburb</span>
        <input
          className="dial t-mono w-full bg-white px-4 py-3.5 text-ink placeholder:text-mauve"
          value={suburb}
          onChange={(e) => setSuburb(e.target.value)}
          placeholder="Williamstown North, Truganina…"
          autoComplete="address-level2"
        />
      </label>

      {isCommercial ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="t-caption mr-2 text-mauve">Industrial</p>
          <SpecChip pressed={power} onToggle={() => setPower((v) => !v)}>
            3-phase power
          </SpecChip>
          <SpecChip pressed={hardstand} onToggle={() => setHardstand((v) => !v)}>
            Hardstand
          </SpecChip>
        </div>
      ) : null}
    </form>
  );
}
