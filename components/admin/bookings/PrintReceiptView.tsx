"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Printer, FileText, ReceiptText } from "lucide-react";
import type { BookingReceiptData } from "@/actions/bookings";
import type { ResortProfileInput } from "@/schemas/settings.schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface PrintReceiptViewProps {
  receiptData: BookingReceiptData;
  settings: ResortProfileInput;
}

export function PrintReceiptView({ receiptData, settings }: PrintReceiptViewProps) {
  const { toast } = useToast();
  const [format, setFormat] = React.useState<"a4" | "thermal">("a4");
  const [isPrinting, setIsPrinting] = React.useState(false);

  const {
    booking,
    displayId,
    totalRent,
    lineItems,
    lineItemsTotal,
    totalBilled,
    totalPaid,
    balanceDue,
    isPaidInFull,
  } = receiptData;

  const handlePrint = () => {
    try {
      setIsPrinting(true);
      window.print();
    } catch {
      toast.error("Unable to trigger print dialog. Please use Ctrl+P / Cmd+P.");
    } finally {
      setIsPrinting(false);
    }
  };

  const formatDate = (dateInput?: Date | string | null) => {
    if (!dateInput) return "—";
    try {
      const d = new Date(dateInput);
      return d.toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(dateInput);
    }
  };

  const formatDateTime = (dateInput?: Date | string | null) => {
    if (!dateInput) return "—";
    try {
      const d = new Date(dateInput);
      const dateStr = d.toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const timeStr = d.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      return `${dateStr}, ${timeStr}`;
    } catch {
      return String(dateInput);
    }
  };

  const bookedUnitsNames =
    booking.units && booking.units.length > 0
      ? booking.units
          .map((u) => u.unit?.name || "Unit")
          .filter(Boolean)
          .join(", ")
      : "Assigned Inventory";

  const issueDateFormatted = formatDateTime(booking.createdAt || new Date());
  
  const primaryUnit = booking.units?.[0];
  const earliestCheckIn = booking.units?.reduce(
    (min, u) => (!min || new Date(u.startDatetime) < new Date(min) ? u.startDatetime : min),
    primaryUnit?.startDatetime
  );
  const latestCheckOut = booking.units?.reduce(
    (max, u) => (!max || new Date(u.endDatetime) > new Date(max) ? u.endDatetime : max),
    primaryUnit?.endDatetime
  );

  const checkInFormatted = formatDate(earliestCheckIn);
  const checkOutFormatted = formatDate(latestCheckOut);

  const totalAdults = booking.units?.reduce((sum, u) => sum + (u.adults || 0), 0) || 0;
  const totalInfants = booking.units?.reduce((sum, u) => sum + (u.infants || 0), 0) || 0;
  const totalHeadcount = booking.units?.reduce((sum, u) => sum + (u.headcount || 0), 0) || 0;
  const displayPax =
    totalAdults > 0
      ? `${totalAdults} Adult${totalAdults > 1 ? "s" : ""}${totalInfants > 0 ? `, ${totalInfants} Infant${totalInfants > 1 ? "s" : ""}` : ""}`
      : totalHeadcount > 0
        ? `${totalHeadcount} Pax`
        : "1 Pax";

  return (
    <div className="min-h-[100dvh] bg-surface-subtle/40 text-foreground pb-16">
      {/* Dynamic Native @page CSS injection based on active format */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: ${format === "thermal" ? "80mm auto" : "A4 portrait"};
                margin: ${format === "thermal" ? "2mm" : "12mm"};
              }
            }
          `,
        }}
      />

      {/* Screen Action Bar (Always hidden during native @media print) */}
      <div className="no-print sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/80 px-4 py-3 shadow-xs">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/bookings"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to bookings</span>
            </Link>
            <span className="text-border">|</span>
            <span className="font-mono text-xs font-semibold text-foreground">
              {displayId}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Switcher */}
            <div className="inline-flex items-center p-0.5 rounded-lg border border-border bg-surface-subtle text-xs">
              <button
                type="button"
                onClick={() => setFormat("a4")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer active:scale-[0.98] select-none",
                  format === "a4"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-pressed={format === "a4"}
              >
                <FileText className="size-3.5" />
                <span>A4 Tax Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat("thermal")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer active:scale-[0.98] select-none",
                  format === "thermal"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-pressed={format === "thermal"}
              >
                <ReceiptText className="size-3.5" />
                <span>80mm Thermal Receipt</span>
              </button>
            </div>

            {/* Print Trigger */}
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handlePrint}
              disabled={isPrinting}
              className="active:scale-[0.98] select-none gap-1.5"
            >
              <Printer className="size-3.5" />
              <span>Print document</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Printable Document Canvas */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        {format === "a4" ? (
          /* ========================================================
             A4 TAX INVOICE FORMAT
             ======================================================== */
          <div className="printable-receipt format-a4 relative bg-white text-black p-8 md:p-12 rounded-lg border border-border/80 shadow-xs print:shadow-none print:border-none print:p-0">
            {/* Watermark Stamp */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-10">
              {isPaidInFull ? (
                <div className="watermark-stamp rotate-[-14deg] border-[3px] border-emerald-700/80 text-emerald-800 text-3xl md:text-4xl font-extrabold uppercase tracking-widest px-8 py-3 rounded-lg shadow-xs opacity-80 print:opacity-90">
                  PAID IN FULL
                </div>
              ) : (
                <div className="watermark-stamp rotate-[-14deg] border-[3px] border-amber-700/80 text-amber-800 text-3xl md:text-4xl font-extrabold uppercase tracking-widest px-8 py-3 rounded-lg shadow-xs opacity-80 print:opacity-90">
                  ADVANCE RECEIPT
                </div>
              )}
            </div>

            {/* Resort Identity Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-black/20">
              <div className="space-y-1">
                <div className="inline-block text-xs font-semibold tracking-widest text-emerald-900 uppercase">
                  Sanctuary &bull; Retreat
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-black font-sans uppercase">
                  {settings.resortName || "PARLAK RESORT"}
                </h1>
                {settings.tagline && (
                  <p className="text-xs text-black/70 italic">{settings.tagline}</p>
                )}
                <p className="text-xs text-black/80 max-w-sm pt-1 leading-relaxed">
                  {settings.address}
                </p>
                <div className="text-xs text-black/80 font-mono tabular-nums pt-0.5">
                  <span>Ph:&nbsp;{settings.phone}</span>
                </div>
              </div>

              {/* Tax Invoice Identification */}
              <div className="text-left md:text-right space-y-1">
                <div className="inline-block px-2.5 py-0.5 rounded bg-black/5 border border-black/20 text-xs font-bold tracking-wider uppercase text-black font-mono">
                  Tax Invoice
                </div>
                <div className="pt-1">
                  <div className="text-xs text-black/60">Booking reference</div>
                  <div className="font-mono text-base font-bold text-black tracking-tight">
                    {displayId}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-black/60">Issue timestamp</div>
                  <div className="font-mono text-xs text-black tabular-nums">
                    {issueDateFormatted}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-black/60">Status</div>
                  <div className="font-mono text-xs font-semibold text-black uppercase">
                    {booking.status.replace("_", " ")}
                  </div>
                </div>
              </div>
            </div>

            {/* Guest & Stay Particulars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-black/20 text-xs">
              {/* Guest Information */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-black/50 uppercase tracking-wider">
                  Guest particulars
                </div>
                <div className="font-semibold text-sm text-black">
                  {booking.guestName}
                </div>
                <div className="font-mono tabular-nums text-black/80">
                  Ph:&nbsp;{booking.guestPhone}
                </div>
                {booking.guestEmail && (
                  <div className="text-black/80">{booking.guestEmail}</div>
                )}
              </div>

              {/* Stay Particulars */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-black/50 uppercase tracking-wider">
                  Stay & venue particulars
                </div>
                <div className="font-medium text-black">
                  Units:&nbsp;<span className="font-semibold">{bookedUnitsNames}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-black/80 font-mono tabular-nums">
                  <div>
                    <span className="text-black/60 block text-[10px] uppercase">Check-in</span>
                    <span>{checkInFormatted}</span>
                  </div>
                  <div>
                    <span className="text-black/60 block text-[10px] uppercase">Check-out</span>
                    <span>{checkOutFormatted}</span>
                  </div>
                </div>
                <div className="text-black/80 font-mono tabular-nums">
                  Occupancy:&nbsp;{displayPax}
                </div>
              </div>
            </div>

            {/* Itemized Charges & Line Items Table */}
            <div className="py-6 border-b border-black/20">
              <div className="text-[11px] font-semibold text-black/50 uppercase tracking-wider mb-2">
                Itemized billing ledger
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-black/30 font-semibold text-black">
                    <th className="py-2 px-1">Description</th>
                    <th className="py-2 px-1 text-center w-24">Type</th>
                    <th className="py-2 px-1 text-right w-32">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Baseline Stay Rent */}
                  <tr className="border-b border-black/10">
                    <td className="py-2.5 px-1 font-medium text-black">
                      Stay Rent &bull; {bookedUnitsNames}
                    </td>
                    <td className="py-2.5 px-1 text-center text-black/70 font-mono">
                      Accommodation
                    </td>
                    <td className="py-2.5 px-1 text-right font-mono tabular-nums font-semibold text-black">
                      ₹&nbsp;{totalRent.toLocaleString("en-IN")}
                    </td>
                  </tr>

                  {/* Extra Services / Waivers from JSONB */}
                  {lineItems.map((li, idx) => (
                    <tr key={idx} className="border-b border-black/10">
                      <td className="py-2.5 px-1 text-black">
                        {li.description}
                      </td>
                      <td className="py-2.5 px-1 text-center text-black/70 font-mono">
                        {li.amount < 0 ? "Courtesy Waiver" : "Service Charge"}
                      </td>
                      <td
                        className={cn(
                          "py-2.5 px-1 text-right font-mono tabular-nums font-semibold",
                          li.amount < 0 ? "text-emerald-700" : "text-black"
                        )}
                      >
                        {li.amount < 0 ? "–" : ""}₹&nbsp;
                        {Math.abs(li.amount).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Payments Summary & Settlement */}
            <div className="py-6 border-b border-black/20 flex flex-col md:flex-row justify-between gap-6">
              <div className="text-xs text-black/70 space-y-1.5 max-w-sm">
                <div className="font-semibold text-black">Settlement terms</div>
                <p className="leading-relaxed text-[11px]">
                  All tariffs represent agreed accommodation charges. Unsettled balance due must be paid at front desk checkout prior to key handover.
                </p>
                {booking.notes && (
                  <div className="font-mono text-[11px] pt-1">
                    Booking notes:&nbsp;{booking.notes}
                  </div>
                )}
              </div>

              {/* Totals Box */}
              <div className="w-full md:w-72 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between py-1 text-black/80">
                  <span>Baseline stay:</span>
                  <span className="tabular-nums">₹&nbsp;{totalRent.toLocaleString("en-IN")}</span>
                </div>
                {lineItems.length > 0 && (
                  <div className="flex justify-between py-1 text-black/80">
                    <span>Extra charges & waivers:</span>
                    <span className="tabular-nums">
                      {lineItemsTotal < 0 ? "–" : ""}₹&nbsp;
                      {Math.abs(lineItemsTotal).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-1.5 border-t border-black/20 font-bold text-black text-sm">
                  <span>Total billed:</span>
                  <span className="tabular-nums">₹&nbsp;{totalBilled.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-1 text-black/80">
                  <span>Total paid:</span>
                  <span className="tabular-nums">₹&nbsp;{totalPaid.toLocaleString("en-IN")}</span>
                </div>
                <div
                  className={cn(
                    "flex justify-between py-2 border-t-2 border-black font-extrabold text-sm",
                    isPaidInFull ? "text-black" : "text-amber-800"
                  )}
                >
                  <span>Balance due:</span>
                  <span className="tabular-nums">₹&nbsp;{balanceDue.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Signatures & Checkout Rules */}
            <div className="pt-8 space-y-8 text-xs">
              <div className="text-[11px] text-black/60 leading-relaxed">
                <strong>Resort check-out policy:</strong> Standard overnight checkout is{" "}
                {settings.overnightCheckOut || "11:00 AM IST"}. Room inspection completed. Keys returned to front desk.
              </div>

              <div className="grid grid-cols-2 gap-12 pt-6">
                <div className="space-y-1">
                  <div className="border-b border-black/40 h-8" />
                  <div className="text-[11px] font-semibold text-black/80">
                    Guest signature
                  </div>
                  <div className="text-[10px] text-black/50">
                    I confirm receipt of services and final settlement
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="border-b border-black/40 h-8" />
                  <div className="text-[11px] font-semibold text-black/80">
                    Authorized signatory / Duty manager
                  </div>
                  <div className="text-[10px] text-black/50">
                    Parlak Resort Desk Operations
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================
             80MM THERMAL RECEIPT FORMAT (POS Printer Optimized)
             ======================================================== */
          <div className="printable-receipt format-thermal bg-white text-black p-4 rounded-lg border border-border/80 shadow-xs max-w-[340px] mx-auto font-mono text-[11px] leading-tight print:shadow-none print:border-none print:p-0">
            {/* Header */}
            <div className="text-center space-y-0.5 pb-2">
              <div className="font-bold text-sm uppercase tracking-wider">
                {settings.resortName || "PARLAK RESORT"}
              </div>
              <div className="text-[10px] text-black/80">{settings.address}</div>
              <div className="text-[10px] text-black/80 tabular-nums">
                Ph:&nbsp;{settings.phone}
              </div>
            </div>

            <div className="border-t border-dashed border-black my-1" />

            {/* Receipt Identification */}
            <div className="space-y-0.5 py-1">
              <div className="flex justify-between">
                <span>RECEIPT:</span>
                <span className="font-bold">{displayId}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE:</span>
                <span className="tabular-nums">{issueDateFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span>STATUS:</span>
                <span className="font-semibold uppercase">
                  {booking.status.replace("_", " ")}
                </span>
              </div>
            </div>

            <div className="border-t border-dashed border-black my-1" />

            {/* Guest & Stay */}
            <div className="space-y-0.5 py-1">
              <div>
                GUEST:&nbsp;<span className="font-semibold">{booking.guestName}</span>
              </div>
              <div className="tabular-nums">PH:&nbsp;{booking.guestPhone}</div>
              <div>UNITS:&nbsp;{bookedUnitsNames}</div>
              <div className="tabular-nums">
                STAY:&nbsp;{checkInFormatted} to {checkOutFormatted}
              </div>
              <div className="tabular-nums">PAX:&nbsp;{displayPax}</div>
            </div>

            <div className="border-t border-dashed border-black my-1" />

            {/* Line Items */}
            <div className="py-1">
              <div className="flex justify-between font-bold pb-1 border-b border-black/20">
                <span>ITEM</span>
                <span>AMOUNT</span>
              </div>

              <div className="py-1 flex justify-between">
                <span>Stay Rent</span>
                <span className="tabular-nums">
                  ₹&nbsp;{totalRent.toLocaleString("en-IN")}
                </span>
              </div>

              {lineItems.map((li, idx) => (
                <div key={idx} className="py-0.5 flex justify-between">
                  <span className="truncate max-w-[180px]">{li.description}</span>
                  <span className="tabular-nums">
                    {li.amount < 0 ? "–" : ""}₹&nbsp;
                    {Math.abs(li.amount).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial Settlement */}
            <div className="receipt-total border-t border-black border-b-2 border-black my-1.5 py-1 space-y-0.5">
              <div className="flex justify-between font-bold">
                <span>TOTAL BILLED:</span>
                <span className="tabular-nums">
                  ₹&nbsp;{totalBilled.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>TOTAL PAID:</span>
                <span className="tabular-nums">
                  ₹&nbsp;{totalPaid.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between font-extrabold text-xs pt-0.5">
                <span>BALANCE DUE:</span>
                <span className="tabular-nums">
                  ₹&nbsp;{balanceDue.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Prominent Thermal Stamp */}
            <div className="text-center font-bold tracking-widest py-1.5 border-y border-dashed border-black my-2">
              *** {isPaidInFull ? "PAID IN FULL" : "ADVANCE RECEIPT"} ***
            </div>

            {/* Footer Signatures */}
            <div className="text-center text-[10px] space-y-3 pt-2">
              <div>Thank you for staying at Parlak Resort!</div>
              <div className="pt-4 border-t border-dashed border-black/40">
                Guest Signature: __________________
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PrintReceiptView;
