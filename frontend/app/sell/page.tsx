import type { Metadata } from "next";
import { AGENCY, sortPropertiesBySide } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { ListingCard } from "@/components/listing/ListingCard";
import { FlagshipCaseStudy } from "@/components/listing/FlagshipCaseStudy";
import { EnquiryForm } from "@/components/forms/EnquiryForm";
import { SellHero } from "@/components/sell/SellHero";
import { WhyAppoint } from "@/components/sell/WhyAppoint";
import { SalePhases } from "@/components/sell/SalePhases";
import { SellCtaBand } from "@/components/sell/SellCtaBand";
import { getProperties } from "@/lib/api";
import { campaignPhotos, pickFlagship } from "@/lib/campaignPhoto";

export const metadata: Metadata = {
  title: "Appraisal",
  description:
    "Market appraisal for industrial and commercial property in Melbourne's west. Evidence first. Method second.",
};

export const revalidate = 60;

export default async function SellPage() {
  const all = await getProperties();
  const evidence = sortPropertiesBySide(
    all.filter((p) => p.status === "sold" || p.status === "leased"),
  );
  const flagship = pickFlagship(evidence);
  const rest = flagship ? evidence.filter((p) => p.id !== flagship.id) : evidence;
  const heroPhoto = campaignPhotos(evidence.length ? evidence : all, 1)[0];
  const phasePhoto = campaignPhotos(evidence.length ? evidence : all, 2)[1] ?? heroPhoto;

  return (
    <div className="bg-paper">
      <SellHero imageSrc={heroPhoto?.src} imageAlt={heroPhoto?.alt} />
      <WhyAppoint />
      <SalePhases photo={phasePhoto ? { src: phasePhoto.src, alt: phasePhoto.alt } : undefined} />

      <section id="evidence" className="scroll-mt-24 bg-paper">
        <Container className="pb-8 pt-16 md:pb-10 md:pt-24">
          <p className="eyebrow-rule t-caption text-oxblood">Track record</p>
          <h2 className="t-h2 mt-5 text-ink">Sold and leased on this corridor</h2>
          <p className="t-body mt-5 max-w-xl text-pretty text-mauve">
            Vendors want proof before they hand over an address. Here it is.
          </p>
        </Container>
        {flagship ? (
          <FlagshipCaseStudy property={flagship} priority />
        ) : (
          <Container>
            <p className="t-body pb-16 text-mauve">WhatsApp {AGENCY.whatsapp} for recent evidence off-market.</p>
          </Container>
        )}
        {rest.length ? (
          <Container className="py-10 md:py-16">
            <div className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((p) => (
                <ListingCard key={p.id} property={p} />
              ))}
            </div>
          </Container>
        ) : null}
      </section>

      <SellCtaBand />

      <section id="enquire" className="scroll-mt-24 bg-ink text-paper">
        <Container className="grid gap-10 py-14 md:grid-cols-12 md:py-20">
          <div className="md:col-span-5">
            <p className="t-caption text-tan">Appraisal request</p>
            <h2 className="t-h2 mt-5 text-paper">Then tell me the building</h2>
            <p className="t-body mt-5 max-w-md text-pretty text-paper/80">Address, GFA, tenure. I will call you back.</p>
            <dl className="mt-10 space-y-5">
              <div className="border-t border-tan/25 pt-4">
                <dt className="t-caption text-tan">WhatsApp</dt>
                <dd className="t-mono mt-1">
                  <a href={AGENCY.whatsappHref} target="_blank" rel="noopener noreferrer" className="hover:text-tan">
                    {AGENCY.whatsapp}
                  </a>
                </dd>
              </div>
              <div className="border-t border-tan/25 pt-4">
                <dt className="t-caption text-tan">Email</dt>
                <dd className="t-body mt-1">
                  <a href={`mailto:${AGENCY.email}`} className="hover:text-tan">
                    {AGENCY.email}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
          <div className="premium-panel border-paper/15 bg-paper p-6 text-ink md:col-span-7 md:p-9">
            <p className="t-caption text-oxblood">Appraisal request</p>
            <h2 className="t-h3 mt-2 text-ink">Request an appraisal</h2>
            <p className="t-body mt-2 text-mauve">Address, GFA, tenure. I will call you back.</p>
            <div className="mt-6">
              <EnquiryForm
                source="appraisal"
                defaultTopic="appraisal"
                submitLabel="Request an appraisal"
                formId="form-appraisal"
              />
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
