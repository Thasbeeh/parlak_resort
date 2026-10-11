import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  getISTDateString,
  getISTDayOfWeek,
  isWeekendIST,
  isDateInModifierRange,
  isModifierActiveOnDate,
  resolveAlgebraicMaxModifier,
  resolveModifiers,
  calculateModifiedPrice,
  calculateNightByNightStayRate,
  resolveSlabForHeadcount,
  calculateHeadcountExpansionIncrementalCharge,
  isZeroBalanceDue,
  PriceModifierLike,
  PriceSlabLike,
} from '../lib/pricing/resolve-modifiers';
import {
  createPriceList,
  updatePriceList,
} from '../actions/price-lists';
import {
  createModifier,
  updateModifier,
} from '../actions/modifiers';
import {
  NEON_TRANSACTION_OPTIONS as NEON_PRICE_LIST_TX_OPTIONS,
  NEON_TRANSACTION_OPTIONS as NEON_MODIFIER_TX_OPTIONS,
} from '../lib/action-errors';

describe('Pricing Engine: IST Date and Weekend Utilities (lib/pricing/resolve-modifiers.ts)', () => {
  it('correctly extracts IST date string and day of week across midnight UTC', () => {
    // 2026-10-06 20:00:00 UTC is 2026-10-07 01:30:00 in IST (Wednesday)
    const lateUtc = new Date('2026-10-06T20:00:00.000Z');
    assert.strictEqual(getISTDateString(lateUtc), '2026-10-07');
    assert.strictEqual(getISTDayOfWeek(lateUtc), 3); // Wednesday
  });

  it('correctly identifies Weekend for OVERNIGHT stays (Friday & Saturday nights)', () => {
    // Friday in IST: 2026-10-09 (check-in at 12:00 PM IST)
    const fridayOvernight = new Date('2026-10-09T06:30:00.000Z'); // 12:00 PM IST
    assert.strictEqual(isWeekendIST(fridayOvernight, 'OVERNIGHT'), true);

    // Saturday in IST: 2026-10-10 (check-in at 12:00 PM IST)
    const saturdayOvernight = new Date('2026-10-10T06:30:00.000Z');
    assert.strictEqual(isWeekendIST(saturdayOvernight, 'OVERNIGHT'), true);

    // Sunday in IST: 2026-10-11 (check-in at 12:00 PM IST is a weekday night)
    const sundayOvernight = new Date('2026-10-11T06:30:00.000Z');
    assert.strictEqual(isWeekendIST(sundayOvernight, 'OVERNIGHT'), false);

    // Thursday in IST: 2026-10-08
    const thursdayOvernight = new Date('2026-10-08T06:30:00.000Z');
    assert.strictEqual(isWeekendIST(thursdayOvernight, 'OVERNIGHT'), false);
  });

  it('correctly identifies Weekend for DAY_SLOT and Event Hall slots (Saturday & Sunday)', () => {
    // Friday daytime in IST: 2026-10-09
    const fridayDay = new Date('2026-10-09T04:30:00.000Z'); // 10:00 AM IST
    assert.strictEqual(isWeekendIST(fridayDay, 'DAY_SLOT'), false);
    assert.strictEqual(isWeekendIST(fridayDay, 'MORNING_SLOT'), false);
    assert.strictEqual(isWeekendIST(fridayDay, 'EVENING_SLOT'), false);

    // Saturday daytime in IST: 2026-10-10
    const saturdayDay = new Date('2026-10-10T04:30:00.000Z');
    assert.strictEqual(isWeekendIST(saturdayDay, 'DAY_SLOT'), true);
    assert.strictEqual(isWeekendIST(saturdayDay, 'MORNING_SLOT'), true);
    assert.strictEqual(isWeekendIST(saturdayDay, 'EVENING_SLOT'), true);

    // Sunday daytime in IST: 2026-10-11
    const sundayDay = new Date('2026-10-11T04:30:00.000Z');
    assert.strictEqual(isWeekendIST(sundayDay, 'DAY_SLOT'), true);
    assert.strictEqual(isWeekendIST(sundayDay, 'MORNING_SLOT'), true);
    assert.strictEqual(isWeekendIST(sundayDay, 'EVENING_SLOT'), true);
  });

  it('correctly validates isDateInModifierRange boundary handling', () => {
    const start = '2026-10-10T00:00:00.000Z'; // Oct 10 in IST
    const end = '2026-10-15T18:29:59.999Z'; // 23:59:59.999 IST on Oct 15

    // Inside
    assert.strictEqual(isDateInModifierRange('2026-10-12T12:00:00.000Z', start, end), true);
    // Boundaries
    assert.strictEqual(isDateInModifierRange('2026-10-10T00:00:00.000Z', start, end), true);
    assert.strictEqual(isDateInModifierRange('2026-10-15T12:00:00.000Z', start, end), true);
    // Outside (Oct 9 and Oct 16 in IST)
    assert.strictEqual(isDateInModifierRange('2026-10-09T12:00:00.000Z', start, end), false);
    assert.strictEqual(isDateInModifierRange('2026-10-16T12:00:00.000Z', start, end), false);
  });

  it('correctly checks isModifierActiveOnDate accounting for weekend status', () => {
    const weekendModifier: PriceModifierLike = {
      name: 'Weekend Surge',
      type: 'WEEKEND',
      percentage: 15,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      isActive: true,
    };

    // Saturday overnight (Weekend) -> active
    const saturday = new Date('2026-10-10T12:00:00+05:30');
    assert.strictEqual(isModifierActiveOnDate(weekendModifier, saturday, 'OVERNIGHT'), true);

    // Wednesday overnight (Weekday) -> inactive for WEEKEND modifier
    const wednesday = new Date('2026-10-07T12:00:00+05:30');
    assert.strictEqual(isModifierActiveOnDate(weekendModifier, wednesday, 'OVERNIGHT'), false);
  });
});

describe('Pricing Engine: Algebraic Maximum Logic (lib/pricing/resolve-modifiers.ts)', () => {
  it('resolves two hikes (+50% vs +20%) to +50% (Maximized revenue)', () => {
    const mod1: PriceModifierLike = {
      name: 'Diwali Surge Minor',
      type: 'SEASONAL',
      percentage: 20,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      isActive: true,
    };
    const mod2: PriceModifierLike = {
      name: 'Diwali Surge Major',
      type: 'SEASONAL',
      percentage: 50,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      isActive: true,
    };

    const winner = resolveAlgebraicMaxModifier([mod1, mod2]);
    assert.ok(winner);
    assert.strictEqual(winner.percentage, 50);
    assert.strictEqual(winner.name, 'Diwali Surge Major');
  });

  it('resolves two discounts (-10% vs -30%) to -10% (Minimizes loss, higher final price)', () => {
    const mod1: PriceModifierLike = {
      name: 'Early Bird Minor',
      type: 'SEASONAL',
      percentage: -10,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      isActive: true,
    };
    const mod2: PriceModifierLike = {
      name: 'Early Bird Major',
      type: 'SEASONAL',
      percentage: -30,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      isActive: true,
    };

    const winner = resolveAlgebraicMaxModifier([mod1, mod2]);
    assert.ok(winner);
    assert.strictEqual(winner.percentage, -10);
    assert.strictEqual(winner.name, 'Early Bird Minor');
  });

  it('resolves hike vs discount (+20% vs -10%) to +20%', () => {
    const hike: PriceModifierLike = {
      name: 'Surge',
      type: 'SEASONAL',
      percentage: 20,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      isActive: true,
    };
    const discount: PriceModifierLike = {
      name: 'Discount',
      type: 'SEASONAL',
      percentage: -10,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      isActive: true,
    };

    const winner = resolveAlgebraicMaxModifier([hike, discount]);
    assert.ok(winner);
    assert.strictEqual(winner.percentage, 20);
  });
});

describe('Pricing Engine: Overlap Hierarchy & resolveModifiers (lib/pricing/resolve-modifiers.ts)', () => {
  const weekendMod: PriceModifierLike = {
    name: 'Weekend Standard Surge',
    type: 'WEEKEND',
    percentage: 15, // +15%
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    isActive: true,
  };

  const seasonalMod: PriceModifierLike = {
    name: 'October Monsoon Sale',
    type: 'SEASONAL',
    percentage: -20, // -20%
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    isActive: true,
  };

  it('enforces Weekend Rate strictly overrides Seasonal Promotion on Weekend dates', () => {
    // Saturday night for OVERNIGHT (2026-10-10)
    const saturday = new Date('2026-10-10T12:00:00+05:30');
    const result = resolveModifiers(saturday, [weekendMod, seasonalMod], 'OVERNIGHT');

    assert.strictEqual(result.isWeekend, true);
    assert.strictEqual(result.effectivePercentage, 15);
    assert.strictEqual(result.appliedModifier?.name, 'Weekend Standard Surge');
    assert.strictEqual(result.breakdown.selectedType, 'WEEKEND');
    assert.ok(result.breakdown.overrideReason?.includes('strictly overrides'));
  });

  it('applies Seasonal Promotion on Weekdays (Weekend modifier does not apply)', () => {
    // Wednesday (2026-10-07)
    const wednesday = new Date('2026-10-07T12:00:00+05:30');
    const result = resolveModifiers(wednesday, [weekendMod, seasonalMod], 'OVERNIGHT');

    assert.strictEqual(result.isWeekend, false);
    assert.strictEqual(result.effectivePercentage, -20);
    assert.strictEqual(result.appliedModifier?.name, 'October Monsoon Sale');
    assert.strictEqual(result.breakdown.selectedType, 'SEASONAL');
  });

  it('applies Seasonal Promotion on Weekend if no Weekend modifier is configured', () => {
    // Saturday night with only seasonal modifier
    const saturday = new Date('2026-10-10T12:00:00+05:30');
    const result = resolveModifiers(saturday, [seasonalMod], 'OVERNIGHT');

    assert.strictEqual(result.isWeekend, true);
    assert.strictEqual(result.effectivePercentage, -20);
    assert.strictEqual(result.appliedModifier?.name, 'October Monsoon Sale');
    assert.strictEqual(result.breakdown.selectedType, 'SEASONAL');
  });

  it('ignores inactive modifiers (isActive === false)', () => {
    const inactiveMod: PriceModifierLike = {
      name: 'Disabled Surge',
      type: 'WEEKEND',
      percentage: 50,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      isActive: false,
    };
    const saturday = new Date('2026-10-10T12:00:00+05:30');
    const result = resolveModifiers(saturday, [inactiveMod], 'OVERNIGHT');

    assert.strictEqual(result.effectivePercentage, 0);
    assert.strictEqual(result.appliedModifier, null);
  });

  it('safely handles invalid date without throwing', () => {
    const result = resolveModifiers('invalid-date-string', [weekendMod], 'OVERNIGHT');
    assert.strictEqual(result.isWeekend, false);
    assert.strictEqual(result.effectivePercentage, 0);
    assert.strictEqual(result.appliedModifier, null);
    assert.strictEqual(result.activeModifiers.length, 0);
  });

  it('normalizes lowercase modifier types defensively', () => {
    const lowercaseMod: PriceModifierLike = {
      name: 'Lowercase Weekend',
      type: 'weekend',
      percentage: 25,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      isActive: true,
    };
    const saturday = new Date('2026-10-10T12:00:00+05:30');
    const result = resolveModifiers(saturday, [lowercaseMod], 'OVERNIGHT');
    assert.strictEqual(result.effectivePercentage, 25);
    assert.strictEqual(result.breakdown.selectedType, 'WEEKEND');
  });
});

describe('Pricing Engine: Calculations & Night-by-Night Stays', () => {
  it('correctly calculates modified price with integer rounding to nearest Rupee', () => {
    // ₹4,500 + 15% = ₹5,175
    assert.strictEqual(calculateModifiedPrice(4500, 15), 5175);

    // ₹4,500 - 20% = ₹3,600
    assert.strictEqual(calculateModifiedPrice(4500, -20), 3600);

    // ₹3,333 + 15% = 3832.95 -> 3833
    assert.strictEqual(calculateModifiedPrice(3333, 15), 3833);

    // 0 base price
    assert.strictEqual(calculateModifiedPrice(0, 15), 0);
  });

  it('calculates multi-night stays night-by-night independently', () => {
    // Check-in on Thursday 2026-10-08 for 3 nights:
    // Night 1: Thursday (Weekday) -> Seasonal -10% -> ₹5,000 - 10% = ₹4,500
    // Night 2: Friday (Weekend overnight) -> Weekend +20% overrides Seasonal -> ₹5,000 + 20% = ₹6,000
    // Night 3: Saturday (Weekend overnight) -> Weekend +20% overrides Seasonal -> ₹5,000 + 20% = ₹6,000
    // Total Stay Rent: 4500 + 6000 + 6000 = ₹16,500
    const modifiers: PriceModifierLike[] = [
      {
        name: 'Weekend Rate',
        type: 'WEEKEND',
        percentage: 20,
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        isActive: true,
      },
      {
        name: 'October Promo',
        type: 'SEASONAL',
        percentage: -10,
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        isActive: true,
      },
    ];

    const result = calculateNightByNightStayRate({
      checkInDate: '2026-10-08T12:00:00+05:30',
      numberOfNights: 3,
      basePricePerNight: 5000,
      modifiers,
      stayType: 'OVERNIGHT',
    });

    assert.strictEqual(result.totalStayRent, 16500);
    assert.strictEqual(result.nightlyBreakdown.length, 3);
    assert.strictEqual(result.nightlyBreakdown[0].finalPrice, 4500); // Thursday
    assert.strictEqual(result.nightlyBreakdown[1].finalPrice, 6000); // Friday (Weekend)
    assert.strictEqual(result.nightlyBreakdown[2].finalPrice, 6000); // Saturday (Weekend)
  });

  it('safely handles invalid date or zero nights in calculateNightByNightStayRate', () => {
    const invalidResult = calculateNightByNightStayRate({
      checkInDate: 'invalid-date',
      numberOfNights: 2,
      basePricePerNight: 5000,
      modifiers: [],
    });
    assert.strictEqual(invalidResult.totalStayRent, 0);
    assert.deepStrictEqual(invalidResult.nightlyBreakdown, []);

    const zeroNightsResult = calculateNightByNightStayRate({
      checkInDate: '2026-10-15',
      numberOfNights: 0,
      basePricePerNight: 5000,
      modifiers: [],
    });
    assert.strictEqual(zeroNightsResult.totalStayRent, 0);
    assert.deepStrictEqual(zeroNightsResult.nightlyBreakdown, []);
  });
});

describe('Event Hall Slabs & Domain Invariants (lib/pricing/resolve-modifiers.ts)', () => {
  const hallSlabs: PriceSlabLike[] = [
    {
      stayType: 'MORNING_SLOT',
      minHeadcount: 10,
      maxHeadcount: 25,
      basePrice: 10000,
      requiredDeposit: 5000,
    },
    {
      stayType: 'MORNING_SLOT',
      minHeadcount: 26,
      maxHeadcount: 50,
      basePrice: 16000,
      requiredDeposit: 5000,
    },
    {
      stayType: 'MORNING_SLOT',
      minHeadcount: 51,
      maxHeadcount: 100,
      basePrice: 25000,
      requiredDeposit: 8000,
    },
  ];

  it('enforces Minimum Slab Floor Rule for attendee headcount below lowest slab', () => {
    // 5 attendees when lowest slab is 10-25 Pax
    const slab = resolveSlabForHeadcount(hallSlabs, 5, 'MORNING_SLOT');
    assert.ok(slab);
    assert.strictEqual(slab.minHeadcount, 10);
    assert.strictEqual(slab.basePrice, 10000);
  });

  it('returns null for non-positive or NaN headcount', () => {
    assert.strictEqual(resolveSlabForHeadcount(hallSlabs, 0, 'MORNING_SLOT'), null);
    assert.strictEqual(resolveSlabForHeadcount(hallSlabs, -5, 'MORNING_SLOT'), null);
    assert.strictEqual(resolveSlabForHeadcount(hallSlabs, NaN, 'MORNING_SLOT'), null);
  });

  it('matches exact slab when attendee count is within range', () => {
    // 35 attendees matches 26-50 Pax slab
    const slab = resolveSlabForHeadcount(hallSlabs, 35, 'MORNING_SLOT');
    assert.ok(slab);
    assert.strictEqual(slab.minHeadcount, 26);
    assert.strictEqual(slab.basePrice, 16000);
  });

  it('calculates headcount expansion incremental charge with algebraic floor', () => {
    // 1. Within original booked slab (e.g. booked max 25, new headcount 20) -> ₹0
    const noChange = calculateHeadcountExpansionIncrementalCharge({
      activeSlabs: hallSlabs,
      bookedMaxHeadcount: 25,
      newHeadcount: 20,
      stayType: 'MORNING_SLOT',
    });
    assert.strictEqual(noChange, 0);

    // 2. Crossing to higher slab (booked max 25, new headcount 45) -> 16,000 - 10,000 = ₹6,000
    const upgraded = calculateHeadcountExpansionIncrementalCharge({
      activeSlabs: hallSlabs,
      bookedMaxHeadcount: 25,
      newHeadcount: 45,
      stayType: 'MORNING_SLOT',
    });
    assert.strictEqual(upgraded, 6000);

    // 3. Price drop tariff floor test: new price lower than old price -> max(0, diff) = 0
    const discountedSlabs: PriceSlabLike[] = [
      {
        stayType: 'MORNING_SLOT',
        minHeadcount: 10,
        maxHeadcount: 25,
        basePrice: 12000,
        requiredDeposit: 5000,
      },
      {
        stayType: 'MORNING_SLOT',
        minHeadcount: 26,
        maxHeadcount: 50,
        basePrice: 10000, // lower active rate
        requiredDeposit: 5000,
      },
    ];
    const floored = calculateHeadcountExpansionIncrementalCharge({
      activeSlabs: discountedSlabs,
      bookedMaxHeadcount: 25,
      newHeadcount: 35,
      stayType: 'MORNING_SLOT',
    });
    assert.strictEqual(floored, 0);
  });

  it('validates zero balance due invariant for checkout settlement', () => {
    // Exact ₹0 balance: Rent 10000 + Line Items 2000 - Total Paid 12000 = 0
    assert.strictEqual(isZeroBalanceDue(10000, 2000, 12000), true);

    // Floating-point precision artifact safe (epsilon check)
    assert.strictEqual(isZeroBalanceDue(10000.00000001, 2000, 12000), true);

    // Uncollected balance: Rent 10000 + Line Items 2000 - Total Paid 11500 = 500 due
    assert.strictEqual(isZeroBalanceDue(10000, 2000, 11500), false);
  });
});

describe('Action Input Validations: Price Lists (actions/price-lists.ts)', () => {
  it('rejects invalid payload when creating price list', async () => {
    const invalidInput = {
      name: '',
      unitType: 'DOME',
      maxGuestCapacity: 5, // Exceeds Dome physical cap 3
      slabs: [],
    };
    const response = await createPriceList(invalidInput);
    assert.strictEqual(response.success, false);
    assert.strictEqual(response.code, 'VALIDATION_ERROR');
    assert.strictEqual(response.status, 400);
  });

  it('rejects updatePriceList when expectedUpdatedAt is missing', async () => {
    const missingOCC = {
      id: '123e4567-e89b-42d3-a456-426614174000',
      name: 'Valid Name',
      unitType: 'DOME',
      maxGuestCapacity: 3,
      slabs: [
        {
          stayType: 'OVERNIGHT',
          minHeadcount: 1,
          maxHeadcount: 3,
          basePrice: 5000,
          requiredDeposit: 2000,
        },
        {
          stayType: 'DAY_SLOT',
          minHeadcount: 1,
          maxHeadcount: 3,
          basePrice: 3000,
          requiredDeposit: 1000,
        },
      ],
      // expectedUpdatedAt omitted
    };
    const response = await updatePriceList(missingOCC);
    assert.strictEqual(response.success, false);
    assert.strictEqual(response.code, 'VALIDATION_ERROR');
    assert.strictEqual(response.status, 400);
  });
});

describe('Action Input Validations: Price Modifiers (actions/modifiers.ts)', () => {
  it('rejects createModifier when startDate is in the past', async () => {
    const pastStartModifier = {
      priceListId: '123e4567-e89b-42d3-a456-426614174000',
      name: 'Past Promo',
      type: 'SEASONAL',
      percentage: 15,
      startDate: new Date('2020-01-01'), // Long past
      endDate: new Date('2026-12-31'),
      isActive: true,
    };
    const response = await createModifier(pastStartModifier);
    assert.strictEqual(response.success, false);
    assert.strictEqual(response.code, 'PAST_START_DATE');
    assert.strictEqual(response.status, 400);
  });

  it('rejects updateModifier when expectedUpdatedAt is missing', async () => {
    const missingOCC = {
      id: '123e4567-e89b-42d3-a456-426614174000',
      name: 'Updated Promo',
      type: 'SEASONAL',
      percentage: 20,
      startDate: new Date('2026-10-10'),
      endDate: new Date('2026-10-20'),
      isActive: true,
      // expectedUpdatedAt omitted
    };
    const response = await updateModifier(missingOCC);
    assert.strictEqual(response.success, false);
    assert.strictEqual(response.code, 'VALIDATION_ERROR');
    assert.strictEqual(response.status, 400);
  });
});

describe('Neon Postgres Transaction Configuration (.agents/skills/neon-postgres/SKILL.md)', () => {
  it('configures explicit transaction timeouts accommodating scale-to-zero compute wakeups', () => {
    assert.strictEqual(NEON_PRICE_LIST_TX_OPTIONS.maxWait, 5000);
    assert.strictEqual(NEON_PRICE_LIST_TX_OPTIONS.timeout, 10000);

    assert.strictEqual(NEON_MODIFIER_TX_OPTIONS.maxWait, 5000);
    assert.strictEqual(NEON_MODIFIER_TX_OPTIONS.timeout, 10000);
  });
});
