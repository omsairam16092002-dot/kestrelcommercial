import type { ReactNode } from "react";
import { Rivet } from "@/components/brand/Rivet";

export function RivetPlate({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative border-2 border-oxblood bg-paper ${className}`}>
      <Rivet className="pointer-events-none absolute left-3 top-3 z-10" />
      <Rivet className="pointer-events-none absolute right-3 top-3 z-10" />
      <Rivet className="pointer-events-none absolute bottom-3 left-3 z-10" />
      <Rivet className="pointer-events-none absolute bottom-3 right-3 z-10" />
      {children}
    </div>
  );
}
