import type { MetadataRoute } from "next";
import { ASSET_CATEGORY_LABELS } from "@kestrel/shared";
import { getProperties } from "@/lib/api";
import { getSiteUrl } from "@/lib/siteUrl";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const listings = await getProperties();
  const staticPaths = [
    "",
    "/sell",
    "/contact",
    "/about",
    "/services",
    "/investing",
    "/privacy",
    "/properties",
    ASSET_CATEGORY_LABELS.commercial.path,
    ASSET_CATEGORY_LABELS.residential.path,
    ASSET_CATEGORY_LABELS["development-site"].path,
  ];

  return [
    ...staticPaths.map((path) => ({
      url: `${base}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : path === "/properties" ? 0.9 : 0.7,
    })),
    ...listings.map((p) => ({
      url: `${base}/listing/${p.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
    })),
  ];
}
