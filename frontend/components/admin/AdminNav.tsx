"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutDesk } from "@/lib/adminApi";
import { useDesk } from "@/components/admin/DeskContext";
import { NotificationBell } from "@/components/admin/NotificationBell";
import {
  IconBuilding,
  IconCalendar,
  IconCog,
  IconGrid,
  IconInbox,
  IconMail,
  IconSearch,
  IconTasks,
  IconUsers,
} from "@/components/icons";

const LINKS = [
  { href: "/admin", label: "Overview", icon: IconGrid, exact: true },
  { href: "/admin/enquiries", label: "Enquiries", icon: IconInbox, badge: "leads" as const },
  { href: "/admin/contacts", label: "Contacts", icon: IconUsers },
  { href: "/admin/tasks", label: "Tasks", icon: IconTasks, badge: "tasks" as const },
  { href: "/admin/inspections", label: "Inspections", icon: IconCalendar },
  { href: "/admin/listings", label: "Listings", icon: IconBuilding },
  { href: "/admin/subscribers", label: "Subscribers", icon: IconMail },
  { href: "/admin/settings", label: "Settings", icon: IconCog },
];

export function AdminNav() {
  const pathname = usePathname() || "/admin";
  const router = useRouter();
  const { user, stats, unread, setPaletteOpen } = useDesk();
  const leadBadge = (stats?.staleNew ?? 0) + (stats?.byStage?.new ?? 0) + (stats?.needsReviewCount ?? 0);
  const taskBadge = stats?.dueTasks ?? 0;

  async function logout() {
    await logoutDesk().catch(() => undefined);
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-paper/10 bg-ink text-paper lg:flex">
      <div className="border-b border-paper/10 px-5 py-5">
        <Link href="/admin" className="block text-lg font-semibold tracking-[-0.04em]">
          Kestrel
        </Link>
        <p className="mt-1 t-caption text-tan">Desk</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {LINKS.map((item) => {
          const active = item.exact ? pathname === "/admin" : pathname.startsWith(item.href);
          const Icon = item.icon;
          const badge = item.badge === "leads" ? leadBadge : item.badge === "tasks" ? taskBadge : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium ${
                active ? "bg-tan text-ink" : "text-paper/75 hover:bg-paper/10 hover:text-paper"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {badge > 0 ? (
                <span className={`t-mono text-[10px] ${active ? "text-ink" : "text-tan"}`}>{badge > 99 ? "99+" : badge}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-paper/10 px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="inline-flex items-center gap-2 px-2 py-1 text-xs text-paper/70 hover:text-tan"
          >
            <IconSearch className="h-3.5 w-3.5" /> Search ⌘K
          </button>
          <div className="[&_button]:text-paper [&_svg]:text-paper">
            <NotificationBell />
          </div>
        </div>
        <p className="truncate text-sm text-paper">{user.name}</p>
        <p className="truncate t-mono text-[11px] text-paper/55">{user.email}</p>
        <button type="button" onClick={() => void logout()} className="mt-3 text-xs font-semibold text-tan hover:text-paper">
          Sign out
        </button>
        <Link href="/" className="mt-2 block text-xs text-paper/50 hover:text-tan">
          View public site →
        </Link>
      </div>
    </aside>
  );
}
