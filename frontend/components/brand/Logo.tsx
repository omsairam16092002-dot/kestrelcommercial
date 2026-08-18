import Image from "next/image";
import Link from "next/link";

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
  return (
    <Link href={href} className={`shrink-0 leading-none ${className}`.trim()} onClick={onClick}>
      <Image
        src="/assets/logo.png"
        alt="Kestrel Commercial"
        width={variant === "footer" ? 140 : 120}
        height={variant === "footer" ? 56 : 48}
        className="h-auto"
        priority
      />
    </Link>
  );
}
