/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../lib/prisma';
import { createBookingSchema } from '../schemas/booking.schema';
import { createBookingAction, createBooking } from '../actions/bookings';
import { GET as checkAvailabilityHandler } from '../app/api/admin/bookings/check-availability/route';
import {
  resolveSlabForHeadcount,
  calculateModifiedPrice,
  calculateNightByNightStayRate,
  resolveModifiers,
} from '../lib/pricing/resolve-modifiers';
import { mapPresetToDateRange, getISTDateString } from '../lib/date-utils';
import { Prisma } from '@prisma/client';

describe('Stage 5: Live Availability Engine & Manual Booking Creation Wizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Phone Number & Guest CRM Validation', () => {
    it('rejects phone numbers with fewer than 10 digits', () => {
      const invalidData = {
        guestName: 'Rashid Khan',
        guestPhone: '9876543', // 7 digits
        rentCharge: 5000,
        totalPaid: 2000,
        status: 'CONFIRMED',
        units: [
          {
            unitId: 'b7d0473c-e198-4292-a9b8-b65e6237b476',
            startDatetime: new Date('2026-10-10T06:30:00.000Z'),
            endDatetime: new Date('2026-10-11T05:30:00.000Z'),
            stayType: 'OVERNIGHT',
            unitPrice: 5000,
            adults: 2,
            infants: 0,
            isComplimentary: false,
          },
        ],
      };

      const result = createBookingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const phoneIssue = result.error.issues.find((i) => i.path.includes('guestPhone'));
        expect(phoneIssue).toBeDefined();
        expect(phoneIssue?.message).toContain('10 to 15 digits');
      }
    });

    it('rejects phone numbers with more than 15 digits', () => {
      const invalidData = {
        guestName: 'Rashid Khan',
        guestPhone: '+911234567890123456', // 18 chars
        rentCharge: 5000,
        totalPaid: 2000,
        status: 'CONFIRMED',
        units: [
          {
            unitId: 'b7d0473c-e198-4292-a9b8-b65e6237b476',
            startDatetime: new Date('2026-10-10T06:30:00.000Z'),
            endDatetime: new Date('2026-10-11T05:30:00.000Z'),
            stayType: 'OVERNIGHT',
            unitPrice: 5000,
            adults: 2,
            infants: 0,
            isComplimentary: false,
          },
        ],
      };

      const result = createBookingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const phoneIssue = result.error.issues.find((i) => i.path.includes('guestPhone'));
        expect(phoneIssue).toBeDefined();
      }
    });

    it('accepts valid 10 to 15-digit phone numbers with or without leading +', () => {
      const validData = {
        guestName: 'Rashid Khan',
        guestPhone: '+919876543210',
        rentCharge: 5000,
        totalPaid: 2000,
        status: 'CONFIRMED',
        units: [
          {
            unitId: 'b7d0473c-e198-4292-a9b8-b65e6237b476',
            startDatetime: new Date('2026-10-10T06:30:00.000Z'),
            endDatetime: new Date('2026-10-11T05:30:00.000Z'),
            stayType: 'OVERNIGHT',
            unitPrice: 5000,
            adults: 2,
            infants: 0,
            isComplimentary: false,
          },
        ],
      };

      const result = createBookingSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('2. Occupancy Hard Caps & Domain Rules', () => {
    it('enforces Domes max 3 adults and strictly 0 extra beds at action layer', async () => {
      const unitMock = {
        id: 'dome-unit-1',
        name: 'Dome 1',
        category: 'DOME',
        isActive: true,
        maxCapacity: 3,
        maxInfants: 2,
        priceList: {
          slabs: [
            { stayType: 'OVERNIGHT', minHeadcount: 1, maxHeadcount: 3, basePrice: 4000, requiredDeposit: 2000 },
          ],
          modifiers: [],
        },
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const tx = {
          unit: { findUnique: vi.fn().mockResolvedValue(unitMock) },
          booking: { findUnique: vi.fn(), create: vi.fn() },
          auditLog: { create: vi.fn() },
        };
        return callback(tx);
      });

      const input = {
        guestName: 'Overcapacity Guest',
        guestPhone: '9876543210',
        rentCharge: 4000,
        totalPaid: 2000,
        status: 'CONFIRMED',
        units: [
          {
            unitId: 'b7d0473c-e198-4292-a9b8-b65e6237b476',
            startDatetime: new Date('2026-10-10T06:30:00.000Z'),
            endDatetime: new Date('2026-10-11T05:30:00.000Z'),
            stayType: 'OVERNIGHT',
            unitPrice: 4000,
            adults: 4, // Exceeds Dome hard cap of 3!
            infants: 0,
            isComplimentary: false,
          },
        ],
      };

      await expect(createBooking(input)).rejects.toThrow('Hard cap exceeded: Dome (Dome 1) allows a maximum of 3 adults');
    });

    it('enforces A-Frames max 5 adults and strictly 0 extra beds at action layer', async () => {
      const unitMock = {
        id: 'a-frame-unit-1',
        name: 'A-Frame 1',
        category: 'A_FRAME',
        isActive: true,
        maxCapacity: 5,
        maxInfants: 4,
        priceList: {
          slabs: [
            { stayType: 'OVERNIGHT', minHeadcount: 1, maxHeadcount: 5, basePrice: 6000, requiredDeposit: 3000 },
          ],
          modifiers: [],
        },
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const tx = {
          unit: { findUnique: vi.fn().mockResolvedValue(unitMock) },
          booking: { findUnique: vi.fn(), create: vi.fn() },
          auditLog: { create: vi.fn() },
        };
        return callback(tx);
      });

      const input = {
        guestName: 'Overcapacity Guest',
        guestPhone: '9876543210',
        rentCharge: 6000,
        totalPaid: 3000,
        status: 'CONFIRMED',
        units: [
          {
            unitId: 'b7d0473c-e198-4292-a9b8-b65e6237b476',
            startDatetime: new Date('2026-10-10T06:30:00.000Z'),
            endDatetime: new Date('2026-10-11T05:30:00.000Z'),
            stayType: 'OVERNIGHT',
            unitPrice: 6000,
            adults: 6, // Exceeds A-Frame hard cap of 5!
            infants: 0,
            isComplimentary: false,
          },
        ],
      };

      await expect(createBooking(input)).rejects.toThrow('Hard cap exceeded: A-Frame (A-Frame 1) allows a maximum of 5 adults');
    });
  });

  describe('3. Event Hall Complimentary Resting Dome Eligibility (>= 400 Pax)', () => {
    it('accepts complimentary attached dome with unitPrice 0 when booked with Event Hall', () => {
      const validHallBundle = {
        guestName: 'Wedding Family',
        guestPhone: '9876543210',
        rentCharge: 58000,
        totalPaid: 15000,
        status: 'CONFIRMED',
        units: [
          // Event Hall with 500 pax (>= 400)
          {
            unitId: 'b7d0473c-e198-4292-a9b8-b65e6237b476',
            startDatetime: new Date('2026-10-10T04:30:00.000Z'),
            endDatetime: new Date('2026-10-10T09:30:00.000Z'),
            stayType: 'MORNING_SLOT',
            headcount: 500,
            unitPrice: 58000,
            isComplimentary: false,
          },
          // Attached resting Dome: complimentary (unitPrice = 0)
          {
            unitId: 'b7d0473c-e198-4292-a9b8-b65e6237b477',
            startDatetime: new Date('2026-10-10T04:30:00.000Z'),
            endDatetime: new Date('2026-10-10T09:30:00.000Z'),
            stayType: 'MORNING_SLOT',
            unitPrice: 0,
            isComplimentary: true,
          },
        ],
      };

      const result = createBookingSchema.safeParse(validHallBundle);
      expect(result.success).toBe(true);
    });

    it('rejects complimentary attached dome if unitPrice > 0', () => {
      const invalidHallBundle = {
        guestName: 'Wedding Family',
        guestPhone: '9876543210',
        rentCharge: 58000,
        totalPaid: 15000,
        status: 'CONFIRMED',
        units: [
          {
            unitId: 'b7d0473c-e198-4292-a9b8-b65e6237b476',
            startDatetime: new Date('2026-10-10T04:30:00.000Z'),
            endDatetime: new Date('2026-10-10T09:30:00.000Z'),
            stayType: 'MORNING_SLOT',
            headcount: 500,
            unitPrice: 58000,
            isComplimentary: false,
          },
          {
            unitId: 'b7d0473c-e198-4292-a9b8-b65e6237b477',
            startDatetime: new Date('2026-10-10T04:30:00.000Z'),
            endDatetime: new Date('2026-10-10T09:30:00.000Z'),
            stayType: 'MORNING_SLOT',
            unitPrice: 2000, // Error: isComplimentary must have unitPrice: 0!
            isComplimentary: true,
          },
        ],
      };

      const result = createBookingSchema.safeParse(invalidHallBundle);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes('unitPrice'));
        expect(issue?.message).toContain('Complimentary attached units must have a unitPrice of 0');
      }
    });
  });

  describe('4. Live Availability Engine API (/api/admin/bookings/check-availability)', () => {
    it('returns isAvailable: true when no overlapping bookings exist', async () => {
      const mockUnits = [
        {
          id: 'unit-dome-1',
          name: 'Dome 1',
          category: 'DOME',
          maxCapacity: 3,
          maxInfants: 2,
          priceListId: 'plist-1',
        },
      ];

      vi.spyOn(prisma.unit, 'findMany').mockResolvedValue(mockUnits as any);
      vi.spyOn(prisma.bookingUnit, 'findMany').mockResolvedValue([]);

      const req = new Request(
        'http://localhost:3000/api/admin/bookings/check-availability?date=2026-10-10&stayType=OVERNIGHT&nights=1'
      );
      const res = await checkAvailabilityHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.units[0].isAvailable).toBe(true);
      expect(json.availabilityMap['unit-dome-1'].isAvailable).toBe(true);
      expect(json.availabilityMap['unit-dome-1'].conflicts.length).toBe(0);
    });

    it('returns isAvailable: false with conflict details when unit has overlapping booking', async () => {
      const mockUnits = [
        {
          id: 'unit-dome-1',
          name: 'Dome 1',
          category: 'DOME',
          maxCapacity: 3,
          maxInfants: 2,
          priceListId: 'plist-1',
        },
      ];

      const mockOverlaps = [
        {
          id: 'bu-123',
          unitId: 'unit-dome-1',
          startDatetime: new Date('2026-10-10T06:30:00.000Z'),
          endDatetime: new Date('2026-10-11T05:30:00.000Z'),
          status: 'CONFIRMED',
          stayType: 'OVERNIGHT',
          isComplimentary: false,
          booking: {
            id: 'b-999',
            bookingId: '#B042',
            guestName: 'Anil Kumar',
            guestPhone: '9876543210',
            status: 'CONFIRMED',
          },
        },
      ];

      vi.spyOn(prisma.unit, 'findMany').mockResolvedValue(mockUnits as any);
      vi.spyOn(prisma.bookingUnit, 'findMany').mockResolvedValue(mockOverlaps as any);

      const req = new Request(
        'http://localhost:3000/api/admin/bookings/check-availability?date=2026-10-10&stayType=OVERNIGHT&nights=1'
      );
      const res = await checkAvailabilityHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.units[0].isAvailable).toBe(false);
      expect(json.availabilityMap['unit-dome-1'].isAvailable).toBe(false);
      expect(json.availabilityMap['unit-dome-1'].conflicts[0].bookingId).toBe('#B042');
      expect(json.availabilityMap['unit-dome-1'].conflicts[0].guestName).toBe('Anil Kumar');
    });

    it('correctly detects resting dome conflict during Event Hall slot hours', async () => {
      // Event Hall Morning Slot: 10:00 AM to 3:00 PM (04:30 UTC to 09:30 UTC)
      // Conflicting Dome has an overnight stay checking out at 11:00 AM (05:30 UTC) -> Overlap!
      const mockUnits = [
        {
          id: 'unit-dome-1',
          name: 'Dome 1',
          category: 'DOME',
          maxCapacity: 3,
          maxInfants: 2,
          priceListId: 'plist-1',
        },
      ];

      const mockOverlaps = [
        {
          id: 'bu-overnight',
          unitId: 'unit-dome-1',
          startDatetime: new Date('2026-10-09T06:30:00.000Z'), // Checking in Oct 9 12:00 PM
          endDatetime: new Date('2026-10-10T05:30:00.000Z'),   // Checking out Oct 10 11:00 AM
          status: 'CONFIRMED',
          stayType: 'OVERNIGHT',
          isComplimentary: false,
          booking: {
            id: 'b-overnight',
            bookingId: '#B010',
            guestName: 'Overnight Resident',
            guestPhone: '9876543210',
            status: 'CONFIRMED',
          },
        },
      ];

      vi.spyOn(prisma.unit, 'findMany').mockResolvedValue(mockUnits as any);
      vi.spyOn(prisma.bookingUnit, 'findMany').mockResolvedValue(mockOverlaps as any);

      const req = new Request(
        'http://localhost:3000/api/admin/bookings/check-availability?date=2026-10-10&stayType=MORNING_SLOT'
      );
      const res = await checkAvailabilityHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.units[0].isAvailable).toBe(false);
      expect(json.availabilityMap['unit-dome-1'].conflicts[0].bookingId).toBe('#B010');
    });
  });

  describe('5. Pricing Resolution & Modifier Breakdown', () => {
    it('dynamically resolves headcount slab and calculates weekend modifier surge', () => {
      const slabs = [
        { stayType: 'MORNING_SLOT', minHeadcount: 1, maxHeadcount: 50, basePrice: 15000, requiredDeposit: 5000 },
        { stayType: 'MORNING_SLOT', minHeadcount: 51, maxHeadcount: 200, basePrice: 30000, requiredDeposit: 10000 },
        { stayType: 'MORNING_SLOT', minHeadcount: 201, maxHeadcount: 500, basePrice: 50000, requiredDeposit: 15000 },
      ];

      // Test 1: Slabs resolution
      const resolvedSlab = resolveSlabForHeadcount(slabs, 350, 'MORNING_SLOT');
      expect(resolvedSlab?.basePrice).toBe(50000);
      expect(resolvedSlab?.requiredDeposit).toBe(15000);

      // Test 2: Weekend modifier on Saturday
      const saturdayDate = new Date('2026-10-10T04:30:00.000Z'); // Oct 10, 2026 is Saturday
      const modifiers = [
        {
          name: 'Weekend Surcharge',
          type: 'WEEKEND',
          percentage: 15,
          startDate: '2026-10-01T00:00:00.000Z',
          endDate: '2026-10-31T23:59:59.000Z',
          isActive: true,
        },
      ];

      const modResult = resolveModifiers(saturdayDate, modifiers, 'MORNING_SLOT');
      expect(modResult.isWeekend).toBe(true);
      expect(modResult.effectivePercentage).toBe(15);

      const modifiedPrice = calculateModifiedPrice(resolvedSlab!.basePrice, modResult.effectivePercentage);
      // 50,000 + 15% = 57,500
      expect(modifiedPrice).toBe(57500);
    });
  });

  describe('6. PostgreSQL GiST Concurrency Collision Handling (HTTP 409)', () => {
    it('catches exclusion violation and returns UNIT_SCHEDULE_COLLISION 409 envelope', async () => {
      // Simulate PostgreSQL 23P01 / GiST exclusion error inside transaction
      vi.spyOn(prisma, '$transaction').mockImplementation(async () => {
        const error = new Error('conflicting key value violates exclusion constraint "no_overlapping_unit_bookings"');
        (error as any).code = '23P01';
        throw error;
      });

      const input = {
        guestName: 'Simulated Concurrent Guest',
        guestPhone: '9876543210',
        rentCharge: 5000,
        totalPaid: 2000,
        status: 'CONFIRMED',
        units: [
          {
            unitId: 'b7d0473c-e198-4292-a9b8-b65e6237b476',
            startDatetime: new Date('2026-10-10T06:30:00.000Z'),
            endDatetime: new Date('2026-10-11T05:30:00.000Z'),
            stayType: 'OVERNIGHT',
            unitPrice: 5000,
            adults: 2,
            infants: 0,
            isComplimentary: false,
          },
        ],
      };

      const response = await createBookingAction(input);

      expect(response.success).toBe(false);
      expect(response.status).toBe(409);
      expect(response.code).toBe('UNIT_SCHEDULE_COLLISION');
      expect(response.error).toContain('is already booked during this time window');
    });
  });
});
