import { AGENCY, SOCIAL } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { Logo } from "@/components/brand/Logo";
import { NewsletterSignup } from "@/components/forms/NewsletterSignup";
import { IconFacebook, IconInstagram, IconLinkedIn, IconMail, IconMapPin, IconWhatsApp } from "@/components/icons";
import { PrefetchLink } from "@/components/ui/PrefetchLink";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/properties/commercial", label: "Properties" },
  { href: "/services", label: "Services" },
  { href: "/investing", label: "Investing" },
  { href: "/contact", label: "Contact" },
  { href: "/sell", label: "Sell my property / Request appraisal" },
  { href: "/privacy", label: "Privacy Policy" },
];

export function Footer() {
  return (
    <footer id="site-footer" className="bg-ink text-paper">
      <Container className="section-pad">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-20">
          <div>
            <Logo variant="footer" />
            <p className="mt-6 max-w-md text-base leading-relaxed text-paper/78">
              Industrial and commercial stock across Melbourne’s west — sales, leasing and management from one desk.
            </p>
            <div className="premium-divider mt-8 max-w-md bg-paper/10" />
            <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-paper/78" aria-label="Footer">
              {LINKS.map((item) => (
                <PrefetchLink
                  key={item.href}
                  href={item.href}
                  className="transition-colors duration-150 ease-out hover:text-tan"
                >
                  {item.label}
                </PrefetchLink>
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
            <div className="mt-8 flex flex-wrap items-center gap-3 text-paper/80">
              <a
                href={AGENCY.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`WhatsApp ${AGENCY.whatsapp}`}
                className="inline-flex h-10 w-10 items-center justify-center border border-paper/15 bg-paper/[0.03] text-tan transition-colors duration-150 ease-out hover:border-tan/40 hover:text-paper"
              >
                <IconWhatsApp className="h-4 w-4" />
              </a>
              <a
                href={`mailto:${AGENCY.email}`}
                aria-label={`Email ${AGENCY.email}`}
                className="inline-flex h-10 w-10 items-center justify-center border border-paper/15 bg-paper/[0.03] text-tan transition-colors duration-150 ease-out hover:border-tan/40 hover:text-paper"
              >
                <IconMail className="h-4 w-4" />
              </a>
              <a
                href={SOCIAL.facebook.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={SOCIAL.facebook.label}
                className="inline-flex h-10 w-10 items-center justify-center border border-paper/15 bg-paper/[0.03] text-tan transition-colors duration-150 ease-out hover:border-tan/40 hover:text-paper"
              >
                <IconFacebook className="h-4 w-4" />
              </a>
              <a
                href={SOCIAL.linkedin.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={SOCIAL.linkedin.label}
                className="inline-flex h-10 w-10 items-center justify-center border border-paper/15 bg-paper/[0.03] text-tan transition-colors duration-150 ease-out hover:border-tan/40 hover:text-paper"
              >
                <IconLinkedIn className="h-4 w-4" />
              </a>
              <a
                href={SOCIAL.instagram.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={SOCIAL.instagram.label}
                className="inline-flex h-10 w-10 items-center justify-center border border-paper/15 bg-paper/[0.03] text-tan transition-colors duration-150 ease-out hover:border-tan/40 hover:text-paper"
              >
                <IconInstagram className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div className="premium-panel-dark w-full p-6 md:p-8">
            <p className="t-caption text-tan">This month in the west</p>
            <p className="mt-2 text-sm text-paper/78">Monthly note. No spam. One confirmation per address.</p>
            <div className="mt-5">
              <NewsletterSignup />
            </div>
          </div>
        </div>
      </Container>

      <div className="h-[4.75rem] md:hidden" aria-hidden />
    </footer>
  );
}
