import { AGENCY } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { CtaLink } from "@/components/ui/CtaLink";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";

export default function NotFound() {
  return (
    <Container className="py-20 md:py-28">
      <div className="surface mx-auto max-w-xl p-10 text-center">
        <p className="t-mono text-oxblood">404</p>
        <h1 className="t-h1 mt-3 text-ink">That page is not on the board</h1>
        <p className="t-body mx-auto mt-4 max-w-md text-mauve">
          Try the stock search, or WhatsApp the desk.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <WhatsAppButton
            page="404"
            className="btn-sharp bg-tan text-ink hover:bg-oxblood hover:text-paper"
            label={`WhatsApp ${AGENCY.whatsapp}`}
          />
          <CtaLink href="/buy" id="cta-404-stock" page="404" className="text-sm font-semibold text-oxblood hover:underline">
            Search stock →
          </CtaLink>
        </div>
      </div>
    </Container>
  );
}
