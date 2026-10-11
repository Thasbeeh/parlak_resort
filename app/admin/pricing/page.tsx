import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  PriceListsTable,
  PriceListTableItem,
} from "@/components/admin/pricing/PriceListsTable";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Tag,
  Plus,
  Calendar,
  Layers,
  Sparkles,
  Home,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { getISTDateString } from "@/lib/pricing/resolve-modifiers";

export const metadata: Metadata = {
  title: "Dynamic Pricing & Slabs | Parlak Resort Admin",
  description:
    "Configure headcount slab tariffs, price profiles, and seasonal modifiers",
};

export const revalidate = 0;

export default async function PricingOverviewPage() {
  const [rawPriceLists, totalUnits, unitsWithPriceList, allActiveModifiers] =
    await Promise.all([
      prisma.priceList.findMany({
        include: {
          slabs: {
            orderBy: [{ stayType: "asc" }, { minHeadcount: "asc" }],
          },
          modifiers: {
            where: { isActive: true },
            orderBy: { startDate: "asc" },
          },
          _count: {
            select: {
              units: true,
              modifiers: true,
              slabs: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.unit.count(),
      prisma.unit.count({
        where: { priceListId: { not: "" } },
      }),
      prisma.priceModifier.findMany({
        where: { isActive: true },
      }),
    ]);

  const todayIST = getISTDateString(new Date());

  // Filter modifiers that cover today in IST
  const todayActiveModifiers = allActiveModifiers.filter((m) => {
    const startIST = getISTDateString(m.startDate);
    const endIST = getISTDateString(m.endDate);
    return todayIST >= startIST && todayIST <= endIST;
  });

  const priceLists: PriceListTableItem[] = rawPriceLists.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    unitType: p.unitType,
    maxGuestCapacity: p.maxGuestCapacity,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    slabs: p.slabs.map((s) => ({
      id: s.id,
      stayType: s.stayType,
      minHeadcount: s.minHeadcount,
      maxHeadcount: s.maxHeadcount,
      basePrice: s.basePrice,
      requiredDeposit: s.requiredDeposit,
    })),
    modifiers: p.modifiers,
    _count: p._count,
  }));

  const uncoveredUnits = Math.max(0, totalUnits - unitsWithPriceList);

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-16">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-3 border-b pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
              Pricing Plans & Slabs
            </h1>
            <span className="text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5 font-mono text-[11px]">
              IST (UTC+5:30)
            </span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/pricing/modifiers"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-8 gap-1.5 text-xs",
            )}
          >
            <Calendar className="h-3.5 w-3.5 text-amber-500" />
            Seasonal & Weekend Modifiers
          </Link>

          <Link
            href="/admin/pricing/new"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "h-8 gap-1.5 text-xs",
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            Create price list
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards Grid (Compact Single Row) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Total Active Price Lists */}
        <div className="border-border bg-card relative flex flex-col justify-between overflow-hidden rounded-xl border p-3 sm:p-3.5 min-w-0 h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs font-medium truncate">
              Configured Price Profiles
            </span>
            <div className="bg-muted/60 text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-lg">
              <Layers className="size-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5 leading-none">
            <span className="text-foreground font-mono text-2xl font-bold tracking-tight tabular-nums">
              {priceLists.length}
            </span>
            <span className="text-muted-foreground text-xs select-none">rate plans</span>
          </div>
        </div>

        {/* Units Covered vs Uncovered */}
        <div className="border-border bg-card relative flex flex-col justify-between overflow-hidden rounded-xl border p-3 sm:p-3.5 min-w-0 h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs font-medium truncate">
              Inventory Coverage
            </span>
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Home className="size-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5 leading-none">
            <span className="text-foreground font-mono text-2xl font-bold tracking-tight tabular-nums">
              {unitsWithPriceList} / {totalUnits}
            </span>
            <span className="text-muted-foreground text-xs select-none">
              units attached
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px]">
            {uncoveredUnits === 0 ? (
              <span className="flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-3" /> 100% attached
              </span>
            ) : (
              <span className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
                <AlertCircle className="size-3" /> {uncoveredUnits} unattached
              </span>
            )}
          </div>
        </div>

        {/* Active Modifiers Pill */}
        <div className="border-border bg-card relative flex flex-col justify-between overflow-hidden rounded-xl border p-3 sm:p-3.5 min-w-0 h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs font-medium truncate">
              Live Modifiers (Today)
            </span>
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="size-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5 leading-none">
            <span className="text-foreground font-mono text-2xl font-bold tracking-tight tabular-nums">
              {todayActiveModifiers.length}
            </span>
            <span className="text-muted-foreground font-mono text-xs tabular-nums select-none">
              of {allActiveModifiers.length} rules active
            </span>
          </div>
        </div>
      </div>

      {/* Price Lists Table */}
      <PriceListsTable priceLists={priceLists} />
    </div>
  );
}
