"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { Footer } from "@/components/layout/Footer";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  if (pathname.startsWith("/admin")) {
    return <main id="main">{children}</main>;
  }
  return (
    <>
      <SiteChrome>
        <main id="main">{children}</main>
      </SiteChrome>
      <Footer />
    </>
  );
}
