"use client";

import { useState } from "react";
import Link from "next/link";
import { markNotificationsRead } from "@/lib/adminApi";
import { useDesk } from "@/components/admin/DeskContext";
import { IconBell } from "@/components/icons";

export function NotificationBell() {
  const { unread, notifications, refreshDesk } = useDesk();
  const [open, setOpen] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread) {
      await markNotificationsRead().catch(() => undefined);
      await refreshDesk();
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void toggle()}
        className="relative inline-flex h-9 w-9 items-center justify-center text-current hover:bg-oxblood/5"
        aria-label="Notifications"
      >
        <IconBell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 min-w-4 bg-oxblood px-1 text-center t-mono text-[10px] leading-4 text-paper">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-1 w-80 border border-oxblood/15 bg-paper shadow-none">
          <p className="border-b border-oxblood/10 px-4 py-2 t-caption text-oxblood">Needs you</p>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length ? (
              notifications.map((n) => (
                <li key={n.id} className="border-b border-oxblood/5">
                  <Link href={n.href} onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-oxblood/5">
                    <p className="text-sm font-semibold text-ink">{n.title}</p>
                    {n.detail ? <p className="mt-1 text-xs text-mauve">{n.detail}</p> : null}
                  </Link>
                </li>
              ))
            ) : (
              <li className="px-4 py-6 text-sm text-mauve">Caught up.</li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
