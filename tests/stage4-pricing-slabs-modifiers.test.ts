/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createPriceList,
  updatePriceList,
  deletePriceList,
  getPriceLists,
  getPriceListById,
} from "../actions/price-lists";
import {
  createModifier,
  updateModifier,
  deleteModifier,
  toggleModifierStatus,
  getModifiers,
} from "../actions/modifiers";
import {
  priceListSchema,
  createPriceModifierSchema,
  updatePriceModifierSchema,
} from "../schemas/price.schema";
import {
  resolveSlabForHeadcount,
  calculateModifiedPrice,
  calculateNightByNightStayRate,
  getISTDateString,
  isWeekendIST,
  resolveModifiers,
} from "../lib/pricing/resolve-modifiers";
import { prisma } from "../lib/prisma";

const PRICELIST_ID_1 = "price-list-dome-test";
const PRICELIST_ID_2 = "price-list-hall-test";
const MODIFIER_ID_1 = "modifier-weekend-test";
const MODIFIER_ID_2 = "modifier-expired-test";

describe("Stage 4: Dynamic Pricing Engine, Slab Builder & Modifiers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Price List Overview & Querying", () => {
    it("lists all rate plans with slab counts and attached units count", async () => {
      const mockPriceLists = [
        {
          id: PRICELIST_ID_1,
          name: "Standard Dome Plan",
          slug: "standard-dome-plan",
          unitType: "DOME",
          maxGuestCapacity: 3,
          slabs: [
            { id: "s1", stayType: "OVERNIGHT", minHeadcount: 1, maxHeadcount: 3, basePrice: 3500, requiredDeposit: 2000 },
            { id: "s2", stayType: "DAY_SLOT", minHeadcount: 1, maxHeadcount: 3, basePrice: 2500, requiredDeposit: 2000 },
          ],
          modifiers: [],
          _count: { units: 4, slabs: 2, modifiers: 1 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.spyOn(prisma.priceList, "findMany").mockResolvedValueOnce(mockPriceLists as any);

      const res = await getPriceLists();
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      const plan = (res.data as any)[0];
      expect(plan._count.units).toBe(4);
      expect(plan.slabs).toHaveLength(2);
    });

    it("fetches single price list by id with unit and slab relations", async () => {
      const mockPriceList = {
        id: PRICELIST_ID_1,
        name: "Standard Dome Plan",
        slug: "standard-dome-plan",
        unitType: "DOME",
        maxGuestCapacity: 3,
        slabs: [
          { id: "s1", stayType: "OVERNIGHT", minHeadcount: 1, maxHeadcount: 3, basePrice: 3500, requiredDeposit: 2000 },
          { id: "s2", stayType: "DAY_SLOT", minHeadcount: 1, maxHeadcount: 3, basePrice: 2500, requiredDeposit: 2000 },
        ],
        modifiers: [],
        units: [{ id: "dome-1", name: "Dome 1", category: "DOME", maxCapacity: 3, isActive: true }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(prisma.priceList, "findUnique").mockResolvedValueOnce(mockPriceList as any);

      const res = await getPriceListById(PRICELIST_ID_1);
      expect(res.success).toBe(true);
      expect((res.data as any).name).toBe("Standard Dome Plan");
      expect((res.data as any).units).toHaveLength(1);
    });
  });

  describe("2. Price List Deletion Guardrails (PRICE_LIST_IN_USE & EXPIRED_MODIFIER_LOCKED)", () => {
    it("blocks deletion when price list is attached to units with PRICE_LIST_IN_USE", async () => {
      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (cb: any) => {
        const tx = {
          priceList: {
            findUnique: vi.fn().mockResolvedValue({
              id: PRICELIST_ID_1,
              name: "Dome Standard",
              updatedAt: new Date(),
              units: [{ id: "dome-1", name: "Dome 1" }, { id: "dome-2", name: "Dome 2" }],
              modifiers: [],
            }),
          },
        };
        return cb(tx);
      });

      const res = await deletePriceList(PRICELIST_ID_1);
      expect(res.success).toBe(false);
      expect(res.code).toBe("PRICE_LIST_IN_USE");
      expect(res.status).toBe(400);
      expect(res.error).toContain("currently attached to 2 unit(s)");
    });

    it("blocks deletion when price list contains expired locked modifiers (EXPIRED_MODIFIER_LOCKED)", async () => {
      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (cb: any) => {
        const tx = {
          priceList: {
            findUnique: vi.fn().mockResolvedValue({
              id: PRICELIST_ID_1,
              name: "Dome Standard",
              updatedAt: new Date(),
              units: [], // no units
              modifiers: [
                {
                  id: "m-old",
                  name: "Past Promo 2024",
                  endDate: new Date("2024-01-01"), // Expired
                },
              ],
            }),
          },
        };
        return cb(tx);
      });

      const res = await deletePriceList(PRICELIST_ID_1);
      expect(res.success).toBe(false);
      expect(res.code).toBe("EXPIRED_MODIFIER_LOCKED");
      expect(res.status).toBe(400);
    });

    it("allows deletion when no units and no expired modifiers are attached", async () => {
      const mockDeleted = { id: PRICELIST_ID_1 };
      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (cb: any) => {
        const tx = {
          priceList: {
            findUnique: vi.fn().mockResolvedValue({
              id: PRICELIST_ID_1,
              name: "Unused Plan",
              updatedAt: new Date(),
              units: [],
              modifiers: [],
            }),
            delete: vi.fn().mockResolvedValue(mockDeleted),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({ id: "audit-1" }),
          },
        };
        return cb(tx);
      });

      const res = await deletePriceList(PRICELIST_ID_1);
      expect(res.success).toBe(true);
      expect(res.status).toBe(200);
    });
  });

  describe("3. Contiguous Slabs Validation & SuperRefine Rules", () => {
    it("enforces lowest slab starts at 1 Pax for Room categories", () => {
      const invalidDome = {
        name: "Invalid Dome Plan",
        unitType: "DOME",
        maxGuestCapacity: 3,
        slabs: [
          { stayType: "OVERNIGHT", minHeadcount: 2, maxHeadcount: 3, basePrice: 3500, requiredDeposit: 2000 },
          { stayType: "DAY_SLOT", minHeadcount: 1, maxHeadcount: 3, basePrice: 2500, requiredDeposit: 2000 },
        ],
      };

      const result = priceListSchema.safeParse(invalidDome);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("must start at minHeadcount = 1");
      }
    });

    it("permits opening tiers (e.g. 10 Pax) for Event Hall categories per event_hall.md", () => {
      const validHallPlan = {
        name: "Grand Non-AC Hall Plan",
        unitType: "NON_AC_HALL",
        maxGuestCapacity: 1200,
        slabs: [
          { stayType: "MORNING_SLOT", minHeadcount: 10, maxHeadcount: 50, basePrice: 15000, requiredDeposit: 5000 },
          { stayType: "MORNING_SLOT", minHeadcount: 51, maxHeadcount: 1200, basePrice: 45000, requiredDeposit: 15000 },
          { stayType: "EVENING_SLOT", minHeadcount: 10, maxHeadcount: 50, basePrice: 20000, requiredDeposit: 8000 },
          { stayType: "EVENING_SLOT", minHeadcount: 51, maxHeadcount: 1200, basePrice: 55000, requiredDeposit: 20000 },
        ],
      };

      const result = priceListSchema.safeParse(validHallPlan);
      expect(result.success).toBe(true);
    });

    it("visually and logically flags gaps between tiers (e.g. S1: 1-2, S2: 4-5)", () => {
      const gappedPlan = {
        name: "Gapped Plan",
        unitType: "A_FRAME",
        maxGuestCapacity: 5,
        slabs: [
          { stayType: "OVERNIGHT", minHeadcount: 1, maxHeadcount: 2, basePrice: 3000, requiredDeposit: 1500 },
          { stayType: "OVERNIGHT", minHeadcount: 4, maxHeadcount: 5, basePrice: 5000, requiredDeposit: 2000 }, // Gap: missing 3
          { stayType: "DAY_SLOT", minHeadcount: 1, maxHeadcount: 5, basePrice: 3000, requiredDeposit: 1500 },
        ],
      };

      const result = priceListSchema.safeParse(gappedPlan);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("must be contiguous with no gaps or overlaps");
      }
    });

    it("flags overlaps between tiers (e.g. S1: 1-3, S2: 3-5)", () => {
      const overlappingPlan = {
        name: "Overlapping Plan",
        unitType: "A_FRAME",
        maxGuestCapacity: 5,
        slabs: [
          { stayType: "OVERNIGHT", minHeadcount: 1, maxHeadcount: 3, basePrice: 3000, requiredDeposit: 1500 },
          { stayType: "OVERNIGHT", minHeadcount: 3, maxHeadcount: 5, basePrice: 5000, requiredDeposit: 2000 }, // Overlap on 3
          { stayType: "DAY_SLOT", minHeadcount: 1, maxHeadcount: 5, basePrice: 3000, requiredDeposit: 1500 },
        ],
      };

      const result = priceListSchema.safeParse(overlappingPlan);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("must be contiguous with no gaps or overlaps");
      }
    });

    it("strictly requires both OVERNIGHT and DAY_SLOT for room categories", () => {
      const missingDaySlot = {
        name: "Missing Day Slot Dome",
        unitType: "DOME",
        maxGuestCapacity: 3,
        slabs: [
          { stayType: "OVERNIGHT", minHeadcount: 1, maxHeadcount: 3, basePrice: 3500, requiredDeposit: 2000 },
        ],
      };

      const result = priceListSchema.safeParse(missingDaySlot);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("must define at least one slab for DAY_SLOT");
      }
    });

    it("strictly requires both MORNING_SLOT and EVENING_SLOT for Event Hall categories", () => {
      const missingEvening = {
        name: "Missing Evening Hall",
        unitType: "NON_AC_HALL",
        maxGuestCapacity: 1200,
        slabs: [
          { stayType: "MORNING_SLOT", minHeadcount: 1, maxHeadcount: 1200, basePrice: 25000, requiredDeposit: 10000 },
        ],
      };

      const result = priceListSchema.safeParse(missingEvening);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("must define at least one slab for EVENING_SLOT");
      }
    });

    it("rejects highest slab maxHeadcount exceeding maxGuestCapacity", () => {
      const excessiveCapacity = {
        name: "Excessive Capacity Plan",
        unitType: "DOME",
        maxGuestCapacity: 3,
        slabs: [
          { stayType: "OVERNIGHT", minHeadcount: 1, maxHeadcount: 4, basePrice: 3500, requiredDeposit: 2000 }, // 4 > 3
          { stayType: "DAY_SLOT", minHeadcount: 1, maxHeadcount: 3, basePrice: 2500, requiredDeposit: 2000 },
        ],
      };

      const result = priceListSchema.safeParse(excessiveCapacity);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("exceeds Price List maxGuestCapacity");
      }
    });
  });

  describe("4. Physical Capacity Ceiling Guards on Updates", () => {
    it("blocks updating Price List capacity beyond attached unit physical ceiling", async () => {
      const existingUpdatedAt = new Date();
      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (cb: any) => {
        const tx = {
          priceList: {
            findUnique: vi.fn().mockResolvedValue({
              id: PRICELIST_ID_1,
              name: "Standard A-Frame",
              slug: "standard-a-frame",
              unitType: "A_FRAME",
              maxGuestCapacity: 4,
              updatedAt: existingUpdatedAt,
              units: [
                { id: "aframe-1", name: "A-Frame 1", maxCapacity: 4 }, // Physical unit capacity is 4
              ],
            }),
          },
        };
        return cb(tx);
      });

      // Attempt to set maxGuestCapacity to 5 (which exceeds attached unit's ceiling of 4)
      const res = await updatePriceList({
        id: PRICELIST_ID_1,
        name: "Standard A-Frame Upgraded",
        unitType: "A_FRAME",
        maxGuestCapacity: 5,
        expectedUpdatedAt: existingUpdatedAt,
        slabs: [
          { stayType: "OVERNIGHT", minHeadcount: 1, maxHeadcount: 5, basePrice: 4000, requiredDeposit: 2000 },
          { stayType: "DAY_SLOT", minHeadcount: 1, maxHeadcount: 5, basePrice: 3000, requiredDeposit: 1500 },
        ],
      });

      expect(res.success).toBe(false);
      expect(res.code).toBe("CAPACITY_EXCEEDS_ATTACHED_UNIT");
      expect(res.status).toBe(400);
      expect(res.error).toContain("Exceeds physical capacity ceiling of attached unit(s)");
    });

    it("blocks changing unitType of an active price list while attached to units", async () => {
      const existingUpdatedAt = new Date();
      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (cb: any) => {
        const tx = {
          priceList: {
            findUnique: vi.fn().mockResolvedValue({
              id: PRICELIST_ID_1,
              name: "Standard Dome",
              slug: "standard-dome",
              unitType: "DOME",
              maxGuestCapacity: 3,
              updatedAt: existingUpdatedAt,
              units: [{ id: "dome-1", name: "Dome 1", maxCapacity: 3 }],
            }),
          },
        };
        return cb(tx);
      });

      const res = await updatePriceList({
        id: PRICELIST_ID_1,
        name: "Standard Dome Changed to A-Frame",
        unitType: "A_FRAME", // Changed unitType
        maxGuestCapacity: 5,
        expectedUpdatedAt: existingUpdatedAt,
        slabs: [
          { stayType: "OVERNIGHT", minHeadcount: 1, maxHeadcount: 5, basePrice: 5000, requiredDeposit: 2000 },
          { stayType: "DAY_SLOT", minHeadcount: 1, maxHeadcount: 5, basePrice: 3500, requiredDeposit: 2000 },
        ],
      });

      expect(res.success).toBe(false);
      expect(res.code).toBe("CANNOT_CHANGE_UNIT_TYPE_OF_ATTACHED_PRICE_LIST");
      expect(res.status).toBe(400);
    });
  });

  describe("5. Modifier Creation, IST Timeline & Audit Locking", () => {
    it("rejects creating a modifier with a start date in the past in Asia/Kolkata (IST)", async () => {
      const pastInput = {
        priceListId: PRICELIST_ID_1,
        name: "Past Surge",
        type: "WEEKEND",
        percentage: 15,
        startDate: new Date("2020-01-01T00:00:00.000Z"),
        endDate: new Date("2026-12-31T23:59:59.999Z"),
        isActive: true,
      };

      const res = await createModifier(pastInput);
      expect(res.success).toBe(false);
      expect(res.code).toBe("PAST_START_DATE");
      expect(res.status).toBe(400);
    });

    it("enforces percentage variance strictly between -80% and +200%", () => {
      const tooHigh = createPriceModifierSchema.safeParse({
        priceListId: PRICELIST_ID_1,
        name: "Excessive Surge",
        type: "SEASONAL",
        percentage: 250, // > 200%
        startDate: new Date("2026-11-01"),
        endDate: new Date("2026-11-10"),
      });
      expect(tooHigh.success).toBe(false);

      const tooLow = createPriceModifierSchema.safeParse({
        priceListId: PRICELIST_ID_1,
        name: "Excessive Discount",
        type: "SEASONAL",
        percentage: -90, // < -80%
        startDate: new Date("2026-11-01"),
        endDate: new Date("2026-11-10"),
      });
      expect(tooLow.success).toBe(false);

      const validBoundary = createPriceModifierSchema.safeParse({
        priceListId: PRICELIST_ID_1,
        name: "Max Discount Allowed",
        type: "SEASONAL",
        percentage: -80,
        startDate: new Date("2026-11-01"),
        endDate: new Date("2026-11-10"),
      });
      expect(validBoundary.success).toBe(true);
    });

    it("blocks modifying an expired modifier (EXPIRED_MODIFIER_LOCKED)", async () => {
      const pastUpdatedAt = new Date();
      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (cb: any) => {
        const tx = {
          priceModifier: {
            findUnique: vi.fn().mockResolvedValue({
              id: MODIFIER_ID_2,
              name: "Expired Holiday Promo",
              type: "SEASONAL",
              percentage: 20,
              startDate: new Date("2024-01-01"),
              endDate: new Date("2024-01-10"), // Expired
              updatedAt: pastUpdatedAt,
              isActive: true,
            }),
          },
        };
        return cb(tx);
      });

      const res = await updateModifier({
        id: MODIFIER_ID_2,
        name: "Attempted Edit on Expired",
        type: "SEASONAL",
        percentage: 25,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-10"),
        expectedUpdatedAt: pastUpdatedAt,
      });

      expect(res.success).toBe(false);
      expect(res.code).toBe("EXPIRED_MODIFIER_LOCKED");
      expect(res.status).toBe(400);
      expect(res.error).toContain("permanently locked for historical audit preservation");
    });

    it("blocks deleting an expired modifier (EXPIRED_MODIFIER_LOCKED)", async () => {
      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (cb: any) => {
        const tx = {
          priceModifier: {
            findUnique: vi.fn().mockResolvedValue({
              id: MODIFIER_ID_2,
              name: "Expired Holiday Promo",
              endDate: new Date("2024-01-10"), // Expired
              updatedAt: new Date(),
            }),
          },
        };
        return cb(tx);
      });

      const res = await deleteModifier(MODIFIER_ID_2);
      expect(res.success).toBe(false);
      expect(res.code).toBe("EXPIRED_MODIFIER_LOCKED");
      expect(res.status).toBe(400);
    });

    it("blocks toggling status of an expired modifier", async () => {
      const pastUpdatedAt = new Date();
      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (cb: any) => {
        const tx = {
          priceModifier: {
            findUnique: vi.fn().mockResolvedValue({
              id: MODIFIER_ID_2,
              name: "Expired Rule",
              endDate: new Date("2024-01-10"), // Expired
              updatedAt: pastUpdatedAt,
            }),
          },
        };
        return cb(tx);
      });

      const res = await toggleModifierStatus(MODIFIER_ID_2, false, pastUpdatedAt);
      expect(res.success).toBe(false);
      expect(res.code).toBe("EXPIRED_MODIFIER_LOCKED");
      expect(res.status).toBe(400);
    });

    it("retrieves modifiers with populated priceList details", async () => {
      const mockModifiers = [
        {
          id: MODIFIER_ID_1,
          priceListId: PRICELIST_ID_1,
          name: "Weekend +15%",
          type: "WEEKEND",
          percentage: 15,
          startDate: new Date("2026-10-01"),
          endDate: new Date("2026-10-31"),
          isActive: true,
          priceList: {
            id: PRICELIST_ID_1,
            name: "Standard Dome Plan",
            unitType: "DOME",
          },
        },
      ];

      vi.spyOn(prisma.priceModifier, "findMany").mockResolvedValueOnce(mockModifiers as any);

      const res = await getModifiers();
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      const mod = (res.data as any)[0];
      expect(mod.priceList.name).toBe("Standard Dome Plan");
    });
  });

  describe("6. Real-Time Price Simulation & Minimum Slab Floor Rules", () => {
    const hallSlabs = [
      { stayType: "MORNING_SLOT", minHeadcount: 10, maxHeadcount: 50, basePrice: 12000, requiredDeposit: 5000 },
      { stayType: "MORNING_SLOT", minHeadcount: 51, maxHeadcount: 200, basePrice: 25000, requiredDeposit: 8000 },
    ];

    it("applies Minimum Slab Floor rule for guest count below lowest slab", () => {
      // 3 guests when lowest slab starts at 10 Pax
      const resolved = resolveSlabForHeadcount(hallSlabs, 3, "MORNING_SLOT");
      expect(resolved).not.toBeNull();
      expect(resolved?.minHeadcount).toBe(10);
      expect(resolved?.basePrice).toBe(12000);
    });

    it("correctly calculates price with percentage variance and integer rounding", () => {
      // Base: ₹3,500, +15% = ₹4,025
      expect(calculateModifiedPrice(3500, 15)).toBe(4025);

      // Base: ₹5,000, -20% = ₹4,000
      expect(calculateModifiedPrice(5000, -20)).toBe(4000);

      // Price floor guard (cannot be negative)
      expect(calculateModifiedPrice(1000, -100)).toBe(0);
    });

    it("prices multi-night stays night-by-night where Weekend overrides Seasonal on weekend nights", () => {
      const modifiers = [
        {
          name: "Weekend +20%",
          type: "WEEKEND",
          percentage: 20,
          startDate: "2026-10-01",
          endDate: "2026-10-31",
          isActive: true,
        },
        {
          name: "Monsoon Sale -15%",
          type: "SEASONAL",
          percentage: -15,
          startDate: "2026-10-01",
          endDate: "2026-10-31",
          isActive: true,
        },
      ];

      // Check-in on Friday 2026-10-09 (2 nights: Friday night + Saturday night -> both weekend)
      const res = calculateNightByNightStayRate({
        checkInDate: "2026-10-09T12:00:00+05:30",
        numberOfNights: 2,
        basePricePerNight: 4000,
        modifiers,
        stayType: "OVERNIGHT",
      });

      // Friday: 4000 + 20% = 4800 (weekend overrides -15%)
      // Saturday: 4000 + 20% = 4800 (weekend overrides -15%)
      // Total: 9600
      expect(res.totalStayRent).toBe(9600);
      expect(res.nightlyBreakdown[0].finalPrice).toBe(4800);
      expect(res.nightlyBreakdown[1].finalPrice).toBe(4800);
    });
  });
});
