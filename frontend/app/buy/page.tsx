import type { Metadata } from "next";
import { SearchPage } from "@/components/listing/SearchPage";
import { filtersFromSearchParams } from "@/lib/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Properties for sale",
  description:
    "Industrial and commercial buildings for sale across Melbourne's west and north-west. Filter by floor area, clear span, zoning and price.",
};

export default function BuyPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = filtersFromSearchParams(searchParams);
  return <SearchPage side="sale" filters={filters} />;
}
