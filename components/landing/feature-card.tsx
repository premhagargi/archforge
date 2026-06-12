import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

/** Calm feature tile: accent icon chip, title, supporting copy. */
export function FeatureCard({
  icon: Icon,
  title,
  description,
  className,
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        "group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6 shadow-xs transition-colors hover:border-border-strong",
        className,
      )}
    >
      <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-white">
        <Icon className="size-5" />
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm leading-6 text-text-secondary">{description}</p>
    </div>
  );
}
