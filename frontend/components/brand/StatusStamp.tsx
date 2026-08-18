import { STATUS_LABELS, statusTone, type PropertyStatus, type TransactionSide } from "@kestrel/shared";

type Size = "sm" | "md" | "lg";

export function StatusStamp({
  status,
  side,
  size = "md",
}: {
  status: PropertyStatus;
  side?: TransactionSide;
  size?: Size;
}) {
  const tone = statusTone(status, side);
  const label = STATUS_LABELS[status];
  const sizeClass =
    size === "sm" ? "px-2.5 py-1 text-[10px]" : size === "lg" ? "px-4 py-1.5 text-[12px]" : "px-3 py-1 text-[11px]";

  return (
    <span
      className={`inline-flex items-center rounded-none font-semibold tracking-wide ${sizeClass} ${
        tone === "oxblood" ? "bg-oxblood text-paper" : "bg-tan text-ink"
      }`}
    >
      {label}
    </span>
  );
}
