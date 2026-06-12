import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

/** Editorial section header: small eyebrow, strong title, calm description. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {eyebrow && (
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          {eyebrow}
        </span>
      )}
      <h2 className="text-balance text-3xl font-semibold sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "max-w-2xl text-lg leading-8 text-text-secondary",
            align === "center" && "mx-auto",
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
