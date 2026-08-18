"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { track } from "@/lib/analytics";

export function CtaLink({
  href,
  id,
  page,
  listing,
  className,
  children,
}: {
  href: string;
  id: string;
  page: string;
  listing?: string;
  className?: string;
  children: ReactNode;
}) {
  const external = href.startsWith("tel:") || href.startsWith("mailto:") || href.startsWith("http");
  const whatsapp = href.includes("wa.me");
  const onClick = () => track({ event: "cta_click", id, page, listing, href });

  if (external) {
    return (
      <a
        href={href}
        id={id}
        className={className}
        onClick={onClick}
        target={whatsapp ? "_blank" : undefined}
        rel={whatsapp ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} id={id} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
