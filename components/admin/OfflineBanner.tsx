"use client";

import * as React from "react";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineBanner({ className }: { className?: string }) {
  const [isOnline, setIsOnline] = React.useState<boolean>(true);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="assertive"
      data-slot="offline-banner"
      className={cn(
        "sticky top-0 z-50 flex items-center justify-center gap-1.5 px-4 py-1.5",
        "bg-warning/15 text-warning-foreground border-b border-warning/30",
        "text-xs font-medium text-center select-none shadow-xs",
        "transition-transform duration-200 ease-[var(--ease-snappy)]",
        className
      )}
    >
      <WifiOff className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
      <span>Offline. Changes cannot be saved until connection is restored.</span>
    </div>
  );
}

export default OfflineBanner;
