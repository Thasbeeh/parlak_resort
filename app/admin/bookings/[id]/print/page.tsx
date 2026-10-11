import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { getBookingReceiptData } from "@/actions/bookings";
import { getResortSettings } from "@/actions/settings";
import { PrintReceiptView } from "@/components/admin/bookings/PrintReceiptView";

export const dynamic = "force-dynamic";

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PrintPageProps): Promise<Metadata> {
  const { id } = await params;
  const res = await getBookingReceiptData(id);

  if (!res.success || !res.data) {
    return {
      title: "Print Receipt | Parlak Resort Admin",
      description: "Booking receipt view",
    };
  }

  return {
    title: `Tax Invoice ${res.data.displayId} | Parlak Resort`,
    description: `Tax invoice and printable billing folio for reservation ${res.data.displayId}`,
  };
}

export default async function BookingPrintPage({ params }: PrintPageProps) {
  const { id } = await params;

  const [receiptResult, settings] = await Promise.all([
    getBookingReceiptData(id),
    getResortSettings(),
  ]);

  if (!receiptResult.success || !receiptResult.data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <AlertCircle className="size-6" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Booking not found</h1>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          {receiptResult.error || `Unable to load reservation details for "${id}".`}
        </p>
        <div className="mt-6">
          <Link
            href="/admin/bookings"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/95 transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Return to bookings desk</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PrintReceiptView
      receiptData={receiptResult.data}
      settings={settings}
    />
  );
}
