import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ModifiersClientView } from "@/components/admin/pricing/ModifiersClientView";
import {
  ModifierItemData,
  TargetPriceListOption,
} from "@/components/admin/pricing/ModifierModal";
import { getISTDateString, isWeekendIST } from "@/lib/pricing/resolve-modifiers";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Sparkles,
  ChevronLeft,
  Clock,
  Coins,
  ShieldAlert,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Seasonal & Weekend Modifiers | Parlak Resort Admin",
  description: "Manage dynamic surge tariffs and promotional discounts (IST)",
};

export const revalidate = 0;

export default async function ModifiersPage() {
  const todayIST = getISTDateString(new Date());

  const [rawModifiers, rawPriceLists] = await Promise.all([
    prisma.priceModifier.findMany({
      include: {
        priceList: {
          select: {
            id: true,
            name: true,
            unitType: true,
          },
        },
      },
      orderBy: [{ startDate: "asc" }],
    }),
    prisma.priceList.findMany({
      select: {
        id: true,
        name: true,
        unitType: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const modifiers: ModifierItemData[] = rawModifiers.map((m) => ({
    id: m.id,
    priceListId: m.priceListId,
    name: m.name,
    type: m.type,
    percentage: m.percentage,
    startDate: m.startDate,
    endDate: m.endDate,
    isActive: m.isActive,
    updatedAt: m.updatedAt,
    priceList: m.priceList,
  }));

  const priceListOptions: TargetPriceListOption[] = rawPriceLists.map((p) => ({
    id: p.id,
    name: p.name,
    unitType: p.unitType,
  }));

  // Identify today's active modifiers
  const todayActiveModifiers = modifiers.filter((m) => {
    if (!m.isActive) return false;
    const start = getISTDateString(m.startDate);
    const end = getISTDateString(m.endDate);
    return todayIST >= start && todayIST <= end;
  });

  const isTodayWeekend = isWeekendIST(new Date(), "OVERNIGHT");

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link
              href="/admin/pricing"
              className="hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Pricing Plans
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Modifiers</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Calendar className="h-6 w-6 text-primary" />
            Weekend & Seasonal Modifiers
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Operational surge multipliers, promotional discounts, and audit-locked archives (Asia/Kolkata IST)
          </p>
        </div>

        {/* Timezone & Live Status Chips */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs px-2.5 py-1 bg-muted/60">
            <Clock className="h-3.5 w-3.5 mr-1.5 text-primary" />
            Today: {todayIST} (IST)
          </Badge>
          <Badge
            variant="outline"
            className={
              isTodayWeekend
                ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300 font-mono text-xs px-2.5 py-1"
                : "bg-muted text-muted-foreground font-mono text-xs px-2.5 py-1"
            }
          >
            {isTodayWeekend ? "Weekend Date" : "Weekday"}
          </Badge>
        </div>
      </div>

      {/* Today's Active Multiplier Widget */}
      <div className="p-4 rounded-xl border bg-card shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-foreground">
                Today&apos;s Active Rate Multipliers
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Rules currently applying to new booking quotes created today ({todayIST})
              </p>
            </div>
          </div>

          <Badge variant="outline" className="font-mono text-[10px]">
            {todayActiveModifiers.length} Active Today
          </Badge>
        </div>

        {todayActiveModifiers.length === 0 ? (
          <div className="p-3 rounded-lg border border-dashed bg-muted/10 text-xs text-muted-foreground text-center">
            No dynamic modifiers active today. Standard base rate tariffs are currently in effect.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {todayActiveModifiers.map((mod) => (
              <div
                key={mod.id}
                className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-foreground">
                    {mod.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Plan: {mod.priceList?.name || "Target Plan"}
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={
                      mod.percentage > 0
                        ? "text-xs font-bold text-primary font-mono"
                        : "text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono"
                    }
                  >
                    {mod.percentage > 0 ? `+${mod.percentage}%` : `${mod.percentage}%`}
                  </span>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    {mod.type}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Interactive Table & Archive Section */}
      <ModifiersClientView
        modifiers={modifiers}
        priceListOptions={priceListOptions}
        todayIST={todayIST}
      />
    </div>
  );
}
