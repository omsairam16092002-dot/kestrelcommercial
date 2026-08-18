import { IconBuilding, IconClipboard, IconCompass, IconKey } from "@/components/icons";

export const SERVICES = [
  {
    n: "01",
    title: "Selling",
    Icon: IconBuilding,
    lede: "Private treaty or EOI. The method that suits the asset — not the one that fills a Saturday.",
    points: ["Market appraisal", "Campaign or off-market", "Buyer qualification", "Negotiation to settlement"],
  },
  {
    n: "02",
    title: "Leasing",
    Icon: IconKey,
    lede: "Tenants who stay. Covenant before the offer. A cheap vacancy costs more than a slow letting.",
    points: ["Rental assessment", "Tenant sourcing", "Lease negotiation", "Incentive structure"],
  },
  {
    n: "03",
    title: "Management",
    Icon: IconClipboard,
    lede: "Day-to-day on commercial and industrial assets. Reporting an owner can actually read.",
    points: ["Rent and outgoings", "Arrears and reviews", "Maintenance coordination", "Budget and forecasting"],
  },
  {
    n: "04",
    title: "Advisory",
    Icon: IconCompass,
    lede: "Work either side of a transaction — buying, developing, or deciding not to transact at all.",
    points: ["Buyer representation", "Development sites", "Off-the-plan campaigns", "Hold or sell"],
  },
] as const;

export function ServicesGrid({ columns = 2 }: { columns?: 2 | 4 }) {
  return (
    <div className={`grid items-stretch gap-5 ${columns === 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2"}`}>
      {SERVICES.map((s) => {
        const points = s.points.filter((p) => p.trim());
        const Icon = s.Icon;
        return (
          <article key={s.n} className="flex h-full min-h-0 flex-col border-t-2 border-oxblood bg-paper pt-5">
            <span className="inline-flex h-9 w-9 items-center justify-center bg-oxblood text-tan">
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <h3 className="t-h3 mt-3 text-ink">{s.title}</h3>
            <p className="t-body mt-3 text-ink/80">{s.lede}</p>
            <ul className="t-body mt-5 space-y-2 text-ink">
              {points.map((p) => (
                <li key={p} className="pl-3 text-ink/85" style={{ borderLeft: "2px solid #5C1F27" }}>
                  {p}
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
}
