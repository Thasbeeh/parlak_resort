import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type BookingStatus =
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"
  | "MAINTENANCE_BLOCKED";

const statusStyles: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  CONFIRMED: {
    label: "Confirmed",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  CHECKED_IN: {
    label: "Checked In",
    className:
      "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
  },
  CHECKED_OUT: {
    label: "Checked Out",
    className:
      "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20",
  },
  CANCELLED: {
    label: "Cancelled",
    className:
      "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  },
  MAINTENANCE_BLOCKED: {
    label: "Maintenance",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: BookingStatus | string;
  className?: string;
}) {
  const config =
    statusStyles[status as BookingStatus] || {
      label: status,
      className: "bg-muted text-muted-foreground border-border",
    };

  return (
    <Badge
      data-slot="status-badge"
      variant="outline"
      className={cn(
        "px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide border uppercase select-none",
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}

export default StatusBadge;
