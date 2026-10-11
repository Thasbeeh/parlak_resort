/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../lib/prisma';
import {
  getResortSettings,
  updateResortSettingsAction,
  getAdminAccounts,
} from '../actions/settings';
import { getBookingReceiptData } from '../actions/bookings';
import { resortProfileSchema } from '../schemas/settings.schema';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const TEST_BOOKING_UUID = '88888888-8888-4888-8888-888888888888';

describe('Stage 8: Native @media print Receipt Engine & Resort Profile Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Settings Schema Validation
  // ──────────────────────────────────────────────────────────────────────────
  describe('1. Resort Profile Schema Validation', () => {
    it('validates a complete, compliant resort profile input', () => {
      const valid = {
        resortName: 'Parlak Resort & Sanctuary',
        tagline: 'Riverfront Luxury Living',
        phone: '+919876543210',
        whatsapp: '+919876543210',
        email: 'stay@parlakresort.com',
        address: 'Chaliyar Riverfront, Malappuram, Kerala 676541',
        overnightCheckIn: '02:00 PM IST',
        overnightCheckOut: '11:00 AM IST',
        daySlotCheckIn: '10:00 AM IST',
        daySlotCheckOut: '06:00 PM IST',
        diningUntil: '10:30 PM IST',
        poolUntil: '10:00 PM IST',
      };

      const result = resortProfileSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.resortName).toBe('Parlak Resort & Sanctuary');
        expect(result.data.email).toBe('stay@parlakresort.com');
      }
    });

    it('rejects an empty resort name', () => {
      const invalid = {
        resortName: '',
        phone: '+919876543210',
        whatsapp: '+919876543210',
        email: 'stay@parlakresort.com',
        address: 'Chaliyar Riverfront',
        overnightCheckIn: '02:00 PM IST',
        overnightCheckOut: '11:00 AM IST',
        daySlotCheckIn: '10:00 AM IST',
        daySlotCheckOut: '06:00 PM IST',
        diningUntil: '10:30 PM IST',
        poolUntil: '10:00 PM IST',
      };

      const result = resortProfileSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.resortName).toBeDefined();
      }
    });

    it('rejects invalid email formats', () => {
      const invalid = {
        resortName: 'Parlak Resort',
        phone: '+919876543210',
        whatsapp: '+919876543210',
        email: 'not-an-email',
        address: 'Chaliyar Riverfront',
        overnightCheckIn: '02:00 PM IST',
        overnightCheckOut: '11:00 AM IST',
        daySlotCheckIn: '10:00 AM IST',
        daySlotCheckOut: '06:00 PM IST',
        diningUntil: '10:30 PM IST',
        poolUntil: '10:00 PM IST',
      };

      const result = resortProfileSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.email).toBeDefined();
      }
    });

    it('rejects too short phone numbers', () => {
      const invalid = {
        resortName: 'Parlak Resort',
        phone: '123',
        whatsapp: '+919876543210',
        email: 'stay@parlakresort.com',
        address: 'Chaliyar Riverfront',
        overnightCheckIn: '02:00 PM IST',
        overnightCheckOut: '11:00 AM IST',
        daySlotCheckIn: '10:00 AM IST',
        daySlotCheckOut: '06:00 PM IST',
        diningUntil: '10:30 PM IST',
        poolUntil: '10:00 PM IST',
      };

      const result = resortProfileSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.phone).toBeDefined();
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Settings Persistence & Retrieval Actions
  // ──────────────────────────────────────────────────────────────────────────
  describe('2. Resort Settings Actions & Database Persistence', () => {
    it('returns default fallback settings when Setting model has no record', async () => {
      vi.spyOn(prisma.setting, 'findUnique').mockResolvedValueOnce(null as any);

      const settings = await getResortSettings();
      expect(settings).toBeDefined();
      expect(settings.resortName).toBe('Parlak Resort');
      expect(settings.phone).toBeDefined();
      expect(settings.overnightCheckIn).toBeDefined();
    });

    it('returns custom settings when Setting record exists in database', async () => {
      const customData = {
        resortName: 'Parlak Riverview Sanctuary',
        phone: '+919999900000',
        whatsapp: '+919999900000',
        email: 'admin@parlak.com',
      };

      vi.spyOn(prisma.setting, 'findUnique').mockResolvedValueOnce({
        id: '1',
        key: 'resort_profile',
        value: JSON.stringify(customData),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const settings = await getResortSettings();
      expect(settings.resortName).toBe('Parlak Riverview Sanctuary');
      expect(settings.email).toBe('admin@parlak.com');
      expect(settings.phone).toBe('+919999900000');
    });

    it('updates resort settings, upserts record, and creates AuditLog entry', async () => {
      const input = {
        resortName: 'Parlak Luxury Sanctuary',
        tagline: 'Private Riverfront Domes',
        phone: '+919876543210',
        whatsapp: '+919876543210',
        email: 'stay@parlakresort.com',
        address: 'Chaliyar Riverfront, Kerala',
        overnightCheckIn: '02:00 PM IST',
        overnightCheckOut: '11:00 AM IST',
        daySlotCheckIn: '10:00 AM IST',
        daySlotCheckOut: '06:00 PM IST',
        diningUntil: '10:30 PM IST',
        poolUntil: '10:00 PM IST',
      };

      vi.spyOn(prisma, '$transaction').mockImplementationOnce(async (cb: any) => {
        return cb({
          setting: {
            findUnique: vi.fn().mockResolvedValue(null),
            upsert: vi.fn().mockResolvedValue({ key: 'resort_profile', value: JSON.stringify(input) }),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({ id: 'log-1' }),
          },
        });
      });

      const res = await updateResortSettingsAction(input, 'SUPER_ADMIN_1');
      expect(res.success).toBe(true);
      expect(res.data?.resortName).toBe('Parlak Luxury Sanctuary');
      expect(res.status).toBe(200);
    });

    it('rejects invalid settings updates with status 400', async () => {
      const res = await updateResortSettingsAction({ resortName: '' });
      expect(res.success).toBe(false);
      expect(res.status).toBe(400);
      expect(res.code).toBe('VALIDATION_ERROR');
    });

    it('retrieves read-only seeded admin accounts', async () => {
      const seededAdmins = [
        { id: 'admin-1', username: 'admin_primary', createdAt: new Date(), updatedAt: new Date() },
        { id: 'admin-2', username: 'admin_ops', createdAt: new Date(), updatedAt: new Date() },
        { id: 'admin-3', username: 'admin_finance', createdAt: new Date(), updatedAt: new Date() },
      ];

      vi.spyOn(prisma.admin, 'findMany').mockResolvedValueOnce(seededAdmins as any);

      const accounts = await getAdminAccounts();
      expect(accounts).toHaveLength(3);
      expect(accounts[0].username).toBe('admin_primary');
      expect(accounts[2].username).toBe('admin_finance');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Structured Tax Invoice & Receipt Engine Data
  // ──────────────────────────────────────────────────────────────────────────
  describe('3. Tax Invoice & Printable Receipt Data Structure', () => {
    it('structures receipt data and marks isPaidInFull = true when balance is ₹0', async () => {
      const mockBooking = {
        id: TEST_BOOKING_UUID,
        bookingId: '#B001',
        guestName: 'Kavya Nair',
        guestPhone: '+919876543210',
        guestEmail: 'kavya@example.com',
        rentCharge: 6000,
        totalPaid: 6500,
        status: 'CHECKED_OUT',
        receiptLineItems: [
          { description: 'Extra Bedding', amount: 500 },
        ],
        units: [
          {
            unit: { id: 'u1', name: 'River Dome 1', category: 'DOME' },
            startDatetime: new Date('2026-10-12T14:00:00Z'),
            endDatetime: new Date('2026-10-13T11:00:00Z'),
          },
        ],
      };

      vi.spyOn(prisma.booking, 'findUnique').mockResolvedValueOnce(mockBooking as any);

      const res = await getBookingReceiptData(TEST_BOOKING_UUID);
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();

      const data = res.data!;
      expect(data.displayId).toBe('#B001');
      expect(data.totalRent).toBe(6000);
      expect(data.lineItemsTotal).toBe(500);
      expect(data.totalBilled).toBe(6500);
      expect(data.totalPaid).toBe(6500);
      expect(data.balanceDue).toBe(0);
      expect(data.isPaidInFull).toBe(true);
    });

    it('structures receipt data and marks isPaidInFull = false when balance > ₹0', async () => {
      const mockBooking = {
        id: TEST_BOOKING_UUID,
        bookingId: '#B002',
        guestName: 'Rahul Verma',
        guestPhone: '+919876543210',
        guestEmail: null,
        rentCharge: 8000,
        totalPaid: 3000,
        status: 'CONFIRMED',
        receiptLineItems: [
          { description: 'Manager Courtesy Discount', amount: -500 },
        ],
        units: [
          {
            unit: { id: 'u2', name: 'Glass Suite', category: 'SUITE' },
            startDatetime: new Date('2026-10-14T14:00:00Z'),
            endDatetime: new Date('2026-10-15T11:00:00Z'),
          },
        ],
      };

      vi.spyOn(prisma.booking, 'findUnique').mockResolvedValueOnce(mockBooking as any);

      const res = await getBookingReceiptData(TEST_BOOKING_UUID);
      expect(res.success).toBe(true);

      const data = res.data!;
      expect(data.totalRent).toBe(8000);
      expect(data.lineItemsTotal).toBe(-500);
      expect(data.totalBilled).toBe(7500);
      expect(data.totalPaid).toBe(3000);
      expect(data.balanceDue).toBe(4500);
      expect(data.isPaidInFull).toBe(false);
    });

    it('returns 404 when requested booking does not exist', async () => {
      vi.spyOn(prisma.booking, 'findUnique').mockResolvedValueOnce(null);

      const res = await getBookingReceiptData(TEST_BOOKING_UUID);
      expect(res.success).toBe(false);
      expect(res.status).toBe(404);
      expect(res.code).toBe('BOOKING_NOT_FOUND');
    });
  });
});
