import { StayType } from '../../schemas/price.schema';

/**
 * Standard Timezone for Parlak Resort operations (UTC+5:30)
 */
export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Common shape for Price Modifiers (supports Prisma PriceModifier or Zod Input)
 */
export interface PriceModifierLike {
  id?: string;
  priceListId?: string;
  name: string;
  type: 'WEEKEND' | 'SEASONAL' | string;
  percentage: number;
  startDate: Date | string;
  endDate: Date | string;
  isActive: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/**
 * Result structure returned by resolveModifiers
 */
export interface ResolvedModifierResult {
  isWeekend: boolean;
  activeModifiers: PriceModifierLike[];
  appliedModifier: PriceModifierLike | null;
  effectivePercentage: number;
  breakdown: {
    matchingWeekendModifiers: PriceModifierLike[];
    matchingSeasonalModifiers: PriceModifierLike[];
    selectedType: 'WEEKEND' | 'SEASONAL' | 'NONE';
    overrideReason?: string;
  };
}

/**
 * Returns the YYYY-MM-DD date string in Asia/Kolkata (IST).
 */
export function getISTDateString(dateInput: Date | string | number): string {
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
 * Returns the day of the week in Asia/Kolkata (IST).
 * 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
 */
export function getISTDayOfWeek(dateInput: Date | string | number): number {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return -1;
  const dayStr = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TIMEZONE,
    weekday: 'short',
  }).format(date);

  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return dayMap[dayStr] ?? -1;
}

/**
 * Determines if a given date constitutes a Weekend in Asia/Kolkata (IST)
 * according to Parlak Resort domain rules:
 *
 * - OVERNIGHT stays (12:00 PM - 11:00 AM next day): Friday night (day 5) and
 *   Saturday night (day 6) trigger the WEEKEND modifier (standard leisure window).
 * - DAY_SLOT (10:00 AM - 3:00 PM): Saturday (day 6) and Sunday (day 0) daytime
 *   trigger the WEEKEND modifier.
 * - MORNING_SLOT & EVENING_SLOT: Saturday (day 6) and Sunday (day 0) daytime/evening
 *   trigger the WEEKEND modifier for both Event Hall slots.
 */
export function isWeekendIST(
  dateInput: Date | string | number,
  stayType: StayType = 'OVERNIGHT'
): boolean {
  const day = getISTDayOfWeek(dateInput);
  if (day === -1) return false;

  if (stayType === 'OVERNIGHT') {
    // Friday night and Saturday night
    return day === 5 || day === 6;
  }

  // DAY_SLOT, MORNING_SLOT, EVENING_SLOT: Saturday and Sunday
  return day === 0 || day === 6;
}

/**
 * Checks if a target date falls inside a modifier's [startDate, endDate] range in IST.
 * Evaluates both exact timestamp boundaries and full calendar day coverage in Asia/Kolkata.
 */
export function isDateInModifierRange(
  dateInput: Date | string | number,
  startDateInput: Date | string | number,
  endDateInput: Date | string | number
): boolean {
  const targetDate = new Date(dateInput);
  const startDate = new Date(startDateInput);
  const endDate = new Date(endDateInput);

  if (
    isNaN(targetDate.getTime()) ||
    isNaN(startDate.getTime()) ||
    isNaN(endDate.getTime())
  ) {
    return false;
  }

  // 1. Direct timestamp inclusion
  if (
    targetDate.getTime() >= startDate.getTime() &&
    targetDate.getTime() <= endDate.getTime()
  ) {
    return true;
  }

  // 2. Full-calendar-day comparison in Asia/Kolkata (IST)
  const targetDay = getISTDateString(targetDate);
  const startDay = getISTDateString(startDate);
  const endDay = getISTDateString(endDate);

  return targetDay >= startDay && targetDay <= endDay;
}

/**
 * Verifies if a single modifier is active and applicable on a given date and stay type.
 */
export function isModifierActiveOnDate(
  modifier: PriceModifierLike,
  dateInput: Date | string | number,
  stayType: StayType = 'OVERNIGHT'
): boolean {
  if (!modifier.isActive) return false;

  if (!isDateInModifierRange(dateInput, modifier.startDate, modifier.endDate)) {
    return false;
  }

  if (modifier.type === 'WEEKEND') {
    return isWeekendIST(dateInput, stayType);
  }

  return true;
}

/**
 * Resolves overlapping modifiers of the same type using Parlak Resort's
 * Algebraic Maximum rule: Math.max(mod1.percentage, mod2.percentage, ...)
 *
 * This intentionally favors resort revenue by applying smaller discounts and
 * higher surcharges:
 * - Two Hikes (+50% vs +20%): picks +50% (maximized revenue)
 * - Two Discounts (-10% vs -30%): picks -10% (minimizes loss)
 * - Hike vs Discount (+20% vs -10%): picks +20% (maximized revenue)
 */
export function resolveAlgebraicMaxModifier<T extends PriceModifierLike>(
  modifiers: T[]
): T | null {
  if (modifiers.length === 0) return null;
  if (modifiers.length === 1) return modifiers[0];

  return modifiers.reduce((maxMod, current) => {
    return current.percentage > maxMod.percentage ? current : maxMod;
  });
}

/**
 * Pure pricing function that:
 * 1. Takes a date and stayType, determines whether it's an IST weekend.
 * 2. Extracts active modifiers whose date range covers the date.
 * 3. Enforces the Overlap Hierarchy:
 *    - On weekend dates, Weekend Rate strictly overrides Seasonal Rate.
 *    - If multiple modifiers of the same type overlap, resolves them via Algebraic Max.
 *    - On weekdays, Weekend modifiers do NOT trigger; only Seasonal promotions apply.
 */
export function resolveModifiers(
  dateInput: Date | string | number,
  modifiers: PriceModifierLike[] = [],
  stayType: StayType = 'OVERNIGHT'
): ResolvedModifierResult {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    return {
      isWeekend: false,
      activeModifiers: [],
      appliedModifier: null,
      effectivePercentage: 0,
      breakdown: {
        matchingWeekendModifiers: [],
        matchingSeasonalModifiers: [],
        selectedType: 'NONE',
        overrideReason: 'Invalid date provided',
      },
    };
  }

  const isWeekend = isWeekendIST(date, stayType);

  // Extract all active modifiers whose date range covers the target date
  const activeModifiers = (modifiers || []).filter((mod) => {
    if (!mod || !mod.isActive) return false;
    return isDateInModifierRange(date, mod.startDate, mod.endDate);
  });

  const matchingWeekendModifiers = activeModifiers.filter(
    (m) => String(m.type).trim().toUpperCase() === 'WEEKEND'
  );
  const matchingSeasonalModifiers = activeModifiers.filter(
    (m) => String(m.type).trim().toUpperCase() === 'SEASONAL'
  );

  let appliedModifier: PriceModifierLike | null = null;
  let effectivePercentage = 0;
  let selectedType: 'WEEKEND' | 'SEASONAL' | 'NONE' = 'NONE';
  let overrideReason: string | undefined;

  if (isWeekend) {
    if (matchingWeekendModifiers.length > 0) {
      // Weekend modifiers strictly take precedence over Seasonal on weekends
      appliedModifier = resolveAlgebraicMaxModifier(matchingWeekendModifiers);
      effectivePercentage = appliedModifier?.percentage ?? 0;
      selectedType = 'WEEKEND';

      if (matchingSeasonalModifiers.length > 0) {
        overrideReason =
          'Weekend Rate strictly overrides Seasonal Promotion on weekend dates';
      }
    } else if (matchingSeasonalModifiers.length > 0) {
      // No weekend modifier active for this range, seasonal applies on weekend
      appliedModifier = resolveAlgebraicMaxModifier(matchingSeasonalModifiers);
      effectivePercentage = appliedModifier?.percentage ?? 0;
      selectedType = 'SEASONAL';
    }
  } else {
    // Weekday: Weekend modifiers do NOT apply; only Seasonal promotions apply
    if (matchingSeasonalModifiers.length > 0) {
      appliedModifier = resolveAlgebraicMaxModifier(matchingSeasonalModifiers);
      effectivePercentage = appliedModifier?.percentage ?? 0;
      selectedType = 'SEASONAL';
    }
  }

  return {
    isWeekend,
    activeModifiers,
    appliedModifier,
    effectivePercentage,
    breakdown: {
      matchingWeekendModifiers,
      matchingSeasonalModifiers,
      selectedType,
      overrideReason,
    },
  };
}

/**
 * Alias for resolveModifiers to provide backward/forward compatibility.
 */
export const resolveActiveModifiers = resolveModifiers;

/**
 * Calculates the modified unit price applying percentage variance.
 * Enforces domain invariants:
 * - Integer rounding (Math.round() to nearest Rupee).
 * - Price floor guard (cannot be negative).
 */
export function calculateModifiedPrice(
  basePrice: number,
  percentage: number
): number {
  if (basePrice <= 0) return 0;
  const multiplier = 1 + percentage / 100;
  return Math.max(0, Math.round(basePrice * multiplier));
}

/**
 * Calculates night-by-night rates for multi-night room stays.
 * Each individual night is priced independently based on its calendar date,
 * whether it qualifies as an IST weekend, and applicable active modifiers.
 */
export function calculateNightByNightStayRate(params: {
  checkInDate: Date | string;
  numberOfNights: number;
  basePricePerNight: number;
  modifiers: PriceModifierLike[];
  stayType?: StayType;
}): {
  totalStayRent: number;
  nightlyBreakdown: Array<{
    nightIndex: number;
    dateString: string;
    isWeekend: boolean;
    appliedModifier: PriceModifierLike | null;
    percentage: number;
    basePrice: number;
    finalPrice: number;
  }>;
} {
  const {
    checkInDate,
    numberOfNights,
    basePricePerNight,
    modifiers,
    stayType = 'OVERNIGHT',
  } = params;

  const start = new Date(checkInDate);
  if (isNaN(start.getTime()) || numberOfNights <= 0) {
    return {
      totalStayRent: 0,
      nightlyBreakdown: [],
    };
  }

  const nightlyBreakdown = [];
  let totalStayRent = 0;

  for (let i = 0; i < numberOfNights; i++) {
    const nightDate = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const resolution = resolveModifiers(nightDate, modifiers, stayType);
    const finalPrice = calculateModifiedPrice(
      basePricePerNight,
      resolution.effectivePercentage
    );

    totalStayRent += finalPrice;
    nightlyBreakdown.push({
      nightIndex: i + 1,
      dateString: getISTDateString(nightDate),
      isWeekend: resolution.isWeekend,
      appliedModifier: resolution.appliedModifier,
      percentage: resolution.effectivePercentage,
      basePrice: basePricePerNight,
      finalPrice,
    });
  }

  return {
    totalStayRent,
    nightlyBreakdown,
  };
}

/**
 * Shape representing a pricing slab (compatible with Prisma PriceSlab or Zod PriceSlabInput)
 */
export interface PriceSlabLike {
  id?: string;
  priceListId?: string;
  stayType: StayType | string;
  minHeadcount: number;
  maxHeadcount: number;
  basePrice: number;
  requiredDeposit: number;
}

/**
 * Resolves the applicable pricing slab for a given headcount and stayType.
 *
 * Enforces the domain Minimum Slab Floor Rule (event_hall.md):
 * "If the attendee headcount is below the lowest configured slab's minHeadcount
 * (e.g., 5 attendees when the lowest slab is 10–25 Pax), the system automatically
 * matches the lowest slab as the minimum baseline venue opening fee rather than returning an error."
 */
export function resolveSlabForHeadcount(
  slabs: PriceSlabLike[],
  headcount: number,
  stayType: StayType
): PriceSlabLike | null {
  if (isNaN(headcount) || headcount <= 0) {
    return null;
  }

  const matchingSlabs = slabs
    .filter((s) => s.stayType === stayType)
    .sort((a, b) => a.minHeadcount - b.minHeadcount);

  if (matchingSlabs.length === 0) return null;

  // Minimum Slab Floor Rule
  const lowestSlab = matchingSlabs[0];
  if (headcount < lowestSlab.minHeadcount) {
    return lowestSlab;
  }

  for (const slab of matchingSlabs) {
    if (headcount >= slab.minHeadcount && headcount <= slab.maxHeadcount) {
      return slab;
    }
  }

  // Headcount exceeds all configured slabs
  return null;
}

/**
 * Calculates the incremental charge for headcount upgrades using the domain
 * Apples-to-Apples Algebraic Floor formula (event_hall.md & parlak-domain):
 *
 * Incremental Charge = max(0, ActiveRate(New Higher Slab) - ActiveRate(Original Booked Capacity))
 *
 * Evaluated strictly against the active price list to prevent negative discounts
 * during tariff drops.
 */
export function calculateHeadcountExpansionIncrementalCharge(params: {
  activeSlabs: PriceSlabLike[];
  bookedMaxHeadcount: number;
  newHeadcount: number;
  stayType: StayType;
}): number {
  const { activeSlabs, bookedMaxHeadcount, newHeadcount, stayType } = params;

  // Within original booked capacity: no incremental charge
  if (newHeadcount <= bookedMaxHeadcount) {
    return 0;
  }

  const originalSlab = resolveSlabForHeadcount(
    activeSlabs,
    bookedMaxHeadcount,
    stayType
  );
  const newSlab = resolveSlabForHeadcount(
    activeSlabs,
    newHeadcount,
    stayType
  );

  // Grandfathering Orphaned Capacities Guardrail (event_hall.md lines 93-96):
  // "While date shifts are permitted, attempting to increase the headcount on this grandfathered booking
  // (e.g. 1000 to 1100 Pax) is mathematically blocked because no matching active slab exists."
  if (!newSlab || !originalSlab) {
    throw new Error(
      `Cannot increase headcount to ${newHeadcount}: Active price list has no matching slab for capacity expansion.`
    );
  }

  // Algebraic floor: max(0, newSlab - originalSlab)
  return Math.max(0, Math.round(newSlab.basePrice - originalSlab.basePrice));
}

/**
 * Verifies the domain checkout invariant (rooms.md & event_hall.md):
 * "A booking strictly cannot be marked as Checked-Out unless Final Balance Due == ₹0.
 * Enforces explicit integer rounding with an epsilon check (Math.abs(balance) < 1)."
 */
export function isZeroBalanceDue(
  rentCharge: number,
  lineItemsTotal: number,
  totalPaid: number
): boolean {
  const balance = Math.round(rentCharge + lineItemsTotal - totalPaid);
  return Math.abs(balance) < 1;
}

