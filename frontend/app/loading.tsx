import { Container } from "@/components/brand/Container";

export default function Loading() {
  return (
    <div className="page-shell min-h-[100svh] bg-paper">
      <div className="border-b border-oxblood/10 bg-paper/95 backdrop-blur-xl">
        <Container className="flex items-center justify-between py-4">
          <div className="h-10 w-12 animate-pulse bg-oxblood/10" />
          <div className="hidden gap-5 md:flex">
            <div className="h-3 w-16 animate-pulse bg-oxblood/10" />
            <div className="h-3 w-16 animate-pulse bg-oxblood/10" />
            <div className="h-3 w-16 animate-pulse bg-oxblood/10" />
          </div>
          <div className="h-10 w-28 animate-pulse bg-tan/45" />
        </Container>
      </div>

      <Container className="section-pad">
        <div className="section-intro space-y-5">
          <div className="h-3 w-40 animate-pulse bg-oxblood/10" />
          <div className="h-12 max-w-3xl animate-pulse bg-oxblood/10 md:h-16" />
          <div className="h-5 max-w-2xl animate-pulse bg-oxblood/10" />
          <div className="h-5 max-w-xl animate-pulse bg-oxblood/10" />
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <div className="premium-panel h-80 animate-pulse bg-oxblood/8" />
          <div className="premium-panel h-80 animate-pulse bg-oxblood/8" />
          <div className="premium-panel h-80 animate-pulse bg-oxblood/8" />
        </div>
      </Container>
    </div>
  );
}
