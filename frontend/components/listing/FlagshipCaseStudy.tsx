import { fullAddress, type Property } from "@kestrel/shared";
import { StatusStamp } from "@/components/brand/StatusStamp";
import { DuotoneImage } from "@/components/brand/DuotoneImage";
import { PrefetchLink } from "@/components/ui/PrefetchLink";
import { listingImageSrc, listingPlaceholderSrc } from "@/lib/images";
import { showcaseImage } from "@/lib/campaignPhoto";

export function FlagshipCaseStudy({
  property,
  priority = false,
  size = "feature",
  imageMode = "hero",
}: {
  property: Property;
  priority?: boolean;
  size?: "feature" | "embed";
  imageMode?: "hero" | "varied";
}) {
  const visual = showcaseImage(property, imageMode);
  const href = `/listing/${property.slug}`;
  const result = property.evidenceLine || property.priceLabel;
  const cta = property.status === "leased" ? "View this lease →" : "View this sale →";
  const tall = size === "feature";

  return (
    <article
      className={`relative overflow-hidden bg-oxblood ${
        tall ? "min-h-[70vh] lg:min-h-[88vh]" : "min-h-[280px] sm:min-h-[380px]"
      }`}
    >
      <DuotoneImage
        src={visual?.src ?? (property.images[0] ? listingImageSrc(property.images[0].publicId, 2400) : listingPlaceholderSrc(property, 2400))}
        alt={visual?.alt ?? fullAddress(property)}
        sizes="100vw"
        priority={priority}
        tone="photo"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 max-w-md border border-oxblood bg-paper p-5 text-ink sm:bottom-8 sm:left-8 sm:p-7">
        <StatusStamp status={property.status} side={property.transactionSide} size="sm" />
        <h3 className="t-h3 mt-4 text-ink">{property.address}</h3>
        <p className="mt-1 text-sm text-mauve">
          {property.suburb} · {property.postcode}
        </p>
        <p className="t-mono tabular mt-4 text-ink">{result}</p>
        <PrefetchLink href={href} className="mt-5 inline-block text-sm font-semibold text-oxblood hover:underline">
          {cta}
        </PrefetchLink>
      </div>
    </article>
  );
}
