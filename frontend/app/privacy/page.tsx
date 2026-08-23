import type { Metadata } from "next";
import { AGENCY } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { getSiteUrl } from "@/lib/siteUrl";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "Privacy, data breach and cookie policies for Kestrel Commercial — RAJNIL PTY LTD T/A KESTREL COMMERCIAL.",
};

function Mail({ children }: { children: React.ReactNode }) {
  return (
    <a href={`mailto:${AGENCY.email}`} className="text-oxblood underline underline-offset-2">
      {children}
    </a>
  );
}

export default function PrivacyPage() {
  const siteUrl = getSiteUrl();

  return (
    <div className="bg-paper pb-16">
      <SectionHeader
        kicker="Legal"
        title="Privacy policy"
        description="Last updated August 2026"
        page="privacy"
        showPhoneActions={false}
      />
      <Container className="section-pad">
        <div className="premium-panel mx-auto max-w-3xl space-y-10 px-6 py-10 text-ink/90 sm:px-10">
          <p className="t-body-lg text-ink">
            {AGENCY.legalName} (ACN {AGENCY.acn}) — {AGENCY.tradingName}
          </p>

          <section className="space-y-4">
            <h2 className="t-h3 text-ink">Acceptance of Use</h2>
            <p className="t-body">
              By accessing this website, you indicate your acceptance of this Privacy Policy. We reserve
              the right, at our discretion, to amend, modify, add or remove portions from this Privacy
              Policy from time to time.
            </p>
          </section>

          <section className="space-y-4 border-t border-oxblood/10 pt-8">
            <h2 className="t-h2 text-ink">Privacy Policy</h2>
            <p className="t-body">
              {AGENCY.legalName} and its related entities understand the importance you attach to your
              personal information and are committed to protecting your privacy. {AGENCY.legalName} is
              bound by the Australian Privacy Principles (APPs) set out in the{" "}
              <em>Privacy Act 1988</em> (Cth).
            </p>
            <p className="t-body">
              We are a licensed Victorian estate agency ({AGENCY.licenceHolder}, License{" "}
              {AGENCY.licenceNumber}) and an AUSTRAC reporting entity. We handle personal information in
              connection with industrial and commercial property sales, leasing, management, enquiries,
              and compliance with anti-money laundering and counter-terrorism financing (AML/CTF) laws.
            </p>

            <h3 className="t-h3 pt-2 text-ink">What personal information is collected about you?</h3>
            <p className="t-body">
              The nature of personal information obtained and collected depends on the services you
              request and may include (but is not limited to):
            </p>
            <ul className="t-body list-disc space-y-2 pl-5">
              <li>Name</li>
              <li>Address</li>
              <li>Date of birth</li>
              <li>Contact details (phone, email, company)</li>
              <li>Identification documents</li>
              <li>Employment details</li>
              <li>Beneficial ownership information for companies, trusts and SMSFs</li>
              <li>Financial information and source-of-funds details relevant to property transactions</li>
              <li>Rental, ownership or transaction history</li>
              <li>Information you include in enquiry, inspection or appraisal forms on this website</li>
            </ul>
            <p className="t-body">
              Most information is obtained directly from you through enquiry forms, appraisal requests,
              tenancy or leasing applications, and client records. This information is recorded and
              maintained as part of ongoing customer service and property activities.
            </p>
            <p className="t-body">
              To comply with legal obligations — including AML/CTF requirements — we may verify your
              identity and request personal identification documents. If you choose not to provide
              required information, we may be unable to provide the requested services.
            </p>

            <h3 className="t-h3 pt-2 text-ink">How your personal information is used and disclosed</h3>
            <p className="t-body">We collect, use, and exchange your personal information to:</p>
            <ul className="t-body list-disc space-y-2 pl-5">
              <li>Verify your identity and beneficial ownership</li>
              <li>Respond to enquiries and provide property sales, leasing and management services</li>
              <li>Communicate with you while you are a client or prospective client</li>
              <li>Market property and, where permitted, send you relevant updates about the desk</li>
              <li>Prevent fraud and unlawful activity</li>
              <li>Comply with legal, regulatory and AUSTRAC reporting obligations</li>
              <li>Respond to requests from government agencies or regulators</li>
            </ul>
            <p className="t-body">We may disclose personal information to:</p>
            <ul className="t-body list-disc space-y-2 pl-5">
              <li>Related entities within our corporate group</li>
              <li>Landlords, tenants, buyers, sellers, and their representatives</li>
              <li>
                Service providers such as solicitors, conveyancers, PEXA, accountants, contractors,
                insurers, credit agencies, and IT providers
              </li>
              <li>Any person authorised by you in writing</li>
              <li>Courts, tribunals, or regulatory authorities as required by law</li>
            </ul>
            <p className="t-body">
              All service providers are required to maintain confidentiality and comply with privacy
              obligations. We do not sell personal information.
            </p>
            <p className="t-body">
              We may use your contact details for marketing communications about property and services.
              You may opt out at any time by emailing <Mail>{AGENCY.email}</Mail>.
            </p>
            <p className="t-body">
              We do not adopt government identifiers such as Tax File Numbers or Medicare numbers as
              our own identifiers.
            </p>

            <h3 className="t-h3 pt-2 text-ink">Sending information overseas</h3>
            <p className="t-body">
              {AGENCY.tradingName} generally does not use overseas service providers. If overseas
              providers are engaged — for example cloud hosting or software — we take reasonable steps to
              ensure they handle your personal information in accordance with Australian privacy laws and
              appropriate data security standards.
            </p>

            <h3 className="t-h3 pt-2 text-ink">Storage of personal information</h3>
            <p className="t-body">
              We store personal information in secure electronic systems and, where applicable,
              paper-based files, taking reasonable steps to protect information from misuse,
              interference, loss, unauthorised access, modification, or disclosure.
            </p>
            <p className="t-body">
              We retain records for the period required by law, typically at least seven years after the
              end of a client relationship or as required under AML/CTF legislation. After this period,
              identifying information is securely destroyed or de-identified.
            </p>

            <h3 className="t-h3 pt-2 text-ink">Accessing and correcting your personal information</h3>
            <p className="t-body">
              You may request access to or correction of personal information we hold by contacting us in
              writing at <Mail>{AGENCY.email}</Mail> and verifying your identity. Requests will be
              acknowledged within 7 days and responded to within 30 days.
            </p>

            <h3 className="t-h3 pt-2 text-ink">Keeping your information accurate</h3>
            <p className="t-body">
              Please notify us if your details change so we can maintain accurate records.
            </p>

            <h3 className="t-h3 pt-2 text-ink">Changes to this policy</h3>
            <p className="t-body">
              This Privacy Policy may be updated from time to time. The latest version is published on{" "}
              <a href={siteUrl} className="text-oxblood underline underline-offset-2">
                {siteUrl.replace(/^https?:\/\//, "")}
              </a>
              .
            </p>

            <h3 className="t-h3 pt-2 text-ink">Complaints</h3>
            <p className="t-body">
              If you believe your privacy has been breached, contact us at <Mail>{AGENCY.email}</Mail>.
              If you are not satisfied with our response, you may contact the Office of the Australian
              Information Commissioner:
            </p>
            <ul className="t-body space-y-1 pl-0">
              <li>Phone: 1300 363 992</li>
              <li>
                Website:{" "}
                <a
                  href="https://www.oaic.gov.au"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-oxblood underline underline-offset-2"
                >
                  www.oaic.gov.au
                </a>
              </li>
              <li>
                Email:{" "}
                <a href="mailto:enquiries@oaic.gov.au" className="text-oxblood underline underline-offset-2">
                  enquiries@oaic.gov.au
                </a>
              </li>
              <li>Post: GPO Box 5218, Sydney NSW 2001</li>
            </ul>
          </section>

          <section className="space-y-4 border-t border-oxblood/10 pt-8">
            <h2 className="t-h2 text-ink">Data Breach Policy</h2>
            <p className="t-body">
              {AGENCY.legalName} and its related entities are committed to protecting your personal
              information and responding to data breaches in accordance with the <em>Privacy Act 1988</em>{" "}
              (Cth) and the Notifiable Data Breaches (NDB) scheme.
            </p>

            <h3 className="t-h3 pt-2 text-ink">What is a data breach?</h3>
            <p className="t-body">A data breach occurs when personal information held by us is:</p>
            <ul className="t-body list-disc space-y-2 pl-5">
              <li>Accessed or disclosed without authorisation, or</li>
              <li>Lost in circumstances where unauthorised access or disclosure is likely</li>
            </ul>

            <h3 className="t-h3 pt-2 text-ink">Our approach to preventing data breaches</h3>
            <p className="t-body">
              We take reasonable steps to protect personal information from misuse, interference, loss,
              unauthorised access, modification, or disclosure. This includes secure electronic systems,
              access controls, staff awareness, and handling procedures.
            </p>

            <h3 className="t-h3 pt-2 text-ink">Reporting a suspected data breach</h3>
            <p className="t-body">
              All employees, contractors, and service providers must promptly report any suspected or
              actual data breach to management or the Privacy Officer at <Mail>{AGENCY.email}</Mail>.
            </p>

            <h3 className="t-h3 pt-2 text-ink">Assessment of a data breach</h3>
            <p className="t-body">When we become aware of a data breach, we will:</p>
            <ul className="t-body list-disc space-y-2 pl-5">
              <li>Contain the breach where possible</li>
              <li>Assess the breach within 30 days</li>
              <li>Determine whether it is an eligible data breach (likely to result in serious harm)</li>
            </ul>
            <p className="t-body">
              If remedial action prevents the likelihood of serious harm, notification may not be
              required.
            </p>

            <h3 className="t-h3 pt-2 text-ink">Notification obligations</h3>
            <p className="t-body">Where an eligible data breach occurs, we will:</p>
            <ul className="t-body list-disc space-y-2 pl-5">
              <li>Notify affected individuals as soon as practicable</li>
              <li>Notify the Office of the Australian Information Commissioner</li>
            </ul>
            <p className="t-body">Notifications include:</p>
            <ul className="t-body list-disc space-y-2 pl-5">
              <li>Description of the data breach</li>
              <li>Type of personal information involved</li>
              <li>Steps individuals can take to reduce potential harm</li>
            </ul>

            <h3 className="t-h3 pt-2 text-ink">Record keeping and policy review</h3>
            <p className="t-body">
              We keep records of all data breaches, including those not requiring notification. This
              policy may be updated from time to time and the latest version is available on our
              website.
            </p>
          </section>

          <section className="space-y-4 border-t border-oxblood/10 pt-8">
            <h2 className="t-h2 text-ink">Cookie Policy</h2>
            <p className="t-body">
              This Cookie Policy explains how {AGENCY.legalName} and its related entities use cookies
              and similar technologies on our website. It forms part of our Privacy Policy.
            </p>

            <h3 className="t-h3 pt-2 text-ink">What are cookies?</h3>
            <p className="t-body">
              Cookies are small text files placed on your device when you visit a website. They allow a
              website to recognise your device and store information about your preferences or past
              actions.
            </p>

            <h3 className="t-h3 pt-2 text-ink">How we use cookies</h3>
            <p className="t-body">We may use cookies to:</p>
            <ul className="t-body list-disc space-y-2 pl-5">
              <li>Enable essential website functionality and security</li>
              <li>Remember preferences for authenticated desk users</li>
              <li>Analyse website usage and improve services</li>
              <li>Support features provided by third-party services (such as embedded maps or media)</li>
            </ul>

            <h3 className="t-h3 pt-2 text-ink">Personal information collected through cookies</h3>
            <p className="t-body">
              Some cookies may collect information that can identify you or be reasonably linked to you.
              Where this occurs, we handle the information in accordance with the Australian Privacy
              Principles and our Privacy Policy.
            </p>

            <h3 className="t-h3 pt-2 text-ink">Managing cookies</h3>
            <p className="t-body">
              You can manage or disable cookies through your web browser settings, including blocking
              cookies or deleting existing cookies. Restricting cookies may affect website
              functionality.
            </p>

            <h3 className="t-h3 pt-2 text-ink">Third-party cookies</h3>
            <p className="t-body">
              Our website may use third-party services that place cookies on your device. These cookies
              are managed by the relevant third parties and are subject to their own privacy policies.
            </p>

            <h3 className="t-h3 pt-2 text-ink">Changes to this policy</h3>
            <p className="t-body">This Cookie Policy may be updated from time to time.</p>
          </section>

          <section className="border-t border-oxblood/10 pt-8">
            <p className="t-caption text-mauve">
              {AGENCY.legalName} · {AGENCY.addressLine1}, {AGENCY.addressLine2} ·{" "}
              <Mail>{AGENCY.email}</Mail>
            </p>
          </section>
        </div>
      </Container>
    </div>
  );
}
