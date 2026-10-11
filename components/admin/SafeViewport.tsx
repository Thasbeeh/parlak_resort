import * as React from "react";
import { cn } from "@/lib/utils";

export interface SafeViewportProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function SafeViewport({
  children,
  className,
  ...props
}: SafeViewportProps) {
  return (
    <div
      data-slot="safe-viewport"
      className={cn(
        "min-h-[100dvh] w-full flex flex-col bg-background text-foreground antialiased",
        "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
        "pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default SafeViewport;
