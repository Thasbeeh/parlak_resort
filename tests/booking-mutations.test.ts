import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { prisma } from '../lib/prisma';
import {
  updateBooking,
  updateBookingAction,
  cancelBooking,
  cancelBookingAction,
  checkoutBooking,
  checkoutBookingAction,
  addReceiptLineItem,
  addReceiptLineItemAction,
  recordPayment,
  recordPaymentAction,
  createMaintenanceBlock,
  createMaintenanceBlockAction,
} from '../actions/bookings';
import { BookingActionError } from '../lib/action-errors';
import {
  calculateUnitIncrementalCharge,
  calculateBookingRentRecalculation,
  calculateHourlyTariff,
} from '../lib/calculate-rent';

describe('Scope-Based Rent Recalculation Engine (lib/calculate-rent.ts)', () => {
  const mockPriceList = {
    id: 'pl-dome-standard',
    unitType: 'DOME',
    maxGuestCapacity: 3,
    slabs: [
      {
        id: 'slab-1',
        stayType: 'OVERNIGHT',
        minHeadcount: 1,
        maxHeadcount: 3,
        basePrice: 5000,
        requiredDeposit: 2000,
      },
      {
        id: 'slab-2',
        stayType: 'DAY_SLOT',
        minHeadcount: 1,
        maxHeadcount: 3,
        basePrice: 3000,
        requiredDeposit: 1000,
      },
    ],
    modifiers: [],
  };

  it('calculates hourly tariff correctly from base price', () => {
    // 5-hour slot: ₹3000 / 5 = ₹600/hr
    assert.strictEqual(calculateHourlyTariff(3000, 'DAY_SLOT'), 600);
    // 23-hour overnight: ₹5000 / 23 = ₹217/hr
    assert.strictEqual(calculateHourlyTariff(5000, 'OVERNIGHT'), 217);
    // Non-positive base price: 0
    assert.strictEqual(calculateHourlyTariff(0, 'DAY_SLOT'), 0);
  });

  it('preserves baseline tariff and charges incremental for extra nights using active rates', () => {
    // Original stay: 1 night, bookedBaseRate = 4000, unitPrice = 4000
    // Active tariff in effect: ₹5,000/night
    // Extended to 2 nights: Night 1 preserves ₹4,000 baseline; Night 2 billed at active ₹5,000
    // Total new price = ₹9,000, incremental = ₹5,000
    const result = calculateUnitIncrementalCharge({
      originalUnit: {
        id: 'bu-1',
        startDatetime: '2026-10-15T06:30:00.000Z',
        endDatetime: '2026-10-16T05:30:00.000Z',
        stayType: 'OVERNIGHT',
        unitPrice: 4000,
        bookedBaseRate: 4000,
        adults: 2,
      },
      newUnit: {
        unitId: 'unit-dome-1',
        startDatetime: '2026-10-15T06:30:00.000Z',
        endDatetime: '2026-10-17T05:30:00.000Z', // 2 nights
        stayType: 'OVERNIGHT',
        adults: 2,
      },
      activePriceList: mockPriceList,
    });

    assert.strictEqual(result.incrementalCharge, 5000);
    assert.strictEqual(result.newUnitPrice, 9000);
    assert.strictEqual(result.breakdown.originalUnitPrice, 4000);
    assert.strictEqual(result.breakdown.extraNightsIncremental, 5000);
  });

  it('does not reduce rent when stay is shortened (flat baseline block & universal partial cancellation rule)', () => {
    // Original stay: 3 nights, unitPrice = 12000
    // Shortened to 2 nights: No auto-refund; incremental charge is 0
    const result = calculateUnitIncrementalCharge({
      originalUnit: {
        id: 'bu-1',
        startDatetime: '2026-10-15T06:30:00.000Z',
        endDatetime: '2026-10-18T05:30:00.000Z', // 3 nights
        stayType: 'OVERNIGHT',
        unitPrice: 12000,
        bookedBaseRate: 4000,
        adults: 2,
      },
      newUnit: {
        unitId: 'unit-dome-1',
        startDatetime: '2026-10-15T06:30:00.000Z',
        endDatetime: '2026-10-17T05:30:00.000Z', // 2 nights
        stayType: 'OVERNIGHT',
        adults: 2,
      },
      activePriceList: mockPriceList,
    });

    assert.strictEqual(result.incrementalCharge, 0);
    assert.strictEqual(result.newUnitPrice, 12000);
  });

  it('calculates headcount upgrade incremental charge using the Apples-to-Apples Algebraic Floor', () => {
    const hallPriceList = {
      id: 'pl-hall',
      unitType: 'NON_AC_HALL',
      maxGuestCapacity: 1200,
      slabs: [
        { stayType: 'MORNING_SLOT', minHeadcount: 10, maxHeadcount: 25, basePrice: 10000, requiredDeposit: 5000 },
        { stayType: 'MORNING_SLOT', minHeadcount: 26, maxHeadcount: 50, basePrice: 16000, requiredDeposit: 5000 },
        { stayType: 'MORNING_SLOT', minHeadcount: 51, maxHeadcount: 100, basePrice: 25000, requiredDeposit: 8000 },
      ],
      modifiers: [],
    };

    // Original booking: 20 attendees (10-25 pax slab), unitPrice = 10000, bookedMaxHeadcount = 25
    // Upgraded to 45 attendees (26-50 pax slab)
    // Incremental: 16000 - 10000 = ₹6,000
    const result = calculateUnitIncrementalCharge({
      originalUnit: {
        id: 'bu-hall',
        startDatetime: '2026-10-15T04:30:00.000Z',
        endDatetime: '2026-10-15T09:30:00.000Z',
        stayType: 'MORNING_SLOT',
        unitPrice: 10000,
        bookedBaseRate: 10000,
        bookedMinHeadcount: 10,
        bookedMaxHeadcount: 25,
        headcount: 20,
      },
      newUnit: {
        unitId: 'unit-hall-1',
        startDatetime: '2026-10-15T04:30:00.000Z',
        endDatetime: '2026-10-15T09:30:00.000Z',
        stayType: 'MORNING_SLOT',
        headcount: 45,
      },
      activePriceList: hallPriceList,
    });

    assert.strictEqual(result.incrementalCharge, 6000);
    assert.strictEqual(result.newUnitPrice, 16000);
    assert.strictEqual(result.breakdown.headcountIncremental, 6000);
  });

  it('charges hourly tariff when event hours are extended beyond standard 5h slot', () => {
    const hallPriceList = {
      id: 'pl-hall',
      unitType: 'NON_AC_HALL',
      maxGuestCapacity: 1200,
      slabs: [
        { stayType: 'MORNING_SLOT', minHeadcount: 10, maxHeadcount: 25, basePrice: 10000, requiredDeposit: 5000 },
      ],
      modifiers: [],
    };

    // Standard Morning slot: 10 AM to 3 PM (5 hours). Hourly tariff: 10000 / 5 = 2000/hr
    // Extended to 10 AM to 5 PM (7 hours -> 2 extra hours)
    // Incremental: 2 * 2000 = ₹4,000
    const result = calculateUnitIncrementalCharge({
      originalUnit: {
        id: 'bu-hall',
        startDatetime: '2026-10-15T04:30:00.000Z', // 10:00 IST
        endDatetime: '2026-10-15T09:30:00.000Z', // 15:00 IST (5 hrs)
        stayType: 'MORNING_SLOT',
        unitPrice: 10000,
        bookedBaseRate: 10000,
        bookedMinHeadcount: 10,
        bookedMaxHeadcount: 25,
        headcount: 20,
      },
      newUnit: {
        unitId: 'unit-hall-1',
        startDatetime: '2026-10-15T04:30:00.000Z', // 10:00 IST
        endDatetime: '2026-10-15T11:30:00.000Z', // 17:00 IST (7 hrs = +2 hrs)
        stayType: 'MORNING_SLOT',
        headcount: 20,
      },
      activePriceList: hallPriceList,
    });

    assert.strictEqual(result.incrementalCharge, 4000);
    assert.strictEqual(result.newUnitPrice, 14000);
    assert.strictEqual(result.breakdown.extraHoursIncremental, 4000);
  });

  it('keeps complimentary units at ₹0 during scope updates', () => {
    const result = calculateUnitIncrementalCharge({
      originalUnit: {
        id: 'bu-comp',
        startDatetime: '2026-10-15T04:30:00.000Z',
        endDatetime: '2026-10-15T09:30:00.000Z',
        stayType: 'MORNING_SLOT',
        unitPrice: 0,
        isComplimentary: true,
      },
      newUnit: {
        unitId: 'unit-dome-1',
        startDatetime: '2026-10-15T04:30:00.000Z',
        endDatetime: '2026-10-15T11:30:00.000Z', // Extended hours
        stayType: 'MORNING_SLOT',
        isComplimentary: true,
      },
      activePriceList: mockPriceList,
    });

    assert.strictEqual(result.isComplimentary, true);
    assert.strictEqual(result.incrementalCharge, 0);
    assert.strictEqual(result.newUnitPrice, 0);
  });

  it('calculates overall booking hybrid rent preserving custom override when provided', () => {
    const unitResults = [
      {
        unitId: 'u1',
        isNewUnit: false,
        isComplimentary: false,
        incrementalCharge: 5000,
        newUnitPrice: 10000,
        breakdown: { headcountIncremental: 0, extraNightsIncremental: 5000, extraHoursIncremental: 0, originalUnitPrice: 5000 },
      },
    ];

    // Recalculated total = 5000 (orig) + 5000 (incr) = 10000
    const autoRecalc = calculateBookingRentRecalculation({
      originalRentCharge: 5000,
      unitResults,
    });
    assert.strictEqual(autoRecalc.recalculatedRentCharge, 10000);
    assert.strictEqual(autoRecalc.finalRentCharge, 10000);

    // If Admin explicitly grants a courtesy override of ₹8,000
    const customOverride = calculateBookingRentRecalculation({
      originalRentCharge: 5000,
      unitResults,
      customRentOverride: 8000,
    });
    assert.strictEqual(customOverride.recalculatedRentCharge, 10000);
    assert.strictEqual(customOverride.finalRentCharge, 8000);
  });
});

describe('Booking Mutations: updateBooking (actions/bookings.ts)', () => {
  const mockBookingId = '123e4567-e89b-42d3-a456-426614174000';
  const mockUnitId = '123e4567-e89b-42d3-a456-426614174001';

  const mockActiveDome = {
    id: mockUnitId,
    name: 'Dome 1',
    category: 'DOME',
    isActive: true,
    maxCapacity: 3,
    maxInfants: 2,
    amenities: 'AC',
    priceList: {
      id: 'pl-1',
      name: 'Plan',
      slug: 'plan',
      unitType: 'DOME',
      maxGuestCapacity: 3,
      slabs: [
        {
          id: 's-1',
          stayType: 'OVERNIGHT',
          minHeadcount: 1,
          maxHeadcount: 3,
          basePrice: 5000,
          requiredDeposit: 2000,
        },
      ],
      modifiers: [],
    },
  };

  it('rejects updateBooking when OCC expectedUpdatedAt is stale (BOOKING_STALE_RECORD 409)', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          booking: {
            findUnique: async () => ({
              id: mockBookingId,
              updatedAt: new Date('2026-10-15T12:00:00.000Z'), // Later than expected
              units: [],
            }),
          },
        };
        return cb(mockTx);
      };

      const payload = {
        id: mockBookingId,
        guestName: 'Rahul Verma',
        guestPhone: '+919876543210',
        expectedUpdatedAt: new Date('2026-10-15T10:00:00.000Z'), // Stale timestamp
        units: [
          {
            unitId: mockUnitId,
            startDatetime: '2026-10-15T06:30:00.000Z',
            endDatetime: '2026-10-16T05:30:00.000Z',
            stayType: 'OVERNIGHT',
            adults: 2,
          },
        ],
      };

      await assert.rejects(
        async () => updateBooking(payload),
        (err: any) => {
          assert.strictEqual(err.code, 'BOOKING_STALE_RECORD');
          assert.strictEqual(err.status, 409);
          assert.ok(err.message.includes('modified by another Admin'));
          return true;
        }
      );
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('updates booking scope and recalculates rent incrementally using active price list', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      let updatedBookingData: any = null;
      let auditLogData: any = null;

      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          booking: {
            findUnique: async () => ({
              id: mockBookingId,
              bookingId: '#B001',
              guestName: 'Rahul Verma',
              guestPhone: '+919876543210',
              rentCharge: 5000,
              totalPaid: 2000,
              status: 'CONFIRMED',
              updatedAt: new Date('2026-10-15T10:00:00.000Z'),
              units: [
                {
                  id: 'bu-1',
                  unitId: mockUnitId,
                  startDatetime: new Date('2026-10-15T06:30:00.000Z'),
                  endDatetime: new Date('2026-10-16T05:30:00.000Z'), // 1 night
                  stayType: 'OVERNIGHT',
                  unitPrice: 5000,
                  bookedBaseRate: 5000,
                  bookedMinHeadcount: 1,
                  bookedMaxHeadcount: 3,
                  adults: 2,
                  unit: mockActiveDome,
                },
              ],
            }),
            update: async (args: any) => {
              updatedBookingData = args.data;
              return { id: mockBookingId, ...args.data, units: [] };
            },
          },
          unit: {
            findUnique: async () => mockActiveDome,
          },
          bookingUnit: {
            deleteMany: async () => ({ count: 1 }),
            createMany: async () => ({ count: 1 }),
          },
          auditLog: {
            create: async (args: any) => {
              auditLogData = args.data;
              return { id: 'audit-1' };
            },
          },
        };
        return cb(mockTx);
      };

      // Extending stay from 1 night to 2 nights:
      // Baseline 5000 + Extra night 5000 = 10000
      const payload = {
        id: mockBookingId,
        guestName: 'Rahul Verma',
        guestPhone: '+919876543210',
        expectedUpdatedAt: new Date('2026-10-15T10:00:00.000Z'),
        units: [
          {
            unitId: mockUnitId,
            startDatetime: '2026-10-15T06:30:00.000Z',
            endDatetime: '2026-10-17T05:30:00.000Z', // 2 nights
            stayType: 'OVERNIGHT',
            adults: 2,
          },
        ],
      };

      const result = await updateBooking(payload);
      assert.ok(result);
      assert.strictEqual(updatedBookingData.rentCharge, 10000);
      assert.strictEqual(auditLogData.action, 'UPDATE_BOOKING');
      assert.strictEqual(auditLogData.entityId, mockBookingId);
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('updateBookingAction returns formatted ActionResponse envelope', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          booking: {
            findUnique: async () => ({
              id: mockBookingId,
              updatedAt: new Date('2026-10-15T12:00:00.000Z'),
              units: [],
            }),
          },
        };
        return cb(mockTx);
      };

      const payload = {
        id: mockBookingId,
        guestName: 'Rahul Verma',
        guestPhone: '+919876543210',
        expectedUpdatedAt: new Date('2026-10-15T10:00:00.000Z'), // Stale
        units: [
          {
            unitId: mockUnitId,
            startDatetime: '2026-10-15T06:30:00.000Z',
            endDatetime: '2026-10-16T05:30:00.000Z',
            stayType: 'OVERNIGHT',
            adults: 2,
          },
        ],
      };

      const res = await updateBookingAction(payload);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.code, 'BOOKING_STALE_RECORD');
      assert.strictEqual(res.status, 409);
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });
});

describe('Booking Cancellations: cancelBooking (actions/bookings.ts)', () => {
  const mockBookingId = '123e4567-e89b-42d3-a456-426614174000';

  it('cancels parent booking and cascades status = CANCELLED to parent and child units', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      let updatedBookingData: any = null;
      let unitUpdates: any[] = [];
      let childBookingUpdates: any[] = [];

      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          booking: {
            findUnique: async () => ({
              id: mockBookingId,
              totalPaid: 5000,
              updatedAt: new Date('2026-10-15T10:00:00.000Z'),
              units: [],
              bundledBookings: [],
            }),
            update: async (args: any) => {
              updatedBookingData = args.data;
              return { id: mockBookingId, ...args.data, units: [] };
            },
            updateMany: async (args: any) => {
              childBookingUpdates.push(args);
              return { count: 1 };
            },
          },
          bookingUnit: {
            updateMany: async (args: any) => {
              unitUpdates.push(args);
              return { count: 1 };
            },
          },
          auditLog: {
            create: async () => ({ id: 'audit-1' }),
          },
        };
        return cb(mockTx);
      };

      const cancelPayload = {
        bookingId: mockBookingId,
        refundAmount: 3000,
        cancelReason: 'Guest requested cancellation',
        expectedUpdatedAt: new Date('2026-10-15T10:00:00.000Z'),
      };

      const result = await cancelBooking(cancelPayload);
      assert.ok(result);
      assert.strictEqual(updatedBookingData.status, 'CANCELLED');
      assert.strictEqual(updatedBookingData.refundAmount, 3000);
      assert.strictEqual(updatedBookingData.cancelReason, 'Guest requested cancellation');

      // Verify cascading updates:
      // 1. Parent booking units updated to CANCELLED
      assert.ok(unitUpdates.some((u) => u.where.bookingId === mockBookingId && u.data.status === 'CANCELLED'));
      // 2. Child bundled bookings updated to CANCELLED
      assert.ok(childBookingUpdates.some((b) => b.where.parentBookingId === mockBookingId && b.data.status === 'CANCELLED'));
      // 3. Child booking units updated to CANCELLED (attached Domes released)
      assert.ok(unitUpdates.some((u) => u.where.booking?.parentBookingId === mockBookingId && u.data.status === 'CANCELLED'));
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('rejects cancelBooking when refundAmount exceeds totalPaid (REFUND_EXCEEDS_TOTAL_PAID 400)', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          booking: {
            findUnique: async () => ({
              id: mockBookingId,
              totalPaid: 2000, // totalPaid is 2000
              updatedAt: new Date('2026-10-15T10:00:00.000Z'),
              units: [],
              bundledBookings: [],
            }),
          },
        };
        return cb(mockTx);
      };

      const excessivePayload = {
        bookingId: mockBookingId,
        refundAmount: 3000, // exceeds totalPaid 2000
        cancelReason: 'Courtesy refund',
        expectedUpdatedAt: new Date('2026-10-15T10:00:00.000Z'),
      };

      await assert.rejects(
        async () => cancelBooking(excessivePayload),
        (err: any) => {
          assert.strictEqual(err.code, 'REFUND_EXCEEDS_TOTAL_PAID');
          assert.strictEqual(err.status, 400);
          return true;
        }
      );
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });
});

describe('Receipts & Line Items: addReceiptLineItem (actions/bookings.ts)', () => {
  const mockBookingId = '123e4567-e89b-42d3-a456-426614174000';

  it('appends custom line item object into receiptLineItems JSONB array', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      let savedLineItems: any = null;

      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          booking: {
            findUnique: async () => ({
              id: mockBookingId,
              receiptLineItems: [{ description: 'Mineral Water', amount: 50 }],
              updatedAt: new Date('2026-10-15T10:00:00.000Z'),
              units: [],
            }),
            update: async (args: any) => {
              savedLineItems = args.data.receiptLineItems;
              return { id: mockBookingId, ...args.data, units: [] };
            },
          },
          auditLog: {
            create: async () => ({ id: 'audit-1' }),
          },
        };
        return cb(mockTx);
      };

      const payload = {
        bookingId: mockBookingId,
        description: 'BBQ Grill Setup',
        amount: 1200,
        expectedUpdatedAt: new Date('2026-10-15T10:00:00.000Z'),
      };

      await addReceiptLineItem(payload);
      assert.strictEqual(savedLineItems.length, 2);
      assert.strictEqual(savedLineItems[0].description, 'Mineral Water');
      assert.strictEqual(savedLineItems[1].description, 'BBQ Grill Setup');
      assert.strictEqual(savedLineItems[1].amount, 1200);
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });
});

describe('Checkout Settlement: checkoutBooking (actions/bookings.ts)', () => {
  const mockBookingId = '123e4567-e89b-42d3-a456-426614174000';

  it('blocks checkout when balance is non-zero (OUTSTANDING_BALANCE_NOT_ZERO 400)', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          booking: {
            findUnique: async () => ({
              id: mockBookingId,
              rentCharge: 5000,
              totalPaid: 4500, // Outstanding balance ₹500
              receiptLineItems: [],
              updatedAt: new Date('2026-10-15T10:00:00.000Z'),
              units: [],
            }),
          },
        };
        return cb(mockTx);
      };

      const payload = {
        bookingId: mockBookingId,
        expectedUpdatedAt: new Date('2026-10-15T10:00:00.000Z'),
      };

      await assert.rejects(
        async () => checkoutBooking(payload),
        (err: any) => {
          assert.strictEqual(err.code, 'OUTSTANDING_BALANCE_NOT_ZERO');
          assert.strictEqual(err.status, 400);
          assert.ok(err.message.includes('Outstanding balance of ₹500'));
          return true;
        }
      );
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('allows checkout and sets status = CHECKED_OUT when balance is mathematically zero', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      let updatedBookingData: any = null;
      let unitStatusUpdate: any = null;

      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          booking: {
            findUnique: async () => ({
              id: mockBookingId,
              rentCharge: 5000,
              totalPaid: 6200, // Exact settlement: 5000 + 1200 - 6200 = 0
              receiptLineItems: [{ description: 'BBQ Grill', amount: 1200 }],
              updatedAt: new Date('2026-10-15T10:00:00.000Z'),
              units: [],
            }),
            update: async (args: any) => {
              updatedBookingData = args.data;
              return { id: mockBookingId, ...args.data, units: [] };
            },
          },
          bookingUnit: {
            updateMany: async (args: any) => {
              unitStatusUpdate = args.data;
              return { count: 1 };
            },
          },
          auditLog: {
            create: async () => ({ id: 'audit-1' }),
          },
        };
        return cb(mockTx);
      };

      const payload = {
        bookingId: mockBookingId,
        expectedUpdatedAt: new Date('2026-10-15T10:00:00.000Z'),
      };

      const result = await checkoutBooking(payload);
      assert.ok(result);
      assert.strictEqual(updatedBookingData.status, 'CHECKED_OUT');
      assert.strictEqual(unitStatusUpdate.status, 'CHECKED_OUT');
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('checkoutBookingAction returns formatted ActionResponse envelope', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          booking: {
            findUnique: async () => ({
              id: mockBookingId,
              rentCharge: 5000,
              totalPaid: 4500, // Balance 500
              receiptLineItems: [],
              updatedAt: new Date('2026-10-15T10:00:00.000Z'),
              units: [],
            }),
          },
        };
        return cb(mockTx);
      };

      const payload = {
        bookingId: mockBookingId,
        expectedUpdatedAt: new Date('2026-10-15T10:00:00.000Z'),
      };

      const res = await checkoutBookingAction(payload);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.code, 'OUTSTANDING_BALANCE_NOT_ZERO');
      assert.strictEqual(res.status, 400);
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });
});

describe('Booking Mutations: Edge Cases & Collision Guards (actions/bookings.ts)', () => {
  const mockBookingId = '123e4567-e89b-42d3-a456-426614174000';
  const mockUnitId = '123e4567-e89b-42d3-a456-426614174001';

  const mockActiveDome = {
    id: mockUnitId,
    name: 'Dome 1',
    category: 'DOME',
    isActive: true,
    maxCapacity: 3,
    maxInfants: 2,
    amenities: 'AC',
    priceList: {
      id: 'pl-1',
      name: 'Plan',
      unitType: 'DOME',
      maxGuestCapacity: 3,
      slabs: [
        {
          id: 's-1',
          stayType: 'OVERNIGHT',
          minHeadcount: 1,
          maxHeadcount: 3,
          basePrice: 5000,
          requiredDeposit: 2000,
        },
      ],
      modifiers: [],
    },
  };

  it('rejects updateBooking when unit capacity of 3 adults is exceeded', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          booking: {
            findUnique: async () => ({
              id: mockBookingId,
              updatedAt: new Date('2026-10-15T10:00:00.000Z'),
              units: [],
            }),
          },
          unit: {
            findUnique: async () => mockActiveDome,
          },
        };
        return cb(mockTx);
      };

      const payload = {
        id: mockBookingId,
        guestName: 'Rahul Verma',
        guestPhone: '+919876543210',
        expectedUpdatedAt: new Date('2026-10-15T10:00:00.000Z'),
        units: [
          {
            unitId: mockUnitId,
            startDatetime: '2026-10-15T06:30:00.000Z',
            endDatetime: '2026-10-16T05:30:00.000Z',
            stayType: 'OVERNIGHT',
            adults: 4, // Exceeds cap 3
          },
        ],
      };

      await assert.rejects(
        async () => updateBooking(payload),
        (err: any) => {
          assert.strictEqual(err.code, 'CAPACITY_EXCEEDED');
          assert.strictEqual(err.status, 400);
          return true;
        }
      );
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('rejects updateBooking when unit is inactive', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          booking: {
            findUnique: async () => ({
              id: mockBookingId,
              updatedAt: new Date('2026-10-15T10:00:00.000Z'),
              units: [],
            }),
          },
          unit: {
            findUnique: async () => ({ ...mockActiveDome, isActive: false }),
          },
        };
        return cb(mockTx);
      };

      const payload = {
        id: mockBookingId,
        guestName: 'Rahul Verma',
        guestPhone: '+919876543210',
        expectedUpdatedAt: new Date('2026-10-15T10:00:00.000Z'),
        units: [
          {
            unitId: mockUnitId,
            startDatetime: '2026-10-15T06:30:00.000Z',
            endDatetime: '2026-10-16T05:30:00.000Z',
            stayType: 'OVERNIGHT',
            adults: 2,
          },
        ],
      };

      await assert.rejects(
        async () => updateBooking(payload),
        (err: any) => {
          assert.strictEqual(err.code, 'UNIT_INACTIVE');
          assert.strictEqual(err.status, 400);
          return true;
        }
      );
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('throws UNIT_SCHEDULE_COLLISION when updateBooking causes schedule collision with another reservation', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          booking: {
            findUnique: async () => ({
              id: mockBookingId,
              updatedAt: new Date('2026-10-15T10:00:00.000Z'),
              units: [],
            }),
          },
          unit: {
            findUnique: async () => mockActiveDome,
          },
          bookingUnit: {
            deleteMany: async () => ({ count: 1 }),
            createMany: async () => {
              // Simulate PostgreSQL exclusion violation
              throw new Error(
                `conflicting key value violates exclusion constraint "no_overlapping_unit_bookings" Detail: Key ("unitId", tstzrange("startDatetime", "endDatetime"))=(${mockUnitId}, ...`
              );
            },
          },
        };
        return cb(mockTx);
      };

      const payload = {
        id: mockBookingId,
        guestName: 'Rahul Verma',
        guestPhone: '+919876543210',
        expectedUpdatedAt: new Date('2026-10-15T10:00:00.000Z'),
        units: [
          {
            unitId: mockUnitId,
            startDatetime: '2026-10-15T06:30:00.000Z',
            endDatetime: '2026-10-16T05:30:00.000Z',
            stayType: 'OVERNIGHT',
            adults: 2,
          },
        ],
      };

      await assert.rejects(
        async () => updateBooking(payload),
        (err: any) => {
          assert.strictEqual(err.code, 'UNIT_SCHEDULE_COLLISION');
          assert.strictEqual(err.status, 409);
          assert.ok(err.message.includes('Dome 1 is already booked'));
          return true;
        }
      );
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('returns 404 BOOKING_NOT_FOUND when target booking does not exist', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          booking: {
            findUnique: async () => null,
          },
        };
        return cb(mockTx);
      };

      // 1. updateBooking 404
      await assert.rejects(
        async () =>
          updateBooking({
            id: mockBookingId,
            guestName: 'Nobody',
            guestPhone: '+919876543210',
            expectedUpdatedAt: new Date(),
            units: [
              {
                unitId: mockUnitId,
                startDatetime: '2026-10-15T06:30:00.000Z',
                endDatetime: '2026-10-16T05:30:00.000Z',
                stayType: 'OVERNIGHT',
                adults: 2,
              },
            ],
          }),
        (err: any) => err.code === 'BOOKING_NOT_FOUND' && err.status === 404
      );

      // 2. cancelBooking 404
      await assert.rejects(
        async () =>
          cancelBooking({
            bookingId: mockBookingId,
            refundAmount: 0,
            cancelReason: 'None',
            expectedUpdatedAt: new Date(),
          }),
        (err: any) => err.code === 'BOOKING_NOT_FOUND' && err.status === 404
      );

      // 3. checkoutBooking 404
      await assert.rejects(
        async () =>
          checkoutBooking({
            bookingId: mockBookingId,
            expectedUpdatedAt: new Date(),
          }),
        (err: any) => err.code === 'BOOKING_NOT_FOUND' && err.status === 404
      );

      // 4. addReceiptLineItem 404
      await assert.rejects(
        async () =>
          addReceiptLineItem({
            bookingId: mockBookingId,
            description: 'Item',
            amount: 100,
          }),
        (err: any) => err.code === 'BOOKING_NOT_FOUND' && err.status === 404
      );
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('cancelBookingAction and addReceiptLineItemAction return formatted ActionResponse envelopes', async () => {
    const resCancel = await cancelBookingAction({
      bookingId: 'invalid-uuid',
      refundAmount: 0,
      cancelReason: 'Test',
      expectedUpdatedAt: new Date(),
    });
    assert.strictEqual(resCancel.success, false);
    assert.strictEqual(resCancel.status, 400);

    const resLineItem = await addReceiptLineItemAction({
      bookingId: 'invalid-uuid',
      description: 'Test Item',
      amount: 100,
    });
    assert.strictEqual(resLineItem.success, false);
    assert.strictEqual(resLineItem.status, 400);
  });

  it('throws "Cannot reschedule: Attached Dome [X] is already booked on the new date." when Hall rescheduling collides with attached Dome', async () => {
    const originalTransaction = prisma.$transaction;
    const mockHallId = '11111111-1111-4111-a111-111111111111';
    const mockAttachedDomeId = '22222222-2222-4222-a222-222222222222';

    try {
      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          booking: {
            findUnique: async () => ({
              id: mockBookingId,
              updatedAt: new Date('2026-10-15T10:00:00.000Z'),
              units: [
                {
                  id: 'bu-hall',
                  unitId: mockHallId,
                  startDatetime: new Date('2026-10-15T04:30:00.000Z'),
                  endDatetime: new Date('2026-10-15T09:30:00.000Z'),
                  stayType: 'MORNING_SLOT',
                  unitPrice: 25000,
                  bookedBaseRate: 25000,
                  bookedMinHeadcount: 10,
                  bookedMaxHeadcount: 50,
                  headcount: 40,
                },
              ],
            }),
            findMany: async () => [],
          },
          unit: {
            findUnique: async ({ where }: any) => {
              if (where.id === mockHallId) {
                return {
                  id: mockHallId,
                  name: 'Non-AC Event Hall',
                  category: 'NON_AC_HALL',
                  isActive: true,
                  maxCapacity: 1200,
                  priceList: {
                    id: 'pl-hall',
                    maxGuestCapacity: 1200,
                    slabs: [
                      {
                        stayType: 'MORNING_SLOT',
                        minHeadcount: 10,
                        maxHeadcount: 50,
                        basePrice: 25000,
                      },
                    ],
                    modifiers: [],
                  },
                };
              }
              return {
                id: mockAttachedDomeId,
                name: 'Dome 1',
                category: 'DOME',
                isActive: true,
                maxCapacity: 3,
                priceList: {
                  id: 'pl-dome',
                  maxGuestCapacity: 3,
                  slabs: [{ stayType: 'MORNING_SLOT', minHeadcount: 1, maxHeadcount: 3, basePrice: 0 }],
                  modifiers: [],
                },
              };
            },
          },
          bookingUnit: {
            deleteMany: async () => ({ count: 2 }),
            createMany: async () => {
              throw new Error(
                `Key ("unitId", tstzrange("startDatetime", "endDatetime"))=(${mockAttachedDomeId}, ...) violates exclusion constraint "no_overlapping_unit_bookings"`
              );
            },
            updateMany: async () => ({ count: 0 }),
          },
        };
        return cb(mockTx);
      };

      const payload = {
        id: mockBookingId,
        guestName: 'Hall Organizer',
        guestPhone: '+919876543210',
        expectedUpdatedAt: new Date('2026-10-15T10:00:00.000Z'),
        units: [
          {
            unitId: mockHallId,
            startDatetime: '2026-10-20T04:30:00.000Z',
            endDatetime: '2026-10-20T09:30:00.000Z',
            stayType: 'MORNING_SLOT',
            headcount: 40,
          },
          {
            unitId: mockAttachedDomeId,
            startDatetime: '2026-10-20T04:30:00.000Z',
            endDatetime: '2026-10-20T09:30:00.000Z',
            stayType: 'MORNING_SLOT',
            isComplimentary: true,
            unitPrice: 0,
          },
        ],
      };

      await assert.rejects(
        async () => updateBooking(payload),
        (err: any) => {
          assert.strictEqual(err.code, 'UNIT_SCHEDULE_COLLISION');
          assert.strictEqual(err.status, 409);
          assert.strictEqual(
            err.message,
            'Cannot reschedule: Attached Dome Dome 1 is already booked on the new date.'
          );
          return true;
        }
      );
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('blocks upward headcount mutations on grandfathered capacities when no active slab exists', () => {
    // Grandfathered booking with 1000 pax capacity when active price list was downsized to max 800 pax
    const downsizedActiveSlabs = [
      {
        id: 's-1',
        stayType: 'MORNING_SLOT',
        minHeadcount: 10,
        maxHeadcount: 100,
        basePrice: 15000,
        requiredDeposit: 5000,
      },
      {
        id: 's-2',
        stayType: 'MORNING_SLOT',
        minHeadcount: 101,
        maxHeadcount: 800,
        basePrice: 50000,
        requiredDeposit: 15000,
      },
    ];

    assert.throws(
      () =>
        calculateUnitIncrementalCharge({
          originalUnit: {
            startDatetime: '2026-10-15T04:30:00.000Z',
            endDatetime: '2026-10-15T09:30:00.000Z',
            stayType: 'MORNING_SLOT',
            unitPrice: 65000,
            bookedBaseRate: 65000,
            bookedMinHeadcount: 801,
            bookedMaxHeadcount: 1000,
            headcount: 950,
          },
          newUnit: {
            unitId: 'hall-1',
            startDatetime: '2026-10-15T04:30:00.000Z',
            endDatetime: '2026-10-15T09:30:00.000Z',
            stayType: 'MORNING_SLOT',
            headcount: 1100, // Exceeds grandfathered max and active max
          },
          activePriceList: {
            id: 'pl-downsized',
            unitType: 'NON_AC_HALL',
            maxGuestCapacity: 800,
            slabs: downsizedActiveSlabs,
            modifiers: [],
          },
        }),
      (err: any) => {
        assert.ok(err.message.includes('Cannot increase headcount to 1100'));
        assert.ok(err.message.includes('Active price list has no matching slab'));
        return true;
      }
    );
  });

  it('evaluates active modifiers against grandfathered bookedBaseRate on Hall date shifts', () => {
    // Hall booking originally on weekday (0% modifier) shifted to Sunday with active +20% weekend modifier
    const result = calculateUnitIncrementalCharge({
      originalUnit: {
        startDatetime: '2026-10-14T04:30:00.000Z', // Wednesday
        endDatetime: '2026-10-14T09:30:00.000Z',
        stayType: 'MORNING_SLOT',
        unitPrice: 30000,
        bookedBaseRate: 30000,
        bookedMinHeadcount: 10,
        bookedMaxHeadcount: 50,
        headcount: 35,
      },
      newUnit: {
        unitId: 'hall-1',
        startDatetime: '2026-10-18T04:30:00.000Z', // Sunday (+20% weekend modifier)
        endDatetime: '2026-10-18T09:30:00.000Z',
        stayType: 'MORNING_SLOT',
        headcount: 35,
      },
      activePriceList: {
        id: 'pl-hall',
        unitType: 'NON_AC_HALL',
        maxGuestCapacity: 1200,
        slabs: [
          {
            stayType: 'MORNING_SLOT',
            minHeadcount: 10,
            maxHeadcount: 50,
            basePrice: 30000,
            requiredDeposit: 10000,
          },
        ],
        modifiers: [
          {
            name: 'Weekend Surge',
            type: 'WEEKEND',
            percentage: 20,
            startDate: new Date('2026-10-01T00:00:00.000Z'),
            endDate: new Date('2026-10-31T23:59:59.000Z'),
            isActive: true,
          },
        ],
      },
    });

    // 20% of 30,000 = 6,000 incremental charge
    assert.strictEqual(result.incrementalCharge, 6000);
    assert.strictEqual(result.newUnitPrice, 36000);
    assert.strictEqual(result.breakdown.dateShiftModifierIncremental, 6000);
  });

  it('records payment and enforces OCC timestamp', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      let updatedTotalPaid = 0;
      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          booking: {
            findUnique: async () => ({
              id: mockBookingId,
              totalPaid: 5000,
              updatedAt: new Date('2026-10-15T10:00:00.000Z'),
              units: [],
            }),
            update: async ({ data }: any) => {
              updatedTotalPaid = data.totalPaid;
              return {
                id: mockBookingId,
                totalPaid: data.totalPaid,
                units: [],
              };
            },
          },
          auditLog: {
            create: async () => ({ id: 'al-pay' }),
          },
        };
        return cb(mockTx);
      };

      const result = await recordPayment({
        bookingId: mockBookingId,
        amount: 2500,
        expectedUpdatedAt: new Date('2026-10-15T10:00:00.000Z'),
      });

      assert.strictEqual(updatedTotalPaid, 7500);
      assert.strictEqual(result.totalPaid, 7500);

      // Verify OCC rejection when record is stale
      await assert.rejects(
        async () =>
          recordPayment({
            bookingId: mockBookingId,
            amount: 1000,
            expectedUpdatedAt: new Date('2026-10-15T09:00:00.000Z'), // Stale!
          }),
        (err: any) => err.code === 'BOOKING_STALE_RECORD' && err.status === 409
      );
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('creates maintenance block and handles schedule collisions', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      let createdStatus = '';
      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          unit: {
            findUnique: async () => ({ id: mockUnitId, category: 'DOME' }),
          },
          bookingUnit: {
            create: async ({ data }: any) => {
              createdStatus = data.status;
              return { id: 'bu-maint-1', ...data, unit: { id: mockUnitId } };
            },
          },
          auditLog: {
            create: async () => ({ id: 'al-maint' }),
          },
        };
        return cb(mockTx);
      };

      const block = await createMaintenanceBlock({
        unitId: mockUnitId,
        startDatetime: '2026-11-01T06:30:00.000Z',
        endDatetime: '2026-11-03T05:30:00.000Z',
        notes: 'Deep cleaning & roof inspection',
      });

      assert.strictEqual(createdStatus, 'MAINTENANCE_BLOCKED');
      assert.strictEqual(block.status, 'MAINTENANCE_BLOCKED');

      // Test collision rejection
      (prisma.$transaction as any) = async () => {
        throw new Error('violates exclusion constraint "no_overlapping_unit_bookings"');
      };

      await assert.rejects(
        async () =>
          createMaintenanceBlock({
            unitId: mockUnitId,
            startDatetime: '2026-11-01T06:30:00.000Z',
            endDatetime: '2026-11-03T05:30:00.000Z',
            notes: 'Deep cleaning',
          }),
        (err: any) => err.code === 'UNIT_SCHEDULE_COLLISION' && err.status === 409
      );
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('calculates unit swap incremental charge when guest is reassigned to higher tier unit', () => {
    const aFramePriceList = {
      id: 'pl-aframe',
      unitType: 'A_FRAME',
      maxGuestCapacity: 5,
      slabs: [
        {
          id: 's-af-1',
          stayType: 'OVERNIGHT',
          minHeadcount: 1,
          maxHeadcount: 5,
          basePrice: 8000,
          requiredDeposit: 3000,
        },
      ],
      modifiers: [],
    };

    // 1. Upgrade from Dome (₹5,000) to A-Frame (₹8,000)
    const upgradeResult = calculateUnitIncrementalCharge({
      originalUnit: {
        unitId: 'dome-1',
        startDatetime: '2026-10-15T06:30:00.000Z',
        endDatetime: '2026-10-16T05:30:00.000Z',
        stayType: 'OVERNIGHT',
        unitPrice: 5000,
        bookedBaseRate: 5000,
      },
      newUnit: {
        unitId: 'aframe-1',
        startDatetime: '2026-10-15T06:30:00.000Z',
        endDatetime: '2026-10-16T05:30:00.000Z',
        stayType: 'OVERNIGHT',
        adults: 2,
      },
      activePriceList: aFramePriceList,
    });

    assert.strictEqual(upgradeResult.incrementalCharge, 3000);
    assert.strictEqual(upgradeResult.newUnitPrice, 8000);
    assert.strictEqual(upgradeResult.breakdown.unitSwapIncremental, 3000);

    // 2. Lateral swap between same tier units (Dome 1 to Dome 2, both ₹5,000)
    const domePriceList = {
      id: 'pl-dome',
      unitType: 'DOME',
      maxGuestCapacity: 3,
      slabs: [
        {
          id: 's-dome-1',
          stayType: 'OVERNIGHT',
          minHeadcount: 1,
          maxHeadcount: 3,
          basePrice: 5000,
          requiredDeposit: 2000,
        },
      ],
      modifiers: [],
    };

    const lateralResult = calculateUnitIncrementalCharge({
      originalUnit: {
        unitId: 'dome-1',
        startDatetime: '2026-10-15T06:30:00.000Z',
        endDatetime: '2026-10-16T05:30:00.000Z',
        stayType: 'OVERNIGHT',
        unitPrice: 5000,
        bookedBaseRate: 5000,
      },
      newUnit: {
        unitId: 'dome-2',
        startDatetime: '2026-10-15T06:30:00.000Z',
        endDatetime: '2026-10-16T05:30:00.000Z',
        stayType: 'OVERNIGHT',
        adults: 2,
      },
      activePriceList: domePriceList,
    });

    assert.strictEqual(lateralResult.incrementalCharge, 0);
    assert.strictEqual(lateralResult.newUnitPrice, 5000);
    assert.strictEqual(lateralResult.breakdown.unitSwapIncremental, 0);

    // 3. Downgrade swap from A-Frame (₹8,000) to Dome (₹5,000) - Universal reduction rule (₹0 incremental, no auto-refund)
    const downgradeResult = calculateUnitIncrementalCharge({
      originalUnit: {
        unitId: 'aframe-1',
        startDatetime: '2026-10-15T06:30:00.000Z',
        endDatetime: '2026-10-16T05:30:00.000Z',
        stayType: 'OVERNIGHT',
        unitPrice: 8000,
        bookedBaseRate: 8000,
      },
      newUnit: {
        unitId: 'dome-1',
        startDatetime: '2026-10-15T06:30:00.000Z',
        endDatetime: '2026-10-16T05:30:00.000Z',
        stayType: 'OVERNIGHT',
        adults: 2,
      },
      activePriceList: domePriceList,
    });

    assert.strictEqual(downgradeResult.incrementalCharge, 0);
    assert.strictEqual(downgradeResult.newUnitPrice, 8000);
    assert.strictEqual(downgradeResult.breakdown.unitSwapIncremental, 0);
  });
});


