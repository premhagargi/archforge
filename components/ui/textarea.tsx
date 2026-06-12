import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[72px] w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text shadow-xs transition-colors",
          "placeholder:text-muted",
          "hover:border-border-strong focus:border-accent focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "resize-y leading-relaxed",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
