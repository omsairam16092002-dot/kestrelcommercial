"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AGENCY } from "@kestrel/shared";
import { IconClose, IconMenu, IconWhatsApp } from "@/components/icons";

const NAV = [
  { href: "/about", label: "About", match: ["/about"] },
  { href: "/buy", label: "Properties", match: ["/buy", "/lease", "/listing", "/properties"] },
  { href: "/services", label: "Services", match: ["/services"] },
  { href: "/investing", label: "Investing", match: ["/investing"] },
  { href: "/contact", label: "Contact", match: ["/contact"] },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const root = document.getElementById("mobile-nav");
      if (!root) return;
      const focusable = [
        menuButtonRef.current,
        ...Array.from(root.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")),
      ].filter((el): el is HTMLButtonElement | HTMLAnchorElement => Boolean(el));
      if (focusable.length < 2) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header id="site-header" className="sticky top-0 z-50 border-b border-oxblood/10 bg-paper/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0 leading-none" onClick={() => setOpen(false)}>
          <span className="block text-[1.45rem] font-semibold tracking-[-0.04em] text-ink md:text-[1.65rem]">
            Kestrel
          </span>
          <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.22em] text-mauve">
            Commercial
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
          {NAV.map((item) => {
            const active = item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative pb-0.5 text-[13px] font-medium tracking-[0.04em] transition-colors duration-150 ease-out ${
                  active ? "text-oxblood" : "text-ink/80 hover:text-ink"
                }`}
              >
                {item.label}
                {active ? <span className="absolute inset-x-0 -bottom-1 h-px bg-tan" aria-hidden /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <a
            href={AGENCY.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 text-[12px] font-semibold tracking-[0.04em] text-ink/80 transition-colors duration-150 ease-out hover:text-oxblood lg:inline-flex"
            aria-label={`WhatsApp ${AGENCY.whatsapp}`}
          >
            <IconWhatsApp className="h-3.5 w-3.5 text-oxblood" />
            {AGENCY.whatsapp}
          </a>
          <Link
            href="/sell"
            className="hidden lg:inline-flex items-center bg-tan px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink transition-colors duration-150 ease-out hover:bg-oxblood hover:text-paper active:scale-[0.985]"
          >
            Sell my asset
          </Link>
          <button
            ref={menuButtonRef}
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center text-ink lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <IconClose className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        hidden={!open}
        className={`border-t border-oxblood/10 bg-paper px-4 pb-5 lg:hidden ${open ? "" : "hidden"}`}
      >
          <nav className="flex flex-col gap-1 pt-3" aria-label="Mobile">
            {NAV.map((item) => {
              const active = item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`min-h-11 px-4 py-3 text-base font-semibold ${active ? "bg-oxblood text-paper" : "text-ink hover:bg-white"}`}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/sell"
              className="mx-1 mt-2 btn-sharp bg-tan text-ink"
              onClick={() => setOpen(false)}
            >
              Sell my asset
            </Link>
            <div className="mt-2 grid grid-cols-2 gap-2 px-1 pb-1">
              <a
                href={AGENCY.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-sharp inline-flex items-center justify-center gap-2 border border-oxblood text-oxblood"
                onClick={() => setOpen(false)}
              >
                <IconWhatsApp className="h-4 w-4" />
                WhatsApp
              </a>
              <a href="/contact#enquire" className="btn-sharp bg-oxblood text-paper" onClick={() => setOpen(false)}>
                Contact
              </a>
            </div>
            <p className="px-4 pt-2 text-xs text-mauve">Licence {AGENCY.licenceNumber}</p>
          </nav>
        </div>
    </header>
  );
}
