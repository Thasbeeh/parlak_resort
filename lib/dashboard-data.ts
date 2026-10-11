/**
 * Parlak Resort - Dashboard Data & Operations Analytics Engine
 *
 * Implements authoritative server-side queries for the Admin Operations Cockpit:
 * 1. 30-Day Net Revenue Formula:
 *    Net Revenue = sum_Active(rentCharge) + sum_Cancelled(totalPaid - refundAmount)
 *    (Extra receipt line items are strictly excluded from dashboard rent analytics).
 * 2. Resident Overnight Guests Invariant:
 *    Strictly filters stayType = 'OVERNIGHT' across Domes & A-Frames with status = 'CHECKED_IN'.
 *    (Day slots, daytime visitors, and resting domes attached to events are strictly excluded).
 * 3. Today's Check-ins & Check-outs:
 *    Evaluated against Asia/Kolkata (IST) calendar day.
 * 4. Hall Shift Operations:
 *    Morning Slot (10 AM - 3 PM) and Evening Slot (5 PM - 10 PM) headcounts for Non-AC & AC halls.
 * 5. Underpaid Arrival Condition:
 *    arrivalDate === TODAY AND totalPaid < requiredAdvance.
 * 6. Today's Roster:
 *    Active reservations arriving or departing today in IST.
 */

import { prisma } from './prisma';
import {
  getISTDateString,
  createISTDateTime,
} from './date-utils';

export interface DashboardSummaryMetrics {
  total30DayRevenue: number;
  todayCheckinsCount: number;
  todayCheckoutsCount: number;
  residentOvernightGuests: number;
}

export interface HallShiftHeadcounts {
  morningSlotHeadcount: number;
  eveningSlotHeadcount: number;
}

export interface DashboardHallOperations {
  nonAcHall: HallShiftHeadcounts;
  acHall: HallShiftHeadcounts;
}

export interface UnderpaidArrival {
  id?: string;
  bookingId: string;
  guestName: string;
  guestPhone: string;
  unitName: string;
  requiredAdvance: number;
  totalPaid: number;
  shortfall: number;
  updatedAt?: string;
}

export interface TodayRosterItem {
  id: string;
  bookingId: string;
  guestName: string;
  guestPhone: string;
  units: string[];
  stayType: string;
  scheduledTime: string;
  status: string;
  balanceDue: number;
  updatedAt?: string;
  rentCharge?: number;
  totalPaid?: number;
  notes?: string | null;
}

export interface DashboardData {
  summaryMetrics: DashboardSummaryMetrics;
  hallOperations: DashboardHallOperations;
  underpaidArrivals: UnderpaidArrival[];
  todayRoster: TodayRosterItem[];
  lastSyncedAt: string;
}

/**
 * Returns IST start and end timestamps for a reference calendar date.
 */
export function getISTTodayRange(referenceDate: Date = new Date()) {
  const todayISTStr = getISTDateString(referenceDate);
  const todayStart = createISTDateTime(todayISTStr, '00:00:00');
  const todayEnd = new Date(createISTDateTime(todayISTStr, '23:59:59').getTime() + 999);
  return { todayISTStr, todayStart, todayEnd };
}

/**
 * Executes direct database queries to compile full operational cockpit metrics.
 */
export async function getDashboardData(
  referenceDate: Date = new Date()
): Promise<DashboardData> {
  const { todayStart, todayEnd } = getISTTodayRange(referenceDate);
  const now = referenceDate;

  // 1. 30-Day Net Revenue: sum_Active(rentCharge) + sum_Cancelled(totalPaid - refundAmount)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentBookings = await prisma.booking.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
    },
    select: {
      id: true,
      status: true,
      rentCharge: true,
      totalPaid: true,
      refundAmount: true,
    },
  });

  let total30DayRevenue = 0;
  for (const b of recentBookings) {
    if (b.status === 'CANCELLED') {
      const retained = (b.totalPaid || 0) - (b.refundAmount || 0);
      total30DayRevenue += Math.max(0, retained);
    } else {
      total30DayRevenue += (b.rentCharge || 0);
    }
  }
  total30DayRevenue = Math.round(total30DayRevenue);

  // 2. Resident Overnight Guests: Strictly stayType = 'OVERNIGHT' across Domes & A-Frames
  const residentUnits = await prisma.bookingUnit.findMany({
    where: {
      stayType: 'OVERNIGHT',
      unit: {
        category: { in: ['DOME', 'A_FRAME'] },
      },
      isComplimentary: false,
      OR: [
        { status: 'CHECKED_IN' },
        { booking: { status: 'CHECKED_IN' } },
      ],
      booking: {
        parentBookingId: null,
        status: { not: 'CANCELLED' },
      },
    },
    select: {
      adults: true,
      infants: true,
      headcount: true,
    },
  });

  let residentOvernightGuests = 0;
  for (const bu of residentUnits) {
    residentOvernightGuests +=
      (bu.adults ?? 0) + (bu.infants ?? 0) || (bu.headcount ?? 1);
  }

  // 3. Operational units covering today (for Check-ins, Check-outs, Hall shifts, Underpaid arrivals, Roster)
  const todayUnits = await prisma.bookingUnit.findMany({
    where: {
      status: { notIn: ['CANCELLED', 'MAINTENANCE_BLOCKED'] },
      OR: [
        { startDatetime: { gte: todayStart, lte: todayEnd } },
        { endDatetime: { gte: todayStart, lte: todayEnd } },
        {
          AND: [
            { startDatetime: { lte: todayStart } },
            { endDatetime: { gte: todayEnd } },
          ],
        },
      ],
    },
    include: {
      booking: true,
      unit: {
        include: {
          priceList: {
            include: {
              slabs: true,
            },
          },
        },
      },
    },
    orderBy: {
      startDatetime: 'asc',
    },
  });

  // Calculate Today's Check-ins & Check-outs counts
  const arrivingBookingIds = new Set<string>();
  const departingBookingIds = new Set<string>();

  for (const bu of todayUnits) {
    if (!bu.booking) continue;
    const startMs = new Date(bu.startDatetime).getTime();
    const endMs = new Date(bu.endDatetime).getTime();

    if (startMs >= todayStart.getTime() && startMs <= todayEnd.getTime()) {
      arrivingBookingIds.add(bu.booking.id);
    }
    if (endMs >= todayStart.getTime() && endMs <= todayEnd.getTime()) {
      departingBookingIds.add(bu.booking.id);
    }
  }

  const todayCheckinsCount = arrivingBookingIds.size;
  const todayCheckoutsCount = departingBookingIds.size;

  // 4. Hall Shift Operations
  const hallOperations: DashboardHallOperations = {
    nonAcHall: { morningSlotHeadcount: 0, eveningSlotHeadcount: 0 },
    acHall: { morningSlotHeadcount: 0, eveningSlotHeadcount: 0 },
  };

  for (const bu of todayUnits) {
    const startMs = new Date(bu.startDatetime).getTime();
    const isTodayStart =
      startMs >= todayStart.getTime() && startMs <= todayEnd.getTime();
    if (!isTodayStart) continue;

    const cat = bu.unit?.category;
    const count = bu.headcount ?? 0;

    if (cat === 'NON_AC_HALL') {
      if (bu.stayType === 'MORNING_SLOT') {
        hallOperations.nonAcHall.morningSlotHeadcount += count;
      } else if (bu.stayType === 'EVENING_SLOT') {
        hallOperations.nonAcHall.eveningSlotHeadcount += count;
      }
    } else if (cat === 'AC_HALL') {
      if (bu.stayType === 'MORNING_SLOT') {
        hallOperations.acHall.morningSlotHeadcount += count;
      } else if (bu.stayType === 'EVENING_SLOT') {
        hallOperations.acHall.eveningSlotHeadcount += count;
      }
    }
  }

  // 5. Underpaid Arrivals: arrivalDate === TODAY AND totalPaid < requiredAdvance
  const arrivingBookingsMap = new Map<
    string,
    { booking: NonNullable<(typeof todayUnits)[0]['booking']>; units: typeof todayUnits }
  >();

  for (const bu of todayUnits) {
    if (!bu.booking) continue;
    const startMs = new Date(bu.startDatetime).getTime();
    const isTodayStart =
      startMs >= todayStart.getTime() && startMs <= todayEnd.getTime();
    if (!isTodayStart) continue;

    if (!arrivingBookingsMap.has(bu.booking.id)) {
      arrivingBookingsMap.set(bu.booking.id, { booking: bu.booking, units: [] });
    }
    arrivingBookingsMap.get(bu.booking.id)!.units.push(bu);
  }

  const underpaidArrivals: UnderpaidArrival[] = [];

  for (const { booking, units } of arrivingBookingsMap.values()) {
    let requiredAdvance = 0;
    for (const bu of units) {
      if (bu.deposit && bu.deposit > 0) {
        requiredAdvance += bu.deposit;
      } else {
        const slab = bu.unit?.priceList?.slabs?.find(
          (s: { stayType: string; requiredDeposit: number }) => s.stayType === bu.stayType
        );
        requiredAdvance += slab?.requiredDeposit ?? 2000;
      }
    }

    const totalPaid = booking.totalPaid || 0;
    if (totalPaid < requiredAdvance) {
      const shortfall = requiredAdvance - totalPaid;
      underpaidArrivals.push({
        id: booking.id,
        bookingId: booking.bookingId,
        guestName: booking.guestName,
        guestPhone: booking.guestPhone,
        unitName: units
          .map((u) => u.unit?.name)
          .filter(Boolean)
          .join(', '),
        requiredAdvance: Math.round(requiredAdvance),
        totalPaid: Math.round(totalPaid),
        shortfall: Math.round(shortfall),
        updatedAt: booking.updatedAt?.toISOString?.() ?? new Date().toISOString(),
      });
    }
  }

  // 6. Today's Roster: Arrivals, departures, or active events scheduled today
  const rosterBookingsMap = new Map<
    string,
    { booking: NonNullable<(typeof todayUnits)[0]['booking']>; units: typeof todayUnits }
  >();

  for (const bu of todayUnits) {
    if (!bu.booking) continue;
    if (!rosterBookingsMap.has(bu.booking.id)) {
      rosterBookingsMap.set(bu.booking.id, { booking: bu.booking, units: [] });
    }
    rosterBookingsMap.get(bu.booking.id)!.units.push(bu);
  }

  const todayRoster: TodayRosterItem[] = [];

  for (const { booking, units } of rosterBookingsMap.values()) {
    const firstUnit = units[0];
    const startMs = new Date(firstUnit.startDatetime).getTime();
    const endMs = new Date(firstUnit.endDatetime).getTime();
    const isArrivingToday =
      startMs >= todayStart.getTime() && startMs <= todayEnd.getTime();
    const isDepartingToday =
      endMs >= todayStart.getTime() && endMs <= todayEnd.getTime();

    let scheduledTime = '12:00 PM Check-In';
    if (firstUnit.stayType === 'MORNING_SLOT') {
      scheduledTime = '10:00 AM Event';
    } else if (firstUnit.stayType === 'EVENING_SLOT') {
      scheduledTime = '5:00 PM Event';
    } else if (firstUnit.stayType === 'DAY_SLOT') {
      scheduledTime =
        isDepartingToday && !isArrivingToday
          ? '3:00 PM Check-Out'
          : '10:00 AM Check-In';
    } else if (firstUnit.stayType === 'OVERNIGHT') {
      scheduledTime =
        isDepartingToday && !isArrivingToday
          ? '11:00 AM Check-Out'
          : '12:00 PM Check-In';
    }

    // Final Balance Due = Math.round(Rent Charge + Receipt Line Items) - Math.round(Total Paid)
    // per rooms.md line 57 and event_hall.md line 134
    const lineItems = Array.isArray(booking.receiptLineItems)
      ? (booking.receiptLineItems as Array<{ description?: string; amount?: number }>)
      : [];
    const lineItemsTotal = lineItems.reduce(
      (sum, item) => sum + (Number(item?.amount) || 0),
      0
    );
    const balanceDue = Math.max(
      0,
      Math.round((booking.rentCharge || 0) + lineItemsTotal - (booking.totalPaid || 0))
    );

    todayRoster.push({
      id: booking.id,
      bookingId: booking.bookingId,
      guestName: booking.guestName,
      guestPhone: booking.guestPhone,
      units: Array.from(new Set(units.map((u) => u.unit?.name).filter(Boolean))),
      stayType: firstUnit.stayType,
      scheduledTime,
      status: booking.status,
      balanceDue,
      updatedAt: booking.updatedAt?.toISOString?.() ?? new Date().toISOString(),
      rentCharge: Math.round(booking.rentCharge || 0),
      totalPaid: Math.round(booking.totalPaid || 0),
      notes: booking.notes,
    });
  }

  return {
    summaryMetrics: {
      total30DayRevenue,
      todayCheckinsCount,
      todayCheckoutsCount,
      residentOvernightGuests,
    },
    hallOperations,
    underpaidArrivals,
    todayRoster,
    lastSyncedAt: new Date().toISOString(),
  };
}
