/** Canonical public site origin for metadata, sitemap, and JSON-LD. */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production") {
    return "https://www.kestrelcommercial.com";
  }
  return "http://localhost:3000";
}
