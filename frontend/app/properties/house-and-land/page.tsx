import type { Metadata } from "next";
import { HOUSE_LAND_SECTION, PACKAGE_SEGMENT_OPTIONS } from "@kestrel/shared";
import { SearchPage } from "@/components/listing/SearchPage";
import { filtersFromSearchParams } from "@/lib/api";
import { searchHubMetadata } from "@/lib/seo";

export const revalidate = 60;

function segmentLabel(value: string | undefined): string | null {
  return PACKAGE_SEGMENT_OPTIONS.find((option) => option.value === value)?.label ?? null;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}): Promise<Metadata> {
  const filters = filtersFromSearchParams(searchParams);
  const segment = segmentLabel(filters.packageSegment);
  return searchHubMetadata({
    canonicalPath: HOUSE_LAND_SECTION.path,
    title: segment ? `${segment} house & land packages` : "House & land packages",
    description:
      "House and land packages across Melbourne for owner occupiers, investors, co-living and dual-occupancy buyers.",
    filters,
  });
}

export default function HouseAndLandPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = filtersFromSearchParams(searchParams);
  const segment = segmentLabel(filters.packageSegment);
  return (
    <SearchPage
      side="sale"
      filters={filters}
      assetCategory="residential"
      houseLand
      pageKey="properties-house-and-land"
      heroKicker={segment ? `House & land · ${segment}` : "House & land · Melbourne"}
      heroTitle={segment ? `${segment} house & land packages.` : "House & land packages."}
      heroDescription="Land and build priced together. Filter by who the package suits: owner occupied, investor, co-living or dual-occupancy."
      evidenceTitle="Recently sold packages"
      resetHref={HOUSE_LAND_SECTION.path}
    />
  );
}
