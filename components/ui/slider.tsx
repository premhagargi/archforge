"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => {
  const value = props.value ?? props.defaultValue ?? [0];
  const thumbCount = Array.isArray(value) ? value.length : 1;

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        "data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-border">
        <SliderPrimitive.Range className="absolute h-full bg-accent" />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbCount }).map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          className={cn(
            "block size-4 rounded-full border-2 border-accent bg-surface shadow-sm transition-colors",
            "hover:bg-accent-soft focus-visible:outline-none disabled:pointer-events-none",
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
