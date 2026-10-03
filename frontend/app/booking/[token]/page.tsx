import type { Metadata } from "next";
import { Container } from "@/components/brand/Container";
import { ManageBooking } from "@/components/booking/ManageBooking";

export const metadata: Metadata = {
  title: "Your booking",
  robots: { index: false, follow: false },
};

export default function ManageBookingPage({ params }: { params: { token: string } }) {
  return (
    <div className="bg-paper">
      <Container className="py-14 md:py-20">
        <div className="mx-auto max-w-2xl">
          <p className="eyebrow-rule t-caption text-oxblood">Your booking</p>
          <h1 className="t-h2 mt-5 text-ink">Reschedule, cancel or add it to your calendar.</h1>
          <div className="mt-8">
            <ManageBooking token={params.token} />
          </div>
        </div>
      </Container>
    </div>
  );
}
