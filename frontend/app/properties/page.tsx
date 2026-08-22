import Link from "next/link";
import type { Metadata } from "next";
import { ASSET_CATEGORY_LABELS } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Property search",
  description:
    "Choose commercial, residential or development-site search — separate paths for Melbourne west property.",
  alternates: { canonical: "/properties" },
};

const CATEGORIES = [
  ASSET_CATEGORY_LABELS.commercial,
  ASSET_CATEGORY_LABELS.residential,
  ASSET_CATEGORY_LABELS["development-site"],
];

export default function PropertiesPage() {
  return (
    <div className="bg-paper">
      <section className="bg-oxblood text-paper">
        <Container className="py-20 md:py-28">
          <p className="t-caption text-tan">Properties</p>
          <h1 className="t-h1 mt-5 max-w-3xl">Choose the right category first.</h1>
          <p className="t-body-lg mt-6 max-w-2xl text-paper/85">
            Commercial buildings, residential stock and development sites now live on their own search paths.
          </p>
        </Container>
      </section>
      <Container className="grid gap-6 py-14 md:grid-cols-3 md:py-20">
        {CATEGORIES.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className="border-t-2 border-oxblood bg-white/70 p-6 transition-colors duration-150 ease-out hover:bg-white"
          >
            <p className="t-caption text-oxblood">{item.short}</p>
            <h2 className="t-h3 mt-4 text-ink">{item.title}</h2>
            <p className="t-body mt-3 text-ink/75">{item.description}</p>
            <p className="mt-6 text-sm font-semibold text-oxblood">Open search →</p>
          </Link>
        ))}
      </Container>
    </div>
  );
}
