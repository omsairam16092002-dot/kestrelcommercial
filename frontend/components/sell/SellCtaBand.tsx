import { AGENCY } from "@kestrel/shared";
import { DualCtaBand } from "@/components/brand/DualCtaBand";

export function SellCtaBand() {
  return (
    <DualCtaBand
      page="sell"
      title={
        <>
          Ready to price a building <em className="font-serif font-normal italic text-oxblood">properly</em>?
        </>
      }
      lede="WhatsApp the desk. Or look at recent sales first."
      primaryHref={AGENCY.whatsappHref}
      primaryLabel="WhatsApp the desk"
      primaryId="cta-sell-band-wa"
      secondaryHref="#evidence"
      secondaryLabel="See recent sales"
      secondaryId="cta-sell-band-evidence"
    />
  );
}
