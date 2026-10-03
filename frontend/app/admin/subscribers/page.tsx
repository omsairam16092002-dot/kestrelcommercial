"use client";

import { useEffect, useState } from "react";
import type { SavedSearch } from "@kestrel/shared";
import { deleteSavedSearch, downloadSubscribersCsv, getSavedSearches, getSubscribers } from "@/lib/adminApi";

export default function AdminSubscribersPage() {
  const [rows, setRows] = useState<{ id: string; email: string; source?: string; createdAt?: string | null }[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => {
      getSubscribers(q.trim() || undefined)
        .then((data) => setRows(data.subscribers))
        .catch((err) => setError(err instanceof Error ? err.message : "Could not load subscribers."));
    }, 180);
    return () => window.clearTimeout(t);
  }, [q]);

  if (error) return <p className="text-oxblood">{error}</p>;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="t-caption text-oxblood">This month in the west</p>
          <h1 className="t-h1 mt-2 text-ink">Subscribers</h1>
        </div>
        <button type="button" className="btn-sharp border border-oxblood text-oxblood hover:bg-oxblood hover:text-paper" onClick={() => void downloadSubscribersCsv()}>
          Export CSV
        </button>
      </div>
      <label className="mt-6 block max-w-md text-sm">
        <span className="mb-1 block text-mauve">Search</span>
        <input className="kc-field w-full px-3 py-2" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Email…" />
      </label>
      <div className="mt-8 overflow-x-auto border border-oxblood/10 bg-paper">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-oxblood/10 t-caption text-mauve">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-oxblood/5">
                <td className="px-4 py-3">{row.email}</td>
                <td className="px-4 py-3">{row.source || "newsletter"}</td>
                <td className="px-4 py-3 t-mono text-xs">
                  {row.createdAt ? new Date(row.createdAt).toLocaleString("en-AU") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PropertyAlerts />
    </div>
  );
}

function PropertyAlerts() {
  const [rows, setRows] = useState<SavedSearch[] | null>(null);

  const load = () =>
    getSavedSearches({ origin: "public" })
      .then((d) => setRows(d.searches))
      .catch(() => setRows([]));

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="mt-14">
      <h2 className="t-h2 text-ink">Property alerts</h2>
      <p className="mt-2 text-sm text-mauve">
        Visitors who saved a search on the website. They get an email whenever a matching listing goes live. Desk
        requirements live on each contact.
      </p>
      <div className="mt-6 overflow-x-auto border border-oxblood/10 bg-paper">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-oxblood/10 t-caption text-mauve">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Search</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Sent</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows?.length ? (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-oxblood/5">
                  <td className="px-4 py-3">{row.email}</td>
                  <td className="px-4 py-3">{row.label}</td>
                  <td className="px-4 py-3 text-xs">{!row.confirmed ? "Unconfirmed" : row.active ? "Active" : "Paused"}</td>
                  <td className="px-4 py-3 t-mono text-xs">{row.alertCount}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="text-xs font-semibold text-mauve hover:text-oxblood" onClick={() => void deleteSavedSearch(row.id).then(load)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-mauve">
                  {rows ? "No property alerts yet." : "Loading…"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
