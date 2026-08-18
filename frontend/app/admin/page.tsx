"use client";

import Link from "next/link";
import { useDesk } from "@/components/admin/DeskContext";
import { LeadContactStrip } from "@/components/admin/LeadContactStrip";

const STAGES = ["new", "contacted", "qualified", "inspecting", "negotiating", "won", "lost"];

export default function AdminHomePage() {
  const { stats, refreshDesk } = useDesk();

  if (!stats) return <p className="text-mauve">Loading overview…</p>;

  const kpis = [
    { k: "Leads · 7 days", v: stats.leads7d, href: "/admin/enquiries" },
    { k: "Stale new", v: stats.staleNew, href: "/admin/enquiries?stage=new" },
    { k: "Follow-ups due", v: stats.dueFollowUps, href: "/admin/enquiries" },
    { k: "Tasks due", v: stats.dueTasks ?? 0, href: "/admin/tasks" },
    { k: "Contacts", v: stats.contacts ?? 0, href: "/admin/contacts" },
    { k: "Live sale", v: stats.liveSale, href: "/admin/listings?side=sale" },
    { k: "Live lease", v: stats.liveLease, href: "/admin/listings?side=lease" },
    { k: "Subscribers", v: stats.subscribers, href: "/admin/subscribers" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="t-caption text-oxblood">Desk</p>
          <h1 className="t-h1 mt-2 text-ink">Overview</h1>
        </div>
        <button type="button" onClick={() => void refreshDesk()} className="text-xs font-semibold text-oxblood hover:underline">
          Refresh
        </button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((card) => (
          <Link key={card.k} href={card.href} className="border-t-2 border-oxblood bg-paper px-5 py-5">
            <p className="t-caption text-oxblood">{card.k}</p>
            <p className="t-h2 mt-2 text-ink">{card.v}</p>
          </Link>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="t-h3 text-ink">Pipeline</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {STAGES.map((stage) => (
            <Link
              key={stage}
              href={`/admin/enquiries?stage=${stage}`}
              className="border border-oxblood/10 bg-paper px-3 py-4 hover:border-oxblood"
            >
              <p className="t-caption text-mauve">{stage}</p>
              <p className="t-mono-lg mt-2 text-ink">{stats.byStage[stage] ?? 0}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="t-h3 text-ink">Needs attention</h2>
          <ul className="mt-4 divide-y divide-oxblood/10 border border-oxblood/10 bg-paper">
            {stats.attention.staleLeads.map((row) => (
              <li key={`stale-${row.id}`} className="px-4 py-3 hover:bg-oxblood/5">
                <Link href={`/admin/enquiries/${row.id}`} className="text-sm font-semibold text-ink hover:text-oxblood">
                  {row.name} · stale new
                </Link>
                <LeadContactStrip
                  name={row.name}
                  phone={row.phone}
                  email={row.email}
                  property={row.property}
                  propertySlug={row.propertySlug}
                  compact
                />
              </li>
            ))}
            {stats.attention.pingFailures.map((row) => (
              <li key={`ping-${row.id}`} className="px-4 py-3 hover:bg-oxblood/5">
                <Link href={`/admin/enquiries/${row.id}`} className="text-sm font-semibold text-ink hover:text-oxblood">
                  {row.name} · ping failed
                </Link>
                <LeadContactStrip
                  name={row.name}
                  phone={row.phone}
                  email={row.email}
                  property={row.property}
                  propertySlug={row.propertySlug}
                  compact
                />
              </li>
            ))}
            {stats.attention.noImages.map((row) => (
              <li key={`img-${row.id}`}>
                <Link href={`/admin/listings/${row.id}`} className="block px-4 py-3 hover:bg-oxblood/5">
                  <p className="text-sm font-semibold text-ink">{row.address} · no images</p>
                  <p className="text-xs text-mauve">{row.suburb}</p>
                </Link>
              </li>
            ))}
            {stats.attention.upcomingInspections.map((row) => (
              <li key={`insp-${row.id}`} className="px-4 py-3 hover:bg-oxblood/5">
                <Link href={`/admin/enquiries/${row.id}`} className="text-sm font-semibold text-ink hover:text-oxblood">
                  {row.name} · inspect {row.preferredInspectionAt}
                </Link>
                <LeadContactStrip
                  name={row.name}
                  phone={row.phone}
                  email={row.email}
                  property={row.property}
                  propertySlug={row.propertySlug}
                  compact
                />
              </li>
            ))}
            {(stats.attention.dueTasks ?? []).map((row) => (
              <li key={`task-${row.id}`} className="px-4 py-3 hover:bg-oxblood/5">
                <Link
                  href={row.contactId ? `/admin/contacts/${row.contactId}` : "/admin/tasks"}
                  className="text-sm font-semibold text-ink hover:text-oxblood"
                >
                  {row.title} · task due
                </Link>
                <p className="mt-1 text-xs text-mauve">
                  {row.kind}
                  {row.dueAt ? ` · ${new Date(row.dueAt).toLocaleDateString("en-AU")}` : ""}
                </p>
              </li>
            ))}
            {(stats.attention.quietPortals ?? []).map((row) => (
              <li key={`quiet-${row.portal}`} className="px-4 py-3 hover:bg-oxblood/5">
                <Link href="/admin/settings" className="text-sm font-semibold text-ink hover:text-oxblood">
                  {row.warning || `No ${row.portal} leads in 14 days`}
                </Link>
                <p className="mt-1 text-xs text-mauve">Check portal notification settings</p>
              </li>
            ))}
            {!stats.attention.staleLeads.length &&
            !stats.attention.pingFailures.length &&
            !stats.attention.noImages.length &&
            !stats.attention.upcomingInspections.length &&
            !(stats.attention.dueTasks ?? []).length &&
            !(stats.attention.quietPortals ?? []).length ? (
              <li className="px-4 py-6 text-sm text-mauve">Nothing waiting.</li>
            ) : null}
          </ul>
        </div>

        <div>
          <h2 className="t-h3 text-ink">Activity</h2>
          <ul className="mt-4 divide-y divide-oxblood/10 border border-oxblood/10 bg-paper">
            {stats.activity.length ? (
              stats.activity.map((row) => (
                <li key={row.id} className="px-4 py-3">
                  <p className="text-sm text-ink">{row.summary}</p>
                  <p className="mt-1 text-xs text-mauve">
                    {row.by} · {new Date(row.at).toLocaleString("en-AU")}
                  </p>
                </li>
              ))
            ) : (
              <li className="px-4 py-6 text-sm text-mauve">No desk activity yet.</li>
            )}
          </ul>
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <h2 className="t-h3 text-ink">Listing health</h2>
          <Link href="/admin/listings/new" className="btn-sharp bg-oxblood text-paper hover:bg-ink">
            Add listing
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto border border-oxblood/10 bg-paper">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-oxblood/10 t-caption text-mauve">
              <tr>
                <th className="px-4 py-3 font-medium">Listing</th>
                <th className="px-4 py-3 font-medium">Side</th>
                <th className="px-4 py-3 font-medium">Leads</th>
                <th className="px-4 py-3 font-medium">Images</th>
              </tr>
            </thead>
            <tbody>
              {stats.listingHealth.length ? (
                stats.listingHealth.map((row) => (
                  <tr key={row.id} className="border-t border-oxblood/5">
                    <td className="px-4 py-3">
                      <Link href={`/admin/listings/${row.id}`} className="font-semibold text-oxblood hover:underline">
                        {row.address}
                      </Link>
                      <p className="text-xs text-mauve">{row.suburb}</p>
                    </td>
                    <td className="px-4 py-3 capitalize">{row.side}</td>
                    <td className="px-4 py-3 t-mono">{row.leadCount}</td>
                    <td className="px-4 py-3 t-mono">{row.imageCount}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-mauve">
                    No live listings yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
