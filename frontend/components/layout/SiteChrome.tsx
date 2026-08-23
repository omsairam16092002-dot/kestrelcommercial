"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { StickyCallBar } from "@/components/listing/StickyCallBar";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const onListing = pathname.startsWith("/listing/");

  return (
    <>
      <Header />
      <div className="page-shell">{children}</div>
      <StickyCallBar
        page={pathname.replace(/\//g, "-").replace(/^-|-$/g, "") || "home"}
        listing={onListing ? pathname.replace("/listing/", "") : undefined}
      />
    </>
  );
}
