import * as React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getBookingsData } from '@/lib/bookings-data';
import { buttonVariants } from '@/components/ui/button';
import { BookingsDataTable } from '@/components/admin/bookings/BookingsDataTable';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Reservations & Bookings | Parlak Resort Admin',
  description: 'Manage confirmed reservations, check-ins, guest timelines, and folios',
};

export const dynamic = 'force-dynamic';

export default async function BookingsOverviewPage() {
  // RSC fetches initial data directly for instant SWR fallbackData (0ms initial load)
  const [initialData, unitsList] = await Promise.all([
    getBookingsData({ page: 1, limit: 20 }),
    prisma.unit.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        category: true,
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header Toolbar (Neutral Sans, Zero Boilerplate Subtitles) */}
      <div className="border-border/80 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground font-sans text-xl font-bold tracking-tight sm:text-2xl">
            Reservations & Bookings
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/bookings/new"
            className={cn(
              buttonVariants({ variant: 'default' }),
              'bg-primary text-primary-foreground hover:bg-primary/95 h-8 px-3 text-xs font-medium shadow-xs transition-transform duration-100 ease-[var(--ease-snappy)] select-none active:scale-[0.98]'
            )}
          >
            <Plus data-icon="inline-start" className="size-3.5" />
            <span>New reservation</span>
          </Link>
        </div>
      </div>

      {/* 2. Primary Bookings Cockpit (SWR-synced with Responsive List) */}
      <BookingsDataTable
        initialData={initialData}
        unitsList={unitsList}
      />
    </div>
  );
}
