import { redirect } from "next/navigation";

export default function BuyPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    const v = Array.isArray(value) ? value[0] : value;
    if (v) params.set(key, v);
  }
  params.set("side", "sale");
  redirect(`/properties/commercial?${params.toString()}`);
}
