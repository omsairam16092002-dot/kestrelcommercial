import Image from "next/image";
import { PrefetchLink } from "@/components/ui/PrefetchLink";

const MARK = {
  header: { size: 40, width: 40, height: 40 },
  footer: { size: 48, width: 48, height: 48 },
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
  const mark = MARK[variant];
  const isFooter = variant === "footer";

  return (
    <PrefetchLink
      href={href}
      className={`inline-flex shrink-0 items-center gap-2.5 leading-none sm:gap-3 ${className}`.trim()}
      aria-label="Kestrel Commercial home"
      onClick={onClick}
    >
      <Image
        src="/assets/kestrel-icon-mark.png"
        alt=""
        width={mark.width}
        height={mark.height}
        className={isFooter ? "h-12 w-12 shrink-0" : "h-10 w-10 shrink-0 sm:h-11 sm:w-11"}
        priority={!isFooter}
        aria-hidden
      />
      <span className="flex flex-col gap-0.5">
        <span
          className={`text-[15px] font-semibold tracking-[-0.02em] sm:text-base ${
            isFooter ? "text-paper" : "text-ink"
          }`}
        >
          Kestrel
        </span>
        <span
          className={`text-[9px] font-medium uppercase tracking-[0.18em] sm:text-[10px] ${
            isFooter ? "text-tan" : "text-mauve"
          }`}
        >
          Commercial
        </span>
      </span>
    </PrefetchLink>
  );
}
