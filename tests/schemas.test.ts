import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  priceSlabSchema,
  priceListSchema,
  priceModifierSchema,
  generateSlug,
  UNIT_MAX_CAPACITIES,
} from '../schemas/price.schema';
import { unitSchema, toggleUnitStatusSchema } from '../schemas/unit.schema';
import {
  bookingSchema,
  cancelBookingSchema,
  checkoutBookingSchema,
  addReceiptLineItemSchema,
  maintenanceBlockSchema,
  recordPaymentSchema,
} from '../schemas/booking.schema';
import {
  unitPhotoSchema,
  reorderUnitPhotosSchema,
  MAX_PHOTO_FILE_SIZE_BYTES,
} from '../schemas/media.schema';
import { db, prisma } from '../lib/db';

describe('Database Singleton (lib/db.ts)', () => {
  it('exports db and prisma as the same instance', () => {
    assert.ok(db);
    assert.strictEqual(prisma, db);
  });
});

describe('Price Slab Schema (schemas/price.schema.ts)', () => {
  it('accepts a valid price slab', () => {
    const valid = {
      stayType: 'OVERNIGHT',
      minHeadcount: 1,
      maxHeadcount: 2,
      basePrice: 5000,
      requiredDeposit: 2000,
    };
    const parsed = priceSlabSchema.safeParse(valid);
    assert.strictEqual(parsed.success, true);
  });

  it('rejects when minHeadcount > maxHeadcount', () => {
    const invalid = {
      stayType: 'OVERNIGHT',
      minHeadcount: 4,
      maxHeadcount: 2,
      basePrice: 5000,
      requiredDeposit: 2000,
    };
    const parsed = priceSlabSchema.safeParse(invalid);
    assert.strictEqual(parsed.success, false);
  });

  it('rejects when requiredDeposit > basePrice', () => {
    const invalid = {
      stayType: 'OVERNIGHT',
      minHeadcount: 1,
      maxHeadcount: 2,
      basePrice: 5000,
      requiredDeposit: 6000,
    };
    const parsed = priceSlabSchema.safeParse(invalid);
    assert.strictEqual(parsed.success, false);
  });

  it('rejects non-positive base price or negative deposit', () => {
    assert.strictEqual(
      priceSlabSchema.safeParse({
        stayType: 'OVERNIGHT',
        minHeadcount: 1,
        maxHeadcount: 2,
        basePrice: 0,
        requiredDeposit: 0,
      }).success,
      false
    );

    assert.strictEqual(
      priceSlabSchema.safeParse({
        stayType: 'OVERNIGHT',
        minHeadcount: 1,
        maxHeadcount: 2,
        basePrice: 5000,
        requiredDeposit: -100,
      }).success,
      false
    );
  });
});

describe('Price List Schema superRefine Rules (schemas/price.schema.ts)', () => {
  const validDomePriceList = {
    name: 'Standard Dome - 3 Pax Plan',
    slug: 'standard-dome-3-pax-plan',
    unitType: 'DOME',
    maxGuestCapacity: 3,
    slabs: [
      // OVERNIGHT slabs (1-2, 3-3)
      {
        stayType: 'OVERNIGHT',
        minHeadcount: 1,
        maxHeadcount: 2,
        basePrice: 4000,
        requiredDeposit: 2000,
      },
      {
        stayType: 'OVERNIGHT',
        minHeadcount: 3,
        maxHeadcount: 3,
        basePrice: 5500,
        requiredDeposit: 2000,
      },
      // DAY_SLOT slabs (1-3)
      {
        stayType: 'DAY_SLOT',
        minHeadcount: 1,
        maxHeadcount: 3,
        basePrice: 3000,
        requiredDeposit: 1500,
      },
    ],
  };

  it('accepts perfectly contiguous slabs starting at 1 for Domes', () => {
    const parsed = priceListSchema.safeParse(validDomePriceList);
    assert.strictEqual(parsed.success, true);
  });

  it('handles unsorted input correctly by sorting before validation', () => {
    const unsorted = {
      ...validDomePriceList,
      slabs: [
        {
          stayType: 'OVERNIGHT',
          minHeadcount: 3,
          maxHeadcount: 3,
          basePrice: 5500,
          requiredDeposit: 2000,
        },
        {
          stayType: 'OVERNIGHT',
          minHeadcount: 1,
          maxHeadcount: 2,
          basePrice: 4000,
          requiredDeposit: 2000,
        },
        {
          stayType: 'DAY_SLOT',
          minHeadcount: 1,
          maxHeadcount: 3,
          basePrice: 3000,
          requiredDeposit: 1500,
        },
      ],
    };
    const parsed = priceListSchema.safeParse(unsorted);
    assert.strictEqual(parsed.success, true);
  });

  it('rejects if room slabs do not start at minHeadcount = 1', () => {
    const invalid = {
      ...validDomePriceList,
      slabs: [
        {
          stayType: 'OVERNIGHT',
          minHeadcount: 2, // Rooms must start at 1
          maxHeadcount: 3,
          basePrice: 5000,
          requiredDeposit: 2000,
        },
        {
          stayType: 'DAY_SLOT',
          minHeadcount: 1,
          maxHeadcount: 3,
          basePrice: 3000,
          requiredDeposit: 1500,
        },
      ],
    };
    const parsed = priceListSchema.safeParse(invalid);
    assert.strictEqual(parsed.success, false);
    if (!parsed.success) {
      assert.ok(
        parsed.error.issues.some((i) =>
          i.message.includes('lowest slab for OVERNIGHT must start at minHeadcount = 1')
        )
      );
    }
  });

  it('rejects gaps between slabs (e.g., 1-1, then 3-3)', () => {
    const withGap = {
      ...validDomePriceList,
      slabs: [
        {
          stayType: 'OVERNIGHT',
          minHeadcount: 1,
          maxHeadcount: 1,
          basePrice: 3000,
          requiredDeposit: 1000,
        },
        {
          stayType: 'OVERNIGHT',
          minHeadcount: 3, // Gap: missed 2
          maxHeadcount: 3,
          basePrice: 5000,
          requiredDeposit: 2000,
        },
        {
          stayType: 'DAY_SLOT',
          minHeadcount: 1,
          maxHeadcount: 3,
          basePrice: 3000,
          requiredDeposit: 1500,
        },
      ],
    };
    const parsed = priceListSchema.safeParse(withGap);
    assert.strictEqual(parsed.success, false);
    if (!parsed.success) {
      assert.ok(
        parsed.error.issues.some((i) => i.message.includes('contiguous with no gaps or overlaps'))
      );
    }
  });

  it('rejects overlaps between slabs (e.g., 1-2, then 2-3)', () => {
    const withOverlap = {
      ...validDomePriceList,
      slabs: [
        {
          stayType: 'OVERNIGHT',
          minHeadcount: 1,
          maxHeadcount: 2,
          basePrice: 3000,
          requiredDeposit: 1000,
        },
        {
          stayType: 'OVERNIGHT',
          minHeadcount: 2, // Overlap on 2
          maxHeadcount: 3,
          basePrice: 5000,
          requiredDeposit: 2000,
        },
        {
          stayType: 'DAY_SLOT',
          minHeadcount: 1,
          maxHeadcount: 3,
          basePrice: 3000,
          requiredDeposit: 1500,
        },
      ],
    };
    const parsed = priceListSchema.safeParse(withOverlap);
    assert.strictEqual(parsed.success, false);
  });

  it('rejects when highest slab maxHeadcount exceeds maxGuestCapacity', () => {
    const exceedsCapacity = {
      ...validDomePriceList,
      maxGuestCapacity: 2, // Capacity is 2
      slabs: [
        {
          stayType: 'OVERNIGHT',
          minHeadcount: 1,
          maxHeadcount: 3, // Slab is 3
          basePrice: 4000,
          requiredDeposit: 2000,
        },
        {
          stayType: 'DAY_SLOT',
          minHeadcount: 1,
          maxHeadcount: 2,
          basePrice: 3000,
          requiredDeposit: 1500,
        },
      ],
    };
    const parsed = priceListSchema.safeParse(exceedsCapacity);
    assert.strictEqual(parsed.success, false);
    if (!parsed.success) {
      assert.ok(
        parsed.error.issues.some((i) => i.message.includes('exceeds Price List maxGuestCapacity'))
      );
    }
  });

  it('rejects when Dome maxGuestCapacity exceeds hard physical cap of 3', () => {
    const invalidDome = {
      ...validDomePriceList,
      maxGuestCapacity: 4, // Hard cap is 3
    };
    const parsed = priceListSchema.safeParse(invalidDome);
    assert.strictEqual(parsed.success, false);
    if (!parsed.success) {
      assert.ok(
        parsed.error.issues.some((i) => i.message.includes('physical ceiling of 3'))
      );
    }
  });

  it('rejects when a required stayType is missing for the unit type', () => {
    const missingDaySlot = {
      ...validDomePriceList,
      slabs: [
        {
          stayType: 'OVERNIGHT',
          minHeadcount: 1,
          maxHeadcount: 3,
          basePrice: 4000,
          requiredDeposit: 2000,
        },
      ],
    };
    const parsed = priceListSchema.safeParse(missingDaySlot);
    assert.strictEqual(parsed.success, false);
    if (!parsed.success) {
      assert.ok(
        parsed.error.issues.some((i) =>
          i.message.includes('must define at least one slab for DAY_SLOT')
        )
      );
    }
  });

  it('rejects invalid stayType for unitType (e.g. MORNING_SLOT on DOME)', () => {
    const wrongSlot = {
      ...validDomePriceList,
      slabs: [
        {
          stayType: 'MORNING_SLOT',
          minHeadcount: 1,
          maxHeadcount: 3,
          basePrice: 4000,
          requiredDeposit: 2000,
        },
        {
          stayType: 'DAY_SLOT',
          minHeadcount: 1,
          maxHeadcount: 3,
          basePrice: 3000,
          requiredDeposit: 1500,
        },
      ],
    };
    const parsed = priceListSchema.safeParse(wrongSlot);
    assert.strictEqual(parsed.success, false);
  });

  it('validates Event Hall price list with opening tier slabs (e.g., 10 to 25 pax) per event_hall.md', () => {
    const hallPriceList = {
      name: 'Non-AC Hall Standard Slabs',
      slug: 'non-ac-hall-standard-slabs',
      unitType: 'NON_AC_HALL',
      maxGuestCapacity: 1200,
      slabs: [
        // MORNING_SLOT starting at opening fee tier (10 pax)
        { stayType: 'MORNING_SLOT', minHeadcount: 10, maxHeadcount: 25, basePrice: 10000, requiredDeposit: 5000 },
        { stayType: 'MORNING_SLOT', minHeadcount: 26, maxHeadcount: 50, basePrice: 16000, requiredDeposit: 5000 },
        { stayType: 'MORNING_SLOT', minHeadcount: 51, maxHeadcount: 100, basePrice: 24000, requiredDeposit: 6000 },
        { stayType: 'MORNING_SLOT', minHeadcount: 101, maxHeadcount: 1200, basePrice: 72000, requiredDeposit: 15000 },
        // EVENING_SLOT starting at opening fee tier (10 pax)
        { stayType: 'EVENING_SLOT', minHeadcount: 10, maxHeadcount: 25, basePrice: 15000, requiredDeposit: 5000 },
        { stayType: 'EVENING_SLOT', minHeadcount: 26, maxHeadcount: 50, basePrice: 22000, requiredDeposit: 5000 },
        { stayType: 'EVENING_SLOT', minHeadcount: 51, maxHeadcount: 100, basePrice: 32000, requiredDeposit: 6000 },
        { stayType: 'EVENING_SLOT', minHeadcount: 101, maxHeadcount: 1200, basePrice: 90000, requiredDeposit: 15000 },
      ],
    };

    const parsed = priceListSchema.safeParse(hallPriceList);
    assert.strictEqual(parsed.success, true);
  });
});

describe('Price Modifier Schema (schemas/price.schema.ts)', () => {
  it('accepts valid price modifier with endDate >= startDate', () => {
    const valid = {
      priceListId: 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d',
      name: 'Weekend Surcharge',
      type: 'WEEKEND',
      percentage: 20,
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-31'),
      isActive: true,
    };
    const parsed = priceModifierSchema.safeParse(valid);
    assert.strictEqual(parsed.success, true);
  });

  it('accepts same-day startDate and endDate (endDate == startDate)', () => {
    const valid = {
      name: 'One-Day Flash Offer',
      type: 'SEASONAL',
      percentage: -15,
      startDate: '2026-10-15',
      endDate: '2026-10-15',
    };
    const parsed = priceModifierSchema.safeParse(valid);
    assert.strictEqual(parsed.success, true);
  });

  it('rejects when endDate < startDate', () => {
    const invalid = {
      name: 'Invalid Promotion',
      type: 'SEASONAL',
      percentage: -10,
      startDate: '2026-10-20',
      endDate: '2026-10-10',
    };
    const parsed = priceModifierSchema.safeParse(invalid);
    assert.strictEqual(parsed.success, false);
    if (!parsed.success) {
      assert.ok(
        parsed.error.issues.some((i) => i.message.includes('End date must be on or after start date'))
      );
    }
  });

  it('enforces percentage boundaries (-80% to +200%)', () => {
    assert.strictEqual(
      priceModifierSchema.safeParse({
        name: 'Too high surge',
        type: 'SEASONAL',
        percentage: 250, // exceeds +200%
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      }).success,
      false
    );

    assert.strictEqual(
      priceModifierSchema.safeParse({
        name: 'Too deep discount',
        type: 'SEASONAL',
        percentage: -90, // exceeds -80%
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      }).success,
      false
    );
  });
});

describe('generateSlug Helper', () => {
  it('converts names to clean slugs', () => {
    assert.strictEqual(generateSlug('Standard Dome - 2 Pax Plan'), 'standard-dome-2-pax-plan');
    assert.strictEqual(generateSlug('AC Hall -- Grand Gala!!'), 'ac-hall-grand-gala');
  });
});

describe('Unit Schema (schemas/unit.schema.ts)', () => {
  it('validates DOME maxCapacity <= 3 and maxInfants <= 2', () => {
    const valid = {
      name: 'Dome 1',
      category: 'DOME',
      maxCapacity: 3,
      maxInfants: 2,
      priceListId: 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d',
    };
    assert.strictEqual(unitSchema.safeParse(valid).success, true);

    const invalidCapacity = {
      ...valid,
      maxCapacity: 4, // Exceeds hard cap 3
    };
    assert.strictEqual(unitSchema.safeParse(invalidCapacity).success, false);
  });

  it('validates A_FRAME maxCapacity <= 5 and maxInfants <= 4', () => {
    const valid = {
      name: 'A-Frame 1',
      category: 'A_FRAME',
      maxCapacity: 5,
      maxInfants: 4,
      priceListId: 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d',
    };
    assert.strictEqual(unitSchema.safeParse(valid).success, true);

    const invalidCapacity = {
      ...valid,
      maxCapacity: 6, // Exceeds hard cap 5
    };
    assert.strictEqual(unitSchema.safeParse(invalidCapacity).success, false);
  });

  it('validates Event Hall does not accept separate infant capacity', () => {
    const hallWithInfants = {
      name: 'Non-AC Event Hall',
      category: 'NON_AC_HALL',
      maxCapacity: 1200,
      maxInfants: 10, // Not allowed for halls
      priceListId: 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d',
    };
    assert.strictEqual(unitSchema.safeParse(hallWithInfants).success, false);
  });

  it('validates toggleUnitStatusSchema', () => {
    const toggle = {
      unitId: 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d',
      isActive: false,
    };
    assert.strictEqual(toggleUnitStatusSchema.safeParse(toggle).success, true);
  });
});

describe('Booking Schema (schemas/booking.schema.ts)', () => {
  it('validates multi-unit booking structure', () => {
    const valid = {
      guestName: 'Anand Kumar',
      guestPhone: '9876543210',
      guestEmail: 'anand@example.com',
      rentCharge: 8000,
      totalPaid: 4000,
      units: [
        {
          unitId: '123e4567-e89b-42d3-a456-426614174000',
          startDatetime: '2026-10-15T12:00:00.000Z',
          endDatetime: '2026-10-16T11:00:00.000Z',
          stayType: 'OVERNIGHT',
          unitPrice: 4000,
          adults: 2,
        },
        {
          unitId: '987fcdeb-51d2-43a1-b456-426614174000',
          startDatetime: '2026-10-15T12:00:00.000Z',
          endDatetime: '2026-10-16T11:00:00.000Z',
          stayType: 'OVERNIGHT',
          unitPrice: 4000,
          adults: 2,
        },
      ],
    };
    assert.strictEqual(bookingSchema.safeParse(valid).success, true);
  });

  it('enforces complimentary unit has unitPrice === 0', () => {
    const complimentaryWithPrice = {
      guestName: 'Anand Kumar',
      guestPhone: '9876543210',
      units: [
        {
          unitId: '123e4567-e89b-42d3-a456-426614174000',
          startDatetime: '2026-10-15T12:00:00.000Z',
          endDatetime: '2026-10-16T11:00:00.000Z',
          stayType: 'OVERNIGHT',
          unitPrice: 2000, // Should be 0 for complimentary
          isComplimentary: true,
        },
      ],
    };
    assert.strictEqual(bookingSchema.safeParse(complimentaryWithPrice).success, false);
  });

  it('rejects booking if unit endDatetime <= startDatetime', () => {
    const invalid = {
      guestName: 'Anand Kumar',
      guestPhone: '9876543210',
      units: [
        {
          unitId: '123e4567-e89b-42d3-a456-426614174000',
          startDatetime: '2026-10-15T12:00:00.000Z',
          endDatetime: '2026-10-15T10:00:00.000Z', // Before start
          stayType: 'OVERNIGHT',
          unitPrice: 4000,
        },
      ],
    };
    assert.strictEqual(bookingSchema.safeParse(invalid).success, false);
  });

  it('rejects booking with non-numeric phone number', () => {
    const invalidPhone = {
      guestName: 'Anand Kumar',
      guestPhone: 'abcdefghij', // 10 letters, invalid
      units: [
        {
          unitId: '123e4567-e89b-42d3-a456-426614174000',
          startDatetime: '2026-10-15T12:00:00.000Z',
          endDatetime: '2026-10-16T11:00:00.000Z',
          stayType: 'OVERNIGHT',
          unitPrice: 4000,
        },
      ],
    };
    assert.strictEqual(bookingSchema.safeParse(invalidPhone).success, false);
  });

  it('rejects booking if it contains internal schedule collisions for the same unit', () => {
    const internalCollision = {
      guestName: 'Anand Kumar',
      guestPhone: '9876543210',
      units: [
        {
          unitId: '123e4567-e89b-42d3-a456-426614174000',
          startDatetime: '2026-10-15T12:00:00.000Z',
          endDatetime: '2026-10-17T11:00:00.000Z',
          stayType: 'OVERNIGHT',
          unitPrice: 4000,
        },
        {
          unitId: '123e4567-e89b-42d3-a456-426614174000', // SAME UNIT
          startDatetime: '2026-10-16T12:00:00.000Z', // OVERLAPPING WITH PREVIOUS
          endDatetime: '2026-10-18T11:00:00.000Z',
          stayType: 'OVERNIGHT',
          unitPrice: 4000,
        },
      ],
    };
    assert.strictEqual(bookingSchema.safeParse(internalCollision).success, false);
  });

  it('validates checkout zero balance due invariant', () => {
    // Exact ₹0 balance: Rent 5000 + Line item 1000 = Total 6000. Total paid = 6000.
    const zeroBalanceCheckout = {
      bookingId: '123e4567-e89b-42d3-a456-426614174000',
      rentCharge: 5000,
      totalPaid: 6000,
      receiptLineItems: [{ description: 'BBQ Setup', amount: 1000 }],
      expectedUpdatedAt: new Date(),
    };
    assert.strictEqual(checkoutBookingSchema.safeParse(zeroBalanceCheckout).success, true);

    // Non-zero balance: Rent 5000 + 1000 = 6000. Total paid = 5000 (Remaining balance ₹1000)
    const unpaidBalanceCheckout = {
      ...zeroBalanceCheckout,
      totalPaid: 5000,
    };
    assert.strictEqual(checkoutBookingSchema.safeParse(unpaidBalanceCheckout).success, false);
  });

  it('validates cancellation refund cannot exceed totalPaid', () => {
    const validCancel = {
      bookingId: '123e4567-e89b-42d3-a456-426614174000',
      totalPaid: 3000,
      refundAmount: 2000,
      cancelReason: 'Guest cancellation',
      expectedUpdatedAt: new Date(),
    };
    assert.strictEqual(cancelBookingSchema.safeParse(validCancel).success, true);

    const excessiveRefund = {
      ...validCancel,
      refundAmount: 4000, // Exceeds totalPaid 3000
    };
    assert.strictEqual(cancelBookingSchema.safeParse(excessiveRefund).success, false);
  });

  it('validates maintenanceBlockSchema', () => {
    const validMaintenance = {
      unitId: '123e4567-e89b-42d3-a456-426614174000',
      startDatetime: '2026-11-01T10:00:00.000Z',
      endDatetime: '2026-11-03T18:00:00.000Z',
      notes: 'Resort annual maintenance and deep clean',
    };
    assert.strictEqual(maintenanceBlockSchema.safeParse(validMaintenance).success, true);
  });

  it('validates addReceiptLineItemSchema with flat or nested fields', () => {
    const validFlat = {
      bookingId: '123e4567-e89b-42d3-a456-426614174000',
      description: 'BBQ Grill Setup',
      amount: 1500,
    };
    assert.strictEqual(addReceiptLineItemSchema.safeParse(validFlat).success, true);

    const validNested = {
      bookingId: '123e4567-e89b-42d3-a456-426614174000',
      lineItem: {
        description: 'Extra Charcoal',
        amount: 300,
      },
    };
    assert.strictEqual(addReceiptLineItemSchema.safeParse(validNested).success, true);

    const invalidNoDescription = {
      bookingId: '123e4567-e89b-42d3-a456-426614174000',
      amount: 500,
    };
    assert.strictEqual(addReceiptLineItemSchema.safeParse(invalidNoDescription).success, false);

    const invalidNoBooking = {
      description: 'Fee',
      amount: 500,
    };
    assert.strictEqual(addReceiptLineItemSchema.safeParse(invalidNoBooking).success, false);
  });

  it('validates recordPaymentSchema and enforces positive amount and OCC timestamp', () => {
    const validPayment = {
      bookingId: '123e4567-e89b-42d3-a456-426614174000',
      amount: 2500,
      expectedUpdatedAt: new Date(),
    };
    assert.strictEqual(recordPaymentSchema.safeParse(validPayment).success, true);

    const invalidNegativeAmount = {
      ...validPayment,
      amount: -100,
    };
    assert.strictEqual(recordPaymentSchema.safeParse(invalidNegativeAmount).success, false);

    const invalidMissingOCC = {
      bookingId: '123e4567-e89b-42d3-a456-426614174000',
      amount: 2500,
    };
    assert.strictEqual(recordPaymentSchema.safeParse(invalidMissingOCC).success, false);
  });
});

describe('Media Schema (schemas/media.schema.ts)', () => {
  it('validates unitPhotoSchema and Cloudinary URL', () => {
    const validPhoto = {
      unitId: '123e4567-e89b-42d3-a456-426614174000',
      url: 'https://res.cloudinary.com/parlak/image/upload/v1234/dome1.jpg',
      caption: 'Dome 1 Panoramic View',
      isFeatured: true,
      orderIndex: 0,
    };
    assert.strictEqual(unitPhotoSchema.safeParse(validPhoto).success, true);
  });

  it('validates reorderUnitPhotosSchema', () => {
    const reorder = {
      unitId: '123e4567-e89b-42d3-a456-426614174000',
      photoIds: [
        '123e4567-e89b-42d3-a456-426614174000',
        '987fcdeb-51d2-43a1-b456-426614174000',
      ],
    };
    assert.strictEqual(reorderUnitPhotosSchema.safeParse(reorder).success, true);
  });

  it('rejects duplicate photo IDs in reorderUnitPhotosSchema', () => {
    const duplicateReorder = {
      unitId: '123e4567-e89b-42d3-a456-426614174000',
      photoIds: [
        '123e4567-e89b-42d3-a456-426614174000',
        '123e4567-e89b-42d3-a456-426614174000', // duplicate
      ],
    };
    assert.strictEqual(reorderUnitPhotosSchema.safeParse(duplicateReorder).success, false);
  });

  it('exposes MAX_PHOTO_FILE_SIZE_BYTES as 3MB', () => {
    assert.strictEqual(MAX_PHOTO_FILE_SIZE_BYTES, 3 * 1024 * 1024);
  });
});

describe('Prisma Schema Alignment (prisma/schema.prisma)', () => {
  it('aligns PriceList schema with Prisma PriceList model', () => {
    const validPriceList = {
      name: 'Standard Dome - 2 Pax Plan',
      slug: 'standard-dome-2-pax-plan',
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
          requiredDeposit: 1500,
        },
      ],
      modifiers: [
        {
          name: 'Weekend Surge (+20%)',
          type: 'WEEKEND',
          percentage: 20,
          startDate: '2026-10-01',
          endDate: '2026-10-31',
        },
      ],
    };
    const parsed = priceListSchema.safeParse(validPriceList);
    assert.strictEqual(parsed.success, true);
    if (parsed.success) {
      assert.strictEqual(parsed.data.name, 'Standard Dome - 2 Pax Plan');
      assert.strictEqual(parsed.data.unitType, 'DOME');
      assert.strictEqual(parsed.data.slabs.length, 2);
      assert.strictEqual(parsed.data.modifiers?.length, 1);
    }
  });

  it('aligns Unit schema with Prisma Unit model', () => {
    const validUnit = {
      name: 'Dome 1',
      category: 'DOME',
      isActive: true,
      maxCapacity: 3,
      maxInfants: 2,
      amenities: ['Private Pool', 'AC', 'Wi-Fi'],
      priceListId: '123e4567-e89b-42d3-a456-426614174000',
    };
    const parsed = unitSchema.safeParse(validUnit);
    assert.strictEqual(parsed.success, true);
    if (parsed.success) {
      // Prisma stores amenities as String
      assert.strictEqual(typeof parsed.data.amenities, 'string');
      assert.strictEqual(parsed.data.category, 'DOME');
      assert.strictEqual(parsed.data.maxCapacity, 3);
      assert.strictEqual(parsed.data.maxInfants, 2);
    }
  });

  it('aligns Booking schema with Prisma Booking model (including flat CRM & triggers)', () => {
    const validBooking = {
      bookingId: '#B001',
      guestName: 'Rahul Verma',
      guestPhone: '9876543210',
      guestEmail: 'rahul@example.com',
      notes: 'Late arrival',
      rentCharge: 5000,
      totalPaid: 2000,
      status: 'CONFIRMED',
      receiptLineItems: [{ description: 'Mineral Water', amount: 50 }],
      refundAmount: 0,
      units: [
        {
          unitId: '123e4567-e89b-42d3-a456-426614174000',
          startDatetime: '2026-10-15T12:00:00.000Z',
          endDatetime: '2026-10-16T11:00:00.000Z',
          stayType: 'OVERNIGHT',
          unitPrice: 5000,
          deposit: 2000,
          bookedBaseRate: 5000,
          adults: 2,
        },
      ],
    };
    const parsed = bookingSchema.safeParse(validBooking);
    assert.strictEqual(parsed.success, true);
    if (parsed.success) {
      assert.strictEqual(parsed.data.guestName, 'Rahul Verma');
      assert.strictEqual(parsed.data.rentCharge, 5000);
      assert.strictEqual(parsed.data.totalPaid, 2000);
      assert.strictEqual(parsed.data.status, 'CONFIRMED');
      assert.strictEqual(parsed.data.units[0].stayType, 'OVERNIGHT');
    }
  });
});

