import { redirect } from "next/navigation";

export default function PropertiesRedirect({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    const v = Array.isArray(value) ? value[0] : value;
    if (v) params.set(key, v);
  }
  const side = params.get("side");
  params.delete("side");
  const qs = params.toString();
  redirect(`${side === "lease" ? "/lease" : "/buy"}${qs ? `?${qs}` : ""}`);
}
