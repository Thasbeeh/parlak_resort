/**
 * Parlak Resort - Scope-Based Rent Recalculation Engine
 *
 * Implements post-confirmation scope modifications and hybrid tariff recalculation:
 * 1. Baseline Scope Preservation: Original contracted stay (nights & slot hours)
 *    is permanently locked to snapshot tariff (BookingUnit.bookedBaseRate).
 * 2. Incremental Scope Expansion (New Active Tariff Rule):
 *    - Extra Nights: Evaluated night-by-night against the current active Price List.
 *    - Extra Hours: Billed at the new active hourly tariff beyond standard slots.
 *    - Headcount Slab Expansion: Evaluated with the Apples-to-Apples Algebraic Floor:
 *      max(0, ActiveRate(New Higher Slab) - ActiveRate(Original Booked Capacity)).
 * 3. Scope Reductions (Partial Cancellations):
 *    - Shortened fractional hours within flat blocks do not reduce rent.
 *    - Dropped nights/slots act strictly as partial cancellations (no automated refunds).
 *
 * 100% aligned with:
 * - parlak-domain (SKILL.md)
 * - docs/admin_panel/rooms.md
 * - docs/admin_panel/event_hall.md
 */

import { StayType } from '../schemas/price.schema';
import {
  calculateNightsBetween,
  getISTDateString,
  isStandardPresetTiming,
  mapPresetToDateRange,
} from './date-utils';
import {
  calculateModifiedPrice,
  resolveModifiers,
  resolveSlabForHeadcount,
  calculateHeadcountExpansionIncrementalCharge,
  PriceModifierLike,
  PriceSlabLike,
} from './pricing/resolve-modifiers';

/**
 * Standard slot duration in hours
 */
export const STANDARD_SLOT_HOURS = {
  OVERNIGHT: 23, // 12:00 PM to 11:00 AM next day
  DAY_SLOT: 5, // 10:00 AM to 3:00 PM
  MORNING_SLOT: 5, // 10:00 AM to 3:00 PM
  EVENING_SLOT: 5, // 5:00 PM to 10:00 PM
} as const;

/**
 * Calculates hourly tariff for a stay type based on active base price
 */
export function calculateHourlyTariff(
  basePrice: number,
  stayType: StayType | string
): number {
  if (basePrice <= 0) return 0;
  const standardHours =
    stayType === 'OVERNIGHT'
      ? STANDARD_SLOT_HOURS.OVERNIGHT
      : STANDARD_SLOT_HOURS[stayType as keyof typeof STANDARD_SLOT_HOURS] ?? 5;
  return Math.round(basePrice / standardHours);
}

/**
 * Input for single unit recalculation
 */
export interface RecalculationUnitParams {
  originalUnit?: {
    id?: string;
    unitId?: string;
    startDatetime: Date | string;
    endDatetime: Date | string;
    stayType: StayType | string;
    unitPrice: number;
    bookedBaseRate?: number | null;
    bookedMinHeadcount?: number | null;
    bookedMaxHeadcount?: number | null;
    headcount?: number | null;
    adults?: number | null;
    infants?: number | null;
    isComplimentary?: boolean;
  } | null;
  newUnit: {
    id?: string;
    unitId: string;
    startDatetime: Date | string;
    endDatetime: Date | string;
    stayType: StayType | string;
    headcount?: number | null;
    adults?: number | null;
    infants?: number | null;
    isComplimentary?: boolean;
    unitPrice?: number;
  };
  activePriceList: {
    id: string;
    unitType?: string;
    maxGuestCapacity: number;
    slabs: PriceSlabLike[];
    modifiers: PriceModifierLike[];
  };
}

/**
 * Result of recalculating an individual unit's scope
 */
export interface UnitRecalculationResult {
  unitId: string;
  isNewUnit: boolean;
  isComplimentary: boolean;
  incrementalCharge: number;
  newUnitPrice: number;
  breakdown: {
    headcountIncremental: number;
    extraNightsIncremental: number;
    extraHoursIncremental: number;
    dateShiftModifierIncremental?: number;
    unitSwapIncremental?: number;
    originalUnitPrice: number;
  };
}

/**
 * Calculates the incremental charge and new unit price for a single unit modification.
 */
export function calculateUnitIncrementalCharge(
  params: RecalculationUnitParams
): UnitRecalculationResult {
  const { originalUnit, newUnit, activePriceList } = params;

  // 1. Complimentary units always remain ₹0
  if (newUnit.isComplimentary) {
    return {
      unitId: newUnit.unitId,
      isNewUnit: !originalUnit,
      isComplimentary: true,
      incrementalCharge: 0,
      newUnitPrice: 0,
      breakdown: {
        headcountIncremental: 0,
        extraNightsIncremental: 0,
        extraHoursIncremental: 0,
        originalUnitPrice: originalUnit?.unitPrice ?? 0,
      },
    };
  }

  // Determine effective headcount
  const effectiveHeadcount =
    newUnit.headcount && newUnit.headcount > 0
      ? newUnit.headcount
      : newUnit.adults && newUnit.adults > 0
      ? newUnit.adults
      : 1;

  // Resolve matching active slab
  let resolvedStayType = newUnit.stayType as StayType;
  if (
    activePriceList.unitType !== 'NON_AC_HALL' &&
    activePriceList.unitType !== 'AC_HALL' &&
    newUnit.stayType === 'MORNING_SLOT'
  ) {
    resolvedStayType = 'DAY_SLOT';
  }

  const activeSlab = resolveSlabForHeadcount(
    activePriceList.slabs,
    effectiveHeadcount,
    resolvedStayType
  );
  const activeBasePrice = activeSlab?.basePrice ?? 0;

  // 2. If it's a completely newly added unit in the booking bundle
  if (!originalUnit) {
    let calculatedNewPrice = 0;
    if (newUnit.stayType === 'OVERNIGHT') {
      const nights = Math.max(
        1,
        calculateNightsBetween(newUnit.startDatetime, newUnit.endDatetime)
      );
      const stayCalc = {
        totalStayRent: 0,
      };
      for (let i = 0; i < nights; i++) {
        const nightDate = new Date(
          new Date(newUnit.startDatetime).getTime() + i * 24 * 60 * 60 * 1000
        );
        const res = resolveModifiers(
          nightDate,
          activePriceList.modifiers,
          'OVERNIGHT'
        );
        stayCalc.totalStayRent += calculateModifiedPrice(
          activeBasePrice,
          res.effectivePercentage
        );
      }
      calculatedNewPrice = stayCalc.totalStayRent;
    } else {
      const res = resolveModifiers(
        newUnit.startDatetime,
        activePriceList.modifiers,
        resolvedStayType
      );
      calculatedNewPrice = calculateModifiedPrice(
        activeBasePrice,
        res.effectivePercentage
      );
    }

    const finalPrice =
      newUnit.unitPrice !== undefined && newUnit.unitPrice > 0
        ? newUnit.unitPrice
        : calculatedNewPrice;

    return {
      unitId: newUnit.unitId,
      isNewUnit: true,
      isComplimentary: false,
      incrementalCharge: finalPrice,
      newUnitPrice: finalPrice,
      breakdown: {
        headcountIncremental: 0,
        extraNightsIncremental: finalPrice,
        extraHoursIncremental: 0,
        originalUnitPrice: 0,
      },
    };
  }

  // 3. Existing unit modification
  let headcountIncremental = 0;
  let extraNightsIncremental = 0;
  let extraHoursIncremental = 0;

  // A. Headcount Slab Expansion (Apples-to-Apples Algebraic Floor)
  if (
    newUnit.headcount !== undefined &&
    newUnit.headcount !== null &&
    originalUnit.bookedMaxHeadcount !== undefined &&
    originalUnit.bookedMaxHeadcount !== null
  ) {
    if (newUnit.headcount > originalUnit.bookedMaxHeadcount) {
      headcountIncremental = calculateHeadcountExpansionIncrementalCharge({
        activeSlabs: activePriceList.slabs,
        bookedMaxHeadcount: originalUnit.bookedMaxHeadcount,
        newHeadcount: newUnit.headcount,
        stayType: resolvedStayType,
      });
    } else {
      // Within original slab or scope reduction -> ₹0
      headcountIncremental = 0;
    }
  }

  // B. Stay Extension (Extra Nights for OVERNIGHT)
  if (newUnit.stayType === 'OVERNIGHT') {
    const origNights = calculateNightsBetween(
      originalUnit.startDatetime,
      originalUnit.endDatetime
    );
    const newNights = calculateNightsBetween(
      newUnit.startDatetime,
      newUnit.endDatetime
    );

    if (newNights > origNights) {
      // Calculate extra nights starting from the additional night offset
      const newStartMs = new Date(newUnit.startDatetime).getTime();
      for (let i = origNights; i < newNights; i++) {
        const extraNightDate = new Date(newStartMs + i * 24 * 60 * 60 * 1000);
        const modRes = resolveModifiers(
          extraNightDate,
          activePriceList.modifiers,
          'OVERNIGHT'
        );
        const nightRate = calculateModifiedPrice(
          activeBasePrice,
          modRes.effectivePercentage
        );
        extraNightsIncremental += nightRate;
      }
    } else {
      // Same nights or reduced nights (partial cancellation) -> ₹0
      extraNightsIncremental = 0;
    }
  }

  // C. Time Extensions (Extra Hours beyond standard preset timings)
  if (isStandardPresetTiming(newUnit.stayType, newUnit.startDatetime, newUnit.endDatetime)) {
    extraHoursIncremental = 0;
  } else {
    try {
      const nights = Math.max(
        1,
        calculateNightsBetween(newUnit.startDatetime, newUnit.endDatetime)
      );
      const standardRange = mapPresetToDateRange(
        newUnit.stayType,
        newUnit.startDatetime,
        nights
      );
      const standardStartMs = standardRange.startDatetime.getTime();
      const standardEndMs = standardRange.endDatetime.getTime();
      const actualStartMs = new Date(newUnit.startDatetime).getTime();
      const actualEndMs = new Date(newUnit.endDatetime).getTime();

      let extraMs = 0;
      // Early check-in beyond standard preset
      if (actualStartMs < standardStartMs) {
        extraMs += standardStartMs - actualStartMs;
      }
      // Late check-out beyond standard preset
      if (actualEndMs > standardEndMs) {
        extraMs += actualEndMs - standardEndMs;
      }

      const extraHours = Math.ceil(extraMs / (60 * 60 * 1000));
      if (extraHours > 0) {
        const hourlyTariff = calculateHourlyTariff(activeBasePrice, newUnit.stayType);
        extraHoursIncremental = extraHours * hourlyTariff;
      }
    } catch {
      extraHoursIncremental = 0;
    }
  }

  // D. Date Shifts on Event Halls (event_hall.md lines 93-96)
  // If an event date shifts, evaluate the new calendar date against current active weekend/seasonal modifiers
  // applied mathematically against grandfathered bookedBaseRate.
  let dateShiftModifierIncremental = 0;
  const isHallUnit =
    activePriceList.unitType === 'NON_AC_HALL' ||
    activePriceList.unitType === 'AC_HALL' ||
    resolvedStayType === 'MORNING_SLOT' ||
    resolvedStayType === 'EVENING_SLOT';

  if (isHallUnit && originalUnit) {
    const origISTDate = getISTDateString(originalUnit.startDatetime);
    const newISTDate = getISTDateString(newUnit.startDatetime);
    if (origISTDate && newISTDate && origISTDate !== newISTDate) {
      const grandfatheredBaseRate =
        originalUnit.bookedBaseRate !== undefined &&
        originalUnit.bookedBaseRate !== null &&
        originalUnit.bookedBaseRate > 0
          ? originalUnit.bookedBaseRate
          : originalUnit.unitPrice;

      const newModRes = resolveModifiers(
        newUnit.startDatetime,
        activePriceList.modifiers,
        resolvedStayType
      );
      const origModRes = resolveModifiers(
        originalUnit.startDatetime,
        activePriceList.modifiers,
        resolvedStayType
      );

      const newRate = calculateModifiedPrice(
        grandfatheredBaseRate,
        newModRes.effectivePercentage
      );
      const origRate = calculateModifiedPrice(
        grandfatheredBaseRate,
        origModRes.effectivePercentage
      );

      // Universal reduction rule: no auto-refunds if new date has lower modifier
      if (newRate > origRate) {
        dateShiftModifierIncremental = newRate - origRate;
      }
    }
  }

  // E. Unit Swap / Reassignment (rooms.md line 52)
  // If moving guest to a different unit, price the new unit under its active rate plan.
  // Upgrades charge the incremental tariff; lateral or downgrade swaps preserve baseline / universal reduction rule.
  let unitSwapIncremental = 0;
  if (originalUnit && originalUnit.unitId && originalUnit.unitId !== newUnit.unitId) {
    let newUnitFullRent = 0;
    if (newUnit.stayType === 'OVERNIGHT') {
      const nights = Math.max(
        1,
        calculateNightsBetween(newUnit.startDatetime, newUnit.endDatetime)
      );
      for (let i = 0; i < nights; i++) {
        const nightDate = new Date(
          new Date(newUnit.startDatetime).getTime() + i * 24 * 60 * 60 * 1000
        );
        const res = resolveModifiers(
          nightDate,
          activePriceList.modifiers,
          'OVERNIGHT'
        );
        newUnitFullRent += calculateModifiedPrice(
          activeBasePrice,
          res.effectivePercentage
        );
      }
    } else {
      const res = resolveModifiers(
        newUnit.startDatetime,
        activePriceList.modifiers,
        resolvedStayType
      );
      newUnitFullRent = calculateModifiedPrice(
        activeBasePrice,
        res.effectivePercentage
      );
    }

    if (newUnitFullRent > originalUnit.unitPrice) {
      unitSwapIncremental = newUnitFullRent - originalUnit.unitPrice;
    }
  }

  const totalIncremental =
    headcountIncremental +
    extraNightsIncremental +
    extraHoursIncremental +
    dateShiftModifierIncremental +
    unitSwapIncremental;
  const newUnitPrice = Math.max(
    0,
    Math.round(originalUnit.unitPrice + totalIncremental)
  );

  return {
    unitId: newUnit.unitId,
    isNewUnit: false,
    isComplimentary: false,
    incrementalCharge: totalIncremental,
    newUnitPrice,
    breakdown: {
      headcountIncremental,
      extraNightsIncremental,
      extraHoursIncremental,
      dateShiftModifierIncremental,
      unitSwapIncremental,
      originalUnitPrice: originalUnit.unitPrice,
    },
  };
}

/**
 * Calculates overall booking rent recalculation across all units.
 */
export function calculateBookingRentRecalculation(params: {
  originalRentCharge: number;
  unitResults: UnitRecalculationResult[];
  customRentOverride?: number | null;
}): {
  originalRentCharge: number;
  totalIncrementalCharge: number;
  recalculatedRentCharge: number;
  finalRentCharge: number;
} {
  const totalIncrementalCharge = params.unitResults.reduce(
    (sum, r) => sum + r.incrementalCharge,
    0
  );
  const recalculatedRentCharge = Math.max(
    0,
    Math.round(params.originalRentCharge + totalIncrementalCharge)
  );

  const finalRentCharge =
    params.customRentOverride !== undefined &&
    params.customRentOverride !== null &&
    params.customRentOverride > 0
      ? params.customRentOverride
      : recalculatedRentCharge;

  return {
    originalRentCharge: params.originalRentCharge,
    totalIncrementalCharge,
    recalculatedRentCharge,
    finalRentCharge,
  };
}

/**
 * Direct calculateRent facade export
 */
export const calculateRent = {
  calculateUnitIncrementalCharge,
  calculateBookingRentRecalculation,
  calculateHourlyTariff,
};

export default calculateRent;
