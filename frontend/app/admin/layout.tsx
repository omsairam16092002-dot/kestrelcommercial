"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { CommandPalette } from "@/components/admin/CommandPalette";
import { DeskDock } from "@/components/admin/DeskDock";
import { DeskProvider, useDesk } from "@/components/admin/DeskContext";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { IconSearch } from "@/components/icons";
import { meDesk, type DeskUser } from "@/lib/adminApi";

function DeskChrome({ children }: { children: React.ReactNode }) {
  const { setPaletteOpen } = useDesk();
  return (
    <div className="flex min-h-screen flex-col bg-paper lg:flex-row">
      <AdminNav />
      <div className="min-w-0 flex-1 pb-28 lg:pb-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-oxblood/10 bg-paper px-4 py-3 lg:hidden">
          <Link href="/admin" className="text-sm font-semibold tracking-[-0.04em] text-ink">
            Kestrel desk
          </Link>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center text-ink"
              aria-label="Search"
            >
              <IconSearch className="h-4 w-4" />
            </button>
            <NotificationBell />
            <Link href="/" className="px-2 text-xs font-semibold text-oxblood">
              Site
            </Link>
          </div>
        </header>
        <div className="px-4 py-6 sm:px-8 lg:py-10">{children}</div>
      </div>
      <DeskDock />
      <CommandPalette />
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/admin";
  const router = useRouter();
  const authPage = pathname === "/admin/login" || pathname === "/admin/signup";
  const [user, setUser] = useState<DeskUser | null>(null);
  const [ready, setReady] = useState(authPage);
  const loaded = useRef(false);

  useEffect(() => {
    if (authPage) {
      setReady(true);
      return;
    }
    if (loaded.current && user) {
      setReady(true);
      return;
    }
    let cancelled = false;
    meDesk()
      .then((res) => {
        if (!cancelled) {
          loaded.current = true;
          setUser(res.user);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
      });
    return () => {
      cancelled = true;
    };
  }, [authPage, pathname, router, user]);

  if (authPage) return <>{children}</>;
  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper t-body text-mauve">
        Opening the desk…
      </div>
    );
  }

  return (
    <DeskProvider user={user}>
      <DeskChrome>{children}</DeskChrome>
    </DeskProvider>
  );
}
