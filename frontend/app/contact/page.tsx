import type { Metadata } from "next";
import { AGENCY } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { ReasonCards, type Reason } from "@/components/brand/ReasonCards";
import { EnquiryForm } from "@/components/forms/EnquiryForm";
import { IconClock, IconMail } from "@/components/icons";
import { ContactClusterBar, ContactDeskSummary } from "@/components/ui/PhoneActionButtons";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Contact",
  description: "Call, WA or text the Kestrel Commercial desk. Melbourne west.",
};

const CONTACT_REASONS: Reason[] = [
  {
    n: "01",
    t: "Call, WA or text",
    d: `${AGENCY.phone} — same Australian mobile for voice, WhatsApp and SMS.`,
    media: <ContactClusterBar page="contact-reasons" />,
  },
  {
    n: "02",
    t: "Hours",
    d: AGENCY.hours,
    Icon: IconClock,
  },
  {
    n: "03",
    t: "Email",
    d: AGENCY.email,
    Icon: IconMail,
  },
];

export default function ContactPage() {
  return (
    <div className="bg-paper">
      <SectionHeader
        kicker="Contact"
        title="Call, WA or text the desk."
        description="Selling, leasing, buying, SMSF, management. One Australian number — three ways to reach us."
        page="contact"
      />

      <ReasonCards kicker="The desk" title="Hours. Phone. Email." reasons={CONTACT_REASONS} />

      <section className="bg-ink text-paper">
        <Container className="grid gap-10 py-14 md:grid-cols-12 md:py-20">
          <dl className="space-y-0 md:col-span-4">
            <div className="border-t border-tan/25 py-5 first:border-t-0 first:pt-0">
              <dt className="t-caption text-tan">Phone</dt>
              <dd className="mt-2">
                <ContactDeskSummary page="contact" tone="light" />
              </dd>
            </div>
            {[
              {
                k: "Email",
                icon: IconMail,
                v: (
                  <a href={`mailto:${AGENCY.email}`} className="hover:text-tan">
                    {AGENCY.email}
                  </a>
                ),
              },
              { k: "Hours", icon: IconClock, v: AGENCY.hours },
            ].map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.k} className="border-t border-tan/25 py-5">
                  <dt className="flex items-center gap-2 t-caption text-tan">
                    <Icon className="h-3.5 w-3.5" />
                    {row.k}
                  </dt>
                  <dd className={`mt-2 ${row.k === "Hours" ? "t-body" : "t-body"}`}>{row.v}</dd>
                </div>
              );
            })}
          </dl>

          <div id="enquire" className="premium-panel bg-paper p-6 text-ink md:col-span-8 md:p-9">
            <h2 className="t-h2 text-ink">If you would rather write</h2>
            <p className="t-body mt-2 text-mauve">One business day. Sooner if you call, WA or text.</p>
            <div className="mt-6">
              <EnquiryForm source="contact" defaultTopic="other" submitLabel="Enquire" formId="form-contact" />
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
