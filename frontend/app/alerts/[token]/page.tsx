import type { Metadata } from "next";
import { Container } from "@/components/brand/Container";
import { ManageAlert } from "@/components/alerts/ManageAlert";

export const metadata: Metadata = {
  title: "Property alert",
  robots: { index: false, follow: false },
};

export default function ManageAlertPage({ params }: { params: { token: string } }) {
  return (
    <div className="bg-paper">
      <Container className="py-14 md:py-20">
        <div className="mx-auto max-w-2xl">
          <p className="eyebrow-rule t-caption text-oxblood">Property alert</p>
          <h1 className="t-h2 mt-5 text-ink">New listings, straight to your inbox.</h1>
          <div className="mt-8">
            <ManageAlert token={params.token} />
          </div>
        </div>
      </Container>
    </div>
  );
}
