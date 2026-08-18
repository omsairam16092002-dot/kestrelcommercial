import { hasMapCoordinates, type Property } from "@kestrel/shared";
import { listingImageSrc, listingPlaceholderSrc } from "@/lib/images";

export function ListingJsonLd({ property }: { property: Property }) {
  const hero = property.images.find((img) => img.isHero) ?? property.images[0];
  const image = hero ? listingImageSrc(hero.publicId, 1200) : listingPlaceholderSrc(property, 1200);
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const url = `${origin.replace(/\/$/, "")}/listing/${property.slug}`;
  const forSale = property.transactionSide === "sale";
  const availability =
    property.status === "sold" || property.status === "leased"
      ? "https://schema.org/SoldOut"
      : "https://schema.org/InStock";

  const data = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: `${property.address}, ${property.suburb}`,
    description: property.description.replace(/\s+/g, " ").slice(0, 300),
    url,
    image,
    datePosted: property.createdAt,
    ...(property.priceValue
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "AUD",
            price: property.priceValue,
            availability,
            businessFunction: forSale
              ? "https://schema.org/SellAction"
              : "https://schema.org/LeaseOutAction",
          },
        }
      : {}),
    about: {
      "@type": "Place",
      name: property.address,
      address: {
        "@type": "PostalAddress",
        streetAddress: property.address,
        addressLocality: property.suburb,
        addressRegion: property.state,
        postalCode: property.postcode,
        addressCountry: "AU",
      },
      ...(hasMapCoordinates(property)
        ? {
            geo: {
              "@type": "GeoCoordinates",
              latitude: property.lat,
              longitude: property.lng,
            },
          }
        : {}),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
