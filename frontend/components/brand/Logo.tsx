import Image from "next/image";
import { PrefetchLink } from "@/components/ui/PrefetchLink";

/** Horizontal mark — 3000×1056 transparent source. */
const SIZES = {
  header: { width: 136, height: 48 },
  footer: { width: 159, height: 56 },
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
        className={variant === "footer" ? "h-14 w-auto" : "h-10 w-auto sm:h-11"}
        priority
      />
    </PrefetchLink>
  );
}
