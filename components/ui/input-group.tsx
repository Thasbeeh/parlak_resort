import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  isError?: boolean;
}

export function InputGroup({ className, isError, ...props }: InputGroupProps) {
  return (
    <div
      data-slot="input-group"
      aria-invalid={isError ? "true" : undefined}
      className={cn(
        "flex h-10 w-full items-center rounded-md border border-input bg-background overflow-hidden",
        "transition-[color,box-shadow,border-color] duration-150 ease-[var(--ease-snappy)]",
        "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40",
        "has-[[disabled]]:opacity-50 has-[[disabled]]:cursor-not-allowed",
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30",
        "group-data-[invalid=true]/field:border-destructive group-data-[invalid=true]/field:ring-2 group-data-[invalid=true]/field:ring-destructive/30",
        className
      )}
      {...props}
    />
  );
}

export function InputGroupAddon({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="input-group-addon"
      className={cn(
        "flex items-center px-3 text-muted-foreground select-none shrink-0 [&_svg]:size-4",
        className
      )}
      {...props}
    />
  );
}

export interface InputGroupInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  isError?: boolean;
}

export const InputGroupInput = React.forwardRef<
  HTMLInputElement,
  InputGroupInputProps
>(({ className, type = "text", isError, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      data-slot="input-group-input"
      aria-invalid={isError ? "true" : props["aria-invalid"]}
      className={cn(
        "flex h-full w-full flex-1 bg-transparent px-3 py-2 border-0 outline-none shadow-none",
        "text-base md:text-sm text-foreground placeholder:text-muted-foreground",
        "disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  );
});
InputGroupInput.displayName = "InputGroupInput";

export interface InputGroupTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  isError?: boolean;
}

export const InputGroupTextarea = React.forwardRef<
  HTMLTextAreaElement,
  InputGroupTextareaProps
>(({ className, isError, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      data-slot="input-group-textarea"
      aria-invalid={isError ? "true" : props["aria-invalid"]}
      className={cn(
        "flex min-h-[80px] w-full flex-1 bg-transparent px-3 py-2 border-0 outline-none shadow-none",
        "text-base md:text-sm text-foreground placeholder:text-muted-foreground",
        "disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  );
});
InputGroupTextarea.displayName = "InputGroupTextarea";
