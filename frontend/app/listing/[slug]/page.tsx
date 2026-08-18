import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fullAddress } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { StatusStamp } from "@/components/brand/StatusStamp";
import { ListingGallery } from "@/components/listing/ListingGallery";
import { SpecTable } from "@/components/listing/SpecTable";
import { ListingMap } from "@/components/listing/ListingMap";
import { ListingLeadDesk } from "@/components/listing/ListingLeadDesk";
import { ListingDocuments } from "@/components/listing/ListingDocuments";
import { FlagshipCaseStudy } from "@/components/listing/FlagshipCaseStudy";
import { ListingCard } from "@/components/listing/ListingCard";
import { ListingJsonLd } from "@/components/listing/ListingJsonLd";
import { getProperties, getPropertyBySlug } from "@/lib/api";
import { compactEvidence, pickFlagship } from "@/lib/campaignPhoto";
import { listingImageSrc, listingPlaceholderSrc } from "@/lib/images";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  const properties = await getProperties();
  return properties.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const data = await getPropertyBySlug(params.slug);
  if (!data) return { title: "Listing" };
  const { property } = data;
  const title = `${property.address}, ${property.suburb}`;
  const description = property.description.replace(/\s+/g, " ").slice(0, 160);
  const hero = property.images.find((img) => img.isHero) ?? property.images[0];
  const ogImage = hero ? listingImageSrc(hero.publicId, 1200) : listingPlaceholderSrc(property, 1200);
  const imageAlt = hero?.alt ?? fullAddress(property);
  return {
    title,
    description,
    alternates: { canonical: `/listing/${property.slug}` },
    openGraph: {
      title: `${title} · Kestrel Commercial`,
      description,
      type: "article",
      locale: "en_AU",
      url: `/listing/${property.slug}`,
      images: [{ url: ogImage, alt: imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ListingPage({ params }: { params: { slug: string } }) {
  const data = await getPropertyBySlug(params.slug);
  if (!data) notFound();
  const { property, agent } = data;
  const similar = compactEvidence((await getProperties({
    side: property.transactionSide,
    assetCategory: property.assetCategory,
  })).filter(
    (p) =>
      p.id !== property.id &&
      p.assetCategory === property.assetCategory &&
      p.transactionSide === property.transactionSide &&
      (p.status === "sold" || p.status === "leased"),
  ));
  const flagship = pickFlagship(similar);
  const rest = similar.filter((p) => p.id !== flagship?.id).slice(0, 3);
  const similarLabel = property.transactionSide === "lease" ? "Similar leases" : "Similar sales";

  return (
    <div className="bg-paper">
      <ListingJsonLd property={property} />
      <Container className="pt-5 md:pt-7">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-oxblood/10 pb-4 t-mono text-[12px] uppercase tracking-plate">
          <p>
            <Link
              href={property.transactionSide === "lease" ? "/lease" : "/buy"}
              className="text-oxblood hover:underline"
            >
              {property.transactionSide === "lease" ? "For lease" : "For sale"}
            </Link>
            <span className="mx-2 text-mauve">/</span>
            <span className="text-ink/70">
              {property.suburb} {property.postcode}
            </span>
          </p>
          <p className="tabular text-mauve">Licence {property.agentLicenceNumber}</p>
        </div>
      </Container>

      <Container className="py-8 md:py-10">
        <StatusStamp status={property.status} side={property.transactionSide} size="lg" />
        <h1 className="t-h1 mt-5 max-w-4xl text-ink">{property.address}</h1>
        <p className="t-mono mt-3 uppercase tracking-plate text-mauve">{fullAddress(property)}</p>
        <p className="t-mono-lg mt-5 tabular text-oxblood">{property.priceLabel}</p>
      </Container>

      <ListingGallery property={property} />

      <Container className="py-10 md:py-14">
        <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="space-y-10 lg:col-span-8">
            <SpecTable property={property} />
            <section className="scroll-mt-24">
              <p className="eyebrow-rule t-caption text-oxblood">The property</p>
              <h2 className="t-h2 mt-5 text-ink">Campaign particulars</h2>
              <div className="mt-6 space-y-4 t-body text-pretty text-ink/85">
                {property.description.split("\n\n").map((para) => (
                  <p key={para.slice(0, 48)}>{para}</p>
                ))}
              </div>
            </section>
            <ListingDocuments property={property} />
            <ListingMap property={property} />

            {similar.length ? (
              <section className="scroll-mt-24 pt-4">
                <p className="eyebrow-rule t-caption text-oxblood">Evidence</p>
                <h2 className="t-h2 mt-5 text-ink">{similarLabel}</h2>
                {flagship ? (
                  <div className="mt-10">
                    <FlagshipCaseStudy property={flagship} size="embed" imageMode="varied" />
                  </div>
                ) : null}
                {rest.length ? (
                  <div className="mt-6 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {rest.map((p) => (
                      <ListingCard key={p.id} property={p} imageMode="varied" />
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>

          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <ListingLeadDesk property={property} agent={agent} />
          </div>
        </div>
      </Container>
    </div>
  );
}
