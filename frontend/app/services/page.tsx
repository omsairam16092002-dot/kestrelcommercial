import type { Metadata } from "next";
import { AGENCY, PROJECT_MARKETING } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { DuotoneImage } from "@/components/brand/DuotoneImage";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { DualCtaBand } from "@/components/brand/DualCtaBand";
import { ServicesGrid } from "@/components/brand/ServicesGrid";
import { getProperties } from "@/lib/api";
import { campaignPhotos } from "@/lib/campaignPhoto";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Services",
  description:
    "Sales, leasing, management and advisory for industrial and commercial property in Melbourne west.",
};

export default async function ServicesPage() {
  const stock = await getProperties();
  const projectPhoto = campaignPhotos(stock.filter((p) => p.assetCategory === "development-site"), 1)[0]
    ?? campaignPhotos(stock, 1)[0];
  return (
    <div className="bg-paper">
      <SectionHeader
        kicker="What we do"
        title="Sales. Leasing. Management. Advisory."
        description="Four lines of work. One standard: the building has to work for the business inside it."
        page="services"
      />

      <section className="bg-paper">
        <Container className="section-pad">
          <p className="eyebrow-rule t-caption text-oxblood">Four lines</p>
          <h2 className="t-h2 mt-5 text-ink">How the desk works.</h2>
          <div className="mt-12">
            <ServicesGrid columns={4} />
          </div>
        </Container>
      </section>

      <section className="bg-ink text-paper">
        <Container className="grid items-center gap-10 py-16 md:grid-cols-12 md:py-24 lg:min-h-[80vh] lg:gap-16">
          <div className="md:col-span-5">
            <p className="t-caption text-tan">{PROJECT_MARKETING.kicker}</p>
            <h2 className="t-h2 mt-5">{PROJECT_MARKETING.title}</h2>
            <div className="t-body mt-8 space-y-4 text-paper/80">
              {PROJECT_MARKETING.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
          <div className="relative min-h-[46vh] overflow-hidden bg-oxblood shadow-[0_24px_60px_rgba(0,0,0,0.18)] md:col-span-7 lg:min-h-[70vh]">
            {projectPhoto ? (
              <DuotoneImage
                src={projectPhoto.src}
                alt={projectPhoto.alt}
                sizes="(min-width: 1024px) 55vw, 100vw"
                tone="photo"
              />
            ) : (
              <div className="absolute inset-0 bg-oxblood" />
            )}
          </div>
        </Container>
      </section>

      <DualCtaBand
        page="services"
        title={
          <>
            Selling? Start with an <em className="font-serif font-normal italic text-oxblood">appraisal</em>.
          </>
        }
        lede="WhatsApp the desk. Or request a priced note."
        primaryHref={AGENCY.whatsappHref}
        primaryLabel={`WhatsApp ${AGENCY.whatsapp}`}
        primaryId="cta-services-band-wa"
        secondaryHref="/sell"
        secondaryLabel="Request an appraisal"
        secondaryId="cta-services-band-sell"
      />
    </div>
  );
}
