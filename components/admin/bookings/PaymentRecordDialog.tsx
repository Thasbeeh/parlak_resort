'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CreditCard, RefreshCw } from 'lucide-react';
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
import { recordPaymentAction } from '@/actions/bookings';
import type { BookingWithUnits } from '@/actions/bookings';
import { cn } from '@/lib/utils';

export interface PaymentRecordDialogProps {
  booking: BookingWithUnits | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  balanceDue?: number;
  onSuccess?: (updatedBooking: BookingWithUnits) => void;
  onConflictRefresh?: () => void;
}

export function PaymentRecordDialog({
  booking,
  isOpen,
  onOpenChange,
  balanceDue = 0,
  onSuccess,
  onConflictRefresh,
}: PaymentRecordDialogProps) {
  const router = useRouter();

  const [amount, setAmount] = React.useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [staleConflict, setStaleConflict] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Initialize payment amount default to remaining balance if > 0
  React.useEffect(() => {
    if (isOpen && booking) {
      setAmount(balanceDue > 0 ? balanceDue : '');
      setStaleConflict(null);
      setErrorMessage(null);
    }
  }, [isOpen, booking, balanceDue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMessage('Payment amount must be greater than ₹0');
      return;
    }

    setIsSubmitting(true);
    setStaleConflict(null);
    setErrorMessage(null);

    try {
      const res = await recordPaymentAction({
        bookingId: booking.id,
        amount: numAmount,
        // Enforce Multi-Admin OCC
        expectedUpdatedAt: booking.updatedAt,
      });

      if (!res.success) {
        if (res.code === 'BOOKING_STALE_RECORD' || res.status === 409) {
          setStaleConflict(
            res.error ||
              'Conflict: Another Admin recorded a payment or modified this reservation. Please refresh.'
          );
        } else {
          setErrorMessage(res.error || 'Failed to record payment');
        }
        return;
      }

      if (res.data) {
        onSuccess?.(res.data);
      }
      onOpenChange(false);
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Unexpected error recording payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const newBalance =
    balanceDue !== undefined && typeof amount === 'number'
      ? Math.round(balanceDue - amount)
      : balanceDue;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Record cash, UPI, or card payment towards reservation #{booking?.bookingId?.replace('#', '')}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Stale Record OCC Alert */}
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

          {/* Validation Error */}
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Financial Status Summary Strip */}
          <div className="grid grid-cols-2 divide-x divide-border rounded-lg border border-border bg-surface-subtle/40 p-2.5">
            <div className="flex flex-col px-2">
              <span className="text-[11px] text-muted-foreground">Current balance due</span>
              <span
                className={cn(
                  'font-mono text-sm font-bold tabular-nums',
                  balanceDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
                )}
              >
                ₹&nbsp;{Math.round(balanceDue).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex flex-col px-2">
              <span className="text-[11px] text-muted-foreground">Already paid</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                ₹&nbsp;{Math.round(booking?.totalPaid || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Payment Amount Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="paymentAmount" className="text-xs font-medium">
                Payment amount (INR)
              </Label>
              {balanceDue > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(balanceDue)}
                  className="text-[11px] text-primary hover:underline font-mono tabular-nums active:scale-95 transition-transform select-none cursor-pointer"
                >
                  Pay full balance (₹&nbsp;{Math.round(balanceDue).toLocaleString('en-IN')})
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">
                ₹
              </span>
              <Input
                id="paymentAmount"
                type="number"
                min="1"
                step="1"
                required
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))
                }
                placeholder="0"
                className="h-9 pl-7 font-mono text-base md:text-xs tabular-nums"
                autoFocus
              />
            </div>
          </div>

          {/* Projected Balance After Payment */}
          {typeof amount === 'number' && amount > 0 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/40 border border-border/60 text-xs">
              <span className="text-muted-foreground">
                {newBalance < 0 ? 'Excess payment after record:' : 'Balance after payment:'}
              </span>
              <span
                className={cn(
                  'font-mono font-semibold tabular-nums',
                  newBalance === 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : newBalance < 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-foreground'
                )}
              >
                {newBalance < 0 ? '–' : ''}₹&nbsp;{Math.abs(newBalance).toLocaleString('en-IN')}
              </span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <DialogClose render={<Button type="button" variant="outline" size="sm" />}>
              Cancel
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              loading={isSubmitting}
              disabled={isSubmitting || !!staleConflict}
              className="active:scale-[0.98] transition-transform select-none"
            >
              <CreditCard data-icon="inline-start" className="size-3.5" />
              <span>Record payment</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
