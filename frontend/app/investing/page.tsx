import type { Metadata } from "next";
import { Container } from "@/components/brand/Container";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { DualCtaBand } from "@/components/brand/DualCtaBand";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Investing and compliance",
  description:
    "SMSF industrial property in Melbourne west, and what Tranche 2 AML/CTF means for your transaction.",
};

export default function InvestingPage() {
  return (
    <div className="bg-paper">
      <SectionHeader
        kicker="Investing · Compliance"
        title="Two things worth knowing before you transact."
        page="investing"
      />

      <Container className="section-pad grid items-stretch gap-8 md:grid-cols-2">
        <article className="premium-panel flex h-full flex-col border-t-2 border-oxblood p-6 pt-6 md:p-8">
          <p className="eyebrow-rule t-caption text-oxblood">SMSF</p>
          <h2 className="t-h2 mt-5 text-ink">Why so much industrial sits inside super</h2>
          <div className="t-body mt-5 flex-1 space-y-4 text-ink/85">
            <p>
              A large share of buyers in Melbourne&apos;s west are SMSFs. A good number of them are
              business owners buying the building their own company occupies.
            </p>
            <p>
              Commercial and industrial sits differently to residential under the super rules.
              Property that meets <strong>business real property</strong> can generally be acquired
              from a related party, and leased back — including to the member&apos;s own business —
              at market rent, on genuine arm&apos;s length terms.
            </p>
            <p>
              That is why a small warehouse with a solid lease is one of the more commonly held
              direct assets in SMSFs. And why yield, lease term and outgoings are on every listing
              here — not after three emails.
            </p>
          </div>
          <ul className="t-body mt-6 space-y-2">
            {[
              "Business real property tests — what typically satisfies them",
              "Related-party leasing at market rent, documented properly",
              "Limited recourse borrowing and the single acquirable asset rule",
              "Yield, lease term, outgoings and review structure on every listing",
            ].map((item) => (
              <li key={item} className="pl-3" style={{ borderLeft: "2px solid #5C1F27" }}>
                {item}
              </li>
            ))}
          </ul>
        </article>

        <article className="premium-panel flex h-full flex-col border-t-2 border-oxblood p-6 pt-6 md:p-8">
          <p className="eyebrow-rule t-caption text-oxblood">AML / CTF</p>
          <h2 className="t-h2 mt-5 text-ink">Tranche 2. Identity first. Settlement later.</h2>
          <div className="t-body mt-5 flex-1 space-y-4 text-ink/85">
            <p>
              Since <strong>1 July 2026</strong>, real estate agencies are reporting entities under
              the <em>Anti-Money Laundering and Counter-Terrorism Financing Act 2006</em>. Property
              was brought in because it has long been one of the more common laundering routes in
              Australia.
            </p>
            <p>
              In practice: we verify identity for <strong>both buyers and sellers</strong> before we
              can provide the service — not just at contract. Company, trust or SMSF: we identify
              the beneficial owners behind it.
            </p>
            <p>
              It is not onerous. It is not optional. It is the thing most likely to hold up a
              settlement if you leave it to the last week. We ask early for exactly that reason.
            </p>
          </div>
          <ul className="t-body mt-6 space-y-2">
            {[
              "Photo ID and verification for every buyer and seller",
              "Beneficial ownership for companies, trusts and SMSFs",
              "Source of funds where a transaction warrants it",
              "Records retained for seven years, as the Act requires",
            ].map((item) => (
              <li key={item} className="pl-3" style={{ borderLeft: "2px solid #5C1F27" }}>
                {item}
              </li>
            ))}
          </ul>
        </article>
      </Container>

      <DualCtaBand
        page="investing"
        title={
          <>
            Questions on SMSF or AML? <em className="font-serif font-normal italic text-oxblood">Ask early.</em>
          </>
        }
        lede="Call, text or WhatsApp the desk. Or write an enquiry."
        phoneActions
      />

      <p className="mx-auto max-w-[1240px] px-4 py-10 t-caption normal-case tracking-normal text-mauve sm:px-6 lg:px-8">
        SMSF material above is general information about how commercial property is commonly held —
        not financial, taxation or legal advice. Kestrel Commercial is a licensed estate agent, not
        a licensed financial adviser. Speak to your accountant, SMSF adviser or lawyer before
        acquiring property in a superannuation fund.
      </p>
    </div>
  );
}
