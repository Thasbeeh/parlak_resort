'use client';

import * as React from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CreditCard,
  Edit,
  LogIn,
  LogOut,
  MessageCircle,
  Phone,
  Plus,
  Receipt,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ZeroBalanceBadge } from '@/components/admin/bookings/ZeroBalanceBadge';
import { BookingEditDialog } from '@/components/admin/bookings/BookingEditDialog';
import { PaymentRecordDialog } from '@/components/admin/bookings/PaymentRecordDialog';
import { ReceiptLineItemsDrawer } from '@/components/admin/bookings/ReceiptLineItemsDrawer';
import { CheckoutDialog } from '@/components/admin/bookings/CheckoutDialog';
import { CancelBookingDialog } from '@/components/admin/bookings/CancelBookingDialog';
import {
  checkInBookingAction,
  getBookingById,
  type BookingWithUnits,
} from '@/actions/bookings';
import {
  calculateBookingBalanceDue,
  getWhatsAppUrl,
  type BookingRecordItem,
} from '@/lib/bookings-data';
import type { ReceiptLineItem } from '@/schemas/booking.schema';
import { cn } from '@/lib/utils';

export interface FolioDrawerProps {
  bookingId: string | null;
  initialBooking?: BookingWithUnits | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  unitsList?: Array<{ id: string; name: string; category: string }>;
  onBookingMutated?: (updated: BookingWithUnits) => void;
}

export function FolioDrawer({
  bookingId,
  initialBooking,
  isOpen,
  onOpenChange,
  unitsList = [],
  onBookingMutated,
}: FolioDrawerProps) {
  const router = useRouter();

  // State for sub-dialogs
  const [showEditDialog, setShowEditDialog] = React.useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = React.useState(false);
  const [showLineItemsDrawer, setShowLineItemsDrawer] = React.useState(false);
  const [showCheckoutDialog, setShowCheckoutDialog] = React.useState(false);
  const [showCancelDialog, setShowCancelDialog] = React.useState(false);

  // Status and error states
  const [isCheckingIn, setIsCheckingIn] = React.useState(false);
  const [staleConflict, setStaleConflict] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Fetch / sync single booking data via SWR
  const {
    data: activeBooking,
    mutate,
    isValidating,
  } = useSWR<BookingWithUnits | null>(
    isOpen && bookingId ? `booking-detail-${bookingId}` : null,
    async () => {
      if (!bookingId) return null;
      const res = await getBookingById(bookingId);
      if (res.success && res.data) {
        return res.data;
      }
      return initialBooking ?? null;
    },
    {
      fallbackData: initialBooking ?? undefined,
      revalidateOnFocus: true,
      dedupingInterval: 3000,
      keepPreviousData: true,
    }
  );

  const booking = activeBooking || initialBooking || null;

  // Clear errors when drawer opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setStaleConflict(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Balance Math
  const { lineItems, lineItemsTotal, totalBilled, totalPaid, balanceDue, isZeroBalance } =
    React.useMemo(() => {
      if (!booking) {
        return {
          lineItems: [],
          lineItemsTotal: 0,
          totalBilled: 0,
          totalPaid: 0,
          balanceDue: 0,
          isZeroBalance: false,
        };
      }
      const rawLineItems = Array.isArray(booking.receiptLineItems)
        ? (booking.receiptLineItems as ReceiptLineItem[])
        : [];
      const liSum = rawLineItems.reduce((acc, it) => acc + (Number(it?.amount) || 0), 0);
      const billed = Math.round((booking.rentCharge || 0) + liSum);
      const paid = Math.round(booking.totalPaid || 0);
      const due = billed - paid;

      return {
        lineItems: rawLineItems,
        lineItemsTotal: liSum,
        totalBilled: billed,
        totalPaid: paid,
        balanceDue: due,
        isZeroBalance: Math.abs(due) < 1,
      };
    }, [booking]);

  // Check-In Action with OCC
  const handleCheckIn = async () => {
    if (!booking) return;

    setIsCheckingIn(true);
    setStaleConflict(null);
    setErrorMessage(null);

    try {
      const res = await checkInBookingAction({
        bookingId: booking.id,
        expectedUpdatedAt: booking.updatedAt,
      });

      if (!res.success) {
        if (res.code === 'BOOKING_STALE_RECORD' || res.status === 409) {
          setStaleConflict(
            res.error ||
              'Conflict: This reservation was modified by another Admin. Please refresh.'
          );
        } else {
          setErrorMessage(res.error || 'Failed to check in guest');
        }
        return;
      }

      if (res.data) {
        mutate(res.data, false);
        onBookingMutated?.(res.data);
      }
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Unexpected check-in error');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleMutationSuccess = (updated: BookingWithUnits) => {
    mutate(updated, false);
    onBookingMutated?.(updated);
    router.refresh();
  };

  if (!booking) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{isValidating ? 'Loading folio…' : 'Reservation not found'}</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {isValidating
                ? 'Retrieving latest reservation and billing details…'
                : `Could not locate reservation records for ID: ${bookingId}`}
            </SheetDescription>
          </SheetHeader>
          <div className="p-5 text-xs text-muted-foreground font-mono">
            {isValidating ? (
              <div className="space-y-3">
                <div className="h-4 bg-muted/40 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-muted/40 rounded animate-pulse w-1/2" />
                <div className="h-16 bg-muted/30 rounded animate-pulse w-full mt-4" />
              </div>
            ) : (
              `Could not locate reservation records for ID: ${bookingId}`
            )}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const primaryUnit = booking?.units?.[0];
  const displayId = booking?.bookingId || (booking?.id ? `#${booking.id.slice(-6)}` : '—');
  const isCancelled = booking?.status === 'CANCELLED';
  const isCheckedOut = booking?.status === 'CHECKED_OUT';
  const isCheckedIn = booking?.status === 'CHECKED_IN';
  const isConfirmed = booking?.status === 'CONFIRMED';

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex flex-col p-0">
          {/* 1. Header Toolbar */}
          <SheetHeader className="px-5 pt-4 pb-3 bg-surface-subtle/30">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <SheetTitle className="font-mono text-base font-bold tabular-nums">
                  {displayId}
                </SheetTitle>
                {booking && <StatusBadge status={booking.status} />}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => mutate()}
                disabled={isValidating}
                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground active:scale-95"
                aria-label="Refresh folio"
              >
                <RefreshCw className={cn('size-3', isValidating && 'animate-spin')} />
                <span className="hidden sm:inline">Sync</span>
              </Button>
            </div>
            <SheetDescription className="text-xs text-muted-foreground">
              In-stay folio lifecycle, room charges, and checkout settlement.
            </SheetDescription>
          </SheetHeader>

          {/* 2. Main Scrollable Canvas */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Stale OCC Conflict Banner */}
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
                      mutate();
                      setStaleConflict(null);
                    }}
                    className="w-fit h-7 px-2.5 text-xs active:scale-[0.98] select-none"
                  >
                    <RefreshCw data-icon="inline-start" className="size-3" />
                    <span>Refresh now</span>
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* General Error Banner */}
            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* 3. Guest Profile */}
            <div className="space-y-1.5 pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  {booking?.guestName}
                </span>
                <div className="flex items-center gap-1.5">
                  {booking?.guestPhone && (
                    <>
                      <a
                        href={getWhatsAppUrl(
                          booking.guestPhone,
                          `Hello ${booking.guestName}, regarding reservation ${displayId} at Parlak Resort:`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center size-7 rounded-md border border-border bg-background hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors active:scale-95 select-none"
                        aria-label="WhatsApp guest"
                      >
                        <MessageCircle className="size-3.5" />
                      </a>
                      <a
                        href={`tel:${booking.guestPhone}`}
                        className="inline-flex items-center justify-center size-7 rounded-md border border-border bg-background hover:bg-accent transition-colors active:scale-95 select-none"
                        aria-label="Call guest"
                      >
                        <Phone className="size-3.5" />
                      </a>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                <span className="font-mono tabular-nums">{booking?.guestPhone}</span>
                {booking?.guestEmail && <span>{booking.guestEmail}</span>}
                {booking?.notes && (
                  <p className="mt-1 text-[11px] italic text-muted-foreground/90 border-t border-border/40 pt-1">
                    “{booking.notes}”
                  </p>
                )}
              </div>
            </div>

            {/* 4. Assigned Units & Stay Overview */}
            <div className="space-y-2 pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Assigned units
                </span>
                {!isCancelled && !isCheckedOut && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEditDialog(true)}
                    className="h-6 px-2 text-[11px] active:scale-[0.98] select-none"
                  >
                    <Edit data-icon="inline-start" className="size-3" />
                    <span>Edit stay</span>
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                {booking?.units?.map((u) => {
                  const s = new Date(u.startDatetime);
                  const e = new Date(u.endDatetime);
                  const sDate = s.toLocaleDateString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    day: '2-digit',
                    month: 'short',
                  });
                  const eDate = e.toLocaleDateString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });
                  const sTime = s.toLocaleTimeString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  });
                  const eTime = e.toLocaleTimeString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  });

                  return (
                    <div
                      key={u.id}
                      className="flex items-center justify-between text-xs p-2 rounded-md bg-surface-subtle/50 border border-border/60"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {u.unit?.name || 'Unit'}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {sDate} {sTime} → {eDate} {eTime}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-mono tabular-nums font-semibold text-foreground">
                          ₹&nbsp;{Math.round(u.unitPrice || 0).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {u.stayType.toLowerCase().replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. In-Stay Folio Ledger & Zero Balance Guard */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Billing folio
                </span>
                <ZeroBalanceBadge balanceDue={balanceDue} />
              </div>

              {/* Folio Ledger Lines */}
              <div className="rounded-md border border-border/70 divide-y divide-border/60 text-xs">
                {/* Stay Rent */}
                <div className="flex items-center justify-between px-3 py-2 bg-muted/10">
                  <span className="text-muted-foreground">Contracted stay rent</span>
                  <span className="font-mono tabular-nums text-foreground">
                    ₹&nbsp;{Math.round(booking?.rentCharge || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Receipt Line Items */}
                {lineItems.map((li, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-muted-foreground text-[11px] truncate max-w-[200px]">
                      {li.description}
                    </span>
                    <span
                      className={cn(
                        'font-mono tabular-nums text-[11px]',
                        li.amount >= 0 ? 'text-foreground' : 'text-emerald-600 dark:text-emerald-400'
                      )}
                    >
                      {li.amount >= 0 ? '+' : '–'}₹&nbsp;
                      {Math.abs(Math.round(li.amount)).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}

                {/* Total Billed */}
                <div className="flex items-center justify-between px-3 py-2 font-medium bg-muted/10">
                  <span className="text-foreground">Total billed</span>
                  <span className="font-mono tabular-nums text-foreground">
                    ₹&nbsp;{totalBilled.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Total Paid */}
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-muted-foreground">Total paid to date</span>
                  <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                    ₹&nbsp;{totalPaid.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Authoritative Balance Due */}
                <div className="flex items-center justify-between px-3 py-2.5 bg-muted/40 font-bold">
                  <span>Balance due</span>
                  <span
                    className={cn(
                      'font-mono tabular-nums text-sm',
                      isZeroBalance
                        ? 'text-foreground'
                        : 'text-amber-600 dark:text-amber-400 font-bold'
                    )}
                  >
                    ₹&nbsp;{balanceDue.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Folio Mutation Triggers */}
              {!isCancelled && !isCheckedOut && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLineItemsDrawer(true)}
                    className="h-8 text-xs active:scale-[0.98] select-none"
                  >
                    <Plus data-icon="inline-start" className="size-3" />
                    <span>Add item / waiver</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPaymentDialog(true)}
                    className="h-8 text-xs active:scale-[0.98] select-none"
                  >
                    <CreditCard data-icon="inline-start" className="size-3" />
                    <span>Record payment</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* 6. Action Footer & State Transitions */}
          <SheetFooter className="p-3 bg-card border-t border-border flex flex-col sm:flex-row gap-2">
            {/* Check-In Action (When CONFIRMED) */}
            {isConfirmed && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleCheckIn}
                disabled={isCheckingIn}
                className="w-full sm:w-auto h-8 text-xs font-semibold active:scale-[0.98] select-none"
              >
                <LogIn data-icon="inline-start" className="size-3.5" />
                <span>{isCheckingIn ? 'Checking in…' : 'Check-in guest'}</span>
              </Button>
            )}

            {/* Check-Out Guard Action (When CHECKED_IN) */}
            {isCheckedIn && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setShowCheckoutDialog(true)}
                className="w-full sm:w-auto h-8 text-xs font-semibold active:scale-[0.98] select-none"
              >
                <LogOut data-icon="inline-start" className="size-3.5" />
                <span>Check-out guest</span>
              </Button>
            )}

            {/* Cancel Booking Action (Destructive, when not cancelled or checked out) */}
            {!isCancelled && !isCheckedOut && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setShowCancelDialog(true)}
                className="w-full sm:w-auto h-8 text-xs active:scale-[0.98] select-none sm:ml-auto"
              >
                <XCircle data-icon="inline-start" className="size-3.5" />
                <span>Cancel</span>
              </Button>
            )}

            {/* Print Receipt Action */}
            {booking && (
              <a
                href={`/admin/bookings/${booking.id}/print`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-md border border-border bg-background text-xs font-medium hover:bg-muted active:scale-[0.98] transition-transform select-none"
              >
                <Receipt data-icon="inline-start" className="size-3.5 text-muted-foreground" />
                <span>Print receipt</span>
              </a>
            )}

            <SheetClose render={<Button type="button" variant="outline" size="sm" className="h-8 text-xs active:scale-[0.98] select-none" />}>
              Close
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* Compound Dialog Sub-Modals                                   */}
      {/* ──────────────────────────────────────────────────────────── */}
      {booking && (
        <>
          <BookingEditDialog
            booking={booking}
            isOpen={showEditDialog}
            onOpenChange={setShowEditDialog}
            unitsList={unitsList}
            onSuccess={handleMutationSuccess}
            onConflictRefresh={() => mutate()}
          />

          <PaymentRecordDialog
            booking={booking}
            isOpen={showPaymentDialog}
            onOpenChange={setShowPaymentDialog}
            balanceDue={balanceDue}
            onSuccess={handleMutationSuccess}
            onConflictRefresh={() => mutate()}
          />

          <ReceiptLineItemsDrawer
            booking={booking}
            isOpen={showLineItemsDrawer}
            onOpenChange={setShowLineItemsDrawer}
            onSuccess={handleMutationSuccess}
            onConflictRefresh={() => mutate()}
          />

          <CheckoutDialog
            booking={booking}
            isOpen={showCheckoutDialog}
            onOpenChange={setShowCheckoutDialog}
            onOpenPaymentModal={() => setShowPaymentDialog(true)}
            onOpenAdjustCharges={() => setShowLineItemsDrawer(true)}
            onSuccess={handleMutationSuccess}
            onConflictRefresh={() => mutate()}
          />

          <CancelBookingDialog
            booking={booking}
            isOpen={showCancelDialog}
            onOpenChange={setShowCancelDialog}
            onSuccess={handleMutationSuccess}
            onConflictRefresh={() => mutate()}
          />
        </>
      )}
    </>
  );
}

// Compound component pattern attachment matching admin-front-end-2.md §14
FolioDrawer.Summary = function FolioSummary({ booking }: { booking?: BookingWithUnits | null }) {
  if (!booking) return null;
  return (
    <div className="space-y-1 pb-3 border-b border-border/60">
      <div className="text-sm font-semibold text-foreground">{booking.guestName}</div>
      <div className="text-xs font-mono text-muted-foreground tabular-nums">{booking.guestPhone}</div>
    </div>
  );
};

FolioDrawer.UnitTariffTable = function FolioUnitTariffTable() {
  return null;
};

FolioDrawer.AddLineItemTool = function FolioAddLineItemTool() {
  return null;
};

FolioDrawer.PaymentLedger = function FolioPaymentLedger() {
  return null;
};

FolioDrawer.SettlementActions = function FolioSettlementActions() {
  return null;
};

export default FolioDrawer;
