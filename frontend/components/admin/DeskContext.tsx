"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getDeskNotifications,
  getAdminStats,
  type AdminStats,
  type DeskNotification,
  type DeskUser,
} from "@/lib/adminApi";

type DeskContextValue = {
  user: DeskUser;
  stats: AdminStats | null;
  unread: number;
  notifications: DeskNotification[];
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  refreshDesk: () => Promise<void>;
};

const DeskContext = createContext<DeskContextValue | null>(null);

export function DeskProvider({ user, children }: { user: DeskUser; children: ReactNode }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<DeskNotification[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const refreshDesk = useCallback(async () => {
    const [nextStats, notes] = await Promise.all([
      getAdminStats().catch(() => null),
      getDeskNotifications().catch(() => null),
    ]);
    if (nextStats) setStats(nextStats);
    if (notes) {
      setUnread(notes.unread);
      setNotifications(notes.items);
    }
  }, []);

  useEffect(() => {
    void refreshDesk();
    const tick = window.setInterval(() => void refreshDesk(), 30_000);
    const onFocus = () => void refreshDesk();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshDesk]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(
    () => ({ user, stats, unread, notifications, paletteOpen, setPaletteOpen, refreshDesk }),
    [user, stats, unread, notifications, paletteOpen, refreshDesk],
  );

  return <DeskContext.Provider value={value}>{children}</DeskContext.Provider>;
}

export function useDesk() {
  const ctx = useContext(DeskContext);
  if (!ctx) throw new Error("useDesk must be used inside DeskProvider");
  return ctx;
}
