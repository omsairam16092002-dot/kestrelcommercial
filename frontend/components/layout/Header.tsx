"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ASSET_CATEGORY_LABELS,
  COMMERCIAL_TYPE_OPTIONS,
  HOUSE_LAND_SECTION,
  PACKAGE_SEGMENT_OPTIONS,
} from "@kestrel/shared";
import { Logo } from "@/components/brand/Logo";
import { IconChevronDown, IconClose, IconMenu } from "@/components/icons";
import { HeaderContactCluster, MobileContactPanel } from "@/components/ui/PhoneActionButtons";
import { PrefetchLink } from "@/components/ui/PrefetchLink";

const NAV = [
  { href: "/about", label: "About", match: ["/about"] },
  { href: "/services", label: "Services", match: ["/services"] },
  { href: "/investing", label: "Investing", match: ["/investing"] },
  { href: "/contact", label: "Contact", match: ["/contact"] },
];

const COMMERCIAL_TYPE_LINKS = COMMERCIAL_TYPE_OPTIONS.map((option) => ({
  label: option.label,
  href: `${ASSET_CATEGORY_LABELS.commercial.path}?type=${option.value}`,
}));

const HOUSE_LAND_LINKS = PACKAGE_SEGMENT_OPTIONS.map((option) => ({
  label: option.label,
  href: `${HOUSE_LAND_SECTION.path}?package=${option.value}`,
}));

const PROPERTY_LINKS = [
  { ...ASSET_CATEGORY_LABELS.commercial, subLinks: COMMERCIAL_TYPE_LINKS },
  { ...HOUSE_LAND_SECTION, subLinks: HOUSE_LAND_LINKS },
  ASSET_CATEGORY_LABELS.residential,
  ASSET_CATEGORY_LABELS["development-site"],
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [mobilePropertiesOpen, setMobilePropertiesOpen] = useState(false);
  const pathname = usePathname();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
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
    const prev = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : prev;
    document.body.dataset.mobileMenuOpen = open ? "true" : "false";
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      delete document.body.dataset.mobileMenuOpen;
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith("/properties") || pathname === "/buy" || pathname === "/lease") {
      setMobilePropertiesOpen(true);
    }
  }, [pathname]);

  const closeMenu = () => setOpen(false);

  return (
    <header id="site-header" className="relative sticky top-0 z-50 border-b border-oxblood/10 bg-paper">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:gap-4 lg:px-8 lg:py-3.5">
        <Logo onClick={closeMenu} />

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
          <div className="group relative">
            <PrefetchLink
              href="/properties/commercial"
              className={`relative inline-flex items-center gap-1 pb-0.5 text-[13px] font-medium tracking-[0.04em] transition-colors duration-150 ease-out ${
                pathname.startsWith("/properties") || pathname === "/buy" || pathname === "/lease"
                  ? "text-oxblood"
                  : "text-ink/80 hover:text-ink"
              }`}
            >
              Properties
              <IconChevronDown className="h-3.5 w-3.5" />
              {pathname.startsWith("/properties") || pathname === "/buy" || pathname === "/lease" ? (
                <span className="absolute inset-x-0 -bottom-1 h-px bg-tan" aria-hidden />
              ) : null}
            </PrefetchLink>
            <div className="invisible absolute left-1/2 top-full z-20 mt-5 w-[420px] -translate-x-1/2 border border-oxblood/10 bg-paper p-3 opacity-0 shadow-[0_24px_60px_rgba(42,20,24,0.14)] transition-all duration-150 group-hover:visible group-hover:opacity-100">
              <div className="grid gap-2">
                {PROPERTY_LINKS.map((item) => (
                  <div key={item.path}>
                    <PrefetchLink
                      href={item.path}
                      className="block border border-transparent px-4 py-3.5 transition-colors duration-150 ease-out hover:border-oxblood/10 hover:bg-white"
                    >
                      <p className="text-sm font-semibold text-ink">{item.title}</p>
                      <p className="mt-1 text-xs text-mauve">{item.description}</p>
                    </PrefetchLink>
                    {"subLinks" in item ? (
                      <div className="flex flex-wrap gap-2 px-4 pb-3">
                        {item.subLinks.map((sub) => (
                          <PrefetchLink
                            key={sub.href}
                            href={sub.href}
                            className="border border-oxblood/15 bg-white px-3 py-1.5 text-xs font-semibold text-oxblood transition-colors duration-150 ease-out hover:bg-oxblood hover:text-paper"
                          >
                            {sub.label}
                          </PrefetchLink>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {NAV.map((item) => {
            const active = item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
            return (
              <PrefetchLink
                key={item.href}
                href={item.href}
                className={`relative pb-0.5 text-[13px] font-medium tracking-[0.04em] transition-colors duration-150 ease-out ${
                  active ? "text-oxblood" : "text-ink/80 hover:text-ink"
                }`}
              >
                {item.label}
                {active ? <span className="absolute inset-x-0 -bottom-1 h-px bg-tan" aria-hidden /> : null}
              </PrefetchLink>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <HeaderContactCluster page="header" />
          <PrefetchLink
            href="/sell"
            className="hidden lg:inline-flex items-center bg-tan px-4 py-2.5 text-[11px] font-semibold normal-case tracking-[0.02em] text-ink transition-colors duration-150 ease-out hover:bg-oxblood hover:text-paper active:scale-[0.985]"
          >
            Sell my property / Request appraisal
          </PrefetchLink>
          <button
            ref={menuButtonRef}
            type="button"
            className="relative z-[60] inline-flex h-11 w-11 items-center justify-center text-ink lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <IconClose className="h-6 w-6" /> : <IconMenu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open ? (
        <div
          id="mobile-nav"
          className="absolute inset-x-0 top-full z-50 h-[calc(100svh-100%)] overflow-y-auto bg-paper px-4 pb-8 lg:hidden"
        >
          <nav className="flex min-h-full flex-col gap-1 pt-3" aria-label="Mobile">
            {NAV.map((item) => {
              const active = item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
              return (
                <PrefetchLink
                  key={item.href}
                  href={item.href}
                  className={`min-h-11 px-4 py-3 text-base font-semibold ${active ? "bg-oxblood text-paper" : "text-ink hover:bg-white"}`}
                  onClick={closeMenu}
                >
                  {item.label}
                </PrefetchLink>
              );
            })}
            <div className="px-4 pt-3">
              <button
                type="button"
                className={`flex min-h-11 w-full items-center justify-between px-4 py-3 text-left text-base font-semibold ${
                  pathname.startsWith("/properties") || pathname === "/buy" || pathname === "/lease"
                    ? "bg-oxblood text-paper"
                    : "text-ink hover:bg-white"
                }`}
                aria-expanded={mobilePropertiesOpen}
                aria-controls="mobile-properties-links"
                onClick={() => setMobilePropertiesOpen((v) => !v)}
              >
                <span>Properties</span>
                <IconChevronDown
                  className={`h-4 w-4 transition-transform duration-150 ${
                    pathname.startsWith("/properties") || pathname === "/buy" || pathname === "/lease"
                      ? "text-paper"
                      : "text-mauve"
                  } ${mobilePropertiesOpen ? "rotate-180" : ""}`}
                />
              </button>
              <div id="mobile-properties-links" className={`mt-2 grid gap-1 ${mobilePropertiesOpen ? "" : "hidden"}`}>
                {PROPERTY_LINKS.map((item) => (
                  <div key={item.path} className="grid gap-1">
                    <PrefetchLink
                      href={item.path}
                      className={`min-h-11 px-4 py-3 text-base font-semibold ${
                        pathname === item.path ? "bg-oxblood text-paper" : "text-ink hover:bg-white"
                      }`}
                      onClick={closeMenu}
                    >
                      {item.title}
                    </PrefetchLink>
                    {"subLinks" in item
                      ? item.subLinks.map((sub) => (
                          <PrefetchLink
                            key={sub.href}
                            href={sub.href}
                            className="min-h-11 py-3 pl-8 pr-4 text-sm font-medium text-ink/80 hover:bg-white"
                            onClick={closeMenu}
                          >
                            {sub.label}
                          </PrefetchLink>
                        ))
                      : null}
                  </div>
                ))}
              </div>
            </div>
            <PrefetchLink href="/sell" className="mx-1 mt-2 btn-sharp bg-tan text-ink" onClick={closeMenu}>
              Sell my property / Request appraisal
            </PrefetchLink>
            <MobileContactPanel page="header" onNavigate={closeMenu} />
          </nav>
        </div>
      ) : null}
    </header>
  );
}
