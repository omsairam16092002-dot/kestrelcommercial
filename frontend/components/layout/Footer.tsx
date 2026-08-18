import Link from "next/link";
import { AGENCY } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { NewsletterSignup } from "@/components/forms/NewsletterSignup";
import { IconMail, IconMapPin, IconWhatsApp } from "@/components/icons";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/buy", label: "Properties" },
  { href: "/services", label: "Services" },
  { href: "/investing", label: "Investing" },
  { href: "/contact", label: "Contact" },
  { href: "/sell", label: "Sell my asset" },
  { href: "/privacy", label: "Privacy Policy" },
];

export function Footer() {
  return (
    <footer id="site-footer" className="bg-ink text-paper">
      <Container className="py-12 md:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-16">
          <div>
            <p className="text-[1.75rem] font-semibold leading-none tracking-[-0.04em]">Kestrel</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-tan">Commercial</p>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-paper/80">
              Industrial and commercial stock across Melbourne’s west — sales, leasing and management from one desk.
            </p>
            <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-paper/80" aria-label="Footer">
              {LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="transition-colors duration-150 ease-out hover:text-tan"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <ul className="mt-8 space-y-3 text-sm text-paper/80">
              <li>
                <a
                  href={AGENCY.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-tan"
                >
                  <IconWhatsApp className="h-3.5 w-3.5 text-tan" />
                  {AGENCY.whatsapp}
                </a>
              </li>
              <li>
                <a href={`mailto:${AGENCY.email}`} className="inline-flex items-center gap-2 hover:text-tan">
                  <IconMail className="h-3.5 w-3.5 text-tan" />
                  {AGENCY.email}
                </a>
              </li>
              <li className="inline-flex items-start gap-2">
                <IconMapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-tan" />
                <span>
                  {AGENCY.addressLine1}
                  <br />
                  {AGENCY.addressLine2}
                </span>
              </li>
            </ul>
          </div>
          <div className="w-full border border-paper/10 bg-paper/[0.03] p-6 md:p-8">
            <p className="t-caption text-tan">This month in the west</p>
            <p className="mt-2 text-sm text-paper/80">Monthly note. No spam. One confirmation per address.</p>
            <div className="mt-5">
              <NewsletterSignup />
            </div>
          </div>
        </div>
      </Container>

      <div className="border-t border-paper/10">
        <Container className="flex flex-col gap-2 py-5 text-xs leading-relaxed text-paper/75 md:flex-row md:items-center md:justify-between">
          <p>
            {AGENCY.legalName} · ACN {AGENCY.acn}
          </p>
          <p>
            {AGENCY.licenceHolder} · Licence {AGENCY.licenceNumber}
          </p>
          <p>{AGENCY.hours}</p>
        </Container>
      </div>

      <div className="h-[4.75rem] md:hidden" aria-hidden />
    </footer>
  );
}
