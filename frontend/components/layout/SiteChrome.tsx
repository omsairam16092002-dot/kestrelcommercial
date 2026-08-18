"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { StickyCallBar } from "@/components/listing/StickyCallBar";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const onListing = pathname.startsWith("/listing/");
  const enquireHref = onListing
    ? "#inspect"
    : pathname === "/" || pathname === "/sell" || pathname === "/contact"
      ? "#enquire"
      : "/contact#enquire";

  return (
    <>
      <Header />
      {children}
      <StickyCallBar
        page={pathname}
        listing={onListing ? pathname.replace("/listing/", "") : undefined}
        secondaryHref={enquireHref}
        secondaryLabel={onListing ? "Inspect" : "Request info"}
      />
    </>
  );
}
