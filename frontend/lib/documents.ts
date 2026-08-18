"use client";

import { useEffect, useState } from "react";

const KEY = "kestrel:unlocked-docs";
const EVENT = "kestrel:docs-unlocked";

function readMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

export function getUnlockedLeadId(slug: string): string | null {
  return readMap()[slug] ?? null;
}

export function unlockDocuments(slug: string, leadId: string) {
  const map = readMap();
  map[slug] = leadId;
  sessionStorage.setItem(KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { slug, leadId } }));
}

export function useUnlockedDocuments(slug: string): string | null {
  const [leadId, setLeadId] = useState<string | null>(null);

  useEffect(() => {
    setLeadId(getUnlockedLeadId(slug));
    const onUnlock = (event: Event) => {
      const detail = (event as CustomEvent<{ slug: string; leadId: string }>).detail;
      if (detail?.slug === slug) setLeadId(detail.leadId);
    };
    window.addEventListener(EVENT, onUnlock);
    return () => window.removeEventListener(EVENT, onUnlock);
  }, [slug]);

  return leadId;
}
