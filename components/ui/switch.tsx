"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  className?: string;
  size?: "sm" | "default";
}

export const Switch = React.forwardRef<HTMLElement, SwitchProps>(
  ({ className, size = "sm", ...props }, ref) => {
    return (
      <SwitchPrimitive.Root
        ref={ref}
        data-slot="switch"
        className={cn(
          "group peer inline-flex shrink-0 cursor-pointer items-center rounded-full border border-border/80 transition-[background-color,box-shadow,border-color,transform] duration-150 ease-[var(--ease-snappy)] outline-none select-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "active:scale-[0.98]",
          "bg-muted/80 data-checked:bg-emerald-600 data-checked:border-emerald-600 data-[checked]:bg-emerald-600 data-[checked]:border-emerald-600 dark:data-checked:bg-emerald-500 dark:data-checked:border-emerald-500 dark:data-[checked]:bg-emerald-500",
          size === "sm" ? "h-5 w-9 px-0.5" : "h-6 w-11 px-0.5",
          className
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          data-slot="switch-thumb"
          className={cn(
            "pointer-events-none block rounded-full bg-background shadow-xs ring-0 transition-transform duration-150 ease-[var(--ease-snappy)]",
            size === "sm"
              ? "size-3.5 group-data-checked:translate-x-4 group-data-[checked]:translate-x-4 translate-x-0"
              : "size-4.5 group-data-checked:translate-x-5 group-data-[checked]:translate-x-5 translate-x-0"
          )}
        />
      </SwitchPrimitive.Root>
    );
  }
);

Switch.displayName = "Switch";
