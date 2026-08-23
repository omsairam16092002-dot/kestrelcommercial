"use client";

import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";

export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <div className="page-shell">{children}</div>
    </>
  );
}
