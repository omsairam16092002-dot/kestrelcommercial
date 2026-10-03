"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  COMMERCIAL_TYPE_OPTIONS,
  canonicalSearchQuery,
  describeSpecFilters,
  type AssetCategory,
  type PropertyType,
  type SavedSearch,
  type SpecFilters,
} from "@kestrel/shared";
import {
  createDeskRequirement,
  deleteSavedSearch,
  getSavedSearchMatches,
  getSavedSearches,
  patchSavedSearch,
  type AlertMatchLite,
} from "@/lib/adminApi";

type Draft = {
  side: "sale" | "lease" | "all";
  category: AssetCategory;
  type: string;
  suburb: string;
  minFloor: string;
  maxFloor: string;
  minLand: string;
  maxPrice: string;
};

const EMPTY: Draft = { side: "sale", category: "commercial", type: "", suburb: "", minFloor: "", maxFloor: "", minLand: "", maxPrice: "" };

function toFilters(d: Draft): SpecFilters {
  const n = (v: string) => (v.trim() && Number(v) > 0 ? Number(v) : undefined);
  return {
    side: d.side,
    assetCategory: d.category,
    propertyType: (d.category === "commercial" && d.type ? d.type : undefined) as PropertyType | undefined,
    suburb: d.suburb.trim() || undefined,
    minFloorAreaSqm: n(d.minFloor),
    maxFloorAreaSqm: n(d.maxFloor),
    minLandAreaSqm: n(d.minLand),
    maxPrice: n(d.maxPrice),
  };
}

export function RequirementsPanel({ contactId, hasEmail }: { contactId: string; hasEmail: boolean }) {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [matches, setMatches] = useState<Record<string, AlertMatchLite[]>>({});
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [emailAlerts, setEmailAlerts] = useState(hasEmail);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function load() {
    const data = await getSavedSearches({ contactId });
    setSearches(data.searches);
    const entries = await Promise.all(
      data.searches.map(async (s) => [s.id, (await getSavedSearchMatches(s.id).catch(() => ({ matches: [] }))).matches] as const),
    );
    setMatches(Object.fromEntries(entries));
  }

  useEffect(() => {
    load().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      await createDeskRequirement({ contactId, query: canonicalSearchQuery(toFilters(draft)), emailAlerts });
      setDraft(EMPTY);
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that requirement.");
    } finally {
      setPending(false);
    }
  }

  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const field = "kc-field w-full px-3 py-2 text-sm";

  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="t-h3 text-ink">Requirements</h2>
          <p className="mt-1 text-sm text-mauve">What they are looking for. New matching listings raise a call task{hasEmail ? " and can email them" : ""}.</p>
        </div>
        {!open ? (
          <button type="button" onClick={() => setOpen(true)} className="btn-sharp bg-ink text-paper hover:bg-oxblood">
            Add requirement
          </button>
        ) : null}
      </div>

      {open ? (
        <form onSubmit={onAdd} className="mt-4 space-y-4 border border-oxblood/10 bg-paper p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-mauve">Buy or lease</span>
              <select className={field} value={draft.side} onChange={(e) => set({ side: e.target.value as Draft["side"] })}>
                <option value="sale">Buy</option>
                <option value="lease">Lease</option>
                <option value="all">Either</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-mauve">Category</span>
              <select className={field} value={draft.category} onChange={(e) => set({ category: e.target.value as AssetCategory, type: "" })}>
                <option value="commercial">Commercial</option>
                <option value="residential">Residential</option>
                <option value="development-site">Development site</option>
              </select>
            </label>
            {draft.category === "commercial" ? (
              <label className="text-sm">
                <span className="mb-1 block text-mauve">Type</span>
                <select className={field} value={draft.type} onChange={(e) => set({ type: e.target.value })}>
                  <option value="">Any</option>
                  {COMMERCIAL_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="text-sm">
              <span className="mb-1 block text-mauve">Suburb</span>
              <input className={field} value={draft.suburb} onChange={(e) => set({ suburb: e.target.value })} placeholder="Any" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-mauve">Min floor (m²)</span>
              <input className={field} inputMode="numeric" value={draft.minFloor} onChange={(e) => set({ minFloor: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-mauve">Max floor (m²)</span>
              <input className={field} inputMode="numeric" value={draft.maxFloor} onChange={(e) => set({ maxFloor: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-mauve">Min land (m²)</span>
              <input className={field} inputMode="numeric" value={draft.minLand} onChange={(e) => set({ minLand: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-mauve">Max price ($)</span>
              <input className={field} inputMode="numeric" value={draft.maxPrice} onChange={(e) => set({ maxPrice: e.target.value })} />
            </label>
          </div>
          <p className="text-sm text-ink">
            <span className="text-mauve">Brief: </span>
            {describeSpecFilters(toFilters(draft))}
          </p>
          <label className={`flex items-center gap-2 text-sm ${hasEmail ? "text-ink" : "text-mauve"}`}>
            <input type="checkbox" disabled={!hasEmail} checked={emailAlerts && hasEmail} onChange={(e) => setEmailAlerts(e.target.checked)} className="h-4 w-4 accent-oxblood" />
            Email them new matches automatically{hasEmail ? "" : " (add an email to this contact first)"}
          </label>
          {error ? <p className="text-sm text-oxblood">{error}</p> : null}
          <div className="flex gap-3">
            <button type="submit" disabled={pending} className="btn-sharp bg-oxblood text-paper hover:bg-ink disabled:opacity-60">
              Save requirement
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold text-mauve hover:text-ink">
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <ul className="mt-4 space-y-3">
        {searches.length ? (
          searches.map((s) => (
            <li key={s.id} className="border border-oxblood/10 bg-paper px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${s.active ? "text-ink" : "text-mauve line-through"}`}>{s.label}</p>
                  <p className="mt-1 text-xs text-mauve">
                    {s.origin === "public" ? "Set up on the website" : "Desk requirement"}
                    {s.origin === "public" && !s.confirmed ? " · not confirmed yet" : ""}
                    {s.emailAlerts ? " · emails on" : " · emails off"}
                    {s.alertCount ? ` · ${s.alertCount} matches sent` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs font-semibold">
                  <button type="button" className="text-oxblood hover:underline" onClick={() => void patchSavedSearch(s.id, { active: !s.active }).then(load)}>
                    {s.active ? "Pause" : "Resume"}
                  </button>
                  {hasEmail || s.origin === "public" ? (
                    <button type="button" className="text-oxblood hover:underline" onClick={() => void patchSavedSearch(s.id, { emailAlerts: !s.emailAlerts }).then(load)}>
                      {s.emailAlerts ? "Stop emails" : "Email matches"}
                    </button>
                  ) : null}
                  <button type="button" className="text-mauve hover:text-oxblood" onClick={() => void deleteSavedSearch(s.id).then(load)}>
                    Remove
                  </button>
                </div>
              </div>
              {matches[s.id]?.length ? (
                <ul className="mt-3 space-y-1 border-t border-oxblood/10 pt-3">
                  {matches[s.id].slice(0, 5).map((m) => (
                    <li key={m.id} className="flex items-baseline justify-between gap-3 text-sm">
                      <a href={`/listing/${m.slug}`} target="_blank" rel="noopener noreferrer" className="text-ink hover:text-oxblood">
                        {m.address}
                      </a>
                      <span className="shrink-0 text-xs text-mauve">{m.priceLabel || "—"}</span>
                    </li>
                  ))}
                  {matches[s.id].length > 5 ? <li className="text-xs text-mauve">+ {matches[s.id].length - 5} more live matches</li> : null}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-mauve">No live matches right now.</p>
              )}
            </li>
          ))
        ) : (
          <li className="border border-oxblood/10 bg-paper px-4 py-6 text-sm text-mauve">No requirements recorded.</li>
        )}
      </ul>
    </section>
  );
}
