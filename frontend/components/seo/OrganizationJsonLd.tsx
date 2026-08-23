import { AGENCY, SOCIAL } from "@kestrel/shared";
import { siteOrigin } from "@/lib/seo";

export function OrganizationJsonLd() {
  const origin = siteOrigin();
  const data = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": `${origin}/#organization`,
    name: AGENCY.tradingName,
    legalName: AGENCY.legalName,
    url: origin,
    telephone: AGENCY.phone,
    email: AGENCY.email,
    image: `${origin}/assets/logo.png`,
    address: {
      "@type": "PostalAddress",
      streetAddress: AGENCY.addressLine1,
      addressLocality: "Point Cook",
      addressRegion: "VIC",
      postalCode: "3030",
      addressCountry: "AU",
    },
    areaServed: [
      { "@type": "AdministrativeArea", name: "Melbourne's west" },
      { "@type": "AdministrativeArea", name: "Melbourne's north-west" },
      { "@type": "City", name: "Melbourne" },
    ],
    sameAs: [SOCIAL.facebook.href, SOCIAL.linkedin.href, SOCIAL.instagram.href],
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:30",
        closes: "17:30",
      },
    ],
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
