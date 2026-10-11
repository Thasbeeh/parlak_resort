"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { dashboardRecordPaymentAction } from "@/actions/dashboard-actions";
import { IndianRupee, Loader2 } from "lucide-react";

export interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    bookingId: string;
    guestName: string;
    amountToPay: number;
    expectedUpdatedAt?: string;
  } | null;
  onSuccess: () => void;
}

function RecordPaymentForm({
  booking,
  onCancel,
  onSuccess,
}: {
  booking: NonNullable<RecordPaymentDialogProps["booking"]>;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = React.useState<number>(booking.amountToPay);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (amount <= 0) {
      setErrorMessage("Payment amount must be greater than ₹0.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await dashboardRecordPaymentAction({
        bookingId: booking.id,
        amount,
        expectedUpdatedAt: booking.expectedUpdatedAt || new Date().toISOString(),
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to record payment. Please try again.");
        return;
      }

      onSuccess();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while recording payment."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <IndianRupee className="size-4" />
          </div>
          <DialogTitle>Record payment</DialogTitle>
        </div>
        <DialogDescription>
          Record advance or balance payment for{" "}
          <strong className="text-foreground">{booking.guestName}</strong> (
          <span className="font-mono">{booking.bookingId}</span>).
        </DialogDescription>
      </DialogHeader>

      <div className="py-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground">
            Payment amount (₹)
          </label>
          <CurrencyInput
            value={amount}
            onChange={(val) => {
              setAmount(val);
              if (errorMessage) setErrorMessage(null);
            }}
            isError={!!errorMessage}
            autoFocus
          />
          <p className="text-[11px] font-mono tabular-nums text-muted-foreground">
            Outstanding balance: ₹{'\u00A0'}
            {booking.amountToPay.toLocaleString("en-IN")}
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
            {errorMessage}
          </div>
        )}
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="active:scale-[0.98] transition-transform duration-150 ease-[var(--ease-snappy)]"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={isSubmitting}
          disabled={isSubmitting || amount <= 0}
          className="active:scale-[0.98] transition-transform duration-150 ease-[var(--ease-snappy)] select-none"
        >
          {`Record ₹\u00A0${amount.toLocaleString("en-IN")}`}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  booking,
  onSuccess,
}: RecordPaymentDialogProps) {
  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <RecordPaymentForm
          key={`${booking.id}-${booking.amountToPay}`}
          booking={booking}
          onCancel={() => onOpenChange(false)}
          onSuccess={() => {
            onOpenChange(false);
            onSuccess();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export default RecordPaymentDialog;
