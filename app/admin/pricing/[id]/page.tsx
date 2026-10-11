import * as React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  UnitPricingSlabBuilder,
  ExistingPriceListData,
} from "@/components/admin/pricing/UnitPricingSlabBuilder";
import { UnitType, StayType } from "@/schemas/price.schema";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const priceList = await prisma.priceList.findUnique({
    where: { id },
    select: { name: true },
  });

  if (!priceList) {
    return {
      title: "Price List Not Found | Parlak Resort Admin",
    };
  }

  return {
    title: `Edit ${priceList.name} | Parlak Resort Admin`,
    description: `Edit headcount slabs and tariffs for ${priceList.name}`,
  };
}

export const revalidate = 0;

export default async function EditPriceListPage({ params }: PageProps) {
  const { id } = await params;

  const rawPriceList = await prisma.priceList.findUnique({
    where: { id },
    include: {
      slabs: {
        orderBy: [{ stayType: "asc" }, { minHeadcount: "asc" }],
      },
      modifiers: {
        orderBy: { startDate: "asc" },
      },
      units: {
        select: {
          id: true,
          name: true,
          maxCapacity: true,
        },
      },
    },
  });

  if (!rawPriceList) {
    notFound();
  }

  const initialData: ExistingPriceListData = {
    id: rawPriceList.id,
    name: rawPriceList.name,
    slug: rawPriceList.slug,
    unitType: rawPriceList.unitType as UnitType,
    maxGuestCapacity: rawPriceList.maxGuestCapacity,
    slabs: rawPriceList.slabs.map((s) => ({
      id: s.id,
      stayType: s.stayType as StayType,
      minHeadcount: s.minHeadcount,
      maxHeadcount: s.maxHeadcount,
      basePrice: s.basePrice,
      requiredDeposit: s.requiredDeposit,
    })),
    modifiers: rawPriceList.modifiers.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      percentage: m.percentage,
      startDate: m.startDate,
      endDate: m.endDate,
      isActive: m.isActive,
    })),
    updatedAt: rawPriceList.updatedAt,
    units: rawPriceList.units,
  };

  return (
    <div className="py-2">
      <UnitPricingSlabBuilder
        initialData={initialData}
        isEditing={true}
      />
    </div>
  );
}
