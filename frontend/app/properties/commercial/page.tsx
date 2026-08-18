import type { Metadata } from "next";
import { SearchPage } from "@/components/listing/SearchPage";
import { filtersFromSearchParams } from "@/lib/api";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Commercial properties",
  description:
    "Commercial and industrial property across Melbourne's west. Search by floor area, clear span, zoning, power and hardstand.",
};

export default function CommercialPropertiesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = filtersFromSearchParams(searchParams);
  return (
    <SearchPage
      side={filters.side === "lease" ? "lease" : "sale"}
      filters={filters}
      assetCategory="commercial"
      pageKey="properties-commercial"
      heroKicker="Commercial · Melbourne west"
      heroTitle={filters.side === "lease" ? "Commercial space for lease." : "Commercial space for sale."}
      evidenceTitle={filters.side === "lease" ? "Recently leased commercial space" : "Recently sold commercial space"}
      resetHref="/properties/commercial"
    />
  );
}
