import type { MetadataRoute } from "next";
import { getProperties } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const listings = await getProperties();
  const staticPaths = ["", "/buy", "/lease", "/sell", "/contact", "/about", "/services", "/investing", "/privacy"];

  return [
    ...staticPaths.map((path) => ({
      url: `${base}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
    ...listings.map((p) => ({
      url: `${base}/listing/${p.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
