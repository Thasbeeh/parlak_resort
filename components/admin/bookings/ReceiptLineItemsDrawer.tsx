'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Plus, Receipt, RefreshCw, Trash2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { addReceiptLineItemAction, removeReceiptLineItemAction } from '@/actions/bookings';
import type { BookingWithUnits } from '@/actions/bookings';
import type { ReceiptLineItem } from '@/schemas/booking.schema';
import { cn } from '@/lib/utils';

export interface ReceiptLineItemsDrawerProps {
  booking: BookingWithUnits | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updatedBooking: BookingWithUnits) => void;
  onConflictRefresh?: () => void;
}

export function ReceiptLineItemsDrawer({
  booking,
  isOpen,
  onOpenChange,
  onSuccess,
  onConflictRefresh,
}: ReceiptLineItemsDrawerProps) {
  const router = useRouter();

  // Form state
  const [description, setDescription] = React.useState('');
  const [amountStr, setAmountStr] = React.useState('');
  const [itemType, setItemType] = React.useState<'CHARGE' | 'WAIVER'>('CHARGE');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [deletingIndex, setDeletingIndex] = React.useState<number | null>(null);
  const [staleConflict, setStaleConflict] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Reset form when drawer opens
  React.useEffect(() => {
    if (isOpen) {
      setDescription('');
      setAmountStr('');
      setItemType('CHARGE');
      setDeletingIndex(null);
      setStaleConflict(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  const existingLineItems: ReceiptLineItem[] = React.useMemo(() => {
    if (!booking || !booking.receiptLineItems) return [];
    if (Array.isArray(booking.receiptLineItems)) {
      return booking.receiptLineItems as ReceiptLineItem[];
    }
    return [];
  }, [booking]);

  const totalLineItems = existingLineItems.reduce((sum, item) => sum + (item.amount || 0), 0);

  const handleDeleteItem = async (index: number) => {
    if (!booking) return;

    setDeletingIndex(index);
    setStaleConflict(null);
    setErrorMessage(null);

    try {
      const res = await removeReceiptLineItemAction({
        bookingId: booking.id,
        index,
        expectedUpdatedAt: booking.updatedAt,
      });

      if (!res.success) {
        if (res.code === 'BOOKING_STALE_RECORD' || res.status === 409) {
          setStaleConflict(
            res.error ||
              'Conflict: This reservation was modified by another Admin. Please refresh.'
          );
        } else {
          setErrorMessage(res.error || 'Failed to remove line item');
        }
        return;
      }

      if (res.data) {
        onSuccess?.(res.data);
      }
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Unexpected error removing line item');
    } finally {
      setDeletingIndex(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      setErrorMessage('Description is required');
      return;
    }

    const numAmount = Number(amountStr);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Amount must be a positive number');
      return;
    }

    // Waivers are stored as negative amounts
    const finalAmount = itemType === 'WAIVER' ? -Math.abs(numAmount) : Math.abs(numAmount);

    setIsSubmitting(true);
    setStaleConflict(null);
    setErrorMessage(null);

    try {
      const res = await addReceiptLineItemAction({
        bookingId: booking.id,
        description: trimmedDesc,
        amount: finalAmount,
        expectedUpdatedAt: booking.updatedAt,
      });

      if (!res.success) {
        if (res.code === 'BOOKING_STALE_RECORD' || res.status === 409) {
          setStaleConflict(
            res.error ||
              'Conflict: This reservation was modified by another Admin. Please refresh.'
          );
        } else {
          setErrorMessage(res.error || 'Failed to add line item');
        }
        return;
      }

      if (res.data) {
        onSuccess?.(res.data);
      }

      // Clear input fields for next entry
      setDescription('');
      setAmountStr('');
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Unexpected error adding line item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Receipt line items & waivers</SheetTitle>
          <SheetDescription>
            Add extra service charges or courtesy waivers for #{booking?.bookingId?.replace('#', '')}.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
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
                  <span>Refresh reservation</span>
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

          {/* Current Line Items Ledger */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span>Itemized ledger</span>
              <span className="font-mono tabular-nums text-muted-foreground">
                Net:&nbsp;
                <span
                  className={cn(
                    totalLineItems >= 0 ? 'text-foreground' : 'text-emerald-600 dark:text-emerald-400'
                  )}
                >
                  {totalLineItems >= 0 ? '+' : '–'}₹&nbsp;
                  {Math.abs(Math.round(totalLineItems)).toLocaleString('en-IN')}
                </span>
              </span>
            </div>

            <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
              {existingLineItems.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground font-mono">
                  No extra charges or adjustments added. Click below to add receipt items (food, activities, damages, or waivers).
                </div>
              ) : (
                existingLineItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="text-foreground truncate max-w-[180px]">
                      {item.description}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'font-mono font-medium tabular-nums',
                          item.amount >= 0
                            ? 'text-foreground'
                            : 'text-emerald-600 dark:text-emerald-400'
                        )}
                      >
                        {item.amount >= 0 ? '+' : '–'}₹&nbsp;
                        {Math.abs(Math.round(item.amount)).toLocaleString('en-IN')}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={deletingIndex === idx}
                        onClick={() => handleDeleteItem(idx)}
                        className="text-muted-foreground hover:text-destructive active:scale-95 transition-transform"
                        aria-label={`Remove ${item.description}`}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add New Line Item Form */}
          <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-3">
            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Plus className="size-3.5" />
              <span>Add line item</span>
            </div>

            {/* Type Toggle: Charge vs Waiver */}
            <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-background p-0.5">
              <button
                type="button"
                onClick={() => setItemType('CHARGE')}
                className={cn(
                  'h-7 rounded text-xs font-medium transition-colors select-none',
                  itemType === 'CHARGE'
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Charge (+)
              </button>
              <button
                type="button"
                onClick={() => setItemType('WAIVER')}
                className={cn(
                  'h-7 rounded text-xs font-medium transition-colors select-none',
                  itemType === 'WAIVER'
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Courtesy waiver (–)
              </button>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label htmlFor="itemDesc" className="text-xs font-medium">
                Description
              </Label>
              <Input
                id="itemDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={itemType === 'CHARGE' ? 'e.g. BBQ grill kit, extra bedding…' : 'e.g. Late checkout courtesy discount…'}
                className="h-8 text-base md:text-xs"
                required
              />
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <Label htmlFor="itemAmount" className="text-xs font-medium">
                Amount (INR)
              </Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">
                  ₹
                </span>
                <Input
                  id="itemAmount"
                  type="number"
                  min="1"
                  step="1"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0"
                  className="h-8 pl-6 font-mono text-base md:text-xs tabular-nums"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              size="sm"
              loading={isSubmitting}
              disabled={isSubmitting || !!staleConflict}
              className="w-full h-8 text-xs font-medium active:scale-[0.98] transition-transform select-none"
            >
              <Plus data-icon="inline-start" className="size-3.5" />
              <span>{itemType === 'CHARGE' ? 'Add charge' : 'Apply waiver'}</span>
            </Button>
          </form>
        </div>

        <SheetFooter>
          <SheetClose render={<Button type="button" variant="outline" size="sm" />}>
            Done
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
