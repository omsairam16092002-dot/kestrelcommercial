"use client";

import { useEffect, useState } from "react";
import { downloadSubscribersCsv, getSubscribers } from "@/lib/adminApi";

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
    </div>
  );
}
