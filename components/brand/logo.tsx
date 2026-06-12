import { cn } from "@/lib/utils";

/**
 * ArchForge brand mark — a forged archway (architecture + "Arch"), a keystone
 * node at the apex and two footing nodes, set on the warm accent tile. The fill
 * uses the live `--accent` CSS variable so it tracks the design tokens; the
 * static favicon (`app/icon.svg`) mirrors the same geometry with a literal hex.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="ArchForge logo"
      className={cn("size-8 shrink-0", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="8"
        fill="var(--accent, #cc785c)"
      />
      {/* Semicircular arch: feet at (9,24) & (23,24), apex at (16,8) */}
      <path
        d="M9 24V15a7 7 0 0 1 14 0v9"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {/* Keystone + footing nodes */}
      <circle cx="16" cy="8" r="2.5" fill="#ffffff" />
      <circle cx="9" cy="24" r="1.7" fill="#ffffff" />
      <circle cx="23" cy="24" r="1.7" fill="#ffffff" />
    </svg>
  );
}

/** Mark + wordmark lockup used in the nav, footer, and hero. */
export function Logo({
  className,
  markClassName,
  wordmarkClassName,
}: {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BrandMark className={markClassName} />
      <span
        className={cn(
          "text-base font-semibold tracking-tight text-text",
          wordmarkClassName,
        )}
      >
        ArchForge
      </span>
    </span>
  );
}
