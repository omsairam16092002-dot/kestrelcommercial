"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import type { Property } from "@kestrel/shared";
import {
  fileInboundEmail,
  getAdminListings,
  getInboundEmails,
  type InboundEmailRow,
} from "@/lib/adminApi";
import { useDesk } from "@/components/admin/DeskContext";

export function NeedsReviewQueue() {
  const { refreshDesk } = useDesk();
  const [rows, setRows] = useState<InboundEmailRow[]>([]);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState("");

  async function reload() {
    const data = await getInboundEmails(true);
    setRows(data.emails);
  }

  useEffect(() => {
    reload().catch((err) => setError(err instanceof Error ? err.message : "Could not load review queue."));
  }, []);

  if (error) return <p className="mt-8 text-oxblood">{error}</p>;
  if (!rows.length) {
    return <p className="mt-8 text-sm text-mauve">Nothing waiting. Failed portal parses land here instead of becoming garbage leads.</p>;
  }

  return (
    <ul className="mt-8 space-y-4">
      {rows.map((row) => (
        <ReviewCard
          key={row.id}
          row={row}
          open={openId === row.id}
          onToggle={() => setOpenId(openId === row.id ? "" : row.id)}
          onFiled={async () => {
            await reload();
            await refreshDesk();
          }}
        />
      ))}
    </ul>
  );
}

function ReviewCard({
  row,
  open,
  onToggle,
  onFiled,
}: {
  row: InboundEmailRow;
  open: boolean;
  onToggle: () => void;
  onFiled: () => Promise<void>;
}) {
  const fields = row.parsedFields || {};
  const [name, setName] = useState(fields.name || "");
  const [phone, setPhone] = useState(fields.phone || "");
  const [email, setEmail] = useState(fields.email || "");
  const [message, setMessage] = useState(fields.message || row.subject);
  const [listingQ, setListingQ] = useState(fields.address || fields.listingId || "");
  const [slug, setSlug] = useState("");
  const [hits, setHits] = useState<Property[]>([]);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (listingQ.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      getAdminListings({ q: listingQ.trim() })
        .then(setHits)
        .catch(() => setHits([]));
    }, 200);
    return () => window.clearTimeout(t);
  }, [listingQ]);

  async function onFile(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setErr("");
    try {
      const filed = await fileInboundEmail(row.id, {
        name,
        phone,
        email,
        message,
        propertySlug: slug || undefined,
        portal: row.portal === "realcommercial" ? "realcommercial" : "rea",
      });
      await onFiled();
      window.location.href = `/admin/enquiries/${filed.enquiryId}`;
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not file this email.");
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="border border-oxblood/15 bg-paper p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="t-caption text-oxblood">{row.portal === "realcommercial" ? "realcommercial" : row.portal === "rea" ? "REA" : "Unknown portal"}</p>
          <p className="mt-1 font-semibold text-ink">{row.subject || "(no subject)"}</p>
          <p className="mt-1 text-xs text-mauve">
            {row.from} · {new Date(row.receivedAt).toLocaleString("en-AU")}
          </p>
          {row.parseError ? <p className="mt-2 text-sm text-oxblood">{row.parseError}</p> : null}
        </div>
        <button type="button" className="text-sm font-semibold text-oxblood hover:underline" onClick={onToggle}>
          {open ? "Hide raw email" : "Show raw email"}
        </button>
      </div>
      {open ? (
        <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap border border-oxblood/10 bg-white/60 p-3 text-xs text-ink">
          {row.subject}
          {"\n\n"}
          {row.text || "(empty body)"}
        </pre>
      ) : null}
      <form onSubmit={onFile} className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-mauve">Name</span>
          <input className="kc-field w-full px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-mauve">Phone</span>
          <input className="kc-field w-full px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-mauve">Email</span>
          <input className="kc-field w-full px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-mauve">Listing</span>
          <input className="kc-field w-full px-3 py-2" value={listingQ} onChange={(e) => setListingQ(e.target.value)} placeholder="Search address…" />
          {slug ? <p className="mt-1 t-mono text-[10px] text-mauve">{slug}</p> : null}
          {hits.length ? (
            <ul className="mt-1 border border-oxblood/10">
              {hits.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full px-2 py-1 text-left text-xs hover:bg-oxblood/5"
                    onClick={() => {
                      setSlug(p.slug);
                      setListingQ(`${p.address}, ${p.suburb}`);
                      setHits([]);
                    }}
                  >
                    {p.address}, {p.suburb}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </label>
        <label className="text-sm md:col-span-2">
          <span className="mb-1 block text-mauve">Message</span>
          <textarea className="kc-field min-h-20 w-full px-3 py-2" value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>
        {err ? <p className="text-sm text-oxblood md:col-span-2">{err}</p> : null}
        <button type="submit" disabled={pending} className="btn-sharp bg-oxblood text-paper hover:bg-ink disabled:opacity-60 md:col-span-2">
          {pending ? "Filing…" : "File as enquiry"}
        </button>
      </form>
      {row.enquiryId ? (
        <Link href={`/admin/enquiries/${row.enquiryId}`} className="mt-3 inline-block text-sm font-semibold text-oxblood">
          Already filed →
        </Link>
      ) : null}
    </li>
  );
}
