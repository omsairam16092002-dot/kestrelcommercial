import type { Metadata } from "next";
import { SearchPage } from "@/components/listing/SearchPage";
import { filtersFromSearchParams } from "@/lib/api";
import { searchHubMetadata } from "@/lib/seo";

export const revalidate = 60;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}): Promise<Metadata> {
  const filters = filtersFromSearchParams(searchParams);
  const lease = filters.side === "lease";
  return searchHubMetadata({
    canonicalPath: "/properties/residential",
    title: lease ? "Residential properties for lease" : "Residential properties for sale",
    description:
      "Residential property listings with beds, baths, cars, land size and price filters kept separate from commercial stock.",
    filters,
  });
}

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
