import { LEAD_SCORE_LABELS, type LeadScore } from "@kestrel/shared";

const TONE: Record<LeadScore, string> = {
  hot: "bg-oxblood text-paper",
  warm: "bg-tan text-ink",
  cold: "border border-oxblood/20 text-mauve",
};

export function LeadScoreBadge({ score, booked }: { score?: LeadScore | null; booked?: boolean }) {
  if (!score && !booked) return null;
  return (
    <span className="inline-flex items-center gap-1">
      {score ? (
        <span className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONE[score]}`}>{LEAD_SCORE_LABELS[score]}</span>
      ) : null}
      {booked ? <span className="bg-ink px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper">Booked</span> : null}
    </span>
  );
}
