import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import { getISTTodayRange } from './dashboard-data';

export interface BookingUnitDetail {
  id: string;
  unitId: string;
  startDatetime: Date;
  endDatetime: Date;
  status: string;
  unitPrice: number;
  stayType: string;
  isComplimentary: boolean;
  unit: {
    id: string;
    name: string;
    category: string;
  };
}

export interface BookingRecordItem {
  id: string;
  bookingId: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  notes?: string | null;
  rentCharge: number;
  totalPaid: number;
  netRevenue: number;
  status: string;
  receiptLineItems?: unknown;
  refundAmount?: number | null;
  cancelReason?: string | null;
  parentBookingId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  units: BookingUnitDetail[];
  unitNames: string[];
  balanceDue: number;
  stayType: string;
  startDatetime: Date;
  endDatetime: Date;
}

export interface BookingsKpis {
  totalBookings: number;
  inHouseCount: number;
  arrivingTodayCount: number;
  outstandingReceivables: number;
}

export interface BookingsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BookingsDataPayload {
  bookings: BookingRecordItem[];
  pagination: BookingsPagination;
  kpis: BookingsKpis;
}

export interface GetBookingsOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  unitId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Calculates authoritative Final Balance Due including extra receipt line items
 * and integer rounding per docs/admin_panel/rooms.md#57 and event_hall.md#134:
 * Balance Due = (Rent Charge + Receipt Line Items) - Total Paid
 */
export function calculateBookingBalanceDue(
  rentCharge: number = 0,
  totalPaid: number = 0,
  receiptLineItems?: unknown
): number {
  const lineItems = Array.isArray(receiptLineItems)
    ? (receiptLineItems as Array<{ description?: string; amount?: number }>)
    : [];
  const lineItemsTotal = lineItems.reduce(
    (sum, item) => sum + (Number(item?.amount) || 0),
    0
  );
  return Math.round((Number(rentCharge) || 0) + lineItemsTotal - (Number(totalPaid) || 0));
}

/**
 * Sanitizes an Indian phone number for click-to-WhatsApp link (https://wa.me/).
 * Strips non-digits, prefixes with 91 for 10-digit Indian numbers, and removes leading 0.
 */
export function sanitizeWhatsAppPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Compiles a direct https://wa.me/ link for WhatsApp contact.
 */
export function getWhatsAppUrl(phone: string, text?: string): string {
  const sanitized = sanitizeWhatsAppPhone(phone);
  if (!sanitized) return 'https://wa.me/';
  return text
    ? `https://wa.me/${sanitized}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${sanitized}`;
}

/**
 * Computes authoritative summary KPI metrics across bookings.
 */
export async function calculateBookingsKpis(): Promise<BookingsKpis> {
  const { todayStart, todayEnd } = getISTTodayRange();

  const [totalBookings, inHouseCount, arrivingTodayCount, activeBookings] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({
      where: { status: 'CHECKED_IN' },
    }),
    prisma.booking.count({
      where: {
        status: 'CONFIRMED',
        units: {
          some: {
            startDatetime: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
        },
      },
    }),
    prisma.booking.findMany({
      where: {
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      },
      select: {
        rentCharge: true,
        totalPaid: true,
        receiptLineItems: true,
      },
    }),
  ]);

  const outstandingReceivables = activeBookings.reduce((sum, b) => {
    const balance = calculateBookingBalanceDue(b.rentCharge, b.totalPaid, b.receiptLineItems);
    return sum + (balance > 0 ? balance : 0);
  }, 0);

  return {
    totalBookings,
    inHouseCount,
    arrivingTodayCount,
    outstandingReceivables,
  };
}

/**
 * Queries bookings with multi-criteria filters, search, pagination, and KPIs.
 */
export async function getBookingsData(
  options: GetBookingsOptions = {}
): Promise<BookingsDataPayload> {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
  const search = options.search?.trim();
  const status = options.status?.trim();
  const unitId = options.unitId?.trim();
  const startDate = options.startDate?.trim();
  const endDate = options.endDate?.trim();

  const where: Prisma.BookingWhereInput = {};

  // Status Filter
  if (status && status !== 'ALL') {
    where.status = status.toUpperCase();
  }

  // Multi-field search (bookingId with/without '#', guestName, guestPhone)
  if (search) {
    const cleanId = search.startsWith('#') ? search : `#${search}`;
    const searchNoHash = search.replace(/^#/, '');

    where.OR = [
      { bookingId: { contains: search, mode: 'insensitive' } },
      { bookingId: { contains: cleanId, mode: 'insensitive' } },
      { bookingId: { contains: searchNoHash, mode: 'insensitive' } },
      { guestName: { contains: search, mode: 'insensitive' } },
      { guestPhone: { contains: search } },
    ];
  }

  // Unit filter
  if (unitId && unitId !== 'ALL') {
    where.units = {
      some: {
        unitId: unitId,
      },
    };
  }

  // Date range filter
  if (startDate || endDate) {
    const unitDateFilter: Prisma.BookingUnitWhereInput = {};
    if (startDate) {
      const parsedStart = new Date(startDate);
      if (!isNaN(parsedStart.getTime())) {
        unitDateFilter.endDatetime = { gte: parsedStart };
      }
    }
    if (endDate) {
      const parsedEnd = new Date(endDate);
      if (!isNaN(parsedEnd.getTime())) {
        unitDateFilter.startDatetime = { lte: parsedEnd };
      }
    }

    if (Object.keys(unitDateFilter).length > 0) {
      where.units = {
        ...(where.units || {}),
        some: {
          ...(where.units?.some || {}),
          ...unitDateFilter,
        },
      };
    }
  }

  const [rawBookings, totalCount, kpis] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        units: {
          include: {
            unit: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
          orderBy: { startDatetime: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.booking.count({ where }),
    calculateBookingsKpis(),
  ]);

  const bookings: BookingRecordItem[] = rawBookings.map((b) => {
    const primaryUnit = b.units[0];
    const unitNames = (b.units ?? []).map((u) => u.unit?.name).filter(Boolean);
    const balanceDue = calculateBookingBalanceDue(b.rentCharge, b.totalPaid, b.receiptLineItems);

    return {
      ...b,
      unitNames,
      balanceDue,
      stayType: primaryUnit?.stayType ?? 'OVERNIGHT',
      startDatetime: primaryUnit?.startDatetime ?? b.createdAt,
      endDatetime: primaryUnit?.endDatetime ?? b.createdAt,
    };
  });

  return {
    bookings,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    },
    kpis,
  };
}
