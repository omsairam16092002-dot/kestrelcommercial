import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fullAddress, isClosedListing, publicListingParagraphs } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { ListingGallery } from "@/components/listing/ListingGallery";
import { SpecTable } from "@/components/listing/SpecTable";
import { ListingMap } from "@/components/listing/ListingMap";
import { ListingLeadDesk } from "@/components/listing/ListingLeadDesk";
import { ListingDocuments } from "@/components/listing/ListingDocuments";
import { ListingJsonLd } from "@/components/listing/ListingJsonLd";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { getProperties, getPropertyBySlug, isPropertySlugFound, isPropertySlugUnavailable } from "@/lib/api";
import { listingImageSrc, listingPlaceholderSrc } from "@/lib/images";
import { listingTitle } from "@/lib/seo";

export const dynamic = "force-dynamic";

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
  if (isPropertySlugUnavailable(data)) {
    return { title: "Listing temporarily unavailable" };
  }
  if (!isPropertySlugFound(data)) {
    return { title: "Listing not found" };
  }
  const { property } = data;
  const title = listingTitle(property);
  const description = property.description.replace(/\s+/g, " ").slice(0, 160);
  const hero = property.images.find((img) => img.isHero) ?? property.images[0];
  const ogImage = hero ? listingImageSrc(hero.publicId, 1200, "gallery") : listingPlaceholderSrc(property, 1200);
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
  if (isPropertySlugUnavailable(data)) {
    throw new Error("Listing API unavailable");
  }
  if (!isPropertySlugFound(data)) notFound();
  const { property, agent } = data;
  const closed = isClosedListing(property.status);
  const browseHref =
    property.transactionSide === "lease" ? "/lease" : property.assetCategory === "commercial" ? "/buy" : "/buy";
  const browseLabel =
    property.transactionSide === "lease"
      ? "For lease"
      : closed
        ? "Properties"
        : "For sale";
  const descriptionParagraphs = publicListingParagraphs(property.description, property.status);

  return (
    <div className="bg-paper">
      <ListingJsonLd property={property} />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", href: "/" },
          {
            name: browseLabel,
            href: browseHref,
          },
          { name: property.address, href: `/listing/${property.slug}` },
        ]}
      />
      <Container className="pt-5 md:pt-7">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-oxblood/10 pb-4 t-mono text-[12px] uppercase tracking-plate">
          <p>
            <Link
              href={browseHref}
              className="text-oxblood hover:underline"
            >
              {browseLabel}
            </Link>
            <span className="mx-2 text-mauve">/</span>
            <span className="text-ink/70">
              {property.suburb} {property.postcode}
            </span>
          </p>
        </div>
      </Container>

      <Container className="py-8 md:py-10">
        <h1 className="t-h1 max-w-4xl text-ink">{property.address}</h1>
        <p className="t-mono mt-3 uppercase tracking-plate text-mauve">{fullAddress(property)}</p>
        {!closed && property.priceLabel ? (
          <p className="t-mono-lg mt-5 tabular text-oxblood">{property.priceLabel}</p>
        ) : null}
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
                {descriptionParagraphs.map((para) => (
                  <p key={para.slice(0, 48)}>{para}</p>
                ))}
              </div>
            </section>
            <ListingDocuments property={property} />
            <ListingMap property={property} />
          </div>

          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <ListingLeadDesk property={property} agent={agent} />
          </div>
        </div>
      </Container>
    </div>
  );
}
