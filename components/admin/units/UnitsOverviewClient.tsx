"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type UnitCardData } from "./UnitCard";
import { UnitStatusSwitch } from "./UnitStatusSwitch";
import {
  MaintenanceBlockDialog,
  type UnitOption,
} from "./MaintenanceBlockDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Wrench,
  Search,
  Tent,
  Home,
  Building2,
  Layers,
  ExternalLink,
  AlertCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface UnitsOverviewClientProps {
  initialUnits: UnitCardData[];
}

export function UnitsOverviewClient({
  initialUnits,
}: UnitsOverviewClientProps) {
  const router = useRouter();
  const [units, setUnits] = React.useState<UnitCardData[]>(initialUnits);
  const [selectedCategory, setSelectedCategory] = React.useState<string>("ALL");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] =
    React.useState(false);
  const [preselectedUnitId, setPreselectedUnitId] = React.useState<
    string | undefined
  >(undefined);

  React.useEffect(() => {
    setUnits(initialUnits);
  }, [initialUnits]);

  // Inventory summary counters
  const totalUnitsCount = units.length;
  const activeDomesCount = units.filter(
    (u) => u.category === "DOME" && u.isActive,
  ).length;
  const totalDomesCount = units.filter((u) => u.category === "DOME").length;

  const activeAFramesCount = units.filter(
    (u) => u.category === "A_FRAME" && u.isActive,
  ).length;
  const totalAFramesCount = units.filter(
    (u) => u.category === "A_FRAME",
  ).length;

  const activeHallsCount = units.filter(
    (u) =>
      (u.category === "NON_AC_HALL" || u.category === "AC_HALL") && u.isActive,
  ).length;
  const totalHallsCount = units.filter(
    (u) => u.category === "NON_AC_HALL" || u.category === "AC_HALL",
  ).length;

  // Filter units
  const filteredUnits = React.useMemo(() => {
    return units.filter((u) => {
      if (selectedCategory === "DOME" && u.category !== "DOME") return false;
      if (selectedCategory === "A_FRAME" && u.category !== "A_FRAME")
        return false;
      if (
        selectedCategory === "HALLS" &&
        u.category !== "NON_AC_HALL" &&
        u.category !== "AC_HALL"
      )
        return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = u.name.toLowerCase().includes(query);
        const matchesPriceList = u.priceList?.name
          ? u.priceList.name.toLowerCase().includes(query)
          : false;
        return matchesName || matchesPriceList;
      }

      return true;
    });
  }, [units, selectedCategory, searchQuery]);

  const handleOpenMaintenance = (unitId?: string) => {
    setPreselectedUnitId(unitId);
    setMaintenanceDialogOpen(true);
  };

  const handleStatusChange = (unitId: string, newStatus: boolean) => {
    setUnits((prev) =>
      prev.map((u) => (u.id === unitId ? { ...u, isActive: newStatus } : u)),
    );
    router.refresh();
  };

  const unitOptions: UnitOption[] = units.map((u) => ({
    id: u.id,
    name: u.name,
    category: u.category,
  }));

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header Toolbar (Neutral Sans, Zero Boilerplate Subtitles) */}
      <div className="border-border/80 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground font-sans text-xl font-bold tracking-tight sm:text-2xl">
            Units & Inventory
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="default"
            onClick={() => handleOpenMaintenance()}
            className="bg-primary text-primary-foreground hover:bg-primary/95 h-8 px-3 text-xs font-medium shadow-xs transition-transform duration-100 ease-[var(--ease-snappy)] select-none active:scale-[0.98]"
          >
            <Wrench data-icon="inline-start" className="size-3.5" />
            <span>Add maintenance block</span>
          </Button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Units */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card p-3 sm:p-3.5 min-w-0 h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground truncate">
              Total Units
            </span>
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
              <Layers className="size-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5 leading-none">
            <span className="font-mono text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {totalUnitsCount}
            </span>
            <span className="text-xs text-muted-foreground select-none">in inventory</span>
          </div>
        </div>

        {/* Geodesic Domes */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card p-3 sm:p-3.5 min-w-0 h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground truncate">
              Geodesic Domes
            </span>
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Tent className="size-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5 leading-none">
            <span className="font-mono text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              {activeDomesCount}
            </span>
            <span className="text-xs text-muted-foreground font-mono tabular-nums select-none">
              of {totalDomesCount} active
            </span>
          </div>
        </div>

        {/* A-Frame Cottages */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card p-3 sm:p-3.5 min-w-0 h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground truncate">
              A-Frame Cottages
            </span>
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Home className="size-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5 leading-none">
            <span className="font-mono text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 tabular-nums">
              {activeAFramesCount}
            </span>
            <span className="text-xs text-muted-foreground font-mono tabular-nums select-none">
              of {totalAFramesCount} active
            </span>
          </div>
        </div>

        {/* Event Halls */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card p-3 sm:p-3.5 min-w-0 h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground truncate">
              Event Halls
            </span>
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Building2 className="size-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5 leading-none">
            <span className="font-mono text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400 tabular-nums">
              {activeHallsCount}
            </span>
            <span className="text-xs text-muted-foreground font-mono tabular-nums select-none">
              of {totalHallsCount} active
            </span>
          </div>
        </div>
      </div>

      {/* 3. Flush Operational Filter & Search Strip (Two-Tier Clean Structural Toolbar) */}
      <div className="border-border/60 flex flex-col gap-2.5 border-b pb-2">
        {/* Tier 1: Category Filter Tabs (Ribbon) */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto [-webkit-overflow-scrolling:touch]">
          <div className="border-border/80 bg-surface-subtle/50 inline-flex shrink-0 items-center rounded-lg border p-0.5 gap-0.5">
            {[
              { id: "ALL", label: `All Units (${units.length})` },
              { id: "DOME", label: `Domes (${totalDomesCount})` },
              { id: "A_FRAME", label: `A-Frames (${totalAFramesCount})` },
              { id: "HALLS", label: `Event Halls (${totalHallsCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-all duration-100 ease-[var(--ease-snappy)] select-none active:scale-[0.98] whitespace-nowrap",
                  selectedCategory === tab.id
                    ? "bg-primary text-primary-foreground font-medium shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-subtle/80",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tier 2: Search Input & Record Count Indicator */}
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full min-w-0 sm:max-w-xs">
            <Input
              type="text"
              placeholder="Filter units or rate plans…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              spellCheck={false}
              className="bg-background border-border/80 focus-visible:ring-ring h-8 px-3 pr-8 text-base focus-visible:ring-1 md:text-xs"
              aria-label="Filter by unit or rate plan"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 flex size-5 items-center justify-center border-0 bg-transparent p-0 transition-transform appearance-none select-none active:scale-[0.98]"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="text-muted-foreground font-mono text-xs tabular-nums select-none">
            {filteredUnits.length === units.length
              ? `${units.length}\u00A0units in inventory`
              : `Showing ${filteredUnits.length} of ${units.length}\u00A0units`}
          </div>
        </div>
      </div>

      {/* 4. High-Density Operational Inventory Matrix (The 8–12 Viewport Invariant) */}
      {filteredUnits.length === 0 ? (
        <div className="border-border/80 bg-surface-subtle/20 flex flex-col items-center justify-center rounded-lg border p-8 text-center">
          <p className="text-muted-foreground text-xs">
            No resort inventory matched the selected category or filter.
          </p>
          {(searchQuery || selectedCategory !== "ALL") && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedCategory("ALL");
                setSearchQuery("");
              }}
              className="mt-3 h-7 text-xs select-none active:scale-[0.98]"
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="border-border bg-card overflow-hidden rounded-lg border shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-surface-subtle/60 text-muted-foreground border-b border-border text-xs font-semibold">
                  <th className="w-12 px-3.5 py-2.5 text-center whitespace-nowrap border-b border-border">Thumb</th>
                  <th className="px-3 py-2.5 whitespace-nowrap border-b border-border">Unit name</th>
                  <th className="px-3 py-2.5 whitespace-nowrap border-b border-border">Category</th>
                  <th className="px-3 py-2.5 whitespace-nowrap border-b border-border">Capacity</th>
                  <th className="px-3 py-2.5 whitespace-nowrap border-b border-border">Rate plan</th>
                  <th className="px-3 py-2.5 whitespace-nowrap border-b border-border">Status</th>
                  <th className="px-3 py-2.5 text-right whitespace-nowrap border-b border-border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnits.map((unit) => {
                  const cover =
                    unit.photos?.find((p) => p.isFeatured)?.url ||
                    unit.photos?.[0]?.url;
                  const isHall =
                    unit.category === "NON_AC_HALL" ||
                    unit.category === "AC_HALL";

                  return (
                    <tr
                      key={unit.id}
                      className="hover:bg-surface-subtle/40 group transition-colors duration-100 border-b border-border/60"
                    >
                      {/* Thumbnail Chip (Thumbnail Sizing Law: <= 48px) */}
                      <td className="px-3.5 py-2 text-center whitespace-nowrap">
                        <div className="border-border/80 bg-surface-subtle relative mx-auto flex size-9 shrink-0 items-center justify-center overflow-hidden rounded border">
                          {cover ? (
                            <Image
                              src={cover}
                              alt={unit.name}
                              fill
                              className="object-cover"
                              sizes="36px"
                            />
                          ) : (
                            <span className="text-muted-foreground font-mono text-[10px]">
                              N/A
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Unit Name */}
                      <td className="text-foreground px-3 py-2 font-semibold whitespace-nowrap min-w-[120px]">
                        <Link
                          href={`/admin/units/${unit.id}`}
                          className="hover:text-primary inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                        >
                          <span>{unit.name}</span>
                          <ExternalLink className="text-muted-foreground size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                      </td>

                      {/* Category */}
                      <td className="text-muted-foreground px-3 py-2 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          {unit.category === "DOME" && (
                            <Tent className="text-primary size-3" />
                          )}
                          {unit.category === "A_FRAME" && (
                            <Home className="text-primary size-3" />
                          )}
                          {isHall && (
                            <Building2 className="text-primary size-3" />
                          )}
                          <span>{unit.category.replace("_", " ")}</span>
                        </span>
                      </td>

                      {/* Capacity (font-mono tabular-nums) */}
                      <td className="text-foreground px-3 py-2 font-mono tabular-nums whitespace-nowrap">
                        {isHall ? (
                          <span>
                            {unit.maxCapacity?.toLocaleString()}&nbsp;Pax
                          </span>
                        ) : (
                          <span>
                            {unit.maxCapacity}&nbsp;Adults
                            {unit.maxInfants > 0
                              ? `, ${unit.maxInfants}\u00A0Infants`
                              : ""}
                          </span>
                        )}
                      </td>

                      {/* Rate Plan (No boilerplate prefixes, no wrapping) */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        {unit.priceList ? (
                          <span className="text-foreground bg-surface-subtle border-border/50 rounded border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap">
                            {unit.priceList.name}
                          </span>
                        ) : (
                          <span className="text-warning inline-flex items-center gap-1 font-mono text-[11px] whitespace-nowrap">
                            <AlertCircle className="size-3" /> Unassigned
                          </span>
                        )}
                      </td>

                      {/* Inline Status Switch (Zero Duplicate Text) */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <UnitStatusSwitch
                          unitId={unit.id}
                          unitName={unit.name}
                          initialActive={unit.isActive}
                          expectedUpdatedAt={unit.updatedAt}
                          onStatusChange={(newStatus) =>
                            handleStatusChange(unit.id, newStatus)
                          }
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2 text-right whitespace-nowrap min-w-[100px]">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenMaintenance(unit.id)}
                            className="text-muted-foreground hover:text-foreground h-7 px-2 text-[11px] transition-transform duration-100 active:scale-95"
                          >
                            <Wrench
                              data-icon="inline-start"
                              className="size-3"
                            />{" "}
                            Block
                          </Button>
                          <Link
                            href={`/admin/units/${unit.id}`}
                            className="border-border bg-surface-subtle hover:bg-surface-subtle/80 text-foreground inline-flex h-7 items-center rounded border px-2.5 text-[11px] font-medium transition-transform duration-100 select-none active:scale-95"
                          >
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Maintenance Block Dialog */}
      <MaintenanceBlockDialog
        open={maintenanceDialogOpen}
        onOpenChange={setMaintenanceDialogOpen}
        units={unitOptions}
        preselectedUnitId={preselectedUnitId}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}

export default UnitsOverviewClient;
