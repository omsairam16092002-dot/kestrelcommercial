import { hasMapCoordinates, type Property } from "@kestrel/shared";
import { listingImageSrc, listingPlaceholderSrc } from "@/lib/images";
import { siteOrigin } from "@/lib/seo";

function accommodationType(propertyType: Property["propertyType"]) {
  switch (propertyType) {
    case "house":
    case "townhouse":
      return "SingleFamilyResidence";
    case "apartment":
      return "Apartment";
    case "development-land":
    case "rural":
      return "LandParcel";
    default:
      return "Place";
  }
}

export function ListingJsonLd({ property }: { property: Property }) {
  const hero = property.images.find((img) => img.isHero) ?? property.images[0];
  const image = hero ? listingImageSrc(hero.publicId, 1200) : listingPlaceholderSrc(property, 1200);
  const origin = siteOrigin();
  const url = `${origin}/listing/${property.slug}`;
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
              ? "http://purl.org/goodrelations/v1#Sell"
              : "http://purl.org/goodrelations/v1#LeaseOut",
          },
        }
      : {}),
    about: {
      "@type": accommodationType(property.propertyType),
      name: property.address,
      address: {
        "@type": "PostalAddress",
        streetAddress: property.address,
        addressLocality: property.suburb,
        addressRegion: property.state,
        postalCode: property.postcode,
        addressCountry: "AU",
      },
      ...(property.floorAreaSqm
        ? {
            floorSize: {
              "@type": "QuantitativeValue",
              value: property.floorAreaSqm,
              unitCode: "MTK",
            },
          }
        : {}),
      ...(property.landAreaSqm
        ? {
            lotSize: {
              "@type": "QuantitativeValue",
              value: property.landAreaSqm,
              unitCode: "MTK",
            },
          }
        : {}),
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
