import Image from "next/image";
import { PrefetchLink } from "@/components/ui/PrefetchLink";

/** Circular mark — 2000×2000 source. */
const SIZES = {
  header: { width: 48, height: 48 },
  footer: { width: 56, height: 56 },
} as const;

export function Logo({
  href = "/",
  className = "",
  variant = "header",
  onClick,
}: {
  href?: string;
  className?: string;
  variant?: "header" | "footer";
  onClick?: () => void;
}) {
  const { width, height } = SIZES[variant];

  return (
    <PrefetchLink href={href} className={`shrink-0 leading-none ${className}`.trim()} onClick={onClick}>
      <Image
        src="/assets/logo.png"
        alt="Kestrel Commercial"
        width={width}
        height={height}
        className={variant === "footer" ? "h-14 w-14" : "h-11 w-11 sm:h-12 sm:w-12"}
        priority
      />
    </PrefetchLink>
  );
}
