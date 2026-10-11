import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  isError?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", isError, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        data-slot="input"
        aria-invalid={isError ? "true" : props["aria-invalid"]}
        className={cn(
          "w-full rounded-md border border-input bg-background px-3",
          "appearance-none [-webkit-appearance:none]",
          !className?.includes("h-")
            ? "h-10 py-2"
            : !className?.includes("py-")
              ? "py-1"
              : undefined,
          "text-base md:text-sm text-foreground placeholder:text-muted-foreground",
          "outline-none transition-[color,box-shadow,border-color] duration-150 ease-[var(--ease-snappy)]",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30",
          "group-data-[invalid=true]/field:border-destructive group-data-[invalid=true]/field:ring-2 group-data-[invalid=true]/field:ring-destructive/30",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export default Input;
