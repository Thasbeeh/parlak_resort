import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  UnitEditorForm,
  UnitDetailData,
  CompatiblePriceList,
} from "@/components/admin/units/UnitEditorForm";
import { Button, buttonVariants } from "@/components/ui/button";
import { SearchX, ChevronLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const unit = await prisma.unit.findUnique({
    where: { id },
    select: { name: true },
  });

  if (!unit) {
    return {
      title: "Unit Not Found | Parlak Resort Admin",
    };
  }

  return {
    title: `Edit ${unit.name} | Parlak Resort Admin`,
    description: `Manage configuration, tariff, and media for ${unit.name}`,
  };
}

export const revalidate = 0;

export default async function UnitDetailPage({ params }: PageProps) {
  const { id } = await params;

  const rawUnit = await prisma.unit.findUnique({
    where: { id },
    include: {
      priceList: {
        select: {
          id: true,
          name: true,
          slug: true,
          unitType: true,
          maxGuestCapacity: true,
        },
      },
      photos: {
        orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          url: true,
          caption: true,
          altText: true,
          description: true,
          orderIndex: true,
          isFeatured: true,
        },
      },
    },
  });

  if (!rawUnit) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed bg-card min-h-[400px]">
        <div className="rounded-full bg-muted p-4 mb-4">
          <SearchX className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          Unit Not Found
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          The requested inventory unit does not exist or may have been removed.
        </p>
        <Link
          href="/admin/units"
          className={buttonVariants({
            variant: "default",
            size: "sm",
            className: "mt-6 text-xs",
          })}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Return to Units Overview
        </Link>
      </div>
    );
  }

  // Fetch category-filtered Price Lists for the dropdown selector
  const compatiblePriceListsRaw = await prisma.priceList.findMany({
    where: {
      unitType: rawUnit.category,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      unitType: true,
      maxGuestCapacity: true,
    },
    orderBy: { name: "asc" },
  });

  const compatiblePriceLists: CompatiblePriceList[] = compatiblePriceListsRaw;

  const unit: UnitDetailData = {
    id: rawUnit.id,
    name: rawUnit.name,
    category: rawUnit.category,
    isActive: rawUnit.isActive,
    maxCapacity: rawUnit.maxCapacity,
    maxInfants: rawUnit.maxInfants,
    amenities: rawUnit.amenities,
    priceListId: rawUnit.priceListId,
    updatedAt: rawUnit.updatedAt,
    priceList: rawUnit.priceList,
    photos: rawUnit.photos,
  };

  return (
    <UnitEditorForm
      unit={unit}
      compatiblePriceLists={compatiblePriceLists}
    />
  );
}
