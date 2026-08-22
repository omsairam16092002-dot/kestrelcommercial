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
  return searchHubMetadata({
    canonicalPath: "/properties/development-sites",
    title: "Development sites for sale",
    description:
      "Land and development opportunities with land area, zoning and price filters separated from operational property stock.",
    filters: { ...filters, side: "sale" },
  });
}

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
