export type AnalyticsPayload = {
  event: string;
  id?: string;
  page?: string;
  listing?: string;
  source?: string;
  href?: string;
};

export function track(payload: AnalyticsPayload) {
  if (typeof window === "undefined") return;
  const detail = { ...payload, ts: Date.now(), path: window.location.pathname };
  window.dispatchEvent(new CustomEvent("kestrel:analytics", { detail }));
  const w = window as Window & { dataLayer?: Record<string, unknown>[] };
  w.dataLayer?.push(detail);
}
