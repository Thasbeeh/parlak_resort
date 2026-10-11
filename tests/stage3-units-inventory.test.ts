/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getUnits,
  toggleUnitStatus,
  updateUnit,
} from "../actions/units";
import {
  generateCloudinarySignature,
  saveUnitPhoto,
  deleteUnitPhoto,
  reorderUnitPhotos,
} from "../actions/media";
import { createMaintenanceBlockAction } from "../actions/bookings";
import { prisma } from "../lib/prisma";

vi.mock("../lib/cloudinary", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/cloudinary")>();
  return {
    ...actual,
    deleteCloudinaryImage: vi.fn().mockResolvedValue(true),
  };
});

const UNIT_UUID_1 = "11111111-1111-4111-8111-111111111111";
const UNIT_UUID_2 = "22222222-2222-4222-8222-222222222222";
const PRICELIST_UUID_1 = "33333333-3333-4333-8333-333333333333";
const PRICELIST_UUID_2 = "44444444-4444-4444-8444-444444444444";
const PHOTO_UUID_1 = "55555555-5555-4555-8555-555555555555";
const PHOTO_UUID_2 = "66666666-6666-4666-8666-666666666666";
const BOOKING_UUID_1 = "77777777-7777-4777-8777-777777777777";

describe("Stage 3: Units & Inventory Management with Direct Cloudinary Media Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Inventory Overview & Category Counts", () => {
    it("fetches all resort units with priceList and photos", async () => {
      const mockUnits = [
        { id: "dome-1", name: "Dome 1", category: "DOME", isActive: true, maxCapacity: 3, maxInfants: 2, amenities: "AC, TV", priceList: { id: PRICELIST_UUID_1, name: "Dome Plan" }, photos: [] },
        { id: "dome-2", name: "Dome 2", category: "DOME", isActive: true, maxCapacity: 3, maxInfants: 2, amenities: "AC, TV", priceList: { id: PRICELIST_UUID_1, name: "Dome Plan" }, photos: [] },
        { id: "dome-3", name: "Dome 3", category: "DOME", isActive: true, maxCapacity: 3, maxInfants: 2, amenities: "AC, TV", priceList: { id: PRICELIST_UUID_1, name: "Dome Plan" }, photos: [] },
        { id: "dome-4", name: "Dome 4", category: "DOME", isActive: true, maxCapacity: 3, maxInfants: 2, amenities: "AC, TV", priceList: { id: PRICELIST_UUID_1, name: "Dome Plan" }, photos: [] },
        { id: "aframe-1", name: "A-Frame 1", category: "A_FRAME", isActive: true, maxCapacity: 5, maxInfants: 4, amenities: "Pool", priceList: { id: PRICELIST_UUID_2, name: "A-Frame Plan" }, photos: [] },
        { id: "aframe-2", name: "A-Frame 2", category: "A_FRAME", isActive: true, maxCapacity: 5, maxInfants: 4, amenities: "Pool", priceList: { id: PRICELIST_UUID_2, name: "A-Frame Plan" }, photos: [] },
        { id: "aframe-3", name: "A-Frame 3", category: "A_FRAME", isActive: true, maxCapacity: 5, maxInfants: 4, amenities: "Pool", priceList: { id: PRICELIST_UUID_2, name: "A-Frame Plan" }, photos: [] },
        { id: "hall-non-ac", name: "Non-AC Event Hall", category: "NON_AC_HALL", isActive: true, maxCapacity: 1200, maxInfants: 0, amenities: "Stage", priceList: { id: "pl-3", name: "Hall Plan" }, photos: [] },
        { id: "hall-ac", name: "AC Event Hall", category: "AC_HALL", isActive: false, maxCapacity: 2000, maxInfants: 0, amenities: "Central AC", priceList: { id: "pl-4", name: "AC Plan" }, photos: [] },
      ];

      vi.spyOn(prisma.unit, "findMany").mockResolvedValueOnce(mockUnits as any);

      const res = await getUnits();
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(9);

      const data = res.data as any[];
      const domes = data.filter((u) => u.category === "DOME");
      const aframes = data.filter((u) => u.category === "A_FRAME");
      const halls = data.filter((u) => u.category === "NON_AC_HALL" || u.category === "AC_HALL");

      expect(domes).toHaveLength(4);
      expect(aframes).toHaveLength(3);
      expect(halls).toHaveLength(2);

      // Verify AC Hall is inactive / under construction
      const acHall = data.find((u) => u.category === "AC_HALL");
      expect(acHall?.isActive).toBe(false);
    });
  });

  describe("2. Pre-Deactivation Guard (UNIT_HAS_FUTURE_BOOKINGS)", () => {
    it("blocks deactivation when unit has future active bookings and returns conflicting bookings", async () => {
      const futureDate = new Date(Date.now() + 86400000 * 5);

      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (callback: any) => {
        const tx = {
          unit: {
            findUnique: vi.fn().mockResolvedValue({
              id: UNIT_UUID_1,
              name: "Dome 1",
              category: "DOME",
              isActive: true,
              updatedAt: new Date(),
            }),
          },
          bookingUnit: {
            findMany: vi.fn().mockResolvedValue([
              {
                id: "bu-1",
                unitId: UNIT_UUID_1,
                bookingId: "b-1",
                startDatetime: futureDate,
                endDatetime: new Date(futureDate.getTime() + 86400000),
                status: "CONFIRMED",
                booking: {
                  bookingId: "B001",
                  guestName: "Arun Kumar",
                  guestPhone: "+919876543210",
                },
              },
            ]),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const res = await toggleUnitStatus({
        unitId: UNIT_UUID_1,
        isActive: false,
      });

      expect(res.success).toBe(false);
      expect(res.code).toBe("UNIT_HAS_FUTURE_BOOKINGS");
      expect(res.status).toBe(400);

      const details = res.data as any;
      expect(details?.count).toBe(1);
      expect(details?.bookings).toHaveLength(1);
      expect(details?.bookings[0]?.guestName).toBe("Arun Kumar");
      expect(details?.bookings[0]?.bookingId).toBe("B001");
    });

    it("allows deactivation when unit has zero future active bookings", async () => {
      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (callback: any) => {
        const tx = {
          unit: {
            findUnique: vi.fn().mockResolvedValue({
              id: UNIT_UUID_2,
              name: "Dome 2",
              isActive: true,
              updatedAt: new Date(),
            }),
            update: vi.fn().mockResolvedValue({
              id: UNIT_UUID_2,
              name: "Dome 2",
              isActive: false,
            }),
          },
          bookingUnit: {
            findMany: vi.fn().mockResolvedValue([]),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const res = await toggleUnitStatus({
        unitId: UNIT_UUID_2,
        isActive: false,
      });

      expect(res.success).toBe(true);
      expect((res.data as any)?.isActive).toBe(false);
    });
  });

  describe("3. PostgreSQL GiST Maintenance Blocking & Schedule Collision (409)", () => {
    it("creates maintenance block with status: 'MAINTENANCE_BLOCKED'", async () => {
      const now = new Date();
      const later = new Date(now.getTime() + 86400000);

      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (callback: any) => {
        const tx = {
          unit: {
            findUnique: vi.fn().mockResolvedValue({
              id: UNIT_UUID_1,
              name: "Dome 1",
              category: "DOME",
            }),
          },
          bookingUnit: {
            create: vi.fn().mockResolvedValue({
              id: "bu-maint-1",
              unitId: UNIT_UUID_1,
              startDatetime: now,
              endDatetime: later,
              status: "MAINTENANCE_BLOCKED",
              unitPrice: 0,
              notes: "Deep Pool Cleaning & AC Servicing",
              unit: { name: "Dome 1" },
            }),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const res = await createMaintenanceBlockAction({
        unitId: UNIT_UUID_1,
        startDatetime: now.toISOString(),
        endDatetime: later.toISOString(),
        notes: "Deep Pool Cleaning & AC Servicing",
      });

      expect(res.success).toBe(true);
      expect((res.data as any)?.status).toBe("MAINTENANCE_BLOCKED");
    });

    it("catches PostgreSQL GiST 23P01 collision and returns UNIT_SCHEDULE_COLLISION with status 409", async () => {
      const now = new Date();
      const later = new Date(now.getTime() + 86400000);

      // Simulate PostgreSQL 23P01 exclusion violation error
      const pgExclusionError: any = new Error("conflicting key value violates exclusion constraint");
      pgExclusionError.code = "23P01";

      vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(pgExclusionError);

      const res = await createMaintenanceBlockAction({
        unitId: UNIT_UUID_1,
        startDatetime: now.toISOString(),
        endDatetime: later.toISOString(),
        notes: "Conflicting window maintenance",
      });

      expect(res.success).toBe(false);
      expect(res.code).toBe("UNIT_SCHEDULE_COLLISION");
      expect(res.status).toBe(409);
      expect(res.error).toContain("already has active reservations");
    });
  });

  describe("4. Unit Configuration & Capacity Safeguard (PriceList.maxGuestCapacity <= Unit.physicalCapacity)", () => {
    it("rejects Price List attachment when PriceList maxGuestCapacity exceeds Unit physicalCapacity", async () => {
      const existingDate = new Date();

      vi.spyOn(prisma.unit, "findUnique").mockResolvedValueOnce({
        id: UNIT_UUID_1,
        name: "Dome 1",
        category: "DOME",
        maxCapacity: 3,
        updatedAt: existingDate,
      } as any);

      // Target price list configured for 5 guests
      vi.spyOn(prisma.priceList, "findUnique").mockResolvedValueOnce({
        id: PRICELIST_UUID_1,
        name: "Oversized Dome Plan",
        unitType: "DOME",
        maxGuestCapacity: 5, // 5 > 3!
      } as any);

      const res = await updateUnit({
        id: UNIT_UUID_1,
        name: "Dome 1",
        category: "DOME",
        isActive: true,
        maxCapacity: 3,
        maxInfants: 2,
        amenities: "AC, Pool",
        priceListId: PRICELIST_UUID_1,
        expectedUpdatedAt: existingDate,
      });

      expect(res.success).toBe(false);
      expect(res.code).toBe("CAPACITY_LESS_THAN_PRICELIST");
      expect(res.status).toBe(400);
      expect(res.error).toContain("cannot be less than attached price list maximum guest capacity");
    });

    it("rejects unit update when category mismatches price list unitType", async () => {
      const existingDate = new Date();

      vi.spyOn(prisma.unit, "findUnique").mockResolvedValueOnce({
        id: UNIT_UUID_1,
        name: "Dome 1",
        category: "DOME",
        maxCapacity: 3,
        updatedAt: existingDate,
      } as any);

      vi.spyOn(prisma.priceList, "findUnique").mockResolvedValueOnce({
        id: PRICELIST_UUID_2,
        name: "A-Frame Plan",
        unitType: "A_FRAME", // Mismatch with DOME
        maxGuestCapacity: 3,
      } as any);

      const res = await updateUnit({
        id: UNIT_UUID_1,
        name: "Dome 1",
        category: "DOME",
        isActive: true,
        maxCapacity: 3,
        maxInfants: 2,
        amenities: "AC, Pool",
        priceListId: PRICELIST_UUID_2,
        expectedUpdatedAt: existingDate,
      });

      expect(res.success).toBe(false);
      expect(res.code).toBe("PRICE_LIST_TYPE_MISMATCH");
      expect(res.status).toBe(400);
    });

    it("rejects Domes exceeding 3 adults physical hard cap", async () => {
      const res = await updateUnit({
        id: UNIT_UUID_1,
        name: "Dome 1",
        category: "DOME",
        isActive: true,
        maxCapacity: 4, // Exceeds hard cap of 3
        maxInfants: 2,
        amenities: "AC",
        priceListId: PRICELIST_UUID_1,
        expectedUpdatedAt: new Date(),
      });

      expect(res.success).toBe(false);
      expect(res.code).toBe("VALIDATION_ERROR");
      expect(res.error).toContain("hard physical cap of 3 adults");
    });
  });

  describe("5. Direct Cloudinary REST Pipeline & Featured Photo Invariant", () => {
    it("generates signed upload credentials for direct client-to-Cloudinary upload", async () => {
      const res = await generateCloudinarySignature({
        folder: "parlak_resort/units",
      });

      expect(res.success).toBe(true);
      expect(res.data?.signature).toBeDefined();
      expect(res.data?.apiKey).toBeDefined();
      expect(res.data?.cloudName).toBeDefined();
    });

    it("automatically sets first uploaded photo as isFeatured: true", async () => {
      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (callback: any) => {
        const tx = {
          unit: {
            findUnique: vi.fn().mockResolvedValue({ id: UNIT_UUID_1 }),
            update: vi.fn().mockResolvedValue({ id: UNIT_UUID_1 }),
          },
          unitPhoto: {
            findMany: vi.fn().mockResolvedValue([]), // 0 existing photos
            create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: PHOTO_UUID_1, ...data })),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const res = await saveUnitPhoto({
        unitId: UNIT_UUID_1,
        url: "https://res.cloudinary.com/test/image/upload/v1/units/photo1.webp",
      });

      expect(res.success).toBe(true);
      expect((res.data as any)?.isFeatured).toBe(true);
    });

    it("deleting the featured photo atomically promotes the remaining photo with lowest orderIndex", async () => {
      const existingFeatured = {
        id: PHOTO_UUID_1,
        unitId: UNIT_UUID_1,
        isFeatured: true,
        orderIndex: 0,
        url: "https://res.cloudinary.com/test/image/upload/v1/units/featured.jpg",
      };

      const remainingPhoto = {
        id: PHOTO_UUID_2,
        unitId: UNIT_UUID_1,
        isFeatured: false,
        orderIndex: 1,
        url: "https://res.cloudinary.com/test/image/upload/v1/units/next.jpg",
      };

      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (callback: any) => {
        const tx = {
          unitPhoto: {
            findFirst: vi.fn()
              .mockResolvedValueOnce(existingFeatured) // 1. target photo
              .mockResolvedValueOnce(null) // 2. hasFeaturedRemaining? No
              .mockResolvedValueOnce(remainingPhoto), // 3. next lowest orderIndex
            delete: vi.fn().mockResolvedValue(existingFeatured),
            update: vi.fn().mockResolvedValue({ ...remainingPhoto, isFeatured: true }),
          },
          unit: {
            update: vi.fn().mockResolvedValue({ id: UNIT_UUID_1 }),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const res = await deleteUnitPhoto({
        photoId: PHOTO_UUID_1,
        unitId: UNIT_UUID_1,
      });

      expect(res.success).toBe(true);
      expect((res.data as any)?.promotedPhoto?.id).toBe(PHOTO_UUID_2);
      expect((res.data as any)?.promotedPhoto?.isFeatured).toBe(true);
    });

    it("reorders photos sequentially inside a single transaction", async () => {
      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (callback: any) => {
        const tx = {
          unitPhoto: {
            findMany: vi.fn().mockResolvedValue([{ id: PHOTO_UUID_1 }, { id: PHOTO_UUID_2 }]),
            update: vi.fn().mockResolvedValue({}),
          },
          unit: {
            update: vi.fn().mockResolvedValue({ id: UNIT_UUID_1 }),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const res = await reorderUnitPhotos({
        unitId: UNIT_UUID_1,
        photoIds: [PHOTO_UUID_2, PHOTO_UUID_1],
      });

      expect(res.success).toBe(true);
      expect((res.data as any)?.reorderedCount).toBe(2);
    });
  });

  describe("5. Seeded Slug IDs Support & Domain Ordering", () => {
    it("accepts seeded string slug IDs like 'dome-1' and 'price-list-dome' in unit mutations", async () => {
      vi.spyOn(prisma.unit, "findUnique").mockResolvedValueOnce({
        id: "dome-1",
        name: "Dome 1",
        category: "DOME",
        isActive: true,
        maxCapacity: 3,
        maxInfants: 2,
        amenities: "AC, Wi-Fi",
        priceListId: "price-list-dome",
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      } as any);

      vi.spyOn(prisma.priceList, "findUnique").mockResolvedValueOnce({
        id: "price-list-dome",
        name: "Standard Dome Rate Plan",
        unitType: "DOME",
        maxGuestCapacity: 3,
      } as any);

      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (callback: any) => {
        const tx = {
          unit: {
            update: vi.fn().mockResolvedValue({
              id: "dome-1",
              name: "Dome 1 (Refurbished)",
              category: "DOME",
              isActive: true,
              maxCapacity: 3,
              maxInfants: 2,
              amenities: "AC, Wi-Fi, Smart TV",
              priceListId: "price-list-dome",
              updatedAt: new Date(),
            }),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const res = await updateUnit({
        id: "dome-1",
        name: "Dome 1 (Refurbished)",
        category: "DOME",
        isActive: true,
        maxCapacity: 3,
        maxInfants: 2,
        amenities: "AC, Wi-Fi, Smart TV",
        priceListId: "price-list-dome",
        expectedUpdatedAt: new Date("2026-01-01T00:00:00Z"),
      });

      expect(res.success).toBe(true);
      expect((res.data as any)?.name).toBe("Dome 1 (Refurbished)");
    });

    it("sorts units by domain category order: Domes -> A-Frames -> Non-AC Hall -> AC Hall", async () => {
      // Unsorted array coming from DB
      const unorderedUnits = [
        { id: "hall-ac", name: "AC Event Hall", category: "AC_HALL" },
        { id: "aframe-1", name: "A-Frame 1", category: "A_FRAME" },
        { id: "dome-2", name: "Dome 2", category: "DOME" },
        { id: "hall-non-ac", name: "Non-AC Event Hall", category: "NON_AC_HALL" },
        { id: "dome-1", name: "Dome 1", category: "DOME" },
      ];

      vi.spyOn(prisma.unit, "findMany").mockResolvedValueOnce(unorderedUnits as any);

      const res = await getUnits();
      expect(res.success).toBe(true);

      const sorted = res.data as any[];
      expect(sorted[0].id).toBe("dome-1");
      expect(sorted[1].id).toBe("dome-2");
      expect(sorted[2].id).toBe("aframe-1");
      expect(sorted[3].id).toBe("hall-non-ac");
      expect(sorted[4].id).toBe("hall-ac");
    });
  });
});
