import { formatMetres, formatSqm, fullAddress, type Property } from "@kestrel/shared";
import { StatusStamp } from "@/components/brand/StatusStamp";
import { DuotoneImage } from "@/components/brand/DuotoneImage";
import { PrefetchLink } from "@/components/ui/PrefetchLink";
import { CtaLink } from "@/components/ui/CtaLink";
import { listingImageSrc, listingImageSrcSet, listingLqipSrc, PLACEHOLDER_LISTING } from "@/lib/images";

export function FeaturedLead({ property }: { property: Property }) {
  const hero = property.images.find((i) => i.isHero) ?? property.images[0];
  const href = `/listing/${property.slug}`;
  const specs = [
    { k: "GFA", v: formatSqm(property.floorAreaSqm) },
    { k: "Land", v: formatSqm(property.landAreaSqm) },
    { k: "Span", v: formatMetres(property.clearSpanM) },
    { k: "Zone", v: property.zoning },
  ];

  return (
    <article className="overflow-hidden bg-ink text-paper lg:grid lg:grid-cols-2">
      <div className="relative aspect-[16/10] bg-oxblood sm:aspect-[16/9] lg:aspect-auto lg:min-h-[420px]">
        <DuotoneImage
          src={hero ? listingImageSrc(hero.publicId, 1600, "gallery") : PLACEHOLDER_LISTING}
          srcSet={hero ? listingImageSrcSet(hero.publicId, [640, 1080, 1600], "gallery") : undefined}
          lqipSrc={hero ? listingLqipSrc(hero.publicId, "gallery") : undefined}
          alt={hero?.alt ?? fullAddress(property)}
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
        />
        <span className="absolute left-4 top-4 z-10">
          <StatusStamp status={property.status} side={property.transactionSide} size="sm" />
        </span>
      </div>

      <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
        <p className="t-caption text-tan">Featured {property.transactionSide === "lease" ? "lease" : "sale"}</p>
        <p className="t-mono mt-3 text-[12px] uppercase tracking-plate text-paper/60">
          {property.suburb} · {property.postcode}
        </p>
        <h2 className="t-h2 mt-2 text-paper">
          <PrefetchLink href={href} className="hover:text-tan">
            {property.address}
          </PrefetchLink>
        </h2>
        <p className="t-mono mt-3 text-tan">{property.priceLabel}</p>
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {specs.map((row) => (
            <div key={row.k} className="border border-paper/10 bg-paper/5 px-3 py-3">
              <dt className="t-caption text-paper/55">{row.k}</dt>
              <dd className="t-mono mt-1 text-[13px] text-paper">{row.v}</dd>
            </div>
          ))}
        </dl>
        <CtaLink
          href={href}
          id="cta-home-featured"
          page="home"
          listing={property.slug}
          className="btn-sharp mt-7 w-fit bg-tan text-ink hover:bg-paper"
        >
          View this building
        </CtaLink>
      </div>
    </article>
  );
}
