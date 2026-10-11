/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";
import { getDashboardData } from "../lib/dashboard-data";
import { GET as getDashboardRoute } from "../app/api/admin/dashboard/route";
import { checkInBookingAction } from "../actions/bookings";
import { prisma } from "../lib/prisma";
import { createISTDateTime, getISTDateString } from "../lib/date-utils";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "super-secret-jwt-key-change-in-production"
);

// Mock cookies for Next.js route testing
const mockCookieStore = {
  get: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

describe("Stage 2: Operations Cockpit Dashboard & SWR Sync Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. GET /api/admin/dashboard Route Handler & Auth Enforcement", () => {
    it("returns 401 Unauthorized when admin_token cookie is missing", async () => {
      mockCookieStore.get.mockReturnValueOnce(undefined);

      const response = await getDashboardRoute();
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 401 Unauthorized when admin_token cookie is invalid or expired", async () => {
      mockCookieStore.get.mockReturnValueOnce({ value: "invalid-garbage-jwt" });

      const response = await getDashboardRoute();
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 200 with exact payload schema defined in admin-front-end.md#10.3 when authenticated", async () => {
      const validToken = await new SignJWT({ adminId: "admin-1", username: "admin1" })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h")
        .sign(JWT_SECRET);

      mockCookieStore.get.mockReturnValueOnce({ value: validToken });

      // Mock prisma queries called by getDashboardData
      vi.spyOn(prisma.booking, "findMany").mockResolvedValueOnce([
        {
          id: "b-1",
          status: "CONFIRMED",
          rentCharge: 14000,
          totalPaid: 5000,
          refundAmount: 0,
        } as any,
        {
          id: "b-2",
          status: "CANCELLED",
          rentCharge: 10000,
          totalPaid: 4000,
          refundAmount: 1000, // Retained: 3000
        } as any,
      ]);

      vi.spyOn(prisma.bookingUnit, "findMany")
        // 1st call: residentUnits
        .mockResolvedValueOnce([
          { adults: 2, infants: 1, headcount: null } as any,
          { adults: 3, infants: 0, headcount: null } as any,
        ])
        // 2nd call: todayUnits
        .mockResolvedValueOnce([]);

      const response = await getDashboardRoute();
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();

      // Check exact top-level keys
      expect(json.data).toHaveProperty("summaryMetrics");
      expect(json.data).toHaveProperty("hallOperations");
      expect(json.data).toHaveProperty("underpaidArrivals");
      expect(json.data).toHaveProperty("todayRoster");
      expect(json.data).toHaveProperty("lastSyncedAt");

      // Verify summaryMetrics keys
      expect(json.data.summaryMetrics).toHaveProperty("total30DayRevenue");
      expect(json.data.summaryMetrics).toHaveProperty("todayCheckinsCount");
      expect(json.data.summaryMetrics).toHaveProperty("todayCheckoutsCount");
      expect(json.data.summaryMetrics).toHaveProperty("residentOvernightGuests");

      // Verify hallOperations keys
      expect(json.data.hallOperations).toHaveProperty("nonAcHall");
      expect(json.data.hallOperations).toHaveProperty("acHall");
      expect(json.data.hallOperations.nonAcHall).toHaveProperty("morningSlotHeadcount");
      expect(json.data.hallOperations.nonAcHall).toHaveProperty("eveningSlotHeadcount");
      expect(json.data.hallOperations.acHall).toHaveProperty("morningSlotHeadcount");
      expect(json.data.hallOperations.acHall).toHaveProperty("eveningSlotHeadcount");

      // Verify arrays
      expect(Array.isArray(json.data.underpaidArrivals)).toBe(true);
      expect(Array.isArray(json.data.todayRoster)).toBe(true);
    });
  });

  describe("2. 30-Day Net Revenue Formula Guardrails", () => {
    it("correctly includes active rent plus retained cancellation fees and excludes extra line items", async () => {
      const now = new Date("2026-10-08T12:00:00.000Z");

      vi.spyOn(prisma.booking, "findMany").mockResolvedValueOnce([
        // Active Booking 1: Rent 14000
        {
          id: "b-1",
          status: "CONFIRMED",
          rentCharge: 14000,
          totalPaid: 4000,
          refundAmount: 0,
        } as any,
        // Active Booking 2: Rent 20000
        {
          id: "b-2",
          status: "CHECKED_IN",
          rentCharge: 20000,
          totalPaid: 20000,
          refundAmount: 0,
        } as any,
        // Cancelled Booking 3: Paid 6000, Refunded 2000 -> Retained 4000
        {
          id: "b-3",
          status: "CANCELLED",
          rentCharge: 12000, // Should be ignored because status is CANCELLED
          totalPaid: 6000,
          refundAmount: 2000,
        } as any,
        // Cancelled Booking 4: Full refund -> Retained 0
        {
          id: "b-4",
          status: "CANCELLED",
          rentCharge: 10000,
          totalPaid: 3000,
          refundAmount: 3000,
        } as any,
      ]);

      vi.spyOn(prisma.bookingUnit, "findMany")
        .mockResolvedValueOnce([]) // residentUnits
        .mockResolvedValueOnce([]); // todayUnits

      const data = await getDashboardData(now);

      // Total Net Revenue = 14000 + 20000 + (6000 - 2000) + 0 = 38000
      expect(data.summaryMetrics.total30DayRevenue).toBe(38000);
    });
  });

  describe("3. Resident Overnight Guests Invariant", () => {
    it("counts strictly stayType = 'OVERNIGHT' across Domes & A-Frames, excluding day slots and resting domes", async () => {
      const now = new Date("2026-10-08T12:00:00.000Z");

      vi.spyOn(prisma.booking, "findMany").mockResolvedValueOnce([]);

      // Mock residentUnits return
      const residentUnitsMock = [
        { adults: 2, infants: 1, headcount: null }, // Dome 1: 3 guests
        { adults: 4, infants: 1, headcount: null }, // A-Frame 1: 5 guests
      ];

      vi.spyOn(prisma.bookingUnit, "findMany")
        .mockResolvedValueOnce(residentUnitsMock as any)
        .mockResolvedValueOnce([]);

      const data = await getDashboardData(now);

      // (2 + 1) + (4 + 1) = 8 overnight resident guests
      expect(data.summaryMetrics.residentOvernightGuests).toBe(8);

      // Verify prisma query filters strictly enforce the invariants
      const firstFindManyCall = vi.mocked(prisma.bookingUnit.findMany).mock.calls[0][0];
      expect(firstFindManyCall?.where?.stayType).toBe("OVERNIGHT");
      expect(firstFindManyCall?.where?.isComplimentary).toBe(false);
      expect((firstFindManyCall?.where?.unit as any)?.category?.in).toEqual([
        "DOME",
        "A_FRAME",
      ]);
    });
  });

  describe("4. Today's Check-ins, Check-outs, and Hall Shift Headcounts", () => {
    it("accurately counts today's arrivals and departures in IST and aggregates hall shifts", async () => {
      const refDate = new Date("2026-10-08T06:00:00.000Z"); // 11:30 AM IST on 2026-10-08
      const todayStr = getISTDateString(refDate); // "2026-10-08"

      // Check-in today at 12:00 PM IST
      const checkInTime = createISTDateTime(todayStr, "12:00:00");
      // Check-out today at 11:00 AM IST
      const checkOutTime = createISTDateTime(todayStr, "11:00:00");
      // Morning hall slot: 10:00 AM - 3:00 PM IST today
      const morningHallStart = createISTDateTime(todayStr, "10:00:00");
      const morningHallEnd = createISTDateTime(todayStr, "15:00:00");

      vi.spyOn(prisma.booking, "findMany").mockResolvedValueOnce([]);
      vi.spyOn(prisma.bookingUnit, "findMany")
        .mockResolvedValueOnce([]) // residentUnits
        .mockResolvedValueOnce([
          // Arriving Dome booking #B010
          {
            id: "bu-1",
            startDatetime: checkInTime,
            endDatetime: new Date(checkInTime.getTime() + 86400000),
            stayType: "OVERNIGHT",
            unit: { id: "u-1", name: "Dome 1", category: "DOME" },
            booking: {
              id: "b-10",
              bookingId: "#B010",
              guestName: "Priya Nair",
              guestPhone: "+919800000001",
              status: "CONFIRMED",
              rentCharge: 5000,
              totalPaid: 5000,
              updatedAt: new Date(),
            },
          } as any,
          // Departing Dome booking #B009
          {
            id: "bu-2",
            startDatetime: new Date(checkOutTime.getTime() - 86400000),
            endDatetime: checkOutTime,
            stayType: "OVERNIGHT",
            unit: { id: "u-2", name: "Dome 2", category: "DOME" },
            booking: {
              id: "b-09",
              bookingId: "#B009",
              guestName: "Arun Varma",
              guestPhone: "+919800000002",
              status: "CHECKED_IN",
              rentCharge: 5000,
              totalPaid: 5000,
              updatedAt: new Date(),
            },
          } as any,
          // Non-AC Hall Morning event: 450 Pax
          {
            id: "bu-3",
            startDatetime: morningHallStart,
            endDatetime: morningHallEnd,
            stayType: "MORNING_SLOT",
            headcount: 450,
            unit: { id: "u-hall-1", name: "Non-AC Event Hall", category: "NON_AC_HALL" },
            booking: {
              id: "b-11",
              bookingId: "#B011",
              guestName: "K. Menon",
              guestPhone: "+919800000003",
              status: "CONFIRMED",
              rentCharge: 58000,
              totalPaid: 20000,
              updatedAt: new Date(),
            },
          } as any,
        ]);

      const data = await getDashboardData(refDate);

      // Check-ins: #B010 and #B011 arrive today -> 2 check-ins
      expect(data.summaryMetrics.todayCheckinsCount).toBe(2);
      // Check-outs: #B009 departs today and #B011 concludes today -> 2 check-outs
      expect(data.summaryMetrics.todayCheckoutsCount).toBe(2);

      // Hall operations
      expect(data.hallOperations.nonAcHall.morningSlotHeadcount).toBe(450);
      expect(data.hallOperations.nonAcHall.eveningSlotHeadcount).toBe(0);
      expect(data.hallOperations.acHall.morningSlotHeadcount).toBe(0);
      expect(data.hallOperations.acHall.eveningSlotHeadcount).toBe(0);
    });
  });

  describe("5. Underpaid Arrival Condition", () => {
    it("flags an arrival as underpaid only when arrivalDate === TODAY AND totalPaid < requiredAdvance", async () => {
      const refDate = new Date("2026-10-08T06:00:00.000Z");
      const todayStr = getISTDateString(refDate);
      const arrivalToday = createISTDateTime(todayStr, "12:00:00");

      vi.spyOn(prisma.booking, "findMany").mockResolvedValueOnce([]);
      vi.spyOn(prisma.bookingUnit, "findMany")
        .mockResolvedValueOnce([]) // residentUnits
        .mockResolvedValueOnce([
          // Case 1: Arrives today, Required 5000, Paid 2000 -> UNDERPAID (shortfall 3000)
          {
            id: "bu-underpaid",
            startDatetime: arrivalToday,
            endDatetime: new Date(arrivalToday.getTime() + 86400000),
            stayType: "OVERNIGHT",
            deposit: 5000,
            unit: { id: "u-1", name: "Dome 2", category: "DOME" },
            booking: {
              id: "b-underpaid",
              bookingId: "#B024",
              guestName: "Rahul Sharma",
              guestPhone: "+919876543210",
              status: "CONFIRMED",
              rentCharge: 12000,
              totalPaid: 2000,
              updatedAt: new Date(),
            },
          } as any,
          // Case 2: Arrives today, Required 2000, Paid 2000 -> NOT underpaid
          {
            id: "bu-paid",
            startDatetime: arrivalToday,
            endDatetime: new Date(arrivalToday.getTime() + 86400000),
            stayType: "OVERNIGHT",
            deposit: 2000,
            unit: { id: "u-2", name: "Dome 3", category: "DOME" },
            booking: {
              id: "b-paid",
              bookingId: "#B025",
              guestName: "Sneha Roy",
              guestPhone: "+919876543211",
              status: "CONFIRMED",
              rentCharge: 7000,
              totalPaid: 2000,
              updatedAt: new Date(),
            },
          } as any,
        ]);

      const data = await getDashboardData(refDate);

      expect(data.underpaidArrivals).toHaveLength(1);
      const alert = data.underpaidArrivals[0];
      expect(alert.bookingId).toBe("#B024");
      expect(alert.guestName).toBe("Rahul Sharma");
      expect(alert.requiredAdvance).toBe(5000);
      expect(alert.totalPaid).toBe(2000);
      expect(alert.shortfall).toBe(3000);
    });
  });

  describe("6. Today's Roster Structure & Timing Mapping", () => {
    it("maps scheduledTime and stayType with precise balance due calculations", async () => {
      const refDate = new Date("2026-10-08T06:00:00.000Z");
      const todayStr = getISTDateString(refDate);
      const arrivalToday = createISTDateTime(todayStr, "12:00:00");

      vi.spyOn(prisma.booking, "findMany").mockResolvedValueOnce([]);
      vi.spyOn(prisma.bookingUnit, "findMany")
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: "bu-roster-1",
            startDatetime: arrivalToday,
            endDatetime: new Date(arrivalToday.getTime() + 86400000),
            stayType: "OVERNIGHT",
            deposit: 2000,
            unit: { id: "u-1", name: "Dome 1", category: "DOME" },
            booking: {
              id: "b-roster-1",
              bookingId: "#B022",
              guestName: "Amina Patel",
              guestPhone: "+919812345678",
              status: "CONFIRMED",
              rentCharge: 10000,
              totalPaid: 2000, // Balance due: 8000
              updatedAt: new Date(),
            },
          } as any,
        ]);

      const data = await getDashboardData(refDate);

      expect(data.todayRoster).toHaveLength(1);
      const item = data.todayRoster[0];
      expect(item.bookingId).toBe("#B022");
      expect(item.guestName).toBe("Amina Patel");
      expect(item.units).toEqual(["Dome 1"]);
      expect(item.stayType).toBe("OVERNIGHT");
      expect(item.scheduledTime).toBe("12:00 PM Check-In");
      expect(item.status).toBe("CONFIRMED");
      expect(item.balanceDue).toBe(8000);
    });

    it("includes extra receipt line items in roster balance due and exposes id and updatedAt in underpaid arrivals", async () => {
      const refDate = new Date("2026-10-08T06:00:00.000Z");
      const todayStr = getISTDateString(refDate);
      const arrivalToday = createISTDateTime(todayStr, "12:00:00");

      vi.spyOn(prisma.booking, "findMany").mockResolvedValueOnce([]);
      vi.spyOn(prisma.bookingUnit, "findMany")
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: "bu-roster-extra",
            startDatetime: arrivalToday,
            endDatetime: new Date(arrivalToday.getTime() + 86400000),
            stayType: "OVERNIGHT",
            deposit: 5000,
            unit: { id: "u-1", name: "Dome 1", category: "DOME" },
            booking: {
              id: "b-roster-extra",
              bookingId: "#B055",
              guestName: "Zoya Ali",
              guestPhone: "+919812345679",
              status: "CONFIRMED",
              rentCharge: 10000,
              totalPaid: 2000,
              receiptLineItems: [{ description: "BBQ Setup", amount: 1500 }],
              updatedAt: new Date("2026-10-08T05:00:00.000Z"),
              notes: "VIP guest, prefers river-view dome",
            },
          } as any,
        ]);

      const data = await getDashboardData(refDate);

      // Total billed = 10000 + 1500 = 11500. Total paid = 2000. Balance due = 9500.
      expect(data.todayRoster[0].balanceDue).toBe(9500);
      expect(data.todayRoster[0].notes).toBe("VIP guest, prefers river-view dome");

      // Underpaid arrival checks
      expect(data.underpaidArrivals[0].id).toBe("b-roster-extra");
      expect(data.underpaidArrivals[0].updatedAt).toBeDefined();
      expect(data.underpaidArrivals[0].shortfall).toBe(3000); // 5000 required - 2000 paid
    });
  });

  describe("7. Quick Check-In Action Flow", () => {
    it("transitions booking and units to CHECKED_IN and creates an audit log", async () => {
      const validUuid = "11111111-1111-4111-a111-111111111111";
      const mockBooking = {
        id: validUuid,
        bookingId: "#B030",
        status: "CONFIRMED",
        guestName: "Vikram Seth",
        updatedAt: new Date("2026-10-08T05:00:00.000Z"),
        units: [],
      };

      const mockUpdated = {
        ...mockBooking,
        status: "CHECKED_IN",
      };

      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (callback: any) => {
        const tx = {
          booking: {
            findUnique: vi.fn().mockResolvedValueOnce(mockBooking),
            update: vi.fn().mockResolvedValueOnce(mockUpdated),
          },
          bookingUnit: {
            updateMany: vi.fn().mockResolvedValueOnce({ count: 1 }),
          },
          auditLog: {
            create: vi.fn().mockResolvedValueOnce({ id: "audit-1" }),
          },
        };
        return callback(tx);
      });

      const result = await checkInBookingAction({
        bookingId: validUuid,
        expectedUpdatedAt: mockBooking.updatedAt,
      });

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("CHECKED_IN");
    });

    it("rejects check-in for cancelled bookings", async () => {
      const validUuid = "22222222-2222-4222-a222-222222222222";
      const mockCancelled = {
        id: validUuid,
        bookingId: "#B031",
        status: "CANCELLED",
        updatedAt: new Date(),
        units: [],
      };

      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (callback: any) => {
        const tx = {
          booking: {
            findUnique: vi.fn().mockResolvedValueOnce(mockCancelled),
          },
        };
        return callback(tx);
      });

      const result = await checkInBookingAction({
        bookingId: validUuid,
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Cannot check in a cancelled booking/i);
    });

    it("accepts human-readable bookingId format (#B001) in checkInBookingAction", async () => {
      const mockBooking = {
        id: "33333333-3333-4333-a333-333333333333",
        bookingId: "#B032",
        status: "CONFIRMED",
        updatedAt: new Date("2026-10-08T06:00:00Z"),
        units: [],
      };

      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (callback: any) => {
        const tx = {
          booking: {
            findFirst: vi.fn().mockResolvedValueOnce(mockBooking),
            update: vi.fn().mockResolvedValueOnce({ ...mockBooking, status: "CHECKED_IN" }),
          },
          bookingUnit: {
            updateMany: vi.fn().mockResolvedValueOnce({ count: 1 }),
          },
          auditLog: {
            create: vi.fn().mockResolvedValueOnce({ id: "audit-2" }),
          },
        };
        return callback(tx);
      });

      const result = await checkInBookingAction({
        bookingId: "#B032",
        expectedUpdatedAt: mockBooking.updatedAt,
      });

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("CHECKED_IN");
    });
  });

  describe("5. Dashboard Server Actions (actions/dashboard-actions.ts)", () => {
    it("handles dashboardRecordPaymentAction with #B001 booking ID and updates totalPaid", async () => {
      const { dashboardRecordPaymentAction } = await import("../actions/dashboard-actions");
      const mockBooking = {
        id: "44444444-4444-4444-a444-444444444444",
        bookingId: "#B040",
        status: "CONFIRMED",
        rentCharge: 12000,
        totalPaid: 4000,
        updatedAt: new Date("2026-10-08T07:00:00Z"),
        units: [],
      };

      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (callback: any) => {
        const tx = {
          booking: {
            findFirst: vi.fn().mockResolvedValueOnce(mockBooking),
            update: vi.fn().mockResolvedValueOnce({
              ...mockBooking,
              totalPaid: 9000,
              updatedAt: new Date("2026-10-08T07:05:00Z"),
            }),
          },
          auditLog: {
            create: vi.fn().mockResolvedValueOnce({ id: "audit-3" }),
          },
        };
        return callback(tx);
      });

      const result = await dashboardRecordPaymentAction({
        bookingId: "#B040",
        amount: 5000,
        expectedUpdatedAt: mockBooking.updatedAt,
      });

      expect(result.success).toBe(true);
      expect(result.data?.totalPaid).toBe(9000);
    });

    it("rejects dashboardRecordPaymentAction when OCC timestamp indicates stale record", async () => {
      const { dashboardRecordPaymentAction } = await import("../actions/dashboard-actions");
      const mockBooking = {
        id: "55555555-5555-4555-a555-555555555555",
        bookingId: "#B050",
        status: "CONFIRMED",
        rentCharge: 10000,
        totalPaid: 5000,
        updatedAt: new Date("2026-10-08T08:00:00Z"), // Record modified at 8:00
        units: [],
      };

      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (callback: any) => {
        const tx = {
          booking: {
            findFirst: vi.fn().mockResolvedValueOnce(mockBooking),
          },
        };
        return callback(tx);
      });

      const result = await dashboardRecordPaymentAction({
        bookingId: "#B050",
        amount: 2000,
        expectedUpdatedAt: new Date("2026-10-08T07:50:00Z"), // Stale client timestamp from 7:50
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe("BOOKING_STALE_RECORD");
      expect(result.error).toMatch(/modified by another Admin/i);
    });
  });
});

