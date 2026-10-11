"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CancellationModalProps {
  policyText?: string;
  trigger?: React.ReactNode;
  triggerClassName?: string;
}

export function CancellationModal({
  policyText,
  trigger,
  triggerClassName,
}: CancellationModalProps) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/90 underline underline-offset-4 active:scale-[0.98] transition-transform duration-100 ease-[var(--ease-snappy)] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs",
                triggerClassName
              )}
            >
              <FileText className="size-3.5 shrink-0" />
              <span>Read complete cancellation &amp; refund policy</span>
            </button>
          )
        }
      />

      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText className="size-4" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground font-sans">
              Cancellation &amp; refund policy
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Authoritative operating guidelines governing cancellations, scope reductions, and booking advances at Parlak Resort.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-xs leading-relaxed text-foreground/90 my-2 divide-y divide-border/60">
          {/* Dynamic database policy block if available */}
          {policyText && (
            <div className="pt-2 first:pt-0 pb-1">
              <div className="rounded-lg bg-surface-subtle border border-border/70 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <ShieldCheck className="size-3.5 shrink-0" />
                  <span>Resort cancellation directive</span>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed font-sans">
                  {policyText}
                </p>
              </div>
            </div>
          )}

          <div className="pt-3 first:pt-0 space-y-1.5">
            <h4 className="font-semibold text-foreground flex items-center gap-1.5">
              <span>1. Booking advance mandate</span>
            </h4>
            <p className="text-muted-foreground">
              Required booking advance payments are dynamically defined per Price List slab at the time of reservation, non-refundable, and credited directly towards the total rent of your stay or event. Security deposits are strictly not tracked or collected.
            </p>
          </div>

          <div className="pt-3 space-y-1.5">
            <h4 className="font-semibold text-foreground flex items-center gap-1.5">
              <span>2. Locked baseline scope &amp; tariffs</span>
            </h4>
            <p className="text-muted-foreground">
              Confirmed reservations permanently preserve their agreed baseline tariff. Subsequent tariff updates in the resort catalogue will not increase your confirmed contract rate.
            </p>
          </div>

          <div className="pt-3 space-y-1.5">
            <h4 className="font-semibold text-foreground flex items-center gap-1.5">
              <span>3. Flat baseline blocks &amp; partial scope reductions</span>
            </h4>
            <p className="text-muted-foreground">
              Standard preset packages (Overnight 12:00&nbsp;PM – 11:00&nbsp;AM, Day slots 10:00&nbsp;AM – 3:00&nbsp;PM, Event Hall slots) are billed as flat baseline blocks. Early checkouts or shortened fractional hours yield no rate deduction. Any reduction in scope (fewer nights, dropped slots, or lower headcount slabs) acts strictly as a Partial Cancellation with zero automated refunds, subject to manual administrative review.
            </p>
          </div>

          <div className="pt-3 space-y-1.5">
            <h4 className="font-semibold text-foreground flex items-center gap-1.5">
              <span>4. Stay extensions &amp; upgrades</span>
            </h4>
            <p className="text-muted-foreground">
              Stay extensions (extra nights, extra hours beyond preset blocks, added day slots) and event headcount increases into higher slabs evaluate against the active Price List in effect at the time of modification, charging only the incremental tariff difference between capacity tiers.
            </p>
          </div>

          <div className="pt-3 space-y-1.5">
            <h4 className="font-semibold text-foreground flex items-center gap-1.5">
              <span>5. Verified cancellations &amp; refund processing</span>
            </h4>
            <p className="text-muted-foreground">
              Cancellations must be requested directly via WhatsApp with your Booking ID prior to check-in. Custom refund amounts approved by management are processed manually via original payment channels and verified through the resort billing engine.
            </p>
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 pt-3 flex justify-end">
          <DialogClose
            render={
              <Button
                variant="outline"
                size="sm"
                className="active:scale-[0.98] transition-transform duration-100 ease-[var(--ease-snappy)] select-none"
              >
                Close
              </Button>
            }
          >
            Close
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CancellationModal;
