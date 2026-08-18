export function Rivet({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      aria-hidden
      fill="none"
    >
      <circle cx="7" cy="7" r="7" fill="#5C1F27" />
      <circle cx="7" cy="7" r="3.25" fill="#F3EDE8" />
      <circle cx="7" cy="7" r="1.5" fill="#5C1F27" />
    </svg>
  );
}
