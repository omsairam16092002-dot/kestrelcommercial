import type { Metadata } from "next";
import { SearchPage } from "@/components/listing/SearchPage";
import { filtersFromSearchParams } from "@/lib/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Residential properties",
  description:
    "Residential property listings with beds, baths, cars, land size and price filters kept separate from commercial stock.",
};

export default function ResidentialPropertiesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = filtersFromSearchParams(searchParams);
  return (
    <SearchPage
      side={filters.side === "lease" ? "lease" : "sale"}
      filters={filters}
      assetCategory="residential"
      pageKey="properties-residential"
      heroKicker="Residential · Melbourne"
      heroTitle={filters.side === "lease" ? "Residential stock for lease." : "Residential stock for sale."}
      evidenceTitle={filters.side === "lease" ? "Recently leased residential stock" : "Recently sold residential stock"}
      resetHref="/properties/residential"
    />
  );
}
