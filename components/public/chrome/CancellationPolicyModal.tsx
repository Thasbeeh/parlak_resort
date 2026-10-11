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
import { FileText } from "lucide-react";

interface CancellationPolicyModalProps {
  triggerClassName?: string;
}

export function CancellationPolicyModal({
  triggerClassName,
}: CancellationPolicyModalProps) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className={
              triggerClassName ??
              "text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 active:scale-95 transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs"
            }
          />
        }
      >
        Cancellation &amp; Refund Policy
      </DialogTrigger>

      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText className="size-4" />
            </div>
            <DialogTitle className="text-lg font-bold">
              Cancellation &amp; Refund Policy
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Authoritative operating guidelines governing cancellations, scope reductions, and booking advances at Parlak Resort.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-xs leading-relaxed text-foreground/90 my-2 divide-y divide-border/60">
          <div className="pt-2 first:pt-0 space-y-1.5">
            <h4 className="font-semibold text-foreground flex items-center gap-1.5">
              <span>1. Booking Advance &amp; Deposit Mandate</span>
            </h4>
            <p className="text-muted-foreground">
              Required booking advance payments are dynamically defined per Price List slab at the time of reservation, non-refundable, and credited directly towards the total rent of your stay or event. Security deposits are strictly not tracked or collected.
            </p>
          </div>

          <div className="pt-3 space-y-1.5">
            <h4 className="font-semibold text-foreground flex items-center gap-1.5">
              <span>2. Locked Baseline Scope &amp; Tariffs</span>
            </h4>
            <p className="text-muted-foreground">
              Confirmed reservations permanently preserve their agreed baseline tariff. Subsequent tariff adjustments in the resort catalogue will not increase your confirmed contract rate.
            </p>
          </div>

          <div className="pt-3 space-y-1.5">
            <h4 className="font-semibold text-foreground flex items-center gap-1.5">
              <span>3. Flat Baseline Blocks &amp; Partial Scope Reductions</span>
            </h4>
            <p className="text-muted-foreground">
              Standard preset packages (Overnight 12:00 PM – 11:00 AM, Day Slots 10:00 AM – 3:00 PM, Event Hall slots) are billed as flat baseline blocks. Early checkouts or shortened fractional hours yield no rate deduction. Any reduction in scope (fewer nights, dropped slots, or lower headcount slabs) acts strictly as a Partial Cancellation with zero automated refunds, subject to manual administrative review.
            </p>
          </div>

          <div className="pt-3 space-y-1.5">
            <h4 className="font-semibold text-foreground flex items-center gap-1.5">
              <span>4. Stay Extensions &amp; Upgrades</span>
            </h4>
            <p className="text-muted-foreground">
              Stay extensions (extra nights, extra hours beyond preset blocks, added day slots) and event headcount increases into higher slabs evaluate against the active Price List in effect at the time of modification, charging only the incremental tariff difference between capacity tiers.
            </p>
          </div>

          <div className="pt-3 space-y-1.5">
            <h4 className="font-semibold text-foreground flex items-center gap-1.5">
              <span>5. Verified Cancellations &amp; Refund Processing</span>
            </h4>
            <p className="text-muted-foreground">
              Cancellations must be requested directly via WhatsApp with your Booking ID prior to check-in. Custom refund amounts approved by management are processed manually via original payment channels and verified automatically through the resort billing engine.
            </p>
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 pt-3 flex justify-end">
          <DialogClose render={<Button variant="outline" size="sm" className="active:scale-[0.98]" />}>
            Close
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CancellationPolicyModal;
