import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  IST_TIMEZONE,
  STANDARD_SLOT_TIMINGS,
  getISTDateString,
  addDaysToISTDate,
  createISTDateTime,
  mapPresetToDateRange,
  calculateNightsBetween,
  formatISTDateTime,
  formatISTTime,
  doTimeRangesOverlap,
  createCustomDateRange,
  isStandardPresetTiming,
} from '../lib/date-utils';
import {
  createBooking,
  createBookingAction,
  isUnitScheduleCollision,
  generateNextBookingId,
} from '../actions/bookings';
import {
  BookingActionError,
  UnitScheduleCollisionError,
  NEON_TRANSACTION_OPTIONS,
} from '../lib/action-errors';

describe('Timezone Utils & Slot Presets (lib/date-utils.ts)', () => {
  it('strictly maps MORNING_SLOT preset to 10:00 to 15:00 IST on the same day', () => {
    const range = mapPresetToDateRange('MORNING_SLOT', '2026-10-15');

    // 10:00 IST = 04:30 UTC
    assert.strictEqual(range.startDatetime.toISOString(), '2026-10-15T04:30:00.000Z');
    // 15:00 IST = 09:30 UTC
    assert.strictEqual(range.endDatetime.toISOString(), '2026-10-15T09:30:00.000Z');

    assert.strictEqual(getISTDateString(range.startDatetime), '2026-10-15');
    assert.strictEqual(getISTDateString(range.endDatetime), '2026-10-15');
    assert.strictEqual(formatISTTime(range.startDatetime), '10:00 am IST');
    assert.strictEqual(formatISTTime(range.endDatetime), '03:00 pm IST');
  });

  it('strictly maps EVENING_SLOT preset to 17:00 to 22:00 IST on the same day', () => {
    const range = mapPresetToDateRange('EVENING_SLOT', '2026-10-15');

    // 17:00 IST = 11:30 UTC
    assert.strictEqual(range.startDatetime.toISOString(), '2026-10-15T11:30:00.000Z');
    // 22:00 IST = 16:30 UTC
    assert.strictEqual(range.endDatetime.toISOString(), '2026-10-15T16:30:00.000Z');

    assert.strictEqual(getISTDateString(range.startDatetime), '2026-10-15');
    assert.strictEqual(getISTDateString(range.endDatetime), '2026-10-15');
    assert.strictEqual(formatISTTime(range.startDatetime), '05:00 pm IST');
    assert.strictEqual(formatISTTime(range.endDatetime), '10:00 pm IST');
  });

  it('strictly maps DAY_SLOT preset to 10:00 to 15:00 IST on the same day', () => {
    const range = mapPresetToDateRange('DAY_SLOT', '2026-10-15');

    assert.strictEqual(range.startDatetime.toISOString(), '2026-10-15T04:30:00.000Z');
    assert.strictEqual(range.endDatetime.toISOString(), '2026-10-15T09:30:00.000Z');
  });

  it('strictly maps OVERNIGHT preset to 12:00 PM check-in and 11:00 AM next-day check-out', () => {
    const range = mapPresetToDateRange('OVERNIGHT', '2026-10-15', 1);

    // 12:00 PM IST on Oct 15 = 06:30 UTC
    assert.strictEqual(range.startDatetime.toISOString(), '2026-10-15T06:30:00.000Z');
    // 11:00 AM IST on Oct 16 = 05:30 UTC
    assert.strictEqual(range.endDatetime.toISOString(), '2026-10-16T05:30:00.000Z');

    assert.strictEqual(getISTDateString(range.startDatetime), '2026-10-15');
    assert.strictEqual(getISTDateString(range.endDatetime), '2026-10-16');
  });

  it('correctly maps multi-night OVERNIGHT stays across month boundaries', () => {
    // 3 nights from Oct 30, 2026 -> check-out on Nov 2, 2026 at 11:00 AM IST
    const range = mapPresetToDateRange('OVERNIGHT', '2026-10-30', 3);

    assert.strictEqual(getISTDateString(range.startDatetime), '2026-10-30');
    assert.strictEqual(getISTDateString(range.endDatetime), '2026-11-02');
    assert.strictEqual(range.startDatetime.toISOString(), '2026-10-30T06:30:00.000Z');
    assert.strictEqual(range.endDatetime.toISOString(), '2026-11-02T05:30:00.000Z');
  });

  it('calculates nights accurately between standard check-in and check-out datetimes', () => {
    const oneNight = mapPresetToDateRange('OVERNIGHT', '2026-10-10', 1);
    assert.strictEqual(calculateNightsBetween(oneNight.startDatetime, oneNight.endDatetime), 1);

    const fourNights = mapPresetToDateRange('OVERNIGHT', '2026-10-10', 4);
    assert.strictEqual(calculateNightsBetween(fourNights.startDatetime, fourNights.endDatetime), 4);

    // Same day times (Day slot / Morning slot)
    const daySlot = mapPresetToDateRange('DAY_SLOT', '2026-10-10');
    assert.strictEqual(calculateNightsBetween(daySlot.startDatetime, daySlot.endDatetime), 0);
  });

  it('checks time range overlaps accurately', () => {
    const morning = mapPresetToDateRange('MORNING_SLOT', '2026-10-15');
    const evening = mapPresetToDateRange('EVENING_SLOT', '2026-10-15');

    // Morning (10:00-15:00) and Evening (17:00-22:00) on the same day do not overlap
    assert.strictEqual(
      doTimeRangesOverlap(
        morning.startDatetime,
        morning.endDatetime,
        evening.startDatetime,
        evening.endDatetime
      ),
      false
    );

    // Overnight (12:00 to 11:00 next day) overlaps with morning slot on check-in date
    const overnight = mapPresetToDateRange('OVERNIGHT', '2026-10-15', 1);
    assert.strictEqual(
      doTimeRangesOverlap(
        morning.startDatetime,
        morning.endDatetime,
        overnight.startDatetime,
        overnight.endDatetime
      ),
      true
    );
  });

  it('creates custom stay date ranges for negotiated check-in/out hours (rooms.md line 34)', () => {
    // 4:00 PM check-in (16:00 IST), 9:00 AM check-out next day (09:00 IST)
    const custom = createCustomDateRange('2026-10-15', '16:00', '09:00', 1);

    // 16:00 IST = 10:30 UTC
    assert.strictEqual(custom.startDatetime.toISOString(), '2026-10-15T10:30:00.000Z');
    // 09:00 IST = 03:30 UTC
    assert.strictEqual(custom.endDatetime.toISOString(), '2026-10-16T03:30:00.000Z');

    // Verifies custom hours are correctly flagged as non-standard
    assert.strictEqual(
      isStandardPresetTiming('OVERNIGHT', custom.startDatetime, custom.endDatetime),
      false
    );

    // Standard preset is identified as standard
    const standard = mapPresetToDateRange('OVERNIGHT', '2026-10-15', 1);
    assert.strictEqual(
      isStandardPresetTiming('OVERNIGHT', standard.startDatetime, standard.endDatetime),
      true
    );
  });

  it('throws descriptive error on invalid preset type or invalid date', () => {
    assert.throws(
      () => mapPresetToDateRange('INVALID_PRESET' as any, '2026-10-15'),
      /Unknown or unsupported stay type preset/
    );
    assert.throws(
      () => mapPresetToDateRange('MORNING_SLOT', 'not-a-valid-date'),
      /Invalid date input/
    );
  });
});

describe('Booking Core: Payload Validation & Input Guards (actions/bookings.ts)', () => {
  it('rejects booking creation when guest phone number format is invalid', async () => {
    const invalidPayload = {
      guestName: 'Rahul Verma',
      guestPhone: '123', // Invalid phone length
      units: [
        {
          unitId: '123e4567-e89b-42d3-a456-426614174000',
          startDatetime: '2026-10-15T04:30:00.000Z',
          endDatetime: '2026-10-15T09:30:00.000Z',
          stayType: 'MORNING_SLOT',
        },
      ],
    };

    await assert.rejects(
      async () => createBooking(invalidPayload),
      (err: any) => {
        assert.strictEqual(err.code, 'VALIDATION_ERROR');
        assert.strictEqual(err.status, 400);
        return true;
      }
    );
  });

  it('rejects booking creation when units array is empty', async () => {
    const noUnitsPayload = {
      guestName: 'Rahul Verma',
      guestPhone: '+919876543210',
      units: [],
    };

    await assert.rejects(
      async () => createBooking(noUnitsPayload),
      (err: any) => {
        assert.strictEqual(err.code, 'VALIDATION_ERROR');
        return true;
      }
    );
  });

  it('rejects booking creation when payload contains internal schedule collisions for the same unit', async () => {
    const collidingPayload = {
      guestName: 'Rahul Verma',
      guestPhone: '+919876543210',
      units: [
        {
          unitId: '123e4567-e89b-42d3-a456-426614174000',
          startDatetime: '2026-10-15T06:30:00.000Z',
          endDatetime: '2026-10-17T05:30:00.000Z',
          stayType: 'OVERNIGHT',
          adults: 2,
        },
        {
          unitId: '123e4567-e89b-42d3-a456-426614174000', // SAME UNIT
          startDatetime: '2026-10-16T06:30:00.000Z', // OVERLAPS WITH PREVIOUS
          endDatetime: '2026-10-18T05:30:00.000Z',
          stayType: 'OVERNIGHT',
          adults: 2,
        },
      ],
    };

    await assert.rejects(
      async () => createBooking(collidingPayload),
      (err: any) => {
        assert.strictEqual(err.code, 'VALIDATION_ERROR');
        assert.ok(err.message.includes('overlapping time windows'));
        return true;
      }
    );
  });
});

describe('Booking Core: Price Snapshotting & Business Invariants', () => {
  const mockUnitId = '123e4567-e89b-42d3-a456-426614174001';
  const mockPriceListId = '123e4567-e89b-42d3-a456-426614174002';

  const mockActivePriceList = {
    id: mockPriceListId,
    name: 'Standard Dome Plan',
    slug: 'standard-dome-plan',
    unitType: 'DOME',
    maxGuestCapacity: 3,
    slabs: [
      {
        id: 'slab-1',
        priceListId: mockPriceListId,
        stayType: 'OVERNIGHT',
        minHeadcount: 1,
        maxHeadcount: 3,
        basePrice: 5000,
        requiredDeposit: 2000,
      },
      {
        id: 'slab-2',
        priceListId: mockPriceListId,
        stayType: 'DAY_SLOT',
        minHeadcount: 1,
        maxHeadcount: 3,
        basePrice: 3000,
        requiredDeposit: 1000,
      },
    ],
    modifiers: [
      {
        id: 'mod-1',
        priceListId: mockPriceListId,
        name: 'Weekend Surge',
        type: 'WEEKEND',
        percentage: 20,
        startDate: new Date('2026-10-01T00:00:00.000Z'),
        endDate: new Date('2026-10-31T23:59:59.999Z'),
        isActive: true,
      },
    ],
  };

  const mockActiveDome = {
    id: mockUnitId,
    name: 'Dome 1',
    category: 'DOME',
    isActive: true,
    maxCapacity: 3,
    maxInfants: 2,
    amenities: 'AC, Pool',
    priceListId: mockPriceListId,
    priceList: mockActivePriceList,
  };

  it('rejects booking when unit is inactive (Sold Out guard)', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          unit: {
            findUnique: async () => ({
              ...mockActiveDome,
              isActive: false, // INACTIVE
            }),
          },
        };
        return cb(mockTx);
      };

      const payload = {
        guestName: 'Arjun Das',
        guestPhone: '+919876543210',
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
        async () => createBooking(payload),
        (err: any) => {
          assert.strictEqual(err.code, 'UNIT_INACTIVE');
          assert.strictEqual(err.status, 400);
          assert.ok(err.message.includes('Inactive'));
          return true;
        }
      );
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('rejects booking when Dome hard capacity of 3 adults is exceeded', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          unit: {
            findUnique: async () => mockActiveDome,
          },
        };
        return cb(mockTx);
      };

      const oversizedPayload = {
        guestName: 'Arjun Das',
        guestPhone: '+919876543210',
        units: [
          {
            unitId: mockUnitId,
            startDatetime: '2026-10-15T06:30:00.000Z',
            endDatetime: '2026-10-16T05:30:00.000Z',
            stayType: 'OVERNIGHT',
            adults: 4, // EXCEEDS DOME CAP OF 3
          },
        ],
      };

      await assert.rejects(
        async () => createBooking(oversizedPayload),
        (err: any) => {
          assert.strictEqual(err.code, 'CAPACITY_EXCEEDED');
          assert.strictEqual(err.status, 400);
          assert.ok(err.message.includes('Hard cap exceeded'));
          return true;
        }
      );
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('rejects booking when Dome hard capacity of 2 infants is exceeded', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          unit: {
            findUnique: async () => mockActiveDome,
          },
        };
        return cb(mockTx);
      };

      const excessiveInfantsPayload = {
        guestName: 'Family Guest',
        guestPhone: '+919876543210',
        units: [
          {
            unitId: mockUnitId,
            startDatetime: '2026-10-15T06:30:00.000Z',
            endDatetime: '2026-10-16T05:30:00.000Z',
            stayType: 'OVERNIGHT',
            adults: 2,
            infants: 3, // EXCEEDS DOME INFANT CAP OF 2
          },
        ],
      };

      await assert.rejects(
        async () => createBooking(excessiveInfantsPayload),
        (err: any) => {
          assert.strictEqual(err.code, 'CAPACITY_EXCEEDED');
          assert.strictEqual(err.status, 400);
          assert.ok(err.message.includes('allows a maximum of 2 infants'));
          return true;
        }
      );
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('snapshots initial prices and executes atomic creation successfully', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      let createdBookingData: any = null;
      let createdAuditData: any = null;

      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          unit: {
            findUnique: async () => mockActiveDome,
          },
          booking: {
            findFirst: async () => ({ bookingId: '#B004' }),
            count: async () => 4,
            create: async (args: any) => {
              createdBookingData = args.data;
              return {
                id: 'booking-uuid-1',
                ...args.data,
                units: args.data.units.create.map((u: any, idx: number) => ({
                  id: `bu-${idx + 1}`,
                  ...u,
                  unit: {
                    id: mockActiveDome.id,
                    name: mockActiveDome.name,
                    category: mockActiveDome.category,
                  },
                })),
              };
            },
          },
          auditLog: {
            create: async (args: any) => {
              createdAuditData = args.data;
              return { id: 'audit-1', ...args.data };
            },
          },
        };
        return cb(mockTx);
      };

      // Overnight booking for 1 night on Thursday (Weekday)
      const payload = {
        guestName: 'Naveen Raj',
        guestPhone: '+919876543210',
        units: [
          {
            unitId: mockUnitId,
            startDatetime: '2026-10-15T06:30:00.000Z', // Thursday 12:00 PM IST
            endDatetime: '2026-10-16T05:30:00.000Z', // Friday 11:00 AM IST
            stayType: 'OVERNIGHT',
            adults: 2,
          },
        ],
      };

      const booking = await createBooking(payload);

      // Verify generated sequential booking ID: #B004 + 1 -> #B005
      assert.strictEqual(booking.bookingId, '#B005');
      assert.strictEqual(booking.guestName, 'Naveen Raj');

      // Verify snapshotting on unit:
      const unitSnapshot = createdBookingData.units.create[0];
      assert.strictEqual(unitSnapshot.bookedBaseRate, 5000);
      assert.strictEqual(unitSnapshot.bookedMinHeadcount, 1);
      assert.strictEqual(unitSnapshot.bookedMaxHeadcount, 3);
      assert.strictEqual(unitSnapshot.deposit, 2000);
      // Weekday overnight: no weekend surge applied -> ₹5,000
      assert.strictEqual(unitSnapshot.unitPrice, 5000);
      assert.strictEqual(createdBookingData.rentCharge, 5000);

      // Verify AuditLog creation
      assert.strictEqual(createdAuditData.action, 'CREATE_BOOKING');
      assert.strictEqual(createdAuditData.entityType, 'Booking');
      assert.strictEqual(createdAuditData.entityId, 'booking-uuid-1');
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('correctly applies weekend modifier for weekend overnight stays during snapshotting', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      let createdBookingData: any = null;

      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          unit: {
            findUnique: async () => mockActiveDome,
          },
          booking: {
            findFirst: async () => null,
            count: async () => 0,
            create: async (args: any) => {
              createdBookingData = args.data;
              return { id: 'b-1', ...args.data, units: [] };
            },
          },
          auditLog: {
            create: async () => ({ id: 'a-1' }),
          },
        };
        return cb(mockTx);
      };

      // Saturday overnight check-in (2026-10-10 at 12:00 PM IST)
      // Base: ₹5,000 + 20% weekend modifier = ₹6,000
      const payload = {
        guestName: 'Weekend Guest',
        guestPhone: '+919876543210',
        units: [
          {
            unitId: mockUnitId,
            startDatetime: '2026-10-10T06:30:00.000Z',
            endDatetime: '2026-10-11T05:30:00.000Z',
            stayType: 'OVERNIGHT',
            adults: 2,
          },
        ],
      };

      await createBooking(payload);

      const unitSnapshot = createdBookingData.units.create[0];
      assert.strictEqual(unitSnapshot.bookedBaseRate, 5000);
      assert.strictEqual(unitSnapshot.unitPrice, 6000); // 5000 + 20%
      assert.strictEqual(createdBookingData.rentCharge, 6000);
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('correctly handles complimentary attached units (unitPrice = 0, bookedBaseRate = 0)', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      let createdBookingData: any = null;

      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          unit: {
            findUnique: async () => mockActiveDome,
          },
          booking: {
            findFirst: async () => null,
            count: async () => 0,
            create: async (args: any) => {
              createdBookingData = args.data;
              return { id: 'b-comp', ...args.data, units: [] };
            },
          },
          auditLog: {
            create: async () => ({ id: 'a-1' }),
          },
        };
        return cb(mockTx);
      };

      const payload = {
        guestName: 'Reception VIP',
        guestPhone: '+919876543210',
        units: [
          {
            unitId: mockUnitId,
            startDatetime: '2026-10-15T04:30:00.000Z',
            endDatetime: '2026-10-15T09:30:00.000Z',
            stayType: 'DAY_SLOT',
            isComplimentary: true,
            unitPrice: 0,
            adults: 2,
          },
        ],
      };

      await createBooking(payload);

      const unitSnapshot = createdBookingData.units.create[0];
      assert.strictEqual(unitSnapshot.isComplimentary, true);
      assert.strictEqual(unitSnapshot.bookedBaseRate, 0);
      assert.strictEqual(unitSnapshot.unitPrice, 0);
      assert.strictEqual(unitSnapshot.deposit, 0);
      assert.strictEqual(createdBookingData.rentCharge, 0);
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });
});

describe('Booking Core: Concurrency & Exclusion Collision Error Handling', () => {
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

  it('identifies collision errors from Prisma P2002 and PostgreSQL 23P01', () => {
    // 1. Prisma P2002 targeting exclusion constraint
    const prismaP2002 = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the constraint: no_overlapping_unit_bookings',
      {
        code: 'P2002',
        clientVersion: '7.9.1',
        meta: { target: ['no_overlapping_unit_bookings'] },
      }
    );
    assert.strictEqual(isUnitScheduleCollision(prismaP2002), true);

    // 2. PostgreSQL raw 23P01 exclusion violation
    const pg23P01 = {
      code: '23P01',
      message: 'conflicting key value violates exclusion constraint "no_overlapping_unit_bookings"',
    };
    assert.strictEqual(isUnitScheduleCollision(pg23P01), true);

    // 3. Unrelated P2002 (e.g. Booking_bookingId_key) is not a unit schedule collision
    const bookingIdP2002 = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the constraint: Booking_bookingId_key',
      {
        code: 'P2002',
        clientVersion: '7.9.1',
        meta: { target: ['bookingId'] },
      }
    );
    assert.strictEqual(isUnitScheduleCollision(bookingIdP2002), false);
  });

  it('explicitly throws UNIT_SCHEDULE_COLLISION when Prisma throws P2002 on no_overlapping_unit_bookings', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      (prisma.$transaction as any) = async () => {
        // Simulate PostgreSQL GiST exclusion constraint rejection via Prisma P2002
        throw new Prisma.PrismaClientKnownRequestError(
          'Unique constraint failed on the constraint: no_overlapping_unit_bookings',
          {
            code: 'P2002',
            clientVersion: '7.9.1',
            meta: { target: ['no_overlapping_unit_bookings'] },
          }
        );
      };

      const payload = {
        guestName: 'Concurrent Booker',
        guestPhone: '+919876543210',
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
        async () => createBooking(payload),
        (err: any) => {
          assert.ok(err instanceof UnitScheduleCollisionError);
          assert.strictEqual(err.code, 'UNIT_SCHEDULE_COLLISION');
          assert.strictEqual(err.name, 'UNIT_SCHEDULE_COLLISION');
          assert.strictEqual(err.status, 409);
          assert.ok(err.message.includes('already booked during this time window'));
          return true;
        }
      );
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('createBookingAction returns formatted 409 error envelope on schedule collision', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      (prisma.$transaction as any) = async () => {
        throw new Prisma.PrismaClientKnownRequestError(
          'conflicting key value violates exclusion constraint "no_overlapping_unit_bookings"',
          {
            code: 'P2002',
            clientVersion: '7.9.1',
            meta: { target: ['no_overlapping_unit_bookings'] },
          }
        );
      };

      const payload = {
        guestName: 'Concurrent Booker',
        guestPhone: '+919876543210',
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

      const res = await createBookingAction(payload);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.code, 'UNIT_SCHEDULE_COLLISION');
      assert.strictEqual(res.status, 409);
      assert.ok(res.error?.includes('already booked during this time window'));
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('correctly identifies the exact colliding unit name in multi-unit bundle collisions', async () => {
    const mockAFrameId = '123e4567-e89b-42d3-a456-426614174099';
    const originalTransaction = prisma.$transaction;
    try {
      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          unit: {
            findUnique: async ({ where }: any) => {
              if (where.id === mockUnitId) return mockActiveDome;
              return {
                id: mockAFrameId,
                name: 'A-Frame 2',
                category: 'A_FRAME',
                isActive: true,
                maxCapacity: 5,
                maxInfants: 4,
                priceList: {
                  id: 'pl-af-2',
                  name: 'A-Frame Plan',
                  slug: 'a-frame-plan',
                  unitType: 'A_FRAME',
                  maxGuestCapacity: 5,
                  slabs: [
                    {
                      id: 'slab-af-1',
                      priceListId: 'pl-af-2',
                      stayType: 'OVERNIGHT',
                      minHeadcount: 1,
                      maxHeadcount: 5,
                      basePrice: 7000,
                      requiredDeposit: 2000,
                    },
                  ],
                  modifiers: [],
                },
              };
            },
          },
          booking: {
            findFirst: async () => null,
            count: async () => 0,
            create: async () => {
              // Simulate PostgreSQL detail message pointing specifically to A-Frame 2
              throw new Error(
                `conflicting key value violates exclusion constraint "no_overlapping_unit_bookings" Detail: Key ("unitId", tstzrange("startDatetime", "endDatetime"))=(${mockAFrameId}, ["2026-10-15 06:30:00+00","2026-10-16 05:30:00+00"])) conflicts with existing key.`
              );
            },
          },
        };
        return cb(mockTx);
      };

      const multiUnitPayload = {
        guestName: 'Multi Booker',
        guestPhone: '+919876543210',
        units: [
          {
            unitId: mockUnitId, // Dome 1 (Free)
            startDatetime: '2026-10-15T06:30:00.000Z',
            endDatetime: '2026-10-16T05:30:00.000Z',
            stayType: 'OVERNIGHT',
            adults: 2,
          },
          {
            unitId: mockAFrameId, // A-Frame 2 (Colliding)
            startDatetime: '2026-10-15T06:30:00.000Z',
            endDatetime: '2026-10-16T05:30:00.000Z',
            stayType: 'OVERNIGHT',
            adults: 4,
          },
        ],
      };

      await assert.rejects(
        async () => createBooking(multiUnitPayload),
        (err: any) => {
          assert.strictEqual(err.code, 'UNIT_SCHEDULE_COLLISION');
          assert.strictEqual(err.status, 409);
          // Crucial: Names A-Frame 2 specifically, NOT Dome 1!
          assert.ok(err.message.includes('A-Frame 2 is already booked'));
          return true;
        }
      );
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('rejects booking creation when custom bookingId is already taken', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      (prisma.$transaction as any) = async () => {
        throw new Prisma.PrismaClientKnownRequestError(
          'Unique constraint failed on the constraint: Booking_bookingId_key',
          {
            code: 'P2002',
            clientVersion: '7.9.1',
            meta: { target: ['bookingId'] },
          }
        );
      };

      const payload = {
        bookingId: '#B001',
        guestName: 'Duplicate ID Booker',
        guestPhone: '+919876543210',
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
        async () => createBooking(payload),
        (err: any) => {
          assert.strictEqual(err.code, 'BOOKING_ID_ALREADY_EXISTS');
          assert.strictEqual(err.status, 409);
          assert.ok(err.message.includes('already taken'));
          return true;
        }
      );
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('rejects booking creation when parentBookingId does not exist', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          booking: {
            findUnique: async () => null, // Parent not found
          },
        };
        return cb(mockTx);
      };

      const payload = {
        guestName: 'Child Booker',
        guestPhone: '+919876543210',
        parentBookingId: '123e4567-e89b-42d3-a456-426614174888',
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
        async () => createBooking(payload),
        (err: any) => {
          assert.strictEqual(err.code, 'PARENT_BOOKING_NOT_FOUND');
          assert.strictEqual(err.status, 404);
          return true;
        }
      );
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('handles attached complimentary dome during evening hall slot without throwing NO_MATCHING_PRICE_SLAB', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      let createdUnits: any = null;
      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          unit: {
            findUnique: async () => mockActiveDome, // Only has OVERNIGHT and DAY_SLOT slabs
          },
          booking: {
            findFirst: async () => null,
            count: async () => 0,
            create: async (args: any) => {
              createdUnits = args.data.units.create;
              return { id: 'b-hall-comp', ...args.data, units: [] };
            },
          },
          auditLog: {
            create: async () => ({ id: 'a-1' }),
          },
        };
        return cb(mockTx);
      };

      // Dome attached to an EVENING_SLOT (5 PM to 10 PM)
      const payload = {
        guestName: 'Hall Event Organizer',
        guestPhone: '+919876543210',
        units: [
          {
            unitId: mockUnitId,
            startDatetime: '2026-10-15T11:30:00.000Z', // 17:00 IST
            endDatetime: '2026-10-15T16:30:00.000Z', // 22:00 IST
            stayType: 'EVENING_SLOT',
            isComplimentary: true,
            adults: 2,
          },
        ],
      };

      const booking = await createBooking(payload);
      assert.ok(booking);
      assert.strictEqual(createdUnits[0].unitPrice, 0);
      assert.strictEqual(createdUnits[0].bookedBaseRate, 0);
      assert.strictEqual(createdUnits[0].isComplimentary, true);
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('displays distinct Cannot attach Dome alert when attached Dome collides in a Hall bundle (event_hall.md lines 117-118)', async () => {
    const mockHallId = '123e4567-e89b-42d3-a456-426614174777';
    const originalTransaction = prisma.$transaction;
    try {
      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
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
                    name: 'Hall Plan',
                    unitType: 'NON_AC_HALL',
                    maxGuestCapacity: 1200,
                    slabs: [
                      {
                        id: 's-h-1',
                        stayType: 'MORNING_SLOT',
                        minHeadcount: 1,
                        maxHeadcount: 500,
                        basePrice: 50000,
                        requiredDeposit: 10000,
                      },
                    ],
                    modifiers: [],
                  },
                };
              }
              return mockActiveDome; // Dome 1
            },
          },
          booking: {
            findFirst: async () => null,
            count: async () => 0,
            create: async () => {
              // Simulate PostgreSQL exclusion failure on Dome 1
              throw new Error(
                `conflicting key value violates exclusion constraint "no_overlapping_unit_bookings" Detail: Key ("unitId", tstzrange("startDatetime", "endDatetime"))=(${mockUnitId}, ...`
              );
            },
          },
        };
        return cb(mockTx);
      };

      const hallWithAttachedDomePayload = {
        guestName: 'Hall Organizer',
        guestPhone: '+919876543210',
        units: [
          {
            unitId: mockHallId,
            startDatetime: '2026-10-15T04:30:00.000Z',
            endDatetime: '2026-10-15T09:30:00.000Z',
            stayType: 'MORNING_SLOT',
            headcount: 450,
          },
          {
            unitId: mockUnitId, // Attached Dome 1
            startDatetime: '2026-10-15T04:30:00.000Z',
            endDatetime: '2026-10-15T09:30:00.000Z',
            stayType: 'MORNING_SLOT',
            isComplimentary: true,
            adults: 2,
          },
        ],
      };

      await assert.rejects(
        async () => createBooking(hallWithAttachedDomePayload),
        (err: any) => {
          assert.strictEqual(err.code, 'UNIT_SCHEDULE_COLLISION');
          assert.strictEqual(err.status, 409);
          // Distinct UI message: "Cannot attach Dome Dome 1..."
          assert.ok(err.message.includes('Cannot attach Dome Dome 1'));
          return true;
        }
      );
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('validates Neon Postgres transaction options are strictly configured', () => {
    assert.strictEqual(NEON_TRANSACTION_OPTIONS.maxWait, 5000);
    assert.strictEqual(NEON_TRANSACTION_OPTIONS.timeout, 10000);
  });
});

