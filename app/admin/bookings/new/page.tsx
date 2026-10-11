import * as React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { BookingCreationForm, UnitWithPriceList } from '@/components/admin/bookings/BookingCreationForm';
import { ArrowLeft, CalendarPlus, ShieldCheck, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'New Reservation Wizard | Parlak Resort Admin',
  description: 'Manual booking creation for WhatsApp reservations with live availability and GiST concurrency protection',
};

export const revalidate = 0;

export default async function NewBookingPage() {
  // Query all active units with full price lists, slabs, and active modifiers
  const units = await prisma.unit.findMany({
    where: { isActive: true },
    include: {
      priceList: {
        include: {
          slabs: {
            orderBy: [{ stayType: 'asc' }, { minHeadcount: 'asc' }],
          },
          modifiers: {
            where: { isActive: true },
            orderBy: { startDate: 'asc' },
          },
        },
      },
      photos: {
        orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
      },
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  const DOMAIN_CATEGORY_ORDER: Record<string, number> = {
    DOME: 1,
    A_FRAME: 2,
    NON_AC_HALL: 3,
    AC_HALL: 4,
  };

  units.sort((a, b) => {
    const catDiff =
      (DOMAIN_CATEGORY_ORDER[a.category] ?? 99) -
      (DOMAIN_CATEGORY_ORDER[b.category] ?? 99);
    if (catDiff !== 0) return catDiff;
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header / Breadcrumb navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/admin/bookings"
              className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Bookings</span>
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <CalendarPlus className="h-6 w-6 text-primary" />
            <span>New Reservation Cockpit</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Manual entry for WhatsApp bookings • Live schedule checks • GiST exclusion safety
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-lg border border-border">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>GiST Overlap Guard Active</span>
          </div>
        </div>
      </div>

      {/* Main Creation Form Wizard */}
      <BookingCreationForm units={units as unknown as UnitWithPriceList[]} />
    </div>
  );
}
