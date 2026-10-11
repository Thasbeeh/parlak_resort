'use client';

import * as React from 'react';
import Link from 'next/link';
import { Phone, MessageCircle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { ZeroBalanceBadge } from '@/components/admin/bookings/ZeroBalanceBadge';
import { getWhatsAppUrl, type BookingRecordItem } from '@/lib/bookings-data';
import { cn } from '@/lib/utils';

export interface ResponsiveBookingsListProps {
  bookings: BookingRecordItem[];
  onManageFolio?: (bookingId: string) => void;
  className?: string;
}

function formatStayDates(start: Date | string, end: Date | string) {
  try {
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) {
      return { dateStr: '—', timeStr: '' };
    }
    const sDate = s.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
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

    if (sDate === eDate) {
      return { dateStr: sDate, timeStr: `${sTime} – ${eTime}` };
    }
    return { dateStr: `${sDate} → ${eDate}`, timeStr: `${sTime} → ${eTime}` };
  } catch {
    return { dateStr: '—', timeStr: '' };
  }
}

function formatStayTypeLabel(stayType: string): string {
  switch (stayType) {
    case 'OVERNIGHT':
      return 'Overnight stay';
    case 'DAY_SLOT':
      return 'Day slot (10A–3P)';
    case 'MORNING_SLOT':
      return 'Morning slot (10A–3P)';
    case 'EVENING_SLOT':
      return 'Evening slot (5P–10P)';
    default:
      return stayType;
  }
}

export function ResponsiveBookingsList({
  bookings = [],
  onManageFolio,
  className,
}: ResponsiveBookingsListProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. DESKTOP / TABLET VIEW (Rendered >= 768px: md:block)         */}
      {/* 7-column dense table grid (py-2.5 px-3, ~44px row height)     */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-subtle/70 text-xs font-semibold text-muted-foreground select-none">
              <th className="py-2.5 px-3 border-b border-border whitespace-nowrap">Booking ID</th>
              <th className="py-2.5 px-3 border-b border-border whitespace-nowrap">Guest details</th>
              <th className="py-2.5 px-3 border-b border-border whitespace-nowrap">Units & slot</th>
              <th className="py-2.5 px-3 border-b border-border whitespace-nowrap">Stay dates (IST)</th>
              <th className="py-2.5 px-3 text-right border-b border-border whitespace-nowrap">Rent / due</th>
              <th className="py-2.5 px-3 text-center border-b border-border whitespace-nowrap">Status</th>
              <th className="py-2.5 px-3 text-right border-b border-border whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-12 text-center text-xs text-muted-foreground"
                >
                  <p className="font-semibold text-foreground text-sm">No reservations found</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    No reservations matched the active status filter or search parameters.
                  </p>
                </td>
              </tr>
            ) : (
              bookings.map((b) => {
                const dates = formatStayDates(b.startDatetime, b.endDatetime);
                const displayId = b.bookingId || `#${b.id.slice(-6)}`;
                const safeUnits = b.units ?? [];

                return (
                  <tr
                    key={b.id}
                    className="hover:bg-muted/30 transition-colors duration-75 border-b border-border/60"
                  >
                    {/* 1. Booking ID */}
                    <td className="py-2.5 px-3 font-mono font-medium text-foreground">
                      {displayId}
                    </td>

                    {/* 2. Guest Details (with click-to-WhatsApp and click-to-call) */}
                    <td className="py-2.5 px-3 font-sans">
                      <div className="font-medium text-foreground">{b.guestName}</div>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                        <a
                          href={`tel:${b.guestPhone}`}
                          className="hover:underline hover:text-foreground"
                        >
                          {b.guestPhone}
                        </a>
                        <span className="text-muted-foreground/40">•</span>
                        <a
                          href={getWhatsAppUrl(b.guestPhone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </td>

                    {/* 3. Units & Slot */}
                    <td className="py-2.5 px-3 font-sans">
                      <div className="flex flex-wrap gap-1 items-center">
                        {safeUnits.map((u) => (
                          <Badge
                            key={u.id}
                            variant="outline"
                            className="px-1.5 py-0 text-[10px] font-medium"
                          >
                            {u.unit?.name ?? 'Unit'}
                            {u.isComplimentary && ' (Free)'}
                          </Badge>
                        ))}
                      </div>
                      <span className="block text-[10px] text-muted-foreground mt-0.5">
                        {formatStayTypeLabel(b.stayType)}
                      </span>
                    </td>

                    {/* 4. Stay Dates (IST) */}
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">
                      <div className="text-foreground">{dates.dateStr}</div>
                      <div className="text-[10px] text-muted-foreground/80">
                        {dates.timeStr}
                      </div>
                    </td>

                    {/* 5. Rent / Due */}
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      <div className="text-foreground font-medium">
                        ₹&nbsp;{Math.round(b.rentCharge ?? 0).toLocaleString('en-IN')}
                      </div>
                      <div className="mt-0.5">
                        <ZeroBalanceBadge balanceDue={b.balanceDue ?? 0} />
                      </div>
                    </td>

                    {/* 6. Status */}
                    <td className="py-2.5 px-3 text-center">
                      <StatusBadge status={b.status} />
                    </td>

                    {/* 7. Action */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/bookings/${b.id}/print`}
                          className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-surface-subtle transition-colors active:scale-95"
                          title="Print tax invoice / receipt"
                          aria-label={`Print invoice for ${b.bookingId || b.id}`}
                        >
                          <Printer className="size-3.5" />
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onManageFolio?.(b.bookingId || b.id)}
                          className="h-7 px-2.5 text-xs font-medium active:scale-[0.98] transition-transform select-none"
                        >
                          Manage
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. MOBILE VIEW (Rendered strictly < 768px: block md:hidden)   */}
      {/* Stacked tactile cards with 44x44px touch targets               */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 md:hidden">
        {bookings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground font-mono">
            No reservations found matching active filters.
          </div>
        ) : (
          bookings.map((b) => {
            const dates = formatStayDates(b.startDatetime, b.endDatetime);
            const displayId = b.bookingId || `#${b.id.slice(-6)}`;
            const safeUnits = b.units ?? [];

            return (
              <article
                key={b.id}
                className="rounded-lg border border-border bg-card p-3.5 shadow-xs flex flex-col gap-3"
              >
                {/* Header: ID + Status Pill */}
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {displayId}
                  </span>
                  <StatusBadge status={b.status} />
                </div>

                {/* Guest Details */}
                <div>
                  <h4 className="font-sans text-sm font-semibold text-foreground">
                    {b.guestName}
                  </h4>
                  <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                    {b.guestPhone}
                  </p>
                </div>

                {/* Thumb-Zone Click-to-Call & Click-to-WhatsApp (44px Minimum Tap Targets) */}
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${b.guestPhone}`}
                    className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-border bg-muted/40 text-xs font-mono font-medium text-foreground hover:bg-muted/70 active:scale-[0.98] transition-transform select-none"
                    aria-label={`Call ${b.guestName}`}
                  >
                    <Phone className="size-3.5 text-muted-foreground" />
                    <span>Call</span>
                  </a>
                  <a
                    href={getWhatsAppUrl(b.guestPhone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 text-xs font-mono font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 active:scale-[0.98] transition-transform select-none"
                    aria-label={`WhatsApp ${b.guestName}`}
                  >
                    <MessageCircle className="size-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>

                {/* Units & Slot Dates */}
                <div className="rounded bg-surface-subtle/60 p-2.5 text-xs flex flex-col gap-1.5 border border-border/50">
                  <div className="flex flex-wrap gap-1 items-center">
                    {safeUnits.map((u) => (
                      <Badge
                        key={u.id}
                        variant="outline"
                        className="px-1.5 py-0 text-[10px] font-medium"
                      >
                        {u.unit?.name ?? 'Unit'}
                        {u.isComplimentary && ' (Free)'}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    <div>{dates.dateStr}</div>
                    <div className="text-[10px] text-muted-foreground/80">{dates.timeStr}</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatStayTypeLabel(b.stayType)}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="block text-[10px] text-muted-foreground select-none">
                      Rent charge
                    </span>
                    <span className="font-mono text-xs font-medium tabular-nums text-foreground">
                      ₹&nbsp;{Math.round(b.rentCharge ?? 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] text-muted-foreground text-right select-none">
                      Balance
                    </span>
                    <ZeroBalanceBadge balanceDue={b.balanceDue ?? 0} />
                  </div>
                </div>

                {/* Full-Width Manage Folio Action Button (44px Minimum Tap Target) */}
                <Button
                  type="button"
                  variant="default"
                  onClick={() => onManageFolio?.(b.bookingId || b.id)}
                  className="w-full min-h-[44px] h-11 text-xs font-semibold active:scale-[0.98] transition-transform select-none shadow-xs"
                >
                  Manage Folio
                </Button>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ResponsiveBookingsList;
