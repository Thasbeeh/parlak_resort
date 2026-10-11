'use client';

import * as React from 'react';
import { AlertCircle, CalendarX, ArrowRight, X, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface CollisionDetails {
  code?: string;
  unitId?: string;
  unitName?: string;
  bookingId?: string;
  message?: string;
  startDatetime?: string | Date;
  endDatetime?: string | Date;
  conflictingBookingId?: string;
  conflictingGuestName?: string;
}

interface CollisionAlertProps {
  collision: CollisionDetails | string | null;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Accessible inline collision alert banner (role="alert")
 * Catches UNIT_SCHEDULE_COLLISION (409) from PostgreSQL GiST exclusion constraint.
 * Features entrance deceleration (scale-96 to scale-100) and tactile UI feedback.
 */
export function CollisionAlert({
  collision,
  onDismiss,
  className,
}: CollisionAlertProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    if (collision) {
      // Trigger smooth entrance deceleration from scale-96 to scale-100
      const timer = requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => cancelAnimationFrame(timer);
    } else {
      setIsVisible(false);
    }
  }, [collision]);

  if (!collision) return null;

  const details: CollisionDetails =
    typeof collision === 'string'
      ? { message: collision }
      : collision;

  const unitName = details.unitName || 'Selected Unit';
  const message =
    details.message ||
    `Cannot save booking: ${unitName} is already booked during this time window.`;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'relative rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive-foreground shadow-md backdrop-blur-md transition-all duration-300 ease-out dark:border-destructive/50 dark:bg-destructive/15',
        isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-96 opacity-0 -translate-y-1',
        className
      )}
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/20 text-destructive shadow-sm">
          <CalendarX className="h-5 w-5" />
        </div>

        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold tracking-tight text-destructive flex items-center gap-1.5">
              <span>Schedule Collision Detected</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium border border-destructive/30">
                HTTP 409 • GiST Exclusion
              </span>
            </h4>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-destructive/15 focus:outline-none focus:ring-2 focus:ring-destructive/40"
                aria-label="Dismiss collision warning"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <p className="text-sm font-medium text-foreground leading-snug">
            {message}
          </p>

          {(details.conflictingBookingId || details.unitName) && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {details.unitName && (
                <div className="flex items-center gap-1 bg-background/80 px-2.5 py-1 rounded-md border border-border shadow-xs font-medium text-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                  Unit: {details.unitName}
                </div>
              )}

              {details.conflictingBookingId && (
                <div className="flex items-center gap-1 bg-background/80 px-2.5 py-1 rounded-md border border-border shadow-xs font-mono font-medium text-destructive">
                  Conflict: {details.conflictingBookingId}
                </div>
              )}

              {details.conflictingGuestName && (
                <div className="flex items-center gap-1 bg-background/80 px-2.5 py-1 rounded-md border border-border shadow-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  {details.conflictingGuestName}
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground pt-1">
            To resolve this collision, select an alternate available unit, adjust the dates/slot, or reassign conflicting guests.
          </p>
        </div>
      </div>
    </div>
  );
}
