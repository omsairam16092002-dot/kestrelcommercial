"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { CrmStage, Enquiry, EnquiryIntent } from "@kestrel/shared";
import { ENQUIRY_SOURCES } from "@kestrel/shared";
import { bulkEnquiryStage, getAdminEnquiries, patchEnquiryStage } from "@/lib/adminApi";
import { useDesk } from "@/components/admin/DeskContext";
import { LeadContactStrip } from "@/components/admin/LeadContactStrip";
import { NeedsReviewQueue } from "@/components/admin/NeedsReviewQueue";
import { SourceBadge } from "@/components/admin/SourceBadge";

const STAGES: CrmStage[] = ["new", "contacted", "qualified", "inspecting", "negotiating", "won", "lost"];

function AdminEnquiriesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshDesk, stats } = useDesk();
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [stage, setStage] = useState(searchParams.get("stage") ?? "all");
  const [source, setSource] = useState(searchParams.get("source") ?? "all");
  const [intent, setIntent] = useState(searchParams.get("intent") ?? "all");
  const [slug, setSlug] = useState(searchParams.get("slug") ?? "");
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");
  const [view, setView] = useState<"board" | "table" | "review">("board");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkStage, setBulkStage] = useState<CrmStage>("contacted");

  const query = useMemo(
    () => ({ q: q.trim() || undefined, stage, source, intent, slug: slug.trim() || undefined, from: from || undefined, to: to || undefined }),
    [q, stage, source, intent, slug, from, to],
  );

  const reload = useCallback(async () => {
    const data = await getAdminEnquiries(query);
    setRows(data.enquiries);
  }, [query]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (stage !== "all") params.set("stage", stage);
    if (source !== "all") params.set("source", source);
    if (intent !== "all") params.set("intent", intent);
    if (slug.trim()) params.set("slug", slug.trim());
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const next = params.toString();
    router.replace(next ? `/admin/enquiries?${next}` : "/admin/enquiries", { scroll: false });
  }, [q, stage, source, intent, slug, from, to, router]);

  useEffect(() => {
    reload().catch((err) => setError(err instanceof Error ? err.message : "Could not load enquiries."));
  }, [reload]);

  useEffect(() => {
    const tick = window.setInterval(() => void reload().catch(() => undefined), 30_000);
    const onFocus = () => void reload().catch(() => undefined);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener("focus", onFocus);
    };
  }, [reload]);

  async function move(id: string, crmStage: CrmStage) {
    const updated = await patchEnquiryStage(id, crmStage);
    setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
    await refreshDesk();
  }

  async function onBulk() {
    if (!selected.length) return;
    const { enquiries } = await bulkEnquiryStage(selected, bulkStage);
    const map = Object.fromEntries(enquiries.map((e) => [e.id, e]));
    setRows((prev) => prev.map((r) => map[r.id] ?? r));
    setSelected([]);
    await refreshDesk();
  }

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const reviewCount = stats?.needsReviewCount ?? 0;
  const statsBadge = reviewCount ? ` (${reviewCount})` : "";

  if (error) return <p className="text-oxblood">{error}</p>;

  return (
    <div>
      <p className="t-caption text-oxblood">CRM</p>
      <h1 className="t-h1 mt-2 text-ink">Enquiries</h1>
      <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <label className="text-sm md:col-span-2">
          <span className="mb-1 block text-mauve">Search</span>
          <input className="kc-field w-full px-3 py-2" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone, email, listing…" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-mauve">Stage</span>
          <select className="kc-field w-full px-3 py-2" value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="all">All</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-mauve">Source</span>
          <select className="kc-field w-full px-3 py-2" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="all">All</option>
            {ENQUIRY_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-mauve">Intent</span>
          <select className="kc-field w-full px-3 py-2" value={intent} onChange={(e) => setIntent(e.target.value)}>
            <option value="all">All</option>
            {(["enquire", "inspection", "brochure"] as EnquiryIntent[]).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-mauve">Listing slug</span>
          <input className="kc-field w-full px-3 py-2" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-mauve">From</span>
          <input type="date" className="kc-field w-full px-3 py-2" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-mauve">To</span>
          <input type="date" className="kc-field w-full px-3 py-2" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="grid grid-cols-3 border border-oxblood/15 bg-paper p-1">
          {(["board", "table", "review"] as const).map((v) => (
            <button
              key={v}
              type="button"
              className={`px-3 py-2 text-xs font-semibold ${view === v ? "bg-oxblood text-paper" : "text-oxblood"}`}
              onClick={() => setView(v)}
            >
              {v === "review" ? `Needs review${statsBadge}` : v}
            </button>
          ))}
        </div>
        {selected.length ? (
          <>
            <select className="kc-field px-3 py-2 text-sm" value={bulkStage} onChange={(e) => setBulkStage(e.target.value as CrmStage)}>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button type="button" className="btn-sharp bg-oxblood text-paper hover:bg-ink" onClick={() => void onBulk()}>
              Move {selected.length}
            </button>
          </>
        ) : (
          <p className="text-xs text-mauve">{rows.length} leads</p>
        )}
      </div>

      {view === "review" ? (
        <NeedsReviewQueue />
      ) : view === "board" ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          {STAGES.map((col) => (
            <section key={col} className="min-h-[200px] border-t-2 border-oxblood bg-paper p-3">
              <p className="t-caption text-mauve">{col}</p>
              <p className="t-mono mt-1 text-ink">{rows.filter((r) => r.crmStage === col).length}</p>
              <ul className="mt-3 space-y-2">
                {rows
                  .filter((r) => r.crmStage === col)
                  .map((row) => (
                    <li key={row.id} className="border border-oxblood/10 p-3">
                      <label className="mb-2 flex items-center gap-2 text-xs text-mauve">
                        <input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggle(row.id)} />
                        Select
                      </label>
                      <Link href={`/admin/enquiries/${row.id}`} className="font-semibold text-ink hover:text-oxblood">
                        {row.name}
                      </Link>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-mauve">
                        {row.intent} · <SourceBadge source={row.source} />
                      </p>
                      <LeadContactStrip
                        name={row.name}
                        phone={row.phone}
                        email={row.email}
                        property={row.property}
                        propertySlug={row.propertySlug}
                        compact
                      />
                      {row.preferredInspectionAt || row.inspectionWindow ? (
                        <p className="mt-1 text-xs text-oxblood">
                          Inspect {row.preferredInspectionAt || "TBC"} {row.inspectionWindow ? `· ${row.inspectionWindow}` : ""}
                        </p>
                      ) : null}
                      {row.followUpAt ? (
                        <p className="mt-1 text-xs text-mauve">Follow-up {new Date(row.followUpAt).toLocaleDateString("en-AU")}</p>
                      ) : null}
                      <select
                        className="mt-2 w-full border border-oxblood/15 bg-paper px-2 py-1 text-xs"
                        value={row.crmStage}
                        onChange={(e) => void move(row.id, e.target.value as CrmStage)}
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto border border-oxblood/10 bg-paper">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-oxblood/10 t-caption text-mauve">
              <tr>
                <th className="px-4 py-3" />
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Listing</th>
                <th className="px-4 py-3">Intent</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Inspect</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-oxblood/5">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggle(row.id)} />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/enquiries/${row.id}`} className="font-semibold text-oxblood hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <LeadContactStrip name={row.name} phone={row.phone} email={row.email} compact />
                  </td>
                  <td className="px-4 py-3 text-xs text-mauve">
                    {row.property
                      ? `${row.property.address}, ${row.property.suburb}`
                      : row.propertySlug || "—"}
                  </td>
                  <td className="px-4 py-3">{row.intent}</td>
                  <td className="px-4 py-3">
                    <SourceBadge source={row.source} />
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {row.preferredInspectionAt || row.inspectionWindow || "—"}
                  </td>
                  <td className="px-4 py-3">{row.crmStage}</td>
                  <td className="px-4 py-3 t-mono text-xs">{new Date(row.createdAt).toLocaleString("en-AU")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminEnquiriesRoute() {
  return (
    <Suspense fallback={<p className="text-mauve">Loading inbox…</p>}>
      <AdminEnquiriesPage />
    </Suspense>
  );
}
