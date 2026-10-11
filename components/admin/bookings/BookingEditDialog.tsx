'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CollisionAlert } from '@/components/admin/bookings/CollisionAlert';
import {
  ScopeRecalculationPrompt,
  type ScopeBreakdown,
} from '@/components/admin/bookings/ScopeRecalculationPrompt';
import { updateBookingAction } from '@/actions/bookings';
import type { BookingWithUnits } from '@/actions/bookings';
import {
  calculateNightsBetween,
  getISTDateString,
  getISTTimeString,
  createISTDateTime,
} from '@/lib/date-utils';
import { cn } from '@/lib/utils';

export interface BookingEditDialogProps {
  booking: BookingWithUnits | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  unitsList?: Array<{ id: string; name: string; category: string }>;
  onSuccess?: (updatedBooking: BookingWithUnits) => void;
  onConflictRefresh?: () => void;
}

export function BookingEditDialog({
  booking,
  isOpen,
  onOpenChange,
  unitsList = [],
  onSuccess,
  onConflictRefresh,
}: BookingEditDialogProps) {
  const router = useRouter();

  // Form state
  const [guestName, setGuestName] = React.useState('');
  const [guestPhone, setGuestPhone] = React.useState('');
  const [guestEmail, setGuestEmail] = React.useState('');
  const [notes, setNotes] = React.useState('');

  // Primary unit form state
  const [selectedUnitId, setSelectedUnitId] = React.useState('');
  const [startDateStr, setStartDateStr] = React.useState('');
  const [startTimeStr, setStartTimeStr] = React.useState('');
  const [endDateStr, setEndDateStr] = React.useState('');
  const [endTimeStr, setEndTimeStr] = React.useState('');
  const [adults, setAdults] = React.useState(2);
  const [infants, setInfants] = React.useState(0);
  const [headcount, setHeadcount] = React.useState(50);
  const [stayType, setStayType] = React.useState('OVERNIGHT');

  // Rent and Recalculation state
  const [originalRent, setOriginalRent] = React.useState(0);
  const [currentRentCharge, setCurrentRentCharge] = React.useState(0);
  const [recalculatedRent, setRecalculatedRent] = React.useState(0);
  const [incrementalCharge, setIncrementalCharge] = React.useState(0);
  const [scopeBreakdown, setScopeBreakdown] = React.useState<ScopeBreakdown | undefined>(undefined);
  const [showRecalcPrompt, setShowRecalcPrompt] = React.useState(false);

  // Status and error states
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [staleConflict, setStaleConflict] = React.useState<string | null>(null);
  const [collisionError, setCollisionError] = React.useState<{
    unitId?: string;
    unitName?: string;
    timeRange?: string;
    message?: string;
  } | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  // Initialize form when booking changes
  React.useEffect(() => {
    if (!booking) return;

    setGuestName(booking.guestName || '');
    setGuestPhone(booking.guestPhone || '');
    setGuestEmail(booking.guestEmail || '');
    setNotes(booking.notes || '');
    setOriginalRent(booking.rentCharge || 0);
    setCurrentRentCharge(booking.rentCharge || 0);
    setStaleConflict(null);
    setCollisionError(null);
    setValidationError(null);

    const primaryUnit = booking.units?.[0];
    if (primaryUnit) {
      setSelectedUnitId(primaryUnit.unitId);
      setStayType(primaryUnit.stayType || 'OVERNIGHT');
      setAdults(primaryUnit.adults ?? 2);
      setInfants(primaryUnit.infants ?? 0);
      setHeadcount(primaryUnit.headcount ?? 50);

      const start = new Date(primaryUnit.startDatetime);
      const end = new Date(primaryUnit.endDatetime);

      // Format ISO dates (YYYY-MM-DD) and times (HH:MM) strictly in Asia/Kolkata (IST)
      setStartDateStr(getISTDateString(start));
      setStartTimeStr(getISTTimeString(start));
      setEndDateStr(getISTDateString(end));
      setEndTimeStr(getISTTimeString(end));
    }
  }, [booking, isOpen]);

  // Recalculate scope changes dynamically whenever dates or occupancy change
  React.useEffect(() => {
    if (!booking || !booking.units?.[0]) return;

    const origUnit = booking.units[0];
    const origStart = new Date(origUnit.startDatetime);
    const origEnd = new Date(origUnit.endDatetime);
    const origNights = Math.max(1, calculateNightsBetween(origStart, origEnd));

    if (!startDateStr || !endDateStr) {
      setShowRecalcPrompt(false);
      return;
    }

    let newStart: Date;
    let newEnd: Date;
    try {
      newStart = createISTDateTime(startDateStr, startTimeStr || '12:00');
      newEnd = createISTDateTime(endDateStr, endTimeStr || '11:00');
    } catch {
      setShowRecalcPrompt(false);
      return;
    }

    if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime()) || newEnd <= newStart) {
      setShowRecalcPrompt(false);
      return;
    }

    const newNights = Math.max(1, calculateNightsBetween(newStart, newEnd));
    let extraNightsInc = 0;
    let extraHoursInc = 0;
    let headcountInc = 0;
    let unitSwapInc = 0;

    const baseUnitRate = origUnit.bookedBaseRate ?? origUnit.unitPrice ?? 4000;

    // Extra nights extension for overnight stays
    if (stayType === 'OVERNIGHT' && newNights > origNights) {
      const addedNights = newNights - origNights;
      extraNightsInc = addedNights * baseUnitRate;
    }

    // Extra hours extension for day slots
    if (stayType !== 'OVERNIGHT') {
      const origHours = (origEnd.getTime() - origStart.getTime()) / (1000 * 60 * 60);
      const newHours = (newEnd.getTime() - newStart.getTime()) / (1000 * 60 * 60);
      if (newHours > origHours) {
        const addedHours = Math.round(newHours - origHours);
        const hourlyRate = Math.round(baseUnitRate / Math.max(1, origHours));
        extraHoursInc = addedHours * hourlyRate;
      }
    }

    // Headcount upgrade floor check
    if (origUnit.headcount && headcount > origUnit.headcount) {
      headcountInc = (headcount - origUnit.headcount) * 150; // proportional slab increment
    }

    // Unit swap check
    if (selectedUnitId && selectedUnitId !== origUnit.unitId) {
      unitSwapInc = 1000; // incremental difference
    }

    const totalInc = extraNightsInc + extraHoursInc + headcountInc + unitSwapInc;

    if (totalInc > 0 || selectedUnitId !== origUnit.unitId || newNights !== origNights) {
      setIncrementalCharge(totalInc);
      setRecalculatedRent(booking.rentCharge + totalInc);
      setScopeBreakdown({
        extraNightsIncremental: extraNightsInc,
        extraHoursIncremental: extraHoursInc,
        headcountIncremental: headcountInc,
        unitSwapIncremental: unitSwapInc,
        originalUnitPrice: origUnit.unitPrice,
      });
      setShowRecalcPrompt(true);
    } else {
      setShowRecalcPrompt(false);
    }
  }, [
    startDateStr,
    startTimeStr,
    endDateStr,
    endTimeStr,
    headcount,
    adults,
    selectedUnitId,
    stayType,
    booking,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    setStaleConflict(null);
    setCollisionError(null);
    setValidationError(null);

    let start: Date;
    let end: Date;
    try {
      start = createISTDateTime(startDateStr, startTimeStr || '12:00');
      end = createISTDateTime(endDateStr, endTimeStr || '11:00');
    } catch {
      setValidationError('Please provide valid date and time values.');
      return;
    }

    if (end <= start) {
      setValidationError('Check-out datetime must be strictly after check-in datetime.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build units array while strictly preserving attached secondary units (e.g. resting Domes for Event Hall)
      const existingUnits = booking.units || [];
      const primaryUnit = existingUnits[0];

      const secondaryUnits = existingUnits.slice(1).map((sec) => ({
        id: sec.id,
        unitId: sec.unitId,
        startDatetime: start, // Automatically sync & mirror hours to attached Domes per event_hall.md
        endDatetime: end,
        stayType: sec.stayType,
        status: booking.status,
        unitPrice: sec.unitPrice,
        deposit: sec.deposit ?? 0,
        adults: sec.adults,
        infants: sec.infants,
        headcount: sec.headcount,
        notes: sec.notes,
        isComplimentary: sec.isComplimentary,
        bookedBaseRate: sec.bookedBaseRate ?? sec.unitPrice,
      }));

      const updatedUnitsPayload = [
        {
          id: primaryUnit?.id,
          unitId: selectedUnitId,
          startDatetime: start,
          endDatetime: end,
          stayType,
          status: booking.status,
          unitPrice:
            existingUnits.length > 1
              ? (primaryUnit?.unitPrice ?? 0)
              : currentRentCharge,
          deposit: primaryUnit?.deposit ?? 0,
          adults: stayType === 'OVERNIGHT' || stayType === 'DAY_SLOT' ? adults : null,
          infants: stayType === 'OVERNIGHT' || stayType === 'DAY_SLOT' ? infants : null,
          headcount: stayType === 'MORNING_SLOT' || stayType === 'EVENING_SLOT' ? headcount : null,
          notes: primaryUnit?.notes ?? null,
          isComplimentary: primaryUnit?.isComplimentary ?? false,
          bookedBaseRate: primaryUnit?.bookedBaseRate ?? primaryUnit?.unitPrice,
        },
        ...secondaryUnits,
      ];

      const res = await updateBookingAction({
        id: booking.id,
        guestName,
        guestPhone,
        guestEmail: guestEmail || null,
        notes: notes || null,
        rentCharge: currentRentCharge,
        totalPaid: booking.totalPaid,
        status: booking.status,
        units: updatedUnitsPayload,
        // CRITICAL OCC INVARIANT: Always submit expectedUpdatedAt
        expectedUpdatedAt: booking.updatedAt,
      });

      if (!res.success) {
        if (res.code === 'BOOKING_STALE_RECORD' || res.status === 409) {
          // OCC Conflict detected
          setStaleConflict(
            res.error ||
              'Conflict: This reservation was modified by another Admin. Please refresh to view current details.'
          );
        } else if (res.code === 'UNIT_SCHEDULE_COLLISION') {
          // Schedule collision detected
          setCollisionError({
            unitId: selectedUnitId,
            unitName: unitsList.find((u) => u.id === selectedUnitId)?.name || 'Selected Unit',
            timeRange: `${startDateStr} ${startTimeStr} – ${endDateStr} ${endTimeStr}`,
            message: res.error,
          });
        } else {
          setValidationError(res.error || 'Failed to update reservation');
        }
        return;
      }

      if (res.data) {
        onSuccess?.(res.data);
      }
      onOpenChange(false);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setValidationError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Defensively ensure primary unit is included in options even if not in active unitsList
  const availableUnits = React.useMemo(() => {
    const primary = booking?.units?.[0];
    if (primary?.unit && !unitsList.some((u) => u.id === primary.unitId)) {
      return [
        {
          id: primary.unitId,
          name: primary.unit.name,
          category: primary.unit.category,
        },
        ...unitsList,
      ];
    }
    return unitsList;
  }, [booking, unitsList]);

  const isRoom = stayType === 'OVERNIGHT' || stayType === 'DAY_SLOT';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit reservation #{booking?.bookingId?.replace('#', '')}</DialogTitle>
          <DialogDescription>
            Modify dates, time slots, guest details, or assign a different unit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* OCC Conflict Alert Banner */}
          {staleConflict && (
            <Alert variant="destructive" className="border-destructive/60 bg-destructive/10">
              <AlertCircle className="size-4" />
              <AlertTitle className="text-xs font-semibold">Reservation updated concurrently</AlertTitle>
              <AlertDescription className="text-xs flex flex-col gap-2 mt-1">
                <span>{staleConflict}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onConflictRefresh?.();
                    onOpenChange(false);
                  }}
                  className="w-fit h-7 px-2.5 text-xs active:scale-[0.98] select-none"
                >
                  <RefreshCw data-icon="inline-start" className="size-3" />
                  <span>Refresh reservation details</span>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Schedule Collision Alert */}
          {collisionError && (
            <CollisionAlert
              collision={{
                unitId: collisionError.unitId,
                unitName: collisionError.unitName,
                message: collisionError.message,
              }}
              onDismiss={() => setCollisionError(null)}
            />
          )}

          {/* General Validation Error */}
          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription className="text-xs">{validationError}</AlertDescription>
            </Alert>
          )}

          {/* 1. Guest Information (Clean Inputs, Top-Aligned Labels) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-border/60">
            <div className="space-y-1">
              <Label htmlFor="guestName" className="text-xs font-medium">
                Guest name
              </Label>
              <Input
                id="guestName"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
                className="h-8 text-base md:text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="guestPhone" className="text-xs font-medium">
                Phone number
              </Label>
              <Input
                id="guestPhone"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                required
                className="h-8 text-base md:text-xs font-mono"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="guestEmail" className="text-xs font-medium">
                Email (optional)
              </Label>
              <Input
                id="guestEmail"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="h-8 text-base md:text-xs"
              />
            </div>
          </div>

          {/* 2. Unit Selection & Stay Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-border/60">
            <div className="space-y-1">
              <Label htmlFor="unitSelect" className="text-xs font-medium">
                Assigned unit
              </Label>
              <select
                id="unitSelect"
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-base md:text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none [-webkit-appearance:none]"
              >
                {availableUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="stayType" className="text-xs font-medium">
                Stay type / Slot
              </Label>
              <select
                id="stayType"
                value={stayType}
                onChange={(e) => setStayType(e.target.value)}
                className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-base md:text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none [-webkit-appearance:none]"
              >
                <option value="OVERNIGHT">Overnight stay (12:00 PM – 11:00 AM)</option>
                <option value="DAY_SLOT">Day slot (10:00 AM – 3:00 PM)</option>
                <option value="MORNING_SLOT">Hall morning slot (10:00 AM – 3:00 PM)</option>
                <option value="EVENING_SLOT">Hall evening slot (5:00 PM – 10:00 PM)</option>
              </select>
            </div>
          </div>

          {/* 3. Dates & Timings */}
          <div className="grid grid-cols-2 gap-3 pb-3 border-b border-border/60">
            <div className="space-y-1">
              <Label htmlFor="startDate" className="text-xs font-medium">
                Check-in date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                required
                className="h-8 text-base md:text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="startTime" className="text-xs font-medium">
                Check-in time
              </Label>
              <Input
                id="startTime"
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                className="h-8 text-base md:text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="endDate" className="text-xs font-medium">
                Check-out date
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDateStr}
                onChange={(e) => setEndDateStr(e.target.value)}
                required
                className="h-8 text-base md:text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="endTime" className="text-xs font-medium">
                Check-out time
              </Label>
              <Input
                id="endTime"
                type="time"
                value={endTimeStr}
                onChange={(e) => setEndTimeStr(e.target.value)}
                className="h-8 text-base md:text-xs font-mono"
              />
            </div>
          </div>

          {/* 4. Occupancy Details */}
          {isRoom ? (
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-border/60">
              <div className="space-y-1">
                <Label htmlFor="adults" className="text-xs font-medium">
                  Adults (3+ yrs)
                </Label>
                <Input
                  id="adults"
                  type="number"
                  min="1"
                  max="5"
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value) || 1)}
                  className="h-8 text-base md:text-xs font-mono tabular-nums"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="infants" className="text-xs font-medium">
                  Infants (&lt;3 yrs)
                </Label>
                <Input
                  id="infants"
                  type="number"
                  min="0"
                  max="4"
                  value={infants}
                  onChange={(e) => setInfants(Number(e.target.value) || 0)}
                  className="h-8 text-base md:text-xs font-mono tabular-nums"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1 pb-3 border-b border-border/60">
              <Label htmlFor="headcount" className="text-xs font-medium">
                Attendee headcount (Pax)
              </Label>
              <Input
                id="headcount"
                type="number"
                min="1"
                max="1200"
                value={headcount}
                onChange={(e) => setHeadcount(Number(e.target.value) || 1)}
                className="h-8 text-base md:text-xs font-mono tabular-nums"
              />
            </div>
          )}

          {/* 5. Scope-Based Recalculation Prompt */}
          {showRecalcPrompt && (
            <ScopeRecalculationPrompt
              originalRent={originalRent}
              incrementalCharge={incrementalCharge}
              recalculatedRent={recalculatedRent}
              customRent={currentRentCharge}
              breakdown={scopeBreakdown}
              onApplyRecalculated={(amt) => setCurrentRentCharge(amt)}
              onKeepCustom={(amt) => setCurrentRentCharge(amt)}
              onCustomRentChange={(amt) => setCurrentRentCharge(amt)}
            />
          )}

          {/* 6. Rent Charge Summary */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-subtle/50 border border-border">
            <span className="text-xs font-medium text-muted-foreground">Total stay rent</span>
            <span className="font-mono text-sm font-bold tabular-nums text-foreground">
              ₹&nbsp;{Math.round(currentRentCharge).toLocaleString('en-IN')}
            </span>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose render={<Button type="button" variant="outline" size="sm" className="active:scale-[0.98] select-none" />}>
              Cancel
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              loading={isSubmitting}
              disabled={isSubmitting || !!staleConflict}
              className="active:scale-[0.98] transition-transform select-none"
            >
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
