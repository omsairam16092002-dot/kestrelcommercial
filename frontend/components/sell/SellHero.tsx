import { HeroBleed } from "@/components/brand/HeroBleed";
import { Container } from "@/components/brand/Container";
import { AppraisalQuickForm } from "@/components/forms/AppraisalQuickForm";
import { CtaLink } from "@/components/ui/CtaLink";

export function SellHero({ imageSrc, imageAlt }: { imageSrc?: string; imageAlt?: string }) {
  return (
    <section className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden bg-oxblood text-paper">
      <HeroBleed alt={imageAlt || "Industrial warehouse, Melbourne west"} src={imageSrc} />
      <Container className="relative z-10 grid items-end gap-10 pb-16 pt-28 md:grid-cols-12 md:pb-24 md:pt-36">
        <div className="md:col-span-7 lg:col-span-7">
          <p className="t-caption text-tan">Selling</p>
          <h1 className="t-h1 mt-5 max-w-3xl">
            Price it <em className="font-serif text-[1.05em] font-normal italic text-tan">properly</em>, from day one.
          </h1>
          <p className="t-body-lg mt-6 max-w-xl text-pretty text-paper/90">
            A portal average is not an appraisal. I price against west-side sold paper, then pick private
            treaty or EOI because the asset needs it.
          </p>
          <CtaLink
            href="#enquire"
            id="cta-sell-hero-appraisal"
            page="sell"
            className="btn-sharp mt-10 bg-tan text-ink hover:bg-paper"
          >
            Request an appraisal
          </CtaLink>
        </div>

        <div className="border border-oxblood bg-paper p-5 text-ink md:col-span-5 lg:col-span-5 md:p-7">
          <p className="t-caption text-oxblood">Appraisal</p>
          <h2 className="t-h3 mt-2 text-ink">Talk to the desk</h2>
          <p className="t-body mt-2 text-mauve">Name, number, address. I will call you back.</p>
          <div className="mt-5">
            <AppraisalQuickForm />
          </div>
        </div>
      </Container>
    </section>
  );
}
