'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, CreditCard, LogOut, RefreshCw } from 'lucide-react';
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
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { checkoutBookingAction } from '@/actions/bookings';
import type { BookingWithUnits } from '@/actions/bookings';
import type { ReceiptLineItem } from '@/schemas/booking.schema';
import { cn } from '@/lib/utils';

export interface CheckoutDialogProps {
  booking: BookingWithUnits | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenPaymentModal?: () => void;
  onOpenAdjustCharges?: () => void;
  onSuccess?: (updatedBooking: BookingWithUnits) => void;
  onConflictRefresh?: () => void;
}

export function CheckoutDialog({
  booking,
  isOpen,
  onOpenChange,
  onOpenPaymentModal,
  onOpenAdjustCharges,
  onSuccess,
  onConflictRefresh,
}: CheckoutDialogProps) {
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCheckoutComplete, setIsCheckoutComplete] = React.useState(false);
  const [staleConflict, setStaleConflict] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Compute authoritative balance due
  const { lineItemsTotal, totalBilled, totalPaid, balanceDue, isZeroBalance } =
    React.useMemo(() => {
      if (!booking) {
        return {
          lineItemsTotal: 0,
          totalBilled: 0,
          totalPaid: 0,
          balanceDue: 0,
          isZeroBalance: false,
        };
      }

      const lineItems: ReceiptLineItem[] = Array.isArray(booking.receiptLineItems)
        ? (booking.receiptLineItems as ReceiptLineItem[])
        : [];
      const liTotal = lineItems.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0);
      const billed = Math.round((booking.rentCharge || 0) + liTotal);
      const paid = Math.round(booking.totalPaid || 0);
      const due = billed - paid;
      const isZero = Math.abs(due) < 1;

      return {
        lineItemsTotal: liTotal,
        totalBilled: billed,
        totalPaid: paid,
        balanceDue: due,
        isZeroBalance: isZero,
      };
    }, [booking]);

  React.useEffect(() => {
    if (isOpen) {
      setIsCheckoutComplete(false);
      setStaleConflict(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  const handleCheckout = async () => {
    if (!booking) return;

    if (!isZeroBalance) {
      setErrorMessage(
        `Cannot check out: Outstanding balance of ₹\u00A0${Math.abs(balanceDue).toLocaleString('en-IN')} must be collected or adjusted to ₹0 first.`
      );
      return;
    }

    setIsSubmitting(true);
    setStaleConflict(null);
    setErrorMessage(null);

    try {
      const res = await checkoutBookingAction({
        bookingId: booking.id,
        rentCharge: booking.rentCharge,
        totalPaid: booking.totalPaid,
        receiptLineItems: booking.receiptLineItems as ReceiptLineItem[] | null,
        // Strict OCC
        expectedUpdatedAt: booking.updatedAt,
      });

      if (!res.success) {
        if (res.code === 'BOOKING_STALE_RECORD' || res.status === 409) {
          setStaleConflict(
            res.error ||
              'Conflict: This reservation was modified by another Admin. Please refresh.'
          );
        } else {
          setErrorMessage(res.error || 'Failed to complete checkout');
        }
        return;
      }

      setIsCheckoutComplete(true);
      if (res.data) {
        onSuccess?.(res.data);
      }
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Unexpected error during check out');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete guest check-out</DialogTitle>
          <DialogDescription>
            Release assigned units and archive stay folio for reservation #{booking?.bookingId?.replace('#', '')}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
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

          {/* Checkout Completed Confirmation State */}
          {isCheckoutComplete ? (
            <div className="p-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                <span>Booking checked-out successfully</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Assigned units released and calendar locks cleared.
              </p>
              {booking && (
                <div className="pt-1">
                  <a
                    href={`/admin/bookings/${booking.id}/print`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md bg-foreground text-background text-xs font-semibold hover:bg-foreground/90 active:scale-[0.98] transition-transform select-none"
                  >
                    Print final receipt
                  </a>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* ZERO BALANCE DUE INVARIANT GUARD BANNER */}
              {!isZeroBalance ? (
                <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                  <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
                  <AlertTitle className="text-xs font-semibold">Outstanding balance due</AlertTitle>
                  <AlertDescription className="text-xs mt-1 space-y-2">
                    <p>
                      {balanceDue > 0
                        ? `Cannot check out: Outstanding balance of ₹\u00A0${Math.abs(balanceDue).toLocaleString('en-IN')} must be collected or adjusted to ₹0 first.`
                        : `Cannot check out: Folio has an excess payment of ₹\u00A0${Math.abs(balanceDue).toLocaleString('en-IN')}. Settle balance to ₹0 first.`}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {onOpenPaymentModal && balanceDue > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onOpenChange(false);
                            onOpenPaymentModal();
                          }}
                          className="h-7 px-2.5 text-xs font-medium border-amber-600/40 text-amber-950 dark:text-amber-100 hover:bg-amber-500/20 active:scale-[0.98] select-none"
                        >
                          <CreditCard data-icon="inline-start" className="size-3" />
                          <span>Record final payment (₹&nbsp;{Math.abs(balanceDue).toLocaleString('en-IN')})</span>
                        </Button>
                      )}
                      {onOpenAdjustCharges && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onOpenChange(false);
                            onOpenAdjustCharges();
                          }}
                          className="h-7 px-2.5 text-xs font-medium border-amber-600/40 text-amber-950 dark:text-amber-100 hover:bg-amber-500/20 active:scale-[0.98] select-none"
                        >
                          <span>Adjust charges / waivers</span>
                        </Button>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="text-xs">
                    <span className="font-semibold">Zero balance due verified.</span>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      All room rents and line items are fully settled.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Folio Financial Breakdown Ribbon */}
          <div className="rounded-lg border border-border bg-card divide-y divide-border/60 text-xs">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-muted-foreground">Stay rent charge</span>
              <span className="font-mono tabular-nums text-foreground">
                ₹&nbsp;{Math.round(booking?.rentCharge || 0).toLocaleString('en-IN')}
              </span>
            </div>

            {lineItemsTotal !== 0 && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-muted-foreground">Receipt line items / waivers</span>
                <span className="font-mono tabular-nums text-foreground">
                  {lineItemsTotal >= 0 ? '+' : '–'}₹&nbsp;
                  {Math.abs(Math.round(lineItemsTotal)).toLocaleString('en-IN')}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between px-3 py-2 font-medium">
              <span className="text-foreground">Total billed</span>
              <span className="font-mono tabular-nums text-foreground">
                ₹&nbsp;{totalBilled.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-muted-foreground">Total paid</span>
              <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                ₹&nbsp;{totalPaid.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex items-center justify-between px-3 py-2.5 bg-muted/30 font-bold">
              <span>Balance due</span>
              <span
                className={cn(
                  'font-mono tabular-nums',
                  isZeroBalance
                    ? 'text-foreground'
                    : 'text-amber-600 dark:text-amber-400 font-bold'
                )}
              >
                ₹&nbsp;{balanceDue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose render={<Button type="button" variant="outline" size="sm" />}>
            Close
          </DialogClose>
          <Button
            type="button"
            size="sm"
            loading={isSubmitting}
            disabled={!isZeroBalance || isSubmitting || !!staleConflict}
            onClick={handleCheckout}
            className="active:scale-[0.98] transition-transform select-none"
          >
            <LogOut data-icon="inline-start" className="size-3.5" />
            <span>Complete check-out</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
