import Image from "next/image";
import { PrefetchLink } from "@/components/ui/PrefetchLink";

/** Horizontal wordmark is ~3000×1056 (~2.84:1). */
const SIZES = {
  header: { width: 168, height: 59 },
  footer: { width: 200, height: 70 },
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
        src="/assets/logo-flat.png"
        alt="Kestrel Commercial"
        width={width}
        height={height}
        className={variant === "footer" ? "h-14 w-auto" : "h-11 w-auto sm:h-12"}
        priority
      />
    </PrefetchLink>
  );
}
