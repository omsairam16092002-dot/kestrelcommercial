"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CrmStage, InspectionAttendance } from "@kestrel/shared";
import { addEnquiryNote, getInspections, patchEnquiryAttendance, patchEnquiryStage, type DeskLeadLite } from "@/lib/adminApi";
import { useDesk } from "@/components/admin/DeskContext";
import { LeadContactStrip } from "@/components/admin/LeadContactStrip";
import { followUpWhatsAppText, listingCaption, telHref, whatsappToLead } from "@/lib/contactLinks";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminInspectionsPage() {
  const { refreshDesk } = useDesk();
  const [from, setFrom] = useState(todayIso());
  const [rows, setRows] = useState<DeskLeadLite[]>([]);
  const [range, setRange] = useState({ from: "", to: "" });
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState("");

  async function reload(start = from) {
    const data = await getInspections(start, 7);
    setRows(data.inspections);
    setRange({ from: data.from, to: data.to });
  }

  useEffect(() => {
    reload().catch((err) => setError(err instanceof Error ? err.message : "Could not load inspections."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, DeskLeadLite[]>();
    for (const row of rows) {
      const day = row.preferredInspectionAt?.slice(0, 10) || "Unscheduled";
      map.set(day, [...(map.get(day) ?? []), row]);
    }
    return Array.from(map.entries());
  }, [rows]);

  async function markAttendance(id: string, attendance: InspectionAttendance) {
    setPendingId(id);
    try {
      await patchEnquiryAttendance(id, attendance);
      if (attendance === "attended") await patchEnquiryStage(id, "inspecting").catch(() => undefined);
      await reload();
      await refreshDesk();
    } finally {
      setPendingId("");
    }
  }

  async function mark(id: string, stage: CrmStage) {
    setPendingId(id);
    try {
      await patchEnquiryStage(id, stage);
      if (stage === "inspecting") await addEnquiryNote(id, "Marked inspecting from diary.").catch(() => undefined);
      await reload();
      await refreshDesk();
    } finally {
      setPendingId("");
    }
  }

  if (error) return <p className="text-oxblood">{error}</p>;

  return (
    <div>
      <p className="t-caption text-oxblood">Diary</p>
      <h1 className="t-h1 mt-2 text-ink">Inspections</h1>
      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-mauve">Week from</span>
          <input
            type="date"
            className="kc-field px-3 py-2"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              void reload(e.target.value).catch(() => undefined);
            }}
          />
        </label>
        <p className="text-xs text-mauve">
          {range.from && range.to ? `${range.from} → ${range.to}` : "Loading…"}
        </p>
      </div>

      <div className="mt-8 space-y-8">
        {grouped.length ? (
          grouped.map(([day, items]) => (
            <section key={day}>
              <h2 className="t-h3 text-ink">{day}</h2>
              <ul className="mt-3 divide-y divide-oxblood/10 border border-oxblood/10 bg-paper">
                {items.map((row) => {
                  const listing = listingCaption(row.property, row.propertySlug);
                  const wa = row.phone
                    ? whatsappToLead(row.phone, followUpWhatsAppText(row.name, listing || "inspection"))
                    : null;
                  const tel = row.phone ? telHref(row.phone) : null;
                  return (
                    <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                      <div>
                        <Link href={`/admin/enquiries/${row.id}`} className="font-semibold text-oxblood hover:underline">
                          {row.name}
                        </Link>
                        <p className="mt-1 text-xs text-mauve">
                          {row.inspectionWindow || "window TBC"} · {row.crmStage}
                          {row.inspectionAttendance ? ` · ${row.inspectionAttendance}` : ""}
                        </p>
                        <LeadContactStrip
                          name={row.name}
                          phone={row.phone}
                          email={row.email}
                          property={row.property}
                          propertySlug={row.propertySlug}
                          compact
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {tel ? (
                          <a href={tel} className="btn-sharp border border-oxblood text-oxblood hover:bg-oxblood hover:text-paper">
                            Call
                          </a>
                        ) : null}
                        {wa ? (
                          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-sharp bg-tan text-ink hover:bg-oxblood hover:text-paper">
                            WhatsApp
                          </a>
                        ) : null}
                        <button
                          type="button"
                          disabled={pendingId === row.id}
                          className="btn-sharp border border-oxblood text-oxblood hover:bg-oxblood hover:text-paper disabled:opacity-50"
                          onClick={() => void mark(row.id, "contacted")}
                        >
                          Contacted
                        </button>
                        <button
                          type="button"
                          disabled={pendingId === row.id}
                          className="btn-sharp bg-oxblood text-paper hover:bg-ink disabled:opacity-50"
                          onClick={() => void markAttendance(row.id, "attended")}
                        >
                          Attended
                        </button>
                        <button
                          type="button"
                          disabled={pendingId === row.id}
                          className="btn-sharp border border-oxblood/20 text-ink hover:border-oxblood disabled:opacity-50"
                          onClick={() => void markAttendance(row.id, "no-show")}
                        >
                          No-show
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        ) : (
          <p className="border border-oxblood/10 bg-paper px-4 py-8 text-sm text-mauve">No inspections in this week.</p>
        )}
      </div>
    </div>
  );
}
