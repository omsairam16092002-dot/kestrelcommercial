import type { EnquirySource } from "@kestrel/shared";

export function portalBadgeLabel(source?: string | null) {
  if (source === "portal-rea") return "REA";
  if (source === "portal-realcommercial") return "realcommercial";
  return null;
}

export function SourceBadge({ source }: { source?: EnquirySource | string | null }) {
  const portal = portalBadgeLabel(source);
  if (portal) {
    return (
      <span className="inline-flex bg-oxblood px-1.5 py-0.5 t-mono text-[10px] uppercase tracking-[0.12em] text-tan">
        {portal}
      </span>
    );
  }
  return <span className="text-xs text-mauve">{source || "web"}</span>;
}
