import { listingPreviewSpecs, type Property } from "@kestrel/shared";

export function SpecMiniTable({ property }: { property: Property }) {
  const rows = listingPreviewSpecs(property);

  return (
    <dl className="grid grid-cols-4 gap-2">
      {rows.map((row) => (
        <div key={row.k} className="min-w-0">
          <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-mauve">{row.k}</dt>
          <dd className="t-mono tabular mt-1 truncate text-[13px] text-ink">{row.v}</dd>
        </div>
      ))}
    </dl>
  );
}
