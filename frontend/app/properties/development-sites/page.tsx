import type { Metadata } from "next";
import { SearchPage } from "@/components/listing/SearchPage";
import { filtersFromSearchParams } from "@/lib/api";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Development sites",
  description:
    "Land and development opportunities with land area, zoning and price filters separated from operational property stock.",
};

export default function DevelopmentSitesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = filtersFromSearchParams(searchParams);
  return (
    <SearchPage
      side="sale"
      filters={{ ...filters, side: "sale" }}
      assetCategory="development-site"
      pageKey="properties-development"
      heroKicker="Development sites · Melbourne"
      heroTitle="Land and development opportunities."
      evidenceTitle="Recently sold development sites"
      resetHref="/properties/development-sites"
    />
  );
}
