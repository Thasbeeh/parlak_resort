'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, AlertTriangle, RefreshCw, XCircle } from 'lucide-react';
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
import { cancelBookingAction } from '@/actions/bookings';
import type { BookingWithUnits } from '@/actions/bookings';
import { cn } from '@/lib/utils';

export interface CancelBookingDialogProps {
  booking: BookingWithUnits | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updatedBooking: BookingWithUnits) => void;
  onConflictRefresh?: () => void;
}

export function CancelBookingDialog({
  booking,
  isOpen,
  onOpenChange,
  onSuccess,
  onConflictRefresh,
}: CancelBookingDialogProps) {
  const router = useRouter();

  const [cancelReason, setCancelReason] = React.useState('');
  const [refundAmountStr, setRefundAmountStr] = React.useState('0');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [staleConflict, setStaleConflict] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const totalPaid = Math.round(booking?.totalPaid || 0);

  // Check if booking has Hall units with attached Domes
  const hasHall = React.useMemo(() => {
    return (
      booking?.units?.some(
        (u) => u.unit?.category === 'NON_AC_HALL' || u.unit?.category === 'AC_HALL'
      ) ?? false
    );
  }, [booking]);

  React.useEffect(() => {
    if (isOpen) {
      setCancelReason('');
      setRefundAmountStr('0');
      setStaleConflict(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    const trimmedReason = cancelReason.trim();
    if (!trimmedReason) {
      setErrorMessage('Cancellation reason is required.');
      return;
    }

    const refundAmount = Number(refundAmountStr);
    if (isNaN(refundAmount) || refundAmount < 0) {
      setErrorMessage('Refund amount cannot be negative.');
      return;
    }

    if (refundAmount > totalPaid) {
      setErrorMessage(
        `Refund amount (₹\u00A0${refundAmount.toLocaleString('en-IN')}) cannot exceed total amount paid (₹\u00A0${totalPaid.toLocaleString('en-IN')}).`
      );
      return;
    }

    setIsSubmitting(true);
    setStaleConflict(null);
    setErrorMessage(null);

    try {
      const res = await cancelBookingAction({
        bookingId: booking.id,
        cancelReason: trimmedReason,
        refundAmount,
        totalPaid: booking.totalPaid,
        // Enforce OCC
        expectedUpdatedAt: booking.updatedAt,
      });

      if (!res.success) {
        if (res.code === 'BOOKING_STALE_RECORD' || res.status === 409) {
          setStaleConflict(
            res.error ||
              'Conflict: Another Admin updated this reservation. Please refresh to inspect.'
          );
        } else {
          setErrorMessage(res.error || 'Failed to cancel reservation');
        }
        return;
      }

      if (res.data) {
        onSuccess?.(res.data);
      }
      onOpenChange(false);
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Unexpected error during cancellation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="size-5" />
            <span>Cancel reservation #{booking?.bookingId?.replace('#', '')}</span>
          </DialogTitle>
          <DialogDescription>
            Release calendar dates, free room inventory, and record guest refund.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Stale OCC Conflict Alert */}
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
                  className="w-fit h-7 px-2.5 text-xs gap-1.5 active:scale-[0.98] select-none"
                >
                  <RefreshCw className="size-3" />
                  <span>Refresh reservation details</span>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Validation Error Banner */}
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Cascading Notice for Event Hall */}
          {hasHall && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
              <span className="font-semibold">Cascading release:</span> Cancelling this Event Hall booking will atomically cancel all attached resting Domes and release them back to public inventory.
            </div>
          )}

          {/* Payment & Refund Boundaries */}
          <div className="grid grid-cols-2 divide-x divide-border rounded-lg border border-border bg-surface-subtle/40 p-2.5">
            <div className="flex flex-col px-2">
              <span className="text-[11px] text-muted-foreground">Total paid to date</span>
              <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                ₹&nbsp;{totalPaid.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex flex-col px-2">
              <span className="text-[11px] text-muted-foreground">Net resort retention</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                ₹&nbsp;{Math.max(0, totalPaid - (Number(refundAmountStr) || 0)).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Refund Amount Input */}
          <div className="space-y-1">
            <Label htmlFor="refundAmount" className="text-xs font-medium">
              Refund amount (₹&nbsp;0 to ₹&nbsp;{totalPaid.toLocaleString('en-IN')})
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">
                ₹
              </span>
              <Input
                id="refundAmount"
                type="number"
                min="0"
                max={totalPaid}
                value={refundAmountStr}
                onChange={(e) => setRefundAmountStr(e.target.value)}
                className="h-9 pl-7 font-mono text-base md:text-xs tabular-nums"
                required
              />
            </div>
          </div>

          {/* Cancellation Reason Input */}
          <div className="space-y-1">
            <Label htmlFor="cancelReason" className="text-xs font-medium">
              Cancellation reason
            </Label>
            <Input
              id="cancelReason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Guest family emergency, weather rescheduling…"
              maxLength={255}
              className="h-9 text-base md:text-xs"
              required
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <DialogClose render={<Button type="button" variant="outline" size="sm" />}>
              Keep reservation
            </DialogClose>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              loading={isSubmitting}
              disabled={isSubmitting || !!staleConflict}
              className="active:scale-[0.98] transition-transform select-none"
            >
              <XCircle data-icon="inline-start" className="size-3.5" />
              <span>Confirm cancellation</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
