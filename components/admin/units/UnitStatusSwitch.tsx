"use client";

import * as React from "react";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toggleUnitStatus } from "@/actions/units";
import { toast } from "@/components/ui/toast";
import {
  PreDeactivationGuardDialog,
  ConflictingBooking,
} from "./PreDeactivationGuardDialog";
import { cn } from "@/lib/utils";

export interface UnitStatusSwitchProps {
  unitId: string;
  unitName: string;
  initialActive: boolean;
  expectedUpdatedAt?: Date | string;
  disabled?: boolean;
  disabledReason?: string;
  statusLabel?: string;
  onStatusChange?: (newStatus: boolean) => void;
  className?: string;
}

export function UnitStatusSwitch({
  unitId,
  unitName,
  initialActive,
  expectedUpdatedAt,
  disabled = false,
  disabledReason,
  statusLabel,
  onStatusChange,
  className,
}: UnitStatusSwitchProps) {
  const [isActive, setIsActive] = React.useState(initialActive);
  const [isPending, setIsPending] = React.useState(false);
  const [guardDialogOpen, setGuardDialogOpen] = React.useState(false);
  const [conflictingBookings, setConflictingBookings] = React.useState<
    ConflictingBooking[]
  >([]);

  // Synchronize state if parent initialActive changes
  React.useEffect(() => {
    setIsActive(initialActive);
  }, [initialActive]);

  const handleToggle = async (nextChecked: boolean) => {
    if (disabled || isPending) return;

    // Optimistically update
    setIsActive(nextChecked);
    setIsPending(true);

    try {
      const res = await toggleUnitStatus({
        unitId,
        isActive: nextChecked,
        expectedUpdatedAt: expectedUpdatedAt ? new Date(expectedUpdatedAt) : undefined,
      });

      if (!res.success) {
        // Revert switch to previous state
        setIsActive(!nextChecked);

        if (res.code === "UNIT_HAS_FUTURE_BOOKINGS") {
          const details = (res.data as any)?.bookings || [];
          setConflictingBookings(details);
          setGuardDialogOpen(true);
        } else {
          toast.error(res.error || "Failed to update unit status");
        }
      } else {
        toast.success(
          `${unitName} is now ${nextChecked ? "Active" : "Inactive (Marked Sold Out on website)"}.`
        );
        onStatusChange?.(nextChecked);
      }
    } catch (err: any) {
      setIsActive(!nextChecked);
      if (err?.code === "UNIT_HAS_FUTURE_BOOKINGS") {
        setConflictingBookings(err?.details?.bookings || []);
        setGuardDialogOpen(true);
      } else {
        toast.error(err?.message || "Internal error toggling unit status");
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <div className={cn("inline-flex items-center gap-2", className)}>
        <div className="relative inline-flex items-center">
          <Switch
            size="sm"
            checked={isActive}
            onCheckedChange={handleToggle}
            disabled={disabled || isPending}
            title={disabled && disabledReason ? disabledReason : undefined}
            aria-label={`Toggle active status for ${unitName}`}
          />
          {isPending && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-full pointer-events-none">
              <Loader2 className="h-3 w-3 animate-spin text-foreground" />
            </div>
          )}
        </div>
        <span
          className={cn(
            "text-xs font-medium select-none whitespace-nowrap",
            isActive
              ? "text-emerald-700 dark:text-emerald-400 font-semibold"
              : "text-muted-foreground",
            disabled && "opacity-60"
          )}
        >
          {statusLabel ?? (isActive ? "Active" : "Inactive")}
        </span>
      </div>

      <PreDeactivationGuardDialog
        open={guardDialogOpen}
        onOpenChange={setGuardDialogOpen}
        unitName={unitName}
        conflictingBookings={conflictingBookings}
      />
    </>
  );
}
