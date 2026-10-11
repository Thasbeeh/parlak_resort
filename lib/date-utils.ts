/**
 * Parlak Resort - Timezone & Calendar Utilities
 * 
 * Standard Timezone: Asia/Kolkata (IST = UTC+5:30)
 * Single source of truth for strictly mapping standard booking presets
 * (OVERNIGHT, DAY_SLOT, MORNING_SLOT, EVENING_SLOT) into standard JavaScript
 * Date objects for PostgreSQL (@db.Timestamptz(3)).
 * 
 * 100% aligned with:
 * - docs/admin_panel/rooms.md
 * - docs/admin_panel/event_hall.md
 * - prisma/schema.prisma
 */

import { StayType } from '../schemas/price.schema';

export const IST_TIMEZONE = 'Asia/Kolkata';
export const IST_OFFSET_HOURS = 5.5;
export const IST_OFFSET_MINUTES = 330;
export const IST_TIMEZONE_OFFSET_STRING = '+05:30';

/**
 * Standard Presets according to Parlak Resort Domain Specification:
 * - OVERNIGHT: 12:00 PM Check-in to 11:00 AM Next-Day Check-out (Domes & A-Frames)
 * - DAY_SLOT: 10:00 AM to 3:00 PM (15:00) Same Day (Domes & A-Frames)
 * - MORNING_SLOT: 10:00 AM to 3:00 PM (15:00) Same Day (Event Halls)
 * - EVENING_SLOT: 5:00 PM (17:00) to 10:00 PM (22:00) Same Day (Event Halls)
 */
export const STANDARD_SLOT_TIMINGS = {
  OVERNIGHT: {
    checkInTime: '12:00',
    checkOutTime: '11:00',
    isNextDay: true,
    label: 'Overnight Stay (12:00 PM – 11:00 AM Next Day)',
  },
  DAY_SLOT: {
    checkInTime: '10:00',
    checkOutTime: '15:00',
    isNextDay: false,
    label: 'Day Slot (10:00 AM – 3:00 PM)',
  },
  MORNING_SLOT: {
    checkInTime: '10:00',
    checkOutTime: '15:00',
    isNextDay: false,
    label: 'Morning Slot (10:00 AM – 3:00 PM)',
  },
  EVENING_SLOT: {
    checkInTime: '17:00',
    checkOutTime: '22:00',
    isNextDay: false,
    label: 'Evening Slot (5:00 PM – 10:00 PM)',
  },
} as const;

export type StandardPresetType = keyof typeof STANDARD_SLOT_TIMINGS;

/**
 * Returns the YYYY-MM-DD calendar date string in Asia/Kolkata (IST).
 */
export function getISTDateString(dateInput: Date | string | number): string {
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Formats a calendar date in IST: "YYYY-MM-DD"
 */
export const formatISTDate = getISTDateString;

/**
 * Returns the 24-hour "HH:mm" time string in Asia/Kolkata (IST) for HTML5 time inputs.
 */
export function getISTTimeString(dateInput: Date | string | number): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/**
 * Adds an integer number of days to an IST calendar date string (YYYY-MM-DD).
 * Uses UTC date calculations to avoid local daylight saving or timezone anomalies.
 */
export function addDaysToISTDate(dateStr: string, days: number): string {
  const trimmed = String(dateStr || '').trim();
  if (!trimmed || !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error(`Invalid date string for addDaysToISTDate: "${dateStr}"`);
  }
  const [year, month, day] = trimmed.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day + days));
  const y = utcDate.getUTCFullYear();
  const m = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Creates a standard JavaScript Date object representing a specific time in Asia/Kolkata (IST).
 * 
 * E.g. date: "2026-10-10", time: "10:00" -> Date representing 2026-10-10T10:00:00+05:30 (2026-10-10T04:30:00.000Z)
 */
export function createISTDateTime(
  dateInput: Date | string | number,
  timeStr: string // "HH:mm" or "HH:mm:ss"
): Date {
  const dateStr = getISTDateString(dateInput);
  if (!dateStr) {
    throw new Error(`Invalid date input for IST datetime conversion: ${String(dateInput)}`);
  }
  const parts = String(timeStr || '').trim().split(':');
  const hours = String(parts[0] || '00').padStart(2, '0');
  const minutes = String(parts[1] || '00').padStart(2, '0');
  const seconds = String(parts[2] || '00').padStart(2, '0');

  const isoIST = `${dateStr}T${hours}:${minutes}:${seconds}${IST_TIMEZONE_OFFSET_STRING}`;
  const parsed = new Date(isoIST);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid time string "${timeStr}" for IST datetime creation`);
  }
  return parsed;
}

/**
 * Maps standard presets (MORNING_SLOT, EVENING_SLOT, DAY_SLOT, OVERNIGHT)
 * into standard JavaScript Date objects for PostgreSQL (@db.Timestamptz(3)).
 * 
 * - MORNING_SLOT: 10:00 to 15:00 IST on date (Same Day)
 * - EVENING_SLOT: 17:00 to 22:00 IST on date (Same Day)
 * - DAY_SLOT: 10:00 to 15:00 IST on date (Same Day)
 * - OVERNIGHT: 12:00 PM IST on check-in date to 11:00 AM IST on (check-in + numberOfNights) date
 */
export function mapPresetToDateRange(
  stayType: StayType | string,
  dateInput: Date | string | number,
  numberOfNights: number = 1
): { startDatetime: Date; endDatetime: Date } {
  const dateStr = getISTDateString(dateInput);
  if (!dateStr) {
    throw new Error(`Invalid date input for preset mapping: ${String(dateInput)}`);
  }

  switch (stayType) {
    case 'MORNING_SLOT': {
      const startDatetime = createISTDateTime(dateStr, STANDARD_SLOT_TIMINGS.MORNING_SLOT.checkInTime);
      const endDatetime = createISTDateTime(dateStr, STANDARD_SLOT_TIMINGS.MORNING_SLOT.checkOutTime);
      return { startDatetime, endDatetime };
    }
    case 'EVENING_SLOT': {
      const startDatetime = createISTDateTime(dateStr, STANDARD_SLOT_TIMINGS.EVENING_SLOT.checkInTime);
      const endDatetime = createISTDateTime(dateStr, STANDARD_SLOT_TIMINGS.EVENING_SLOT.checkOutTime);
      return { startDatetime, endDatetime };
    }
    case 'DAY_SLOT': {
      const startDatetime = createISTDateTime(dateStr, STANDARD_SLOT_TIMINGS.DAY_SLOT.checkInTime);
      const endDatetime = createISTDateTime(dateStr, STANDARD_SLOT_TIMINGS.DAY_SLOT.checkOutTime);
      return { startDatetime, endDatetime };
    }
    case 'OVERNIGHT': {
      const nights = Math.max(1, Math.floor(numberOfNights));
      const endDateStr = addDaysToISTDate(dateStr, nights);
      const startDatetime = createISTDateTime(dateStr, STANDARD_SLOT_TIMINGS.OVERNIGHT.checkInTime);
      const endDatetime = createISTDateTime(endDateStr, STANDARD_SLOT_TIMINGS.OVERNIGHT.checkOutTime);
      return { startDatetime, endDatetime };
    }
    default:
      throw new Error(`Unknown or unsupported stay type preset: "${stayType}"`);
  }
}

/**
 * Creates custom start and end datetimes for post-confirmation adjustments or flexible hours.
 * Supports customized check-in/out hours (e.g. 4:00 PM check-in or 9:00 AM checkout) to clear overlaps.
 * 
 * E.g. checkInDate: "2026-10-15", checkInTime: "16:00", checkOutTime: "09:00", numberOfNights: 1
 */
export function createCustomDateRange(
  checkInDate: Date | string | number,
  checkInTime: string,
  checkOutTime: string,
  numberOfNights: number = 0
): { startDatetime: Date; endDatetime: Date } {
  const dateStr = getISTDateString(checkInDate);
  if (!dateStr) {
    throw new Error(`Invalid date input for custom date range: ${String(checkInDate)}`);
  }
  const startDatetime = createISTDateTime(dateStr, checkInTime);
  const endDateStr =
    numberOfNights > 0 ? addDaysToISTDate(dateStr, numberOfNights) : dateStr;
  const endDatetime = createISTDateTime(endDateStr, checkOutTime);
  return { startDatetime, endDatetime };
}

/**
 * Verifies whether a given start and end datetime corresponds to a standard preset.
 */
export function isStandardPresetTiming(
  stayType: StayType | string,
  startDatetime: Date | string | number,
  endDatetime: Date | string | number
): boolean {
  try {
    const nights = calculateNightsBetween(startDatetime, endDatetime);
    const standard = mapPresetToDateRange(stayType, startDatetime, nights);
    const sActual = new Date(startDatetime).getTime();
    const eActual = new Date(endDatetime).getTime();
    return (
      sActual === standard.startDatetime.getTime() &&
      eActual === standard.endDatetime.getTime()
    );
  } catch {
    return false;
  }
}

/**
 * Alias for mapPresetToDateRange
 */
export const presetToDateRange = mapPresetToDateRange;
export const getPresetDateRange = mapPresetToDateRange;

/**
 * Calculates the number of overnight nights between two dates in IST.
 * For example:
 * Start: 2026-10-10 at 12:00 PM IST
 * End: 2026-10-12 at 11:00 AM IST
 * Returns: 2 nights.
 * 
 * Returns 0 if start and end fall on the same day or end <= start.
 */
export function calculateNightsBetween(
  startDatetime: Date | string | number,
  endDatetime: Date | string | number
): number {
  const start = new Date(startDatetime);
  const end = new Date(endDatetime);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return 0;
  }
  const startDateStr = getISTDateString(start);
  const endDateStr = getISTDateString(end);
  if (!startDateStr || !endDateStr) {
    return 0;
  }

  const [y1, m1, d1] = startDateStr.split('-').map(Number);
  const [y2, m2, d2] = endDateStr.split('-').map(Number);

  const startUtc = Date.UTC(y1, m1 - 1, d1);
  const endUtc = Date.UTC(y2, m2 - 1, d2);

  const diffDays = Math.round((endUtc - startUtc) / (24 * 60 * 60 * 1000));
  return Math.max(0, diffDays);
}

/**
 * Formats a Date into human-readable IST string.
 * Normalizes narrow no-break spaces (\u202f) for deterministic cross-platform output.
 * E.g. "15 Oct 2026, 10:00 am IST"
 */
export function formatISTDateTime(dateInput: Date | string | number): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  const formatted = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
  return formatted.replace(/\u202f/g, ' ') + ' IST';
}

/**
 * Formats a Date into time-only IST string: "10:00 am IST"
 * Normalizes narrow no-break spaces (\u202f).
 */
export function formatISTTime(dateInput: Date | string | number): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  const formatted = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
  return formatted.replace(/\u202f/g, ' ') + ' IST';
}

/**
 * Checks if two time windows overlap: (start1 < end2) && (end1 > start2)
 */
export function doTimeRangesOverlap(
  start1: Date | string | number,
  end1: Date | string | number,
  start2: Date | string | number,
  end2: Date | string | number
): boolean {
  const s1 = new Date(start1).getTime();
  const e1 = new Date(end1).getTime();
  const s2 = new Date(start2).getTime();
  const e2 = new Date(end2).getTime();
  if (isNaN(s1) || isNaN(e1) || isNaN(s2) || isNaN(e2)) {
    return false;
  }
  return s1 < e2 && e1 > s2;
}
