import Image from "next/image";
import { PrefetchLink } from "@/components/ui/PrefetchLink";

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
  const w = variant === "footer" ? 110 : 52;
  const h = variant === "footer" ? 44 : 52;

  return (
    <PrefetchLink href={href} className={`shrink-0 leading-none ${className}`.trim()} onClick={onClick}>
      <Image
        src="/assets/logo-flat.png"
        alt="Kestrel Commercial"
        width={w}
        height={h}
        className="h-12 w-auto"
        priority
      />
    </PrefetchLink>
  );
}
