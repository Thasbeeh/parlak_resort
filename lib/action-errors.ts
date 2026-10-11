/**
 * Custom domain action error classes and database transaction options.
 * Defined in lib/ to ensure 'use server' action files only export async functions,
 * maintaining full compatibility with Next.js App Router client component boundaries.
 */

export const NEON_TRANSACTION_OPTIONS = {
  maxWait: 5000,
  timeout: 10000,
} as const;

export class UnitActionError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = 'UnitActionError';
  }
}

export class MediaActionError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = 'MediaActionError';
  }
}

export class PriceListActionError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = 'PriceListActionError';
  }
}

export class ModifierActionError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ModifierActionError';
  }
}

export class BookingActionError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = 'BookingActionError';
  }
}

export class UnitScheduleCollisionError extends BookingActionError {
  constructor(message: string, details?: unknown) {
    super(message, 'UNIT_SCHEDULE_COLLISION', 409, details);
    this.name = 'UNIT_SCHEDULE_COLLISION';
  }
}

/**
 * Helper to determine if an error represents a unit schedule collision.
 * Detects Prisma P2002 on BookingUnit / no_overlapping_unit_bookings,
 * PostgreSQL 23P01 (exclusion_violation), or constraint violation messages.
 */
export function isUnitScheduleCollision(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    if (err.code === 'P2002') {
      const targetStr = JSON.stringify(
        err.meta && typeof err.meta === 'object'
          ? (err.meta as Record<string, unknown>).target ?? ''
          : ''
      );
      const msg = String(err.message || '').toLowerCase();
      // If it's a bookingId collision on Booking table, that's not a unit schedule collision
      if (targetStr.includes('bookingId') || msg.includes('booking_bookingid_key')) {
        return false;
      }
      return true;
    }

    if (err.code === '23P01') {
      return true;
    }

    const msg = String(err.message || '').toLowerCase();
    if (
      msg.includes('no_overlapping_unit_bookings') ||
      msg.includes('23p01') ||
      msg.includes('exclusion_violation') ||
      msg.includes('violates exclusion constraint')
    ) {
      return true;
    }
  }

  return false;
}
