"use client";

import * as React from "react";
import { format, addDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/components/ui/toast";
import { createMaintenanceBlockAction } from "@/actions/units";
import { CalendarX, Loader2, Wrench } from "lucide-react";

export interface UnitOption {
  id: string;
  name: string;
  category: string;
}

export interface MaintenanceBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: UnitOption[];
  preselectedUnitId?: string;
  onSuccess?: () => void;
}

export function MaintenanceBlockDialog({
  open,
  onOpenChange,
  units,
  preselectedUnitId,
  onSuccess,
}: MaintenanceBlockDialogProps) {
  const [selectedUnitId, setSelectedUnitId] = React.useState<string>(
    preselectedUnitId || (units[0]?.id ?? "")
  );

  // Initialize start at tomorrow 12:00 PM, end at day after tomorrow 11:00 AM
  const getInitialStart = () => {
    const d = addDays(new Date(), 1);
    d.setHours(12, 0, 0, 0);
    return format(d, "yyyy-MM-dd'T'HH:mm");
  };

  const getInitialEnd = () => {
    const d = addDays(new Date(), 2);
    d.setHours(11, 0, 0, 0);
    return format(d, "yyyy-MM-dd'T'HH:mm");
  };

  const [startDatetime, setStartDatetime] = React.useState(getInitialStart);
  const [endDatetime, setEndDatetime] = React.useState(getInitialEnd);
  const [notes, setNotes] = React.useState("");
  const [isPending, setIsPending] = React.useState(false);
  const [collisionError, setCollisionError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (preselectedUnitId) {
      setSelectedUnitId(preselectedUnitId);
    } else if (units.length > 0 && !selectedUnitId) {
      setSelectedUnitId(units[0].id);
    }
  }, [preselectedUnitId, units, selectedUnitId]);

  // Reset collision error on input change
  const handleStartChange = (val: string) => {
    setStartDatetime(val);
    setCollisionError(null);
  };

  const handleEndChange = (val: string) => {
    setEndDatetime(val);
    setCollisionError(null);
  };

  const handleUnitChange = (val: string) => {
    setSelectedUnitId(val);
    setCollisionError(null);
  };

  const selectedUnit = units.find((u) => u.id === selectedUnitId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCollisionError(null);

    if (!selectedUnitId) {
      toast.error("Please select a unit to block.");
      return;
    }

    const startDate = new Date(startDatetime);
    const endDate = new Date(endDatetime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      toast.error("Please enter valid dates.");
      return;
    }

    if (endDate <= startDate) {
      toast.error("End date/time must be strictly after start date/time.");
      return;
    }

    if (!notes.trim()) {
      toast.error("Please provide maintenance notes or reason.");
      return;
    }

    setIsPending(true);

    try {
      const res = await createMaintenanceBlockAction({
        unitId: selectedUnitId,
        startDatetime: startDate.toISOString(),
        endDatetime: endDate.toISOString(),
        notes: notes.trim(),
      });

      if (!res.success) {
        if (
          res.code === "UNIT_SCHEDULE_COLLISION" ||
          res.status === 409 ||
          res.error?.includes("reservations") ||
          res.error?.includes("collision")
        ) {
          const unitDisplayName = selectedUnit?.name || "Unit";
          setCollisionError(
            `Cannot block dates: ${unitDisplayName} already has active reservations during this time window. Please choose a different window or reschedule the existing guest.`
          );
        } else {
          toast.error(res.error || "Failed to create maintenance block");
        }
      } else {
        toast.success("Maintenance block created. Unit inventory reserved.");
        setNotes("");
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (err: any) {
      if (err?.code === "UNIT_SCHEDULE_COLLISION" || err?.status === 409) {
        setCollisionError(
          `Cannot block dates: ${selectedUnit?.name || "Unit"} already has active reservations during this time window.`
        );
      } else {
        toast.error(err?.message || "Internal error creating maintenance block");
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg p-6">
        <DialogHeader className="gap-2">
          <div className="flex items-center gap-3 text-primary">
            <div className="rounded-full bg-primary/10 p-2.5 ring-1 ring-primary/20">
              <Wrench className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                Add Maintenance Block
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Temporarily block unit availability for maintenance or repairs
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {collisionError && (
            <Alert variant="destructive" className="border-destructive/30 bg-destructive/10 text-destructive dark:bg-destructive/20">
              <CalendarX className="h-4 w-4" />
              <AlertTitle className="font-semibold text-xs tracking-wider uppercase">
                Scheduling Conflict
              </AlertTitle>
              <AlertDescription className="text-xs leading-relaxed mt-1">
                {collisionError}
              </AlertDescription>
            </Alert>
          )}

          {/* Unit selection */}
          <div className="space-y-1.5">
            <Label htmlFor="maintenance-unit" className="text-xs font-semibold">
              Target Unit
            </Label>
            {preselectedUnitId && selectedUnit ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30 text-sm">
                <span className="font-medium text-foreground">{selectedUnit.name}</span>
                <span className="text-xs text-muted-foreground font-mono uppercase px-2 py-0.5 rounded bg-muted">
                  {selectedUnit.category.replace("_", " ")}
                </span>
              </div>
            ) : (
              <select
                id="maintenance-unit"
                value={selectedUnitId}
                onChange={(e) => handleUnitChange(e.target.value)}
                disabled={isPending}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none [-webkit-appearance:none]"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.category.replace("_", " ")})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Start and End date time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="maintenance-start" className="text-xs font-semibold">
                Start Date & Time
              </Label>
              <Input
                id="maintenance-start"
                type="datetime-local"
                value={startDatetime}
                onChange={(e) => handleStartChange(e.target.value)}
                disabled={isPending}
                required
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maintenance-end" className="text-xs font-semibold">
                End Date & Time
              </Label>
              <Input
                id="maintenance-end"
                type="datetime-local"
                value={endDatetime}
                onChange={(e) => handleEndChange(e.target.value)}
                disabled={isPending}
                required
                className="text-xs font-mono"
              />
            </div>
          </div>

          {/* Notes / Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="maintenance-notes" className="text-xs font-semibold">
              Maintenance Reason / Notes
            </Label>
            <Textarea
              id="maintenance-notes"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setCollisionError(null);
              }}
              placeholder="e.g. Deep cleaning, AC repair, or private buyout…"
              disabled={isPending}
              rows={3}
              required
              className="text-sm resize-none text-base md:text-sm"
            />
          </div>

          <DialogFooter className="sm:justify-end gap-2 pt-2 border-t -mx-6 -mb-6 p-4 bg-muted/30 rounded-b-xl">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              loading={isPending}
              disabled={isPending || !notes.trim()}
              className="font-medium active:scale-[0.98] transition-transform select-none"
            >
              Confirm maintenance block
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
