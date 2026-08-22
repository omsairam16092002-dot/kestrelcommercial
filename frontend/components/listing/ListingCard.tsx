import { fullAddress, type Property } from "@kestrel/shared";
import { StatusStamp } from "@/components/brand/StatusStamp";
import { SpecMiniTable } from "@/components/brand/SpecMiniTable";
import { DuotoneImage } from "@/components/brand/DuotoneImage";
import { PrefetchLink } from "@/components/ui/PrefetchLink";
import { CtaLink } from "@/components/ui/CtaLink";
import { listingImageSrc, listingImageSrcSet, listingPlaceholderSrc } from "@/lib/images";
import { showcaseImage } from "@/lib/campaignPhoto";
import { IconArrowRight } from "@/components/icons";

export function ListingCard({
  property,
  imageMode = "hero",
}: {
  property: Property;
  imageMode?: "hero" | "varied";
}) {
  const hero = property.images.find((i) => i.isHero) ?? property.images[0];
  const visual = showcaseImage(property, imageMode);
  const href = `/listing/${property.slug}`;
  const imageSrc = visual?.src ?? (hero ? listingImageSrc(hero.publicId, 1080) : listingPlaceholderSrc(property, 1080));
  const imageSrcSet = hero && !visual?.src ? listingImageSrcSet(hero.publicId, [640, 1080, 1920]) : undefined;
  const imageAlt = visual?.alt ?? hero?.alt ?? fullAddress(property);

  return (
    <article className="surface group flex h-full flex-col overflow-hidden border-t-2 border-t-oxblood transition-[transform,border-color,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:border-oxblood/25 hover:shadow-[0_20px_50px_rgba(42,20,24,0.08)]">
      <PrefetchLink href={href} className="group relative block aspect-[4/3] overflow-hidden bg-oxblood">
        <DuotoneImage
          src={imageSrc}
          srcSet={imageSrcSet}
          alt={imageAlt}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          zoom
        />
        <span className="absolute left-3 top-3 z-10">
          <StatusStamp status={property.status} side={property.transactionSide} size="sm" />
        </span>
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink/35 to-transparent opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100" />
      </PrefetchLink>

      <div className="flex flex-1 flex-col p-5 md:p-6">
        <p className="t-mono tabular text-[12px] uppercase tracking-[0.14em] text-oxblood">{property.priceLabel}</p>
        <h3 className="t-h3 mt-2 text-ink">
          <PrefetchLink href={href} className="transition-colors hover:text-oxblood">
            {property.address}
          </PrefetchLink>
        </h3>
        <p className="mt-1 text-sm text-mauve">
          {property.suburb} · {property.postcode}
        </p>
        <div className="mt-auto pt-5">
          <SpecMiniTable property={property} />
        </div>
        <CtaLink
          href={`${href}#enquire`}
          id={`cta-card-enquire-${property.slug}`}
          page="listing-card"
          listing={property.slug}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-oxblood hover:underline"
        >
          Contact agent
          <IconArrowRight className="h-4 w-4" />
        </CtaLink>
      </div>
    </article>
  );
}
