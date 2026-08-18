import type { Metadata } from "next";
import { AGENCY } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { PageHero } from "@/components/brand/PageHero";
import { DualCtaBand } from "@/components/brand/DualCtaBand";
import { ServicesGrid } from "@/components/brand/ServicesGrid";
import { getProperties } from "@/lib/api";
import { campaignPhotos } from "@/lib/campaignPhoto";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Sales, leasing, management and advisory for industrial and commercial property in Melbourne west.",
};

export default async function ServicesPage() {
  const bleed = campaignPhotos(await getProperties(), 1)[0];
  return (
    <div className="bg-paper">
      <PageHero
        kicker="What we do"
        title="Sales. Leasing. Management. Advisory."
        description="Four lines of work. One standard: the building has to work for the business inside it."
        page="services"
        imageSrc={bleed?.src}
        imageAlt={bleed?.alt}
      />

      <section className="bg-paper">
        <Container className="py-16 md:py-24">
          <p className="t-caption text-oxblood">Four lines</p>
          <h2 className="t-h2 mt-5 text-ink">How the desk works.</h2>
          <div className="mt-12">
            <ServicesGrid columns={4} />
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
