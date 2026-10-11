"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { AlertTriangle, Calendar } from "lucide-react";

export interface ConflictingBooking {
  bookingUnitId?: string;
  bookingId: string;
  guestName: string;
  startDatetime: string | Date;
  endDatetime: string | Date;
  status: string;
}

export interface PreDeactivationGuardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitName: string;
  conflictingBookings: ConflictingBooking[];
}

export function PreDeactivationGuardDialog({
  open,
  onOpenChange,
  unitName,
  conflictingBookings,
}: PreDeactivationGuardDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="gap-2">
          <div className="flex items-center gap-3 text-amber-500 dark:text-amber-400">
            <div className="rounded-full bg-amber-500/10 p-2.5 ring-1 ring-amber-500/20">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                Cannot Deactivate {unitName}
              </DialogTitle>
              <div className="text-xs font-mono text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Pre-Deactivation Guard Trapped
              </div>
            </div>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed pt-1">
            This unit has{" "}
            <span className="font-semibold text-foreground font-mono">
              {conflictingBookings.length}
            </span>{" "}
            future active reservation(s) scheduled. The Pre-Deactivation Guard
            protects guests from arriving at an inactive or offline unit. You must
            reassign or cancel these reservations before deactivating this unit.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto my-3 border rounded-xl divide-y bg-muted/20">
          {conflictingBookings.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No specific booking details available.
            </div>
          ) : (
            conflictingBookings.map((b, idx) => {
              const startDate = new Date(b.startDatetime);
              const endDate = new Date(b.endDatetime);
              return (
                <div
                  key={b.bookingUnitId || `${b.bookingId}-${idx}`}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground">
                        {b.bookingId.startsWith("#") ? b.bookingId : `#${b.bookingId}`}
                      </span>
                      <span className="text-muted-foreground font-medium">
                        · {b.guestName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground font-mono">
                      <Calendar className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>
                        {format(startDate, "dd MMM yyyy, h:mm a")} →{" "}
                        {format(endDate, "dd MMM yyyy, h:mm a")}
                      </span>
                    </div>
                  </div>
                  <div>
                    <StatusBadge
                      status={b.status as any}
                      className="text-[10px] px-2 py-0.5"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="sm:justify-end gap-2 pt-2 border-t -mx-6 -mb-6 p-4 bg-muted/40 rounded-b-xl">
          <Button
            type="button"
            variant="default"
            className="w-full sm:w-auto font-medium"
            onClick={() => onOpenChange(false)}
          >
            Understood, Keep Unit Active
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
