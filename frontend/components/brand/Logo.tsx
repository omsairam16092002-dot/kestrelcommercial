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
  const w = variant === "footer" ? 110 : 52;
  const h = variant === "footer" ? 44 : 52;

  return (
    <Link href={href} className={`shrink-0 leading-none ${className}`.trim()} onClick={onClick}>
      <Image
        src="/assets/logo.png"
        alt="Kestrel Commercial"
        width={w}
        height={h}
        className="h-auto"
        priority
      />
    </Link>
  );
}
