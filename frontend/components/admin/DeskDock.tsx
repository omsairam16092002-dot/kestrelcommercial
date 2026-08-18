"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutDesk } from "@/lib/adminApi";
import { useDesk } from "@/components/admin/DeskContext";
import { IconBuilding, IconCalendar, IconGrid, IconInbox, IconUsers } from "@/components/icons";

const DOCK = [
  { href: "/admin", label: "Home", icon: IconGrid, exact: true },
  { href: "/admin/enquiries", label: "Leads", icon: IconInbox, badgeKey: "leads" as const },
  { href: "/admin/contacts", label: "People", icon: IconUsers },
  { href: "/admin/listings", label: "Stock", icon: IconBuilding },
  { href: "/admin/inspections", label: "Inspect", icon: IconCalendar },
];

export function DeskDock() {
  const pathname = usePathname() || "/admin";
  const router = useRouter();
  const { stats, unread, user } = useDesk();
  const leadBadge = (stats?.staleNew ?? 0) + (stats?.byStage?.new ?? 0);

  async function logout() {
    await logoutDesk().catch(() => undefined);
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-oxblood/15 bg-paper pb-[env(safe-area-inset-bottom)] lg:hidden">
      <nav className="grid grid-cols-5">
        {DOCK.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const badge = item.badgeKey === "leads" ? leadBadge + unread : 0;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                active ? "text-oxblood" : "text-mauve"
              }`}
            >
              <span className="relative">
                <Icon className="h-4 w-4" />
                {badge > 0 ? (
                  <span className="absolute -right-2 -top-1 min-w-3 bg-oxblood px-0.5 text-center t-mono text-[9px] leading-3 text-paper">
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center justify-between border-t border-oxblood/10 px-4 py-2">
        <p className="truncate text-xs text-ink">{user.name}</p>
        <button type="button" onClick={() => void logout()} className="text-xs font-semibold text-oxblood">
          Sign out
        </button>
      </div>
    </div>
  );
}
