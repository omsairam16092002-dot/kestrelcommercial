import type { Metadata } from "next";
import { AGENCY, type BookingKind } from "@kestrel/shared";
import { Container } from "@/components/brand/Container";
import { BookChooser } from "@/components/booking/BookChooser";
import { ContactDeskSummary } from "@/components/ui/PhoneActionButtons";

export const metadata: Metadata = {
  title: "Book a time",
  description: "Book a meeting or a market appraisal with Kestrel Commercial. Pick a time — confirmed instantly.",
};

export default function BookPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const kind = (typeof searchParams.kind === "string" ? searchParams.kind : "meeting") as BookingKind;

  return (
    <div className="bg-paper">
      <Container className="grid gap-10 py-14 md:grid-cols-12 md:py-20">
        <div className="md:col-span-5">
          <p className="eyebrow-rule t-caption text-oxblood">Book a time</p>
          <h1 className="t-h1 mt-5 text-ink">Pick a time. It is locked in.</h1>
          <p className="t-body mt-5 max-w-md text-pretty text-mauve">
            Meetings at the office or by phone, and on-site appraisals across Melbourne&apos;s west. You get an email
            confirmation and calendar invite straight away — reschedule from the link any time.
          </p>
          <dl className="mt-10 space-y-5">
            <div className="border-t border-oxblood/15 pt-4">
              <dt className="t-caption text-oxblood">Prefer to talk?</dt>
              <dd className="mt-2">
                <ContactDeskSummary page="book" tone="paper" />
              </dd>
            </div>
            <div className="border-t border-oxblood/15 pt-4">
              <dt className="t-caption text-oxblood">Hours</dt>
              <dd className="t-body mt-1 text-ink">{AGENCY.hours}</dd>
            </div>
          </dl>
        </div>
        <div className="premium-panel bg-paper p-6 md:col-span-7 md:p-9">
          <BookChooser initial={kind} />
        </div>
      </Container>
    </div>
  );
}
