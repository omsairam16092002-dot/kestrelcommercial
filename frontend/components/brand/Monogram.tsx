export function Monogram({
  name,
  className = "h-20 w-20 text-2xl",
}: {
  name: string;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className={`inline-flex items-center justify-center border-2 border-oxblood bg-oxblood font-display font-semibold tracking-stamp text-paper ${className}`}
      aria-hidden
    >
      {initials || "K"}
    </div>
  );
}
