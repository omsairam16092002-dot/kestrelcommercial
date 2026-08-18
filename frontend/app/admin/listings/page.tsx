"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Property } from "@kestrel/shared";
import { PROPERTY_TYPES, propertyTypeLabel } from "@kestrel/shared";
import { archiveListing, downloadReaxml, duplicateListing, getAdminListings } from "@/lib/adminApi";
import { useDesk } from "@/components/admin/DeskContext";

function AdminListingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshDesk } = useDesk();
  const [rows, setRows] = useState<Property[]>([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [side, setSide] = useState(searchParams.get("side") ?? "all");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [type, setType] = useState(searchParams.get("type") ?? "");
  const [featured, setFeatured] = useState(searchParams.get("featured") ?? "");
  const [showArchived, setShowArchived] = useState(true);

  const reload = useCallback(async () => {
    setRows(
      await getAdminListings({
        q: q.trim() || undefined,
        side,
        status: status || undefined,
        type: type || undefined,
        featured: featured || undefined,
        archived: showArchived,
      }),
    );
  }, [q, side, status, type, featured, showArchived]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (side !== "all") params.set("side", side);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (featured) params.set("featured", featured);
    const next = params.toString();
    router.replace(next ? `/admin/listings?${next}` : "/admin/listings", { scroll: false });
  }, [q, side, status, type, featured, router]);

  useEffect(() => {
    reload().catch((err) => setError(err instanceof Error ? err.message : "Could not load listings."));
  }, [reload]);

  async function onArchive(id: string) {
    if (!confirm("Archive this listing from the public site?")) return;
    await archiveListing(id);
    await reload();
    await refreshDesk();
  }

  async function onDuplicate(id: string) {
    const copy = await duplicateListing(id);
    await refreshDesk();
    window.location.href = `/admin/listings/${copy.id}`;
  }

  if (error) return <p className="text-oxblood">{error}</p>;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="t-caption text-oxblood">Inventory</p>
          <h1 className="t-h1 mt-2 text-ink">Listings</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-sharp border border-oxblood text-oxblood hover:bg-oxblood hover:text-paper"
            onClick={() => void downloadReaxml("/api/properties/feed.xml", "kestrel-listings.xml")}
          >
            Download REAXML
          </button>
          <Link href="/admin/listings/new" className="btn-sharp bg-oxblood text-paper hover:bg-ink">
            Add listing
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <label className="text-sm md:col-span-2">
          <span className="mb-1 block text-mauve">Search</span>
          <input className="kc-field w-full px-3 py-2" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Address, suburb, slug…" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-mauve">Side</span>
          <select className="kc-field w-full px-3 py-2" value={side} onChange={(e) => setSide(e.target.value)}>
            <option value="all">All</option>
            <option value="sale">Sale</option>
            <option value="lease">Lease</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-mauve">Status</span>
          <select className="kc-field w-full px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {["for-sale", "for-lease", "under-offer", "sold", "leased"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-mauve">Type</span>
          <select className="kc-field w-full px-3 py-2" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All</option>
            {PROPERTY_TYPES.map((s) => (
              <option key={s} value={s}>
                {propertyTypeLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-mauve">Featured</span>
          <select className="kc-field w-full px-3 py-2" value={featured} onChange={(e) => setFeatured(e.target.value)}>
            <option value="">All</option>
            <option value="1">Featured only</option>
          </select>
        </label>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-mauve">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        Include archived
      </label>

      <div className="mt-8 overflow-x-auto border border-oxblood/10 bg-paper">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-oxblood/10 t-caption text-mauve">
            <tr>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Side</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Leads</th>
              <th className="px-4 py-3">Images</th>
              <th className="px-4 py-3">Featured</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={`border-t border-oxblood/5 ${row.archived ? "opacity-50" : ""}`}>
                <td className="px-4 py-3">
                  <Link href={`/admin/listings/${row.id}`} className="font-semibold text-oxblood hover:underline">
                    {row.address}
                  </Link>
                  <p className="text-xs text-mauve">
                    {row.suburb} {row.postcode}
                    {row.archived ? " · archived" : ""}
                  </p>
                </td>
                <td className="px-4 py-3 capitalize">{row.transactionSide}</td>
                <td className="px-4 py-3">{propertyTypeLabel(row.propertyType)}</td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3 t-mono">{row.leadCount ?? 0}</td>
                <td className="px-4 py-3 t-mono">{row.images?.length ?? 0}</td>
                <td className="px-4 py-3">{row.featured ? "Yes" : "—"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <Link href={`/listing/${row.slug}`} className="text-xs font-semibold text-ink hover:underline">
                      View
                    </Link>
                    <button type="button" className="text-xs font-semibold text-oxblood" onClick={() => void onDuplicate(row.id)}>
                      Duplicate
                    </button>
                    {!row.archived ? (
                      <button type="button" className="text-xs font-semibold text-mauve" onClick={() => void onArchive(row.id)}>
                        Archive
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminListingsRoute() {
  return (
    <Suspense fallback={<p className="text-mauve">Loading listings…</p>}>
      <AdminListingsPage />
    </Suspense>
  );
}
