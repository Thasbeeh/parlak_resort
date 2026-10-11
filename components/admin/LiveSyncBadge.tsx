"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface LiveSyncBadgeProps {
  className?: string;
  isSyncing?: boolean;
  lastSyncedAt?: Date | null;
}

export function LiveSyncBadge({
  className,
  isSyncing = false,
  lastSyncedAt,
}: LiveSyncBadgeProps) {
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

  if (!isOnline) {
    return (
      <div
        data-slot="live-sync-badge"
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-warning/40 bg-warning/10 text-[11px] font-mono text-warning font-medium select-none",
          className
        )}
      >
        <span className="size-1.5 rounded-full bg-amber-500" />
        <span>Offline</span>
      </div>
    );
  }

  return (
    <div
      data-slot="live-sync-badge"
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-medium select-none transition-colors duration-150",
        className
      )}
      title={
        lastSyncedAt
          ? `Last synced: ${lastSyncedAt.toLocaleTimeString()}`
          : "Live SWR Engine Active"
      }
    >
      <span className="relative flex size-1.5">
        {isSyncing && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
      </span>
      <span>{isSyncing ? "Syncing…" : "Live"}</span>
    </div>
  );
}

export default LiveSyncBadge;
