"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { CrmStage, Enquiry, InspectionAttendance, Property } from "@kestrel/shared";
import { INSPECTION_ATTENDANCE } from "@kestrel/shared";
import {
  addEnquiryNote,
  attachEnquiryListing,
  createAdminTask,
  getAdminEnquiry,
  getAdminListings,
  getDeskActivity,
  patchEnquiryAttendance,
  patchEnquiryFollowUp,
  patchEnquiryStage,
  type DeskActivity,
} from "@/lib/adminApi";
import { useDesk } from "@/components/admin/DeskContext";
import { LeadContactStrip } from "@/components/admin/LeadContactStrip";
import { SourceBadge } from "@/components/admin/SourceBadge";
import type { InboundEmailRow } from "@/lib/adminApi";
import {
  followUpEmailBody,
  followUpEmailSubject,
  followUpWhatsAppText,
  listingCaption,
  mailtoHref,
  telHref,
  whatsappToLead,
} from "@/lib/contactLinks";

const STAGES: CrmStage[] = ["new", "contacted", "qualified", "inspecting", "negotiating", "won", "lost"];

export default function AdminEnquiryDetailPage() {
  const params = useParams<{ id: string }>();
  const { refreshDesk } = useDesk();
  const [row, setRow] = useState<(Enquiry & { inboundEmail?: InboundEmailRow | null }) | null>(null);
  const [activity, setActivity] = useState<DeskActivity[]>([]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [followAt, setFollowAt] = useState("");
  const [followNote, setFollowNote] = useState("");
  const [pending, setPending] = useState(false);
  const [listingQ, setListingQ] = useState("");
  const [listingHits, setListingHits] = useState<Property[]>([]);
  const [attachError, setAttachError] = useState("");
  const [showAttach, setShowAttach] = useState(false);

  async function load(id: string) {
    const [lead, feed] = await Promise.all([
      getAdminEnquiry(id),
      getDeskActivity({ entityType: "enquiry", entityId: id, limit: 30 }).catch(() => ({ activity: [] })),
    ]);
    setRow(lead);
    setFollowAt(lead.followUpAt ? lead.followUpAt.slice(0, 10) : "");
    setFollowNote(lead.followUpNote ?? "");
    setActivity(feed.activity);
  }

  useEffect(() => {
    if (!params.id) return;
    load(params.id).catch((err) => setError(err instanceof Error ? err.message : "Not found."));
  }, [params.id]);

  useEffect(() => {
    if (listingQ.trim().length < 2) {
      setListingHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      getAdminListings({ q: listingQ.trim() })
        .then(setListingHits)
        .catch(() => setListingHits([]));
    }, 200);
    return () => window.clearTimeout(t);
  }, [listingQ]);

  const listing = listingCaption(row?.property, row?.propertySlug);
  const tel = row?.phone ? telHref(row.phone) : null;
  const mail = row?.email
    ? mailtoHref(row.email, followUpEmailSubject(listing), followUpEmailBody(row.name, listing))
    : null;
  const wa = row?.phone ? whatsappToLead(row.phone, followUpWhatsAppText(row.name, listing)) : null;

  async function onStage(crmStage: CrmStage) {
    if (!row) return;
    const updated = await patchEnquiryStage(row.id, crmStage);
    setRow(updated);
    await refreshDesk();
    if (params.id) await load(params.id).catch(() => undefined);
  }

  async function onFollow(e: FormEvent) {
    e.preventDefault();
    if (!row) return;
    setPending(true);
    try {
      const updated = await patchEnquiryFollowUp(row.id, {
        followUpAt: followAt || null,
        followUpNote: followNote,
      });
      setRow(updated);
      await refreshDesk();
    } finally {
      setPending(false);
    }
  }

  async function onNote(e: FormEvent) {
    e.preventDefault();
    if (!row || !note.trim()) return;
    setPending(true);
    try {
      const updated = await addEnquiryNote(row.id, note.trim());
      setRow(updated);
      setNote("");
      await refreshDesk();
      if (params.id) await load(params.id).catch(() => undefined);
    } finally {
      setPending(false);
    }
  }

  async function attach(slug: string) {
    if (!row) return;
    setPending(true);
    setAttachError("");
    try {
      const updated = await attachEnquiryListing(row.id, slug);
      setRow(updated);
      setListingQ("");
      setListingHits([]);
      setShowAttach(false);
      await refreshDesk();
    } catch (err) {
      setAttachError(err instanceof Error ? err.message : "Could not attach listing.");
    } finally {
      setPending(false);
    }
  }

  const missingListing = useMemo(() => Boolean(row && !row.property?.address && !row.propertySlug), [row]);

  if (error) return <p className="text-oxblood">{error}</p>;
  if (!row) return <p className="text-mauve">Loading lead…</p>;

  return (
    <div className="max-w-3xl">
      <Link href="/admin/enquiries" className="text-sm font-semibold text-oxblood hover:underline">
        ← Inbox
      </Link>
      <p className="t-caption mt-6 flex flex-wrap items-center gap-2 text-oxblood">
        <SourceBadge source={row.source} />
        <span>
          {row.intent}
          {row.topic ? ` · ${row.topic}` : ""}
        </span>
      </p>
      <h1 className="t-h1 mt-2 text-ink">{row.name}</h1>
      <p className="t-mono mt-2 text-mauve">{new Date(row.createdAt).toLocaleString("en-AU")}</p>
      <LeadContactStrip
        name={row.name}
        phone={row.phone}
        email={row.email}
        property={row.property}
        propertySlug={row.propertySlug}
      />
      {row.contactId ? (
        <Link href={`/admin/contacts/${row.contactId}`} className="mt-3 inline-block text-sm font-semibold text-oxblood hover:underline">
          Open contact record →
        </Link>
      ) : null}

      <section className="mt-8 border-t-2 border-oxblood pt-6">
        <p className="t-caption text-oxblood">Listing</p>
        {row.property?.address || row.propertySlug ? (
          <div className="mt-3">
            <p className="t-h3 text-ink">{row.property?.address || listing}</p>
            {row.property?.suburb ? (
              <p className="mt-1 text-sm text-mauve">
                {row.property.suburb}
                {row.property.priceLabel ? ` · ${row.property.priceLabel}` : ""}
              </p>
            ) : row.property?.priceLabel ? (
              <p className="mt-1 text-sm text-mauve">{row.property.priceLabel}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              {row.propertySlug ? (
                <Link href={`/listing/${row.propertySlug}`} className="font-semibold text-oxblood hover:underline">
                  Public listing
                </Link>
              ) : null}
              {row.property?.id ? (
                <Link href={`/admin/listings/${row.property.id}`} className="font-semibold text-oxblood hover:underline">
                  Desk edit
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-mauve">No listing attached.</p>
        )}
        {missingListing || showAttach ? (
          <div className="mt-4">
            <p className="t-caption text-mauve">{missingListing ? "Attach listing" : "Change listing"}</p>
            <input
              className="kc-field mt-2 w-full px-3 py-2"
              value={listingQ}
              onChange={(e) => setListingQ(e.target.value)}
              placeholder="Search address or suburb…"
            />
            {attachError ? <p className="mt-2 text-sm text-oxblood">{attachError}</p> : null}
            {listingHits.length ? (
              <ul className="mt-2 divide-y divide-oxblood/10 border border-oxblood/10 bg-paper">
                {listingHits.slice(0, 8).map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={pending}
                      className="w-full px-3 py-2 text-left hover:bg-oxblood/5 disabled:opacity-50"
                      onClick={() => void attach(p.slug)}
                    >
                      <p className="text-sm font-semibold text-ink">{p.address}</p>
                      <p className="text-xs text-mauve">
                        {p.suburb} · {p.priceLabel}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            className="mt-4 text-sm font-semibold text-oxblood hover:underline"
            onClick={() => setShowAttach(true)}
          >
            Change listing
          </button>
        )}
      </section>

      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="border-t border-oxblood/15 pt-3">
          <dt className="t-caption text-mauve">Company</dt>
          <dd className="mt-1">{row.company || "—"}</dd>
        </div>
        <div className="border-t border-oxblood/15 pt-3">
          <dt className="t-caption text-mauve">Inspection</dt>
          <dd className="mt-1 text-sm">
            {row.preferredInspectionAt || "—"} {row.inspectionWindow ? `· ${row.inspectionWindow}` : ""}
          </dd>
        </div>
        {row.intent === "inspection" || row.preferredInspectionAt ? (
          <div className="border-t border-oxblood/15 pt-3">
            <dt className="t-caption text-mauve">Attendance</dt>
            <dd className="mt-2">
              <select
                className="kc-field px-3 py-2"
                value={row.inspectionAttendance || "booked"}
                onChange={(e) =>
                  void patchEnquiryAttendance(row.id, e.target.value as InspectionAttendance).then((updated) => {
                    setRow(updated);
                    void refreshDesk();
                  })
                }
              >
                {INSPECTION_ATTENDANCE.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-8 border-t-2 border-oxblood pt-6">
        <p className="t-caption text-oxblood">Message</p>
        <p className="t-body mt-3 whitespace-pre-wrap text-ink/90">{row.message}</p>
      </div>

      {row.inboundEmail ? (
        <details className="mt-8 border border-oxblood/15 bg-paper p-4">
          <summary className="cursor-pointer text-sm font-semibold text-oxblood">Original portal email</summary>
          <p className="mt-3 text-xs text-mauve">
            {row.inboundEmail.from} · {new Date(row.inboundEmail.receivedAt).toLocaleString("en-AU")}
          </p>
          <p className="mt-2 font-semibold text-ink">{row.inboundEmail.subject}</p>
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-ink">
            {row.inboundEmail.text || "(empty body)"}
          </pre>
        </details>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-mauve">Stage</span>
          <select className="kc-field px-3 py-2" value={row.crmStage} onChange={(e) => void onStage(e.target.value as CrmStage)}>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        {wa ? (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-sharp self-end bg-tan text-ink hover:bg-oxblood hover:text-paper">
            WhatsApp
          </a>
        ) : null}
        {tel ? (
          <a href={tel} className="btn-sharp self-end border border-oxblood text-oxblood hover:bg-oxblood hover:text-paper">
            Call
          </a>
        ) : null}
        {mail ? (
          <a href={mail} className="btn-sharp self-end border border-oxblood text-oxblood hover:bg-oxblood hover:text-paper">
            Email
          </a>
        ) : null}
        <Link href="/admin/inspections" className="btn-sharp self-end border border-oxblood/20 text-ink hover:border-oxblood">
          Diary
        </Link>
      </div>

      <p className="mt-4 text-xs text-mauve">
        Ping: {row.notifiedAt ? new Date(row.notifiedAt).toLocaleString("en-AU") : "not delivered"}{" "}
        {row.notifyChannels?.length ? `· ${row.notifyChannels.join(", ")}` : ""}
      </p>

      <form onSubmit={onFollow} className="mt-10 grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
        <label className="text-sm">
          <span className="mb-1 block text-mauve">Follow-up date</span>
          <input type="date" className="kc-field w-full px-3 py-2" value={followAt} onChange={(e) => setFollowAt(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-mauve">Follow-up note</span>
          <input className="kc-field w-full px-3 py-2" value={followNote} onChange={(e) => setFollowNote(e.target.value)} />
        </label>
        <button type="submit" disabled={pending} className="btn-sharp bg-ink text-paper hover:bg-oxblood disabled:opacity-60">
          Save follow-up
        </button>
      </form>
      <button
        type="button"
        className="mt-3 text-sm font-semibold text-oxblood hover:underline"
        onClick={() =>
          void createAdminTask({
            title: `Follow up · ${row.name}`,
            kind: "follow-up",
            dueAt: followAt || new Date().toISOString().slice(0, 10),
            contactId: row.contactId || null,
            enquiryId: row.id,
            propertySlug: row.propertySlug || null,
          }).then(() => refreshDesk())
        }
      >
        Also create a task
      </button>

      <section className="mt-12">
        <h2 className="t-h3 text-ink">Timeline</h2>
        <ul className="mt-4 space-y-3">
          {(row.notes ?? []).slice().reverse().map((n, i) => (
            <li key={`${n.at}-${i}`} className="border-l-2 border-tan pl-3">
              <p className="text-sm text-ink">{n.text}</p>
              <p className="mt-1 text-xs text-mauve">
                {n.by} · {new Date(n.at).toLocaleString("en-AU")}
              </p>
            </li>
          ))}
          {activity.map((a) => (
            <li key={a.id} className="border-l-2 border-oxblood/20 pl-3">
              <p className="text-sm text-ink">{a.summary}</p>
              <p className="mt-1 text-xs text-mauve">
                {a.by} · {new Date(a.at).toLocaleString("en-AU")}
              </p>
            </li>
          ))}
        </ul>
        <form onSubmit={onNote} className="mt-4 space-y-3">
          <textarea className="kc-field min-h-24 w-full px-3 py-3" value={note} onChange={(e) => setNote(e.target.value)} />
          <button type="submit" disabled={pending} className="btn-sharp bg-oxblood text-paper hover:bg-ink disabled:opacity-60">
            {pending ? "Saving…" : "Add note"}
          </button>
        </form>
      </section>
    </div>
  );
}
