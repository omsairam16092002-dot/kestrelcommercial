"use client";

import { useEffect, useState } from "react";
import { fullAddress, type Agent, type EnquiryIntent, type Property } from "@kestrel/shared";
import { EnquiryForm } from "@/components/forms/EnquiryForm";
import { Monogram } from "@/components/brand/Monogram";
import { useUnlockedDocuments } from "@/lib/documents";
import { apiUrl } from "@/lib/api";
import { agentPortraitSrc } from "@/lib/images";
import { PhoneActionButtons } from "@/components/ui/PhoneActionButtons";

const TABS: { id: EnquiryIntent; label: string; hash: string }[] = [
  { id: "inspection", label: "Inspect", hash: "inspect" },
  { id: "enquire", label: "Enquire", hash: "enquire" },
  { id: "brochure", label: "Documents", hash: "brochure" },
];

function tabFromHash(): EnquiryIntent {
  if (typeof window === "undefined") return "inspection";
  if (window.location.hash === "#enquire") return "enquire";
  if (window.location.hash === "#brochure" || window.location.hash === "#documents") return "brochure";
  return "inspection";
}

export function ListingLeadDesk({ property, agent }: { property: Property; agent: Agent }) {
  const [tab, setTab] = useState<EnquiryIntent>("inspection");
  const leadId = useUnlockedDocuments(property.slug);
  const label = fullAddress(property);
  const photo = agentPortraitSrc(agent.photoPublicId, 240);

  useEffect(() => {
    setTab(tabFromHash());
    const onHash = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function go(next: EnquiryIntent, hash: string) {
    setTab(next);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${hash}`);
    }
  }

  return (
    <div id="enquire" className="premium-panel scroll-mt-24 p-5 sm:p-6">
      <div id="inspect" className="sr-only" />
      <div id="brochure" className="sr-only" />

      <div className="flex gap-3">
        {photo ? (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden bg-oxblood">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt={agent.name} className="h-full w-full object-cover object-top" />
          </div>
        ) : (
          <Monogram name={agent.name} className="h-14 w-14 shrink-0 text-lg" />
        )}
        <div className="min-w-0">
          <p className="t-caption text-oxblood">Listing agent</p>
          <h2 className="mt-1 text-base font-semibold text-ink">{agent.name}</h2>
        </div>
      </div>

      <div className="premium-divider mt-5" />

      <div className="mt-5">
        <PhoneActionButtons
          page={`listing-${property.slug}`}
          variant="sharp"
          className="grid grid-cols-3 gap-2"
          listing={property.slug}
        />
      </div>

      <div
        className="mt-5 grid grid-cols-3 gap-1 bg-paper p-1"
        role="tablist"
        aria-label="Lead type"
        onKeyDown={(e) => {
          const i = TABS.findIndex((item) => item.id === tab);
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            const next = e.key === "ArrowRight" ? TABS[(i + 1) % TABS.length] : TABS[(i - 1 + TABS.length) % TABS.length];
            go(next.id, next.hash);
          }
        }}
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            id={`lead-tab-${item.id}`}
            role="tab"
            aria-selected={tab === item.id}
            aria-controls="lead-desk-panel"
            tabIndex={tab === item.id ? 0 : -1}
            className={`min-h-11 px-2 py-2.5 text-xs font-semibold transition-colors duration-150 ease-out ${
              tab === item.id ? "bg-oxblood text-paper" : "text-oxblood hover:bg-white"
            }`}
            onClick={() => go(item.id, item.hash)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm text-mauve">
        {tab === "inspection"
          ? "Qualified occupiers only. Pick a window and we will confirm."
          : tab === "brochure"
            ? "Unlock the IM and floorplan. One form. Desk is pinged immediately."
            : "Tell us what you need. One business day, sooner on WhatsApp."}
      </p>

      <div id="lead-desk-panel" className="mt-4" role="tabpanel" aria-labelledby={`lead-tab-${tab}`}>
        {tab === "brochure" && leadId ? (
          <div className="space-y-3">
            <a
              href={apiUrl(`/api/properties/${property.slug}/brochure?lead=${leadId}`)}
              className="btn-sharp w-full bg-oxblood text-paper hover:bg-ink"
            >
              Download brochure PDF
            </a>
            {property.floorplanPublicId ? (
              <a
                href={apiUrl(`/api/properties/${property.slug}/floorplan?lead=${leadId}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-sharp w-full bg-paper text-ink hover:bg-tan"
              >
                Open floorplan
              </a>
            ) : (
              <p className="text-sm text-mauve">Floorplan not on file — request it on inspection.</p>
            )}
          </div>
        ) : (
          <EnquiryForm
            key={tab}
            source="web"
            intent={tab}
            propertyId={property.id}
            propertySlug={property.slug}
            propertyLabel={label}
            defaultTopic="buying-or-leasing"
            formId={`${tab}-${property.slug}`}
            fieldTone="paper"
            defaultMessage={
              tab === "enquire"
                ? `I'm interested in ${label}.`
                : tab === "brochure"
                  ? `Please send the brochure and floorplan for ${label}.`
                  : ""
            }
          />
        )}
      </div>
    </div>
  );
}
