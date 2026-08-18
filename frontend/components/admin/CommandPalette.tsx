"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deskSearch, type DeskSearchHit } from "@/lib/adminApi";
import { useDesk } from "@/components/admin/DeskContext";

const SHORTCUTS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/contacts", label: "Contacts" },
  { href: "/admin/tasks", label: "Tasks" },
  { href: "/admin/inspections", label: "Inspections" },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/listings/new", label: "New listing" },
  { href: "/admin/subscribers", label: "Subscribers" },
  { href: "/admin/settings", label: "Settings" },
];

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen } = useDesk();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{
    enquiries: DeskSearchHit[];
    listings: DeskSearchHit[];
    subscribers: DeskSearchHit[];
    contacts: DeskSearchHit[];
  }>({
    enquiries: [],
    listings: [],
    subscribers: [],
    contacts: [],
  });

  useEffect(() => {
    if (!paletteOpen) {
      setQ("");
      setHits({ enquiries: [], listings: [], subscribers: [], contacts: [] });
      return;
    }
    const t = window.setTimeout(() => {
      if (q.trim().length < 2) {
        setHits({ enquiries: [], listings: [], subscribers: [], contacts: [] });
        return;
      }
      deskSearch(q.trim())
        .then(setHits)
        .catch(() => setHits({ enquiries: [], listings: [], subscribers: [], contacts: [] }));
    }, 180);
    return () => window.clearTimeout(t);
  }, [q, paletteOpen]);

  if (!paletteOpen) return null;

  function go(href: string) {
    setPaletteOpen(false);
    router.push(href);
  }

  const groups = [
    { label: "Contacts", rows: hits.contacts },
    { label: "Enquiries", rows: hits.enquiries },
    { label: "Listings", rows: hits.listings },
    { label: "Subscribers", rows: hits.subscribers },
  ].filter((g) => g.rows.length);

  return (
    <div className="fixed inset-0 z-50 bg-ink/50" onClick={() => setPaletteOpen(false)}>
      <div
        className="mx-auto mt-[12vh] w-[min(640px,calc(100%-1.5rem))] border border-oxblood/20 bg-paper"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          className="kc-field w-full border-0 border-b border-oxblood/15 px-4 py-4 text-ink"
          placeholder="Search contacts, leads, listings…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {groups.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="px-3 py-1 t-caption text-mauve">{group.label}</p>
              {group.rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-oxblood/5"
                  onClick={() => go(row.href)}
                >
                  <span className="text-sm font-semibold text-ink">{row.name}</span>
                  <span className="text-xs text-mauve">{row.detail}</span>
                </button>
              ))}
            </div>
          ))}
          <p className="px-3 py-1 t-caption text-mauve">Jump</p>
          {SHORTCUTS.filter((s) => !q || s.label.toLowerCase().includes(q.toLowerCase())).map((s) => (
            <button
              key={s.href}
              type="button"
              className="flex w-full px-3 py-2 text-left text-sm text-ink hover:bg-oxblood/5"
              onClick={() => go(s.href)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="border-t border-oxblood/10 px-4 py-2 text-[11px] text-mauve">Esc to close · ⌘K to open</p>
      </div>
    </div>
  );
}
