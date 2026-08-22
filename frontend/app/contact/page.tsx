import type { Metadata } from "next";
import { AGENCY } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { ReasonCards, type Reason } from "@/components/brand/ReasonCards";
import { EnquiryForm } from "@/components/forms/EnquiryForm";
import { IconBadge, IconClock, IconMail, IconWhatsApp } from "@/components/icons";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Contact",
  description: "WhatsApp the Kestrel Commercial desk. Melbourne west.",
};

const CONTACT_REASONS: Reason[] = [
  {
    n: "01",
    t: "WhatsApp first",
    d: "The public number is WhatsApp only. Licence on every reply.",
    Icon: IconWhatsApp,
  },
  {
    n: "02",
    t: "Hours",
    d: AGENCY.hours,
    Icon: IconClock,
  },
  {
    n: "03",
    t: "Licence",
    d: `${AGENCY.licenceHolder} · ${AGENCY.licenceNumber}`,
    Icon: IconBadge,
  },
];

export default function ContactPage() {
  return (
    <div className="bg-paper">
      <SectionHeader
        kicker="Contact"
        title="Start with WhatsApp."
        description="Selling, leasing, buying, SMSF, management. Message the desk."
        page="contact"
      />

      <ReasonCards kicker="The desk" title="Hours. Licence. WhatsApp." reasons={CONTACT_REASONS} />

      <section className="bg-ink text-paper">
        <Container className="grid gap-10 py-14 md:grid-cols-12 md:py-20">
          <dl className="space-y-0 md:col-span-4">
            {[
              {
                k: "WhatsApp",
                icon: IconWhatsApp,
                v: (
                  <a href={AGENCY.whatsappHref} target="_blank" rel="noopener noreferrer" className="hover:text-tan">
                    {AGENCY.whatsapp}
                  </a>
                ),
                mono: true,
              },
              {
                k: "Email",
                icon: IconMail,
                v: (
                  <a href={`mailto:${AGENCY.email}`} className="hover:text-tan">
                    {AGENCY.email}
                  </a>
                ),
                mono: false,
              },
              { k: "Hours", icon: IconClock, v: AGENCY.hours, mono: false },
              {
                k: "Licence",
                icon: IconBadge,
                v: (
                  <>
                    {AGENCY.licenceHolder}
                    <br />
                    {AGENCY.licenceNumber}
                  </>
                ),
                mono: true,
              },
            ].map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.k} className="border-t border-tan/25 py-5 first:border-t-0 first:pt-0">
                  <dt className="flex items-center gap-2 t-caption text-tan">
                    <Icon className="h-3.5 w-3.5" />
                    {row.k}
                  </dt>
                  <dd className={`mt-2 ${row.mono ? "t-mono" : "t-body"}`}>{row.v}</dd>
                </div>
              );
            })}
          </dl>

          <div id="enquire" className="premium-panel bg-paper p-6 text-ink md:col-span-8 md:p-9">
            <h2 className="t-h2 text-ink">If you would rather write</h2>
            <p className="t-body mt-2 text-mauve">One business day. Sooner if you WhatsApp.</p>
            <div className="mt-6">
              <EnquiryForm source="contact" defaultTopic="other" submitLabel="Enquire" formId="form-contact" />
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
