import * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  [
    "group/button inline-flex items-center justify-center gap-2 font-medium select-none outline-none cursor-pointer",
    "rounded-md border text-sm transition-[transform,background-color,border-color,opacity] duration-150 ease-[var(--ease-snappy)]",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus:outline-none",
    "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground border-transparent hover:bg-primary/95 shadow-xs",
        default:
          "bg-primary text-primary-foreground border-transparent hover:bg-primary/95 shadow-xs",
        secondary:
          "bg-secondary text-secondary-foreground border-border/50 hover:bg-secondary/80",
        outline:
          "bg-transparent text-foreground border-border hover:bg-surface-subtle hover:border-foreground/20",
        ghost:
          "bg-transparent text-foreground border-transparent hover:bg-surface-subtle",
        destructive:
          "bg-destructive text-destructive-foreground border-transparent hover:bg-destructive/90 shadow-xs",
        link:
          "text-primary underline-offset-4 hover:underline border-transparent bg-transparent",
        whatsapp:
          "bg-[#25D366] text-white border-transparent hover:bg-[#20ba5a] shadow-xs active:scale-[0.97]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base font-semibold",
        compact: "h-7 px-2.5 text-xs font-mono",
        icon: "size-9 p-0",
        "icon-sm": "size-7 p-0",
        "icon-xs": "size-6 p-0",
        "icon-lg": "size-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends ButtonPrimitive.Props,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "default",
      loading = false,
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isBusy = Boolean(loading || isLoading);

    return (
      <ButtonPrimitive
        ref={ref}
        data-slot="button"
        aria-busy={isBusy ? "true" : undefined}
        disabled={disabled || isBusy}
        className={cn(
          buttonVariants({ variant, size, className }),
          isBusy && "relative cursor-wait"
        )}
        {...props}
      >
        {isBusy && (
          <span
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            aria-hidden="true"
          >
            <Loader2 className="size-4 animate-spin shrink-0 text-current" />
          </span>
        )}
        <span
          className={cn(
            "inline-flex items-center justify-center gap-2",
            isBusy && "invisible opacity-0"
          )}
        >
          {children}
        </span>
      </ButtonPrimitive>
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
export default Button;
