import type { Metadata } from "next";
import { AGENCY } from "@kestrel/shared";
import { PageHero } from "@/components/brand/PageHero";
import { getProperties } from "@/lib/api";
import { campaignPhotos } from "@/lib/campaignPhoto";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How Kestrel Commercial collects, uses and stores personal information for enquiries, listings and desk records.",
};

export default async function PrivacyPage() {
  const bleed = campaignPhotos(await getProperties(), 1)[0];
  return (
    <div className="bg-paper pb-16">
      <PageHero
        kicker="Legal"
        title="Privacy policy"
        description={`Last updated August 2026`}
        page="privacy"
        imageSrc={bleed?.src}
        imageAlt={bleed?.alt}
      />
      <div className="premium-panel mx-auto mt-10 max-w-3xl space-y-5 px-6 py-10 t-body text-ink/90 sm:px-10">
        <p>
          {AGENCY.legalName} (ACN {AGENCY.acn}) trading as Kestrel Commercial collects personal
          information to respond to enquiries, market and sell or lease property, and to meet our
          obligations as a licensed estate agent and AUSTRAC reporting entity.
        </p>
        <p>
          We collect name, contact details, company, and information you include in an enquiry or
          appraisal request. For AML/CTF we may also collect identity documents, beneficial
          ownership details and source-of-funds information. Records are retained for seven years
          where the Act requires it.
        </p>
        <p>
          We do not sell personal information. We share it with contractors who help us deliver the
          service (for example solicitors, conveyancers, PEXA, accountants) and with regulators when
          required by law.
        </p>
        <p>
          You can request access or correction by emailing{" "}
          <a href={`mailto:${AGENCY.email}`} className="text-oxblood underline">
            {AGENCY.email}
          </a>
          .
        </p>
        <p className="t-mono text-mauve">
          Estate Agent Licence {AGENCY.licenceNumber} · {AGENCY.licenceHolder}
        </p>
      </div>
    </div>
  );
}
