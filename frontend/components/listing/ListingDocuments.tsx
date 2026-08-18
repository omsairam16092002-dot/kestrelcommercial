"use client";

import { fullAddress, type Property } from "@kestrel/shared";
import { listingImageSrc } from "@/lib/images";
import { useUnlockedDocuments } from "@/lib/documents";
import { apiUrl } from "@/lib/api";

export function ListingDocuments({ property }: { property: Property }) {
  const leadId = useUnlockedDocuments(property.slug);
  const unlocked = Boolean(leadId);
  const floorplanSrc = property.floorplanPublicId
    ? listingImageSrc(property.floorplanPublicId, unlocked ? 1800 : 900)
    : null;

  return (
    <section id="documents" className="surface scroll-mt-24 p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="t-caption text-oxblood">Documents</p>
          <h2 className="t-h3 mt-2 text-ink">Brochure and floorplan</h2>
          <p className="t-body mt-2 max-w-xl text-mauve">
            {unlocked
              ? "Unlocked for this session. Download the IM or open the plate."
              : "Qualify once on the desk. Jignesh is pinged immediately, then the files unlock."}
          </p>
        </div>
        {unlocked ? (
          <a
            href={apiUrl(`/api/properties/${property.slug}/brochure?lead=${leadId}`)}
            className="btn-sharp bg-oxblood text-paper hover:bg-ink"
          >
            Download IM PDF
          </a>
        ) : (
          <a href="#brochure" className="btn-sharp bg-oxblood text-paper hover:bg-ink">
            Request documents
          </a>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <a
          href={unlocked ? apiUrl(`/api/properties/${property.slug}/brochure?lead=${leadId}`) : "#brochure"}
          className="bg-paper p-4 transition duration-150 ease-out hover:bg-white"
        >
          <p className="t-caption text-mauve">PDF</p>
          <p className="mt-2 text-base font-semibold text-ink">Information memorandum</p>
          <p className="mt-1 text-sm text-mauve">
            {unlocked ? "Download the spec plate and campaign note." : "Locked · request to unlock."}
          </p>
        </a>
        <a
          href={
            unlocked && property.floorplanPublicId
              ? apiUrl(`/api/properties/${property.slug}/floorplan?lead=${leadId}`)
              : "#brochure"
          }
          className="bg-paper p-4 transition duration-150 ease-out hover:bg-white"
        >
          <p className="t-caption text-mauve">Plan</p>
          <p className="mt-2 text-base font-semibold text-ink">Floorplan</p>
          <p className="mt-1 text-sm text-mauve">
            {property.floorplanPublicId
              ? unlocked
                ? "Open the measured plate."
                : "On file · unlock with the desk."
              : "Not on file · request on inspection."}
          </p>
        </a>
      </div>

      {unlocked && floorplanSrc ? (
        <div className="mt-5 overflow-hidden bg-paper">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={floorplanSrc}
            alt={`Floorplan — ${fullAddress(property)}`}
            className="mx-auto max-h-[480px] w-full object-contain p-4"
          />
        </div>
      ) : null}
    </section>
  );
}
