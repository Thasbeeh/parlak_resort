/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignJWT } from 'jose';
import { GET as getBookingsRoute } from '../app/api/admin/bookings/route';
import {
  getBookingsData,
  calculateBookingsKpis,
  calculateBookingBalanceDue,
  sanitizeWhatsAppPhone,
  getWhatsAppUrl,
} from '../lib/bookings-data';
import { prisma } from '../lib/prisma';
import { ZeroBalanceBadge } from '../components/admin/bookings/ZeroBalanceBadge';
import { BookingsKpiStrip } from '../components/admin/bookings/BookingsKpiStrip';
import { ResponsiveBookingsList } from '../components/admin/bookings/ResponsiveBookingsList';
import * as React from 'react';

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'super-secret-jwt-key-change-in-production'
);

const mockCookieStore = {
  get: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

describe('Stage 6: Bookings Master Cockpit & Responsive Table-to-Tile Reflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. GET /api/admin/bookings Route Handler & Auth Enforcement', () => {
    it('returns 401 Unauthorized when admin_token cookie is missing', async () => {
      mockCookieStore.get.mockReturnValueOnce(undefined);

      const request = new Request('http://localhost:3000/api/admin/bookings');
      const response = await getBookingsRoute(request);
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 401 Unauthorized when admin_token cookie is invalid or expired', async () => {
      mockCookieStore.get.mockReturnValueOnce({ value: 'invalid-token-payload' });

      const request = new Request('http://localhost:3000/api/admin/bookings');
      const response = await getBookingsRoute(request);
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 200 with formatted bookings, pagination, and KPIs when authenticated', async () => {
      const validToken = await new SignJWT({ adminId: 'admin-1', username: 'admin1' })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(JWT_SECRET);

      mockCookieStore.get.mockReturnValueOnce({ value: validToken });

      const mockBooking = {
        id: 'b-001',
        bookingId: '#B001',
        guestName: 'Rahul Varma',
        guestPhone: '+919847012345',
        guestEmail: 'rahul@example.com',
        notes: 'Quiet stay',
        rentCharge: 12000,
        totalPaid: 5000,
        netRevenue: 5000,
        status: 'CONFIRMED',
        receiptLineItems: null,
        refundAmount: 0,
        cancelReason: null,
        parentBookingId: null,
        createdAt: new Date('2026-10-10T10:00:00.000Z'),
        updatedAt: new Date('2026-10-10T10:00:00.000Z'),
        units: [
          {
            id: 'bu-1',
            unitId: 'u-dome-1',
            startDatetime: new Date('2026-10-12T06:30:00.000Z'),
            endDatetime: new Date('2026-10-13T05:30:00.000Z'),
            status: 'CONFIRMED',
            unitPrice: 12000,
            stayType: 'OVERNIGHT',
            isComplimentary: false,
            unit: {
              id: 'u-dome-1',
              name: 'Dome 1',
              category: 'DOME',
            },
          },
        ],
      };

      vi.spyOn(prisma.booking, 'findMany').mockResolvedValueOnce([mockBooking as any]);
      vi.spyOn(prisma.booking, 'count')
        .mockResolvedValueOnce(1) // total filtered count
        .mockResolvedValueOnce(10) // total all bookings
        .mockResolvedValueOnce(2) // inHouseCount
        .mockResolvedValueOnce(1); // arrivingTodayCount

      // Active bookings for outstanding receivables
      vi.spyOn(prisma.booking, 'findMany').mockResolvedValueOnce([
        { rentCharge: 12000, totalPaid: 5000 } as any,
      ]);

      const request = new Request('http://localhost:3000/api/admin/bookings?page=1&limit=20');
      const response = await getBookingsRoute(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.bookings).toHaveLength(1);
      expect(json.data.bookings[0].bookingId).toBe('#B001');
      expect(json.data.bookings[0].balanceDue).toBe(7000);
      expect(json.data.bookings[0].unitNames).toEqual(['Dome 1']);
      expect(json.data.pagination.page).toBe(1);
      expect(json.data.pagination.total).toBe(1);
      expect(json.data.kpis.totalBookings).toBe(10);
      expect(json.data.kpis.inHouseCount).toBe(2);
      expect(json.data.kpis.outstandingReceivables).toBe(7000);
    });
  });

  describe('2. Multi-Criteria Filtering and Search Queries', () => {
    it('constructs correct Prisma where clause for debounced search with booking ID', async () => {
      const findManySpy = vi.spyOn(prisma.booking, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.booking, 'count').mockResolvedValue(0);

      await getBookingsData({ search: 'B001' });

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { bookingId: { contains: 'B001', mode: 'insensitive' } },
              { bookingId: { contains: '#B001', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });

    it('filters by status when specified', async () => {
      const findManySpy = vi.spyOn(prisma.booking, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.booking, 'count').mockResolvedValue(0);

      await getBookingsData({ status: 'CHECKED_IN' });

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'CHECKED_IN',
          }),
        })
      );
    });

    it('filters by specific physical unitId', async () => {
      const findManySpy = vi.spyOn(prisma.booking, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.booking, 'count').mockResolvedValue(0);

      await getBookingsData({ unitId: 'unit-123' });

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            units: {
              some: {
                unitId: 'unit-123',
              },
            },
          }),
        })
      );
    });
  });

  describe('3. Phone Sanitization & Click-to-WhatsApp Links', () => {
    it('sanitizes standard 10-digit Indian numbers to E.164 format without +', () => {
      expect(sanitizeWhatsAppPhone('9847012345')).toBe('919847012345');
    });

    it('strips spaces, dashes, and + from phone numbers', () => {
      expect(sanitizeWhatsAppPhone('+91 98470-12345')).toBe('919847012345');
      expect(sanitizeWhatsAppPhone('09847012345')).toBe('919847012345');
    });

    it('compiles valid https://wa.me/ URL', () => {
      expect(getWhatsAppUrl('9847012345')).toBe('https://wa.me/919847012345');
      expect(getWhatsAppUrl('+91 98470 12345', 'Hi Rahul')).toBe(
        'https://wa.me/919847012345?text=Hi%20Rahul'
      );
    });
  });

  describe('4. ZeroBalanceBadge Visual States', () => {
    it('renders green Settled badge when balance is 0 or negative', () => {
      const element = ZeroBalanceBadge({ balanceDue: 0 });
      expect(element.props.className).toContain('bg-emerald-500/10');
      expect(element.props.children).toBe('Settled: ₹\u00A00');

      const negativeElement = ZeroBalanceBadge({ balanceDue: -100 });
      expect(negativeElement.props.className).toContain('bg-emerald-500/10');
    });

    it('renders amber Due badge when balance is positive', () => {
      const element = ZeroBalanceBadge({ balanceDue: 4500 });
      expect(element.props.className).toContain('bg-amber-500/10');
      const renderedText = Array.isArray(element.props.children)
        ? element.props.children.join('')
        : element.props.children;
      expect(renderedText).toBe('Due: ₹\u00A04,500');
    });

    it('correctly calculates Final Balance Due with receiptLineItems and courtesy waivers per rooms.md#57', () => {
      // 1. Standard rent with no line items
      expect(calculateBookingBalanceDue(10000, 4000)).toBe(6000);

      // 2. Rent with positive extra charges (BBQ +1200, Campfire +800)
      const lineItems = [
        { description: 'BBQ Setup', amount: 1200 },
        { description: 'Campfire', amount: 800 },
      ];
      expect(calculateBookingBalanceDue(10000, 4000, lineItems)).toBe(8000);

      // 3. Rent with negative courtesy waiver (-500)
      const waivedItems = [
        { description: 'Early Checkout Courtesy', amount: -500 },
      ];
      expect(calculateBookingBalanceDue(10000, 9500, waivedItems)).toBe(0);

      // 4. Fully settled
      expect(calculateBookingBalanceDue(12000, 12000)).toBe(0);
    });
  });

  describe('5. BookingsKpiStrip Metric Ribbon', () => {
    it('renders the 4 continuous metric ribbons with tabular-nums and non-breaking spaces', () => {
      const kpis = {
        totalBookings: 42,
        inHouseCount: 8,
        arrivingTodayCount: 5,
        outstandingReceivables: 18500,
      };

      const element = BookingsKpiStrip({ kpis });
      expect(element.props['data-slot']).toBe('bookings-kpi-strip');
      expect(element.props.className).toContain('grid-cols-2');
      expect(element.props.className).toContain('md:grid-cols-4');
    });
  });

  describe('6. ResponsiveBookingsList Table-to-Tile Reflow Structure', () => {
    const sampleBookings: any[] = [
      {
        id: 'b-101',
        bookingId: '#B101',
        guestName: 'Ananya Nair',
        guestPhone: '+919745567890',
        rentCharge: 8000,
        totalPaid: 8000,
        balanceDue: 0,
        status: 'CONFIRMED',
        stayType: 'OVERNIGHT',
        startDatetime: new Date('2026-10-15T06:30:00.000Z'),
        endDatetime: new Date('2026-10-16T05:30:00.000Z'),
        units: [
          {
            id: 'bu-1',
            unit: { id: 'u-1', name: 'A-Frame 1', category: 'A_FRAME' },
            isComplimentary: false,
          },
        ],
      },
    ];

    it('renders desktop table wrapper with 7-column header and md:block', () => {
      const listElement = ResponsiveBookingsList({ bookings: sampleBookings });
      const desktopTable = listElement.props.children[0];
      expect(desktopTable.props.className).toContain('hidden md:block');
    });

    it('renders mobile tile cards with md:hidden and full-width manage button', () => {
      const listElement = ResponsiveBookingsList({ bookings: sampleBookings });
      const mobileList = listElement.props.children[1];
      expect(mobileList.props.className).toContain('flex flex-col gap-3 md:hidden');
    });
  });
});
