import * as React from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { UnitsOverviewClient } from "@/components/admin/units/UnitsOverviewClient";
import { UnitCardData } from "@/components/admin/units/UnitCard";

export const metadata: Metadata = {
  title: "Units & Inventory | Parlak Resort Admin",
  description: "Manage Geodesic Domes, A-Frames, and Event Halls inventory",
};

export const revalidate = 0;

export default async function UnitsPage() {
  const rawUnits = await prisma.unit.findMany({
    include: {
      priceList: {
        select: {
          id: true,
          name: true,
          maxGuestCapacity: true,
        },
      },
      photos: {
        orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          url: true,
          caption: true,
          isFeatured: true,
          orderIndex: true,
        },
      },
    },
    orderBy: [
      { category: "asc" },
      { name: "asc" },
    ],
  });

  const DOMAIN_CATEGORY_ORDER: Record<string, number> = {
    DOME: 1,
    A_FRAME: 2,
    NON_AC_HALL: 3,
    AC_HALL: 4,
  };

  const units: UnitCardData[] = rawUnits
    .map((u) => ({
      id: u.id,
      name: u.name,
      category: u.category,
      isActive: u.isActive,
      maxCapacity: u.maxCapacity,
      maxInfants: u.maxInfants,
      amenities: u.amenities,
      updatedAt: u.updatedAt,
      priceList: u.priceList,
      photos: u.photos,
    }))
    .sort((a, b) => {
      const catDiff =
        (DOMAIN_CATEGORY_ORDER[a.category] ?? 99) -
        (DOMAIN_CATEGORY_ORDER[b.category] ?? 99);
      if (catDiff !== 0) return catDiff;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });

  return <UnitsOverviewClient initialUnits={units} />;
}
