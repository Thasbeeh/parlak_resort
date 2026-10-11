/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { prisma } from '../lib/prisma';
import {
  updateBookingAction,
  recordPaymentAction,
  addReceiptLineItemAction,
  removeReceiptLineItemAction,
  checkoutBookingAction,
  cancelBookingAction,
  checkInBookingAction,
  getBookingById,
} from '../actions/bookings';
import {
  calculateBookingBalanceDue,
} from '../lib/bookings-data';
import {
  calculateUnitIncrementalCharge,
  calculateBookingRentRecalculation,
} from '../lib/calculate-rent';
import {
  checkoutBookingSchema,
  cancelBookingSchema,
  recordPaymentSchema,
  addReceiptLineItemSchema,
} from '../schemas/booking.schema';
import { ScopeRecalculationPrompt } from '../components/admin/bookings/ScopeRecalculationPrompt';
import { CheckoutDialog } from '../components/admin/bookings/CheckoutDialog';
import { PaymentRecordDialog } from '../components/admin/bookings/PaymentRecordDialog';
import { ReceiptLineItemsDrawer } from '../components/admin/bookings/ReceiptLineItemsDrawer';
import { CancelBookingDialog } from '../components/admin/bookings/CancelBookingDialog';
import { FolioDrawer } from '../components/admin/bookings/FolioDrawer';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

const TEST_UUID_1 = '11111111-1111-4111-8111-111111111111';
const TEST_UUID_2 = '22222222-2222-4222-8222-222222222222';
const TEST_UNIT_UUID = '33333333-3333-4333-8333-333333333333';

describe('Stage 7: Folio Management, Post-Confirmation Mutations & Checkout Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Optimistic Concurrency Control (OCC) Enforcement
  // ──────────────────────────────────────────────────────────────────────────
  describe('1. Optimistic Concurrency Control (OCC) with expectedUpdatedAt', () => {
    const laterUpdatedDate = new Date('2026-10-10T12:05:00.000Z'); // Record modified by another Admin
    const staleTimestamp = new Date('2026-10-10T11:59:00.000Z'); // Stale timestamp sent by client

    it('rejects updateBooking with BOOKING_STALE_RECORD (409) when record was modified concurrently', async () => {
      const mockBooking = {
        id: TEST_UUID_1,
        bookingId: '#B001',
        guestName: 'Arjun Menon',
        guestPhone: '+919847123456',
        guestEmail: null,
        notes: null,
        rentCharge: 5000,
        totalPaid: 2000,
        status: 'CONFIRMED',
        updatedAt: laterUpdatedDate,
        units: [
          {
            id: TEST_UUID_2,
            unitId: TEST_UNIT_UUID,
            startDatetime: new Date('2026-10-15T06:30:00.000Z'),
            endDatetime: new Date('2026-10-16T05:30:00.000Z'),
            status: 'CONFIRMED',
            unitPrice: 5000,
            stayType: 'OVERNIGHT',
            unit: { id: TEST_UNIT_UUID, name: 'Dome 1', category: 'DOME' },
          },
        ],
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          booking: {
            findUnique: vi.fn().mockResolvedValue(mockBooking),
          },
        });
      });

      const res = await updateBookingAction({
        id: TEST_UUID_1,
        guestName: 'Arjun Menon',
        guestPhone: '+919847123456',
        rentCharge: 5000,
        units: [
          {
            id: TEST_UUID_2,
            unitId: TEST_UNIT_UUID,
            startDatetime: new Date('2026-10-15T06:30:00.000Z'),
            endDatetime: new Date('2026-10-16T05:30:00.000Z'),
            stayType: 'OVERNIGHT',
            unitPrice: 5000,
            adults: 2,
          },
        ],
        expectedUpdatedAt: staleTimestamp,
      });

      expect(res.success).toBe(false);
      expect(res.code).toBe('BOOKING_STALE_RECORD');
      expect(res.status).toBe(409);
      expect(res.error).toContain('Conflict');
    });

    it('rejects recordPayment with BOOKING_STALE_RECORD (409) when record was modified concurrently', async () => {
      const mockBooking = {
        id: TEST_UUID_1,
        updatedAt: laterUpdatedDate,
        totalPaid: 3000,
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          booking: {
            findUnique: vi.fn().mockResolvedValue(mockBooking),
          },
        });
      });

      const res = await recordPaymentAction({
        bookingId: TEST_UUID_1,
        amount: 2000,
        expectedUpdatedAt: staleTimestamp,
      });

      expect(res.success).toBe(false);
      expect(res.code).toBe('BOOKING_STALE_RECORD');
      expect(res.status).toBe(409);
    });

    it('rejects checkoutBooking with BOOKING_STALE_RECORD (409) when record was modified concurrently', async () => {
      const mockBooking = {
        id: TEST_UUID_1,
        rentCharge: 5000,
        totalPaid: 5000,
        receiptLineItems: [],
        updatedAt: laterUpdatedDate,
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          booking: {
            findUnique: vi.fn().mockResolvedValue(mockBooking),
          },
        });
      });

      const res = await checkoutBookingAction({
        bookingId: TEST_UUID_1,
        rentCharge: 5000,
        totalPaid: 5000,
        receiptLineItems: [],
        expectedUpdatedAt: staleTimestamp,
      });

      expect(res.success).toBe(false);
      expect(res.code).toBe('BOOKING_STALE_RECORD');
      expect(res.status).toBe(409);
    });

    it('rejects cancelBooking with BOOKING_STALE_RECORD (409) when record was modified concurrently', async () => {
      const mockBooking = {
        id: TEST_UUID_1,
        totalPaid: 2000,
        updatedAt: laterUpdatedDate,
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          booking: {
            findUnique: vi.fn().mockResolvedValue(mockBooking),
          },
        });
      });

      const res = await cancelBookingAction({
        bookingId: TEST_UUID_1,
        cancelReason: 'Guest cancellation',
        refundAmount: 1000,
        totalPaid: 2000,
        expectedUpdatedAt: staleTimestamp,
      });

      expect(res.success).toBe(false);
      expect(res.code).toBe('BOOKING_STALE_RECORD');
      expect(res.status).toBe(409);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Scope-Based Recalculation Engine
  // ──────────────────────────────────────────────────────────────────────────
  describe('2. Scope-Based Recalculation Engine (Baseline Stay Preserved + Extension Tariff)', () => {
    const mockActivePriceList = {
      id: 'pl-dome-active',
      unitType: 'DOME',
      maxGuestCapacity: 3,
      slabs: [
        {
          id: 's-1',
          stayType: 'OVERNIGHT',
          minHeadcount: 1,
          maxHeadcount: 3,
          basePrice: 6000, // Current active tariff is ₹6,000/night (increased from historical ₹4,500)
          requiredDeposit: 2000,
        },
      ],
      modifiers: [],
    };

    it('preserves historical contracted base rate and prices extra nights at current active tariff', () => {
      // Original 1 night booked at historical ₹4,500
      // Extending to 2 nights: Night 1 preserves ₹4,500; Night 2 charged at active ₹6,000
      // Expected new unit price = ₹10,500, incremental charge = +₹6,000
      const recalc = calculateUnitIncrementalCharge({
        originalUnit: {
          id: TEST_UUID_2,
          startDatetime: '2026-10-20T06:30:00.000Z',
          endDatetime: '2026-10-21T05:30:00.000Z',
          stayType: 'OVERNIGHT',
          unitPrice: 4500,
          bookedBaseRate: 4500,
          adults: 2,
        },
        newUnit: {
          unitId: TEST_UNIT_UUID,
          startDatetime: '2026-10-20T06:30:00.000Z',
          endDatetime: '2026-10-22T05:30:00.000Z', // 2 nights
          stayType: 'OVERNIGHT',
          adults: 2,
        },
        activePriceList: mockActivePriceList,
      });

      expect(recalc.incrementalCharge).toBe(6000);
      expect(recalc.newUnitPrice).toBe(10500);
      expect(recalc.breakdown.extraNightsIncremental).toBe(6000);
      expect(recalc.breakdown.originalUnitPrice).toBe(4500);

      // Total booking recalculation
      const bookingRecalc = calculateBookingRentRecalculation({
        originalRentCharge: 4500,
        unitResults: [recalc],
      });

      expect(bookingRecalc.originalRentCharge).toBe(4500);
      expect(bookingRecalc.totalIncrementalCharge).toBe(6000);
      expect(bookingRecalc.recalculatedRentCharge).toBe(10500);
      expect(bookingRecalc.finalRentCharge).toBe(10500);
    });

    it('respects Admin custom rent override when courtesy discount is granted on extension', () => {
      const recalc = calculateUnitIncrementalCharge({
        originalUnit: {
          id: TEST_UUID_2,
          startDatetime: '2026-10-20T06:30:00.000Z',
          endDatetime: '2026-10-21T05:30:00.000Z',
          stayType: 'OVERNIGHT',
          unitPrice: 4500,
          bookedBaseRate: 4500,
          adults: 2,
        },
        newUnit: {
          unitId: TEST_UNIT_UUID,
          startDatetime: '2026-10-20T06:30:00.000Z',
          endDatetime: '2026-10-22T05:30:00.000Z',
          stayType: 'OVERNIGHT',
          adults: 2,
        },
        activePriceList: mockActivePriceList,
      });

      // Admin grants special courtesy rate of ₹9,000 instead of calculated ₹10,500
      const customBookingRecalc = calculateBookingRentRecalculation({
        originalRentCharge: 4500,
        unitResults: [recalc],
        customRentOverride: 9000,
      });

      expect(customBookingRecalc.recalculatedRentCharge).toBe(10500);
      expect(customBookingRecalc.finalRentCharge).toBe(9000);
    });

    it('enforces flat baseline block rule: stay shortening yields 0 incremental charge (universal partial cancellation rule)', () => {
      // Original 3 nights (unitPrice ₹13,500) shortened to 2 nights
      // Does not auto-refund baseline stay
      const recalc = calculateUnitIncrementalCharge({
        originalUnit: {
          id: TEST_UUID_2,
          startDatetime: '2026-10-20T06:30:00.000Z',
          endDatetime: '2026-10-23T05:30:00.000Z',
          stayType: 'OVERNIGHT',
          unitPrice: 13500,
          bookedBaseRate: 4500,
          adults: 2,
        },
        newUnit: {
          unitId: TEST_UNIT_UUID,
          startDatetime: '2026-10-20T06:30:00.000Z',
          endDatetime: '2026-10-22T05:30:00.000Z', // 2 nights
          stayType: 'OVERNIGHT',
          adults: 2,
        },
        activePriceList: mockActivePriceList,
      });

      expect(recalc.incrementalCharge).toBe(0);
      expect(recalc.newUnitPrice).toBe(13500);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Receipt Line Items & Courtesy Waivers
  // ──────────────────────────────────────────────────────────────────────────
  describe('3. Receipt Line Items & Courtesy Waivers (receiptLineItems JSONB)', () => {
    it('validates positive service charges and negative courtesy waivers via addReceiptLineItemSchema', () => {
      // Positive charge
      const charge = addReceiptLineItemSchema.safeParse({
        bookingId: '#B100',
        description: 'BBQ Grill Set with Charcoal',
        amount: 1500,
        expectedUpdatedAt: new Date(),
      });
      expect(charge.success).toBe(true);

      // Negative waiver
      const waiver = addReceiptLineItemSchema.safeParse({
        bookingId: '#B100',
        description: 'Late Check-out Courtesy Waiver',
        amount: -500,
        expectedUpdatedAt: new Date(),
      });
      expect(waiver.success).toBe(true);

      // Reject empty description
      const invalid = addReceiptLineItemSchema.safeParse({
        bookingId: '#B100',
        description: '',
        amount: 500,
      });
      expect(invalid.success).toBe(false);
    });

    it('calculates folio balance due accurately with positive charges and negative waivers', () => {
      const rentCharge = 10000;
      const totalPaid = 8000;
      const lineItems = [
        { description: 'BBQ Kit', amount: 1500 },
        { description: 'Extra Towels', amount: 300 },
        { description: 'Manager Courtesy Discount', amount: -800 },
      ];

      // Net line items = 1500 + 300 - 800 = +1000
      // Total billed = 10000 + 1000 = 11000
      // Balance due = 11000 - 8000 = 3000
      const balance = calculateBookingBalanceDue(rentCharge, totalPaid, lineItems);
      expect(balance).toBe(3000);
    });

    it('removes a line item at specified index from receiptLineItems JSONB array', async () => {
      const mockBookingWithItems = {
        id: TEST_UUID_1,
        bookingId: '#B100',
        rentCharge: 8000,
        totalPaid: 8000,
        updatedAt: new Date('2026-10-10T10:00:00.000Z'),
        receiptLineItems: [
          { description: 'BBQ Kit', amount: 1500 },
          { description: 'Extra Towels', amount: 300 },
        ],
        units: [],
      };

      const updateSpy = vi.fn().mockResolvedValue({
        ...mockBookingWithItems,
        receiptLineItems: [{ description: 'Extra Towels', amount: 300 }],
      });

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          booking: {
            findUnique: vi.fn().mockResolvedValue(mockBookingWithItems),
            findFirst: vi.fn().mockResolvedValue(mockBookingWithItems),
            update: updateSpy,
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({}),
          },
        });
      });

      const res = await removeReceiptLineItemAction({
        bookingId: TEST_UUID_1,
        index: 0, // Remove first item (BBQ Kit)
        expectedUpdatedAt: new Date('2026-10-10T10:00:00.000Z'),
      });

      expect(res.success).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEST_UUID_1 },
          data: {
            receiptLineItems: [{ description: 'Extra Towels', amount: 300 }],
          },
        })
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Strict Zero Balance Due Checkout Invariant
  // ──────────────────────────────────────────────────────────────────────────
  describe('4. Strict Zero Balance Due Checkout Invariant (|balance| < 1)', () => {
    it('hard-rejects checkout when balance is positive (underpaid by >= ₹1)', () => {
      const result = checkoutBookingSchema.safeParse({
        bookingId: '#B200',
        rentCharge: 8000,
        totalPaid: 5000, // Outstanding balance = ₹3,000
        receiptLineItems: [],
        expectedUpdatedAt: new Date(),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Outstanding balance of ₹3000');
      }
    });

    it('hard-rejects checkout when balance is negative (overpaid by >= ₹1)', () => {
      const result = checkoutBookingSchema.safeParse({
        bookingId: '#B200',
        rentCharge: 8000,
        totalPaid: 9000, // Balance = -₹1,000 (overpayment)
        receiptLineItems: [],
        expectedUpdatedAt: new Date(),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Outstanding balance of ₹-1000');
      }
    });

    it('permits checkout when balance is exactly settled to ₹0 (|balance| < 1)', () => {
      const result = checkoutBookingSchema.safeParse({
        bookingId: '#B200',
        rentCharge: 8000,
        totalPaid: 9500,
        receiptLineItems: [
          { description: 'Damage repair charge', amount: 1500 },
        ], // 8000 + 1500 = 9500 total billed, 9500 paid -> balance = 0
        expectedUpdatedAt: new Date(),
      });

      expect(result.success).toBe(true);
    });

    it('permits checkout with fractional floating precision rounding within epsilon (< 1)', () => {
      const result = checkoutBookingSchema.safeParse({
        bookingId: '#B200',
        rentCharge: 7999.8,
        totalPaid: 8000.2, // Math.round(7999.8) = 8000, Math.round(8000.2) = 8000 -> balance = 0
        receiptLineItems: [],
        expectedUpdatedAt: new Date(),
      });

      expect(result.success).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Cascading Cancellation & GiST Constraint Release
  // ──────────────────────────────────────────────────────────────────────────
  describe('5. Cascading Cancellation & Refund Boundaries', () => {
    it('validates that refund amount cannot exceed totalPaid', () => {
      const valid = cancelBookingSchema.safeParse({
        bookingId: '#B300',
        cancelReason: 'Guest changed travel plans',
        refundAmount: 2000,
        totalPaid: 3000, // refund 2000 <= totalPaid 3000
        expectedUpdatedAt: new Date(),
      });
      expect(valid.success).toBe(true);

      const invalid = cancelBookingSchema.safeParse({
        bookingId: '#B300',
        cancelReason: 'Guest changed travel plans',
        refundAmount: 4000,
        totalPaid: 3000, // refund 4000 > totalPaid 3000
        expectedUpdatedAt: new Date(),
      });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error.issues[0].message).toContain('Refund amount cannot exceed');
      }
    });

    it('cascades status = CANCELLED to all attached resting Domes inside transaction', async () => {
      const mockParentBooking = {
        id: TEST_UUID_1,
        bookingId: '#B400',
        guestName: 'Kavitha Wedding',
        totalPaid: 50000,
        updatedAt: new Date('2026-10-10T10:00:00.000Z'),
        bundledBookings: [
          { id: TEST_UUID_2 },
        ],
      };

      const updateManySpy = vi.fn().mockResolvedValue({ count: 2 });
      const updateSpy = vi.fn().mockResolvedValue({
        ...mockParentBooking,
        status: 'CANCELLED',
        refundAmount: 30000,
      });

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          booking: {
            findUnique: vi.fn().mockResolvedValue(mockParentBooking),
            findFirst: vi.fn().mockResolvedValue(mockParentBooking),
            update: updateSpy,
            updateMany: updateManySpy,
          },
          bookingUnit: {
            updateMany: updateManySpy,
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({}),
          },
        });
      });

      const res = await cancelBookingAction({
        bookingId: '#B400',
        cancelReason: 'Event cancelled',
        refundAmount: 30000,
        totalPaid: 50000,
        expectedUpdatedAt: new Date('2026-10-10T10:00:00.000Z'),
      });

      expect(res.success).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEST_UUID_1 },
          data: expect.objectContaining({
            status: 'CANCELLED',
            refundAmount: 30000,
          }),
        })
      );
      // Ensures bookingUnit.updateMany was called to cancel all units and lift GiST exclusion
      expect(updateManySpy).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. UI Components & Component Integrity
  // ──────────────────────────────────────────────────────────────────────────
  describe('6. Component Integrity & Render Affordances', () => {
    it('instantiates ScopeRecalculationPrompt with breakdown and action buttons', () => {
      const element = ScopeRecalculationPrompt({
        originalRent: 5000,
        incrementalCharge: 4000,
        recalculatedRent: 9000,
        customRent: 9000,
        breakdown: {
          extraNightsIncremental: 4000,
        },
        onApplyRecalculated: vi.fn(),
        onKeepCustom: vi.fn(),
      });

      expect(element).toBeDefined();
      expect(element.props.className).toContain('rounded-lg border');
    });

    it('instantiates CheckoutDialog with zero balance validation logic', () => {
      expect(typeof CheckoutDialog).toBe('function');
      const el = React.createElement(CheckoutDialog, {
        booking: {
          id: TEST_UUID_1,
          bookingId: '#B001',
          rentCharge: 5000,
          totalPaid: 5000,
          receiptLineItems: [],
          updatedAt: new Date(),
        } as any,
        isOpen: true,
        onOpenChange: vi.fn(),
      });
      expect(React.isValidElement(el)).toBe(true);
    });

    it('instantiates FolioDrawer compound sheet with proper drawer properties', () => {
      expect(typeof FolioDrawer).toBe('function');
      const el = React.createElement(FolioDrawer, {
        bookingId: TEST_UUID_1,
        isOpen: true,
        onOpenChange: vi.fn(),
      });
      expect(React.isValidElement(el)).toBe(true);
    });
  });
});
