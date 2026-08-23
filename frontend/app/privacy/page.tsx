import type { Metadata } from "next";
import { AGENCY } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { SectionHeader } from "@/components/brand/SectionHeader";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How Kestrel Commercial collects, uses and stores personal information for enquiries, listings and desk records.",
};

export default function PrivacyPage() {
  return (
    <div className="bg-paper pb-16">
      <SectionHeader
        kicker="Legal"
        title="Privacy policy"
        description="Last updated August 2026"
        page="privacy"
      />
      <Container className="section-pad">
        <div className="premium-panel mx-auto max-w-3xl space-y-5 px-6 py-10 t-body text-ink/90 sm:px-10">
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
          <div className="border-t border-oxblood/10 pt-6">
            <h2 className="t-h3 text-ink">Acceptance of Use</h2>
            <p className="mt-3">
              By accessing this website, you indicate your acceptance of this Privacy Policy. We reserve
              the right, at our discretion, to amend, modify, add or remove portions from this Privacy
              Policy from time to time.
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
}
