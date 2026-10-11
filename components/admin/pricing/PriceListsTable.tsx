"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UnitType, StayType } from "@/schemas/price.schema";
import { deletePriceList, createPriceList } from "@/actions/price-lists";
import { toast } from "@/components/ui/toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Layers,
  Search,
  Plus,
  Edit2,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  ExternalLink,
  Tent,
  Home,
  Building2,
  HardHat,
  Tag,
  ArrowRight,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface PriceListTableItem {
  id: string;
  name: string;
  slug: string;
  unitType: string;
  maxGuestCapacity: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  slabs: Array<{
    id?: string;
    stayType: string;
    minHeadcount: number;
    maxHeadcount: number;
    basePrice: number;
    requiredDeposit: number;
  }>;
  modifiers?: Array<{
    id: string;
    name: string;
    type: string;
    percentage: number;
    startDate: Date | string;
    endDate: Date | string;
    isActive: boolean;
  }>;
  _count?: {
    units: number;
    modifiers: number;
    slabs: number;
  };
}

export interface PriceListsTableProps {
  priceLists: PriceListTableItem[];
  className?: string;
}

export function PriceListsTable({
  priceLists: initialPriceLists,
  className,
}: PriceListsTableProps) {
  const router = useRouter();
  const [priceLists, setPriceLists] =
    React.useState<PriceListTableItem[]>(initialPriceLists);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("ALL");
  const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);

  // Delete modal state
  const [planToDelete, setPlanToDelete] =
    React.useState<PriceListTableItem | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Duplicate modal state
  const [planToDuplicate, setPlanToDuplicate] =
    React.useState<PriceListTableItem | null>(null);
  const [duplicateName, setDuplicateName] = React.useState("");
  const [isDuplicating, setIsDuplicating] = React.useState(false);

  React.useEffect(() => {
    setPriceLists(initialPriceLists);
  }, [initialPriceLists]);

  // Filtering
  const filteredList = React.useMemo(() => {
    return priceLists.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.slug.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === "ALL" || item.unitType === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [priceLists, searchQuery, categoryFilter]);

  // Helper for Category Badge and Icon
  const renderCategoryPill = (type: string) => {
    switch (type) {
      case "DOME":
        return (
          <Badge
            variant="outline"
            className="bg-primary/10 border-primary/20 text-primary gap-1 text-[10px]"
          >
            <Tent className="h-3 w-3" /> Geodesic Dome
          </Badge>
        );
      case "A_FRAME":
        return (
          <Badge
            variant="outline"
            className="gap-1 border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-400"
          >
            <Home className="h-3 w-3" /> A-Frame
          </Badge>
        );
      case "NON_AC_HALL":
        return (
          <Badge
            variant="outline"
            className="gap-1 border-blue-500/20 bg-blue-500/10 text-[10px] text-blue-700 dark:text-blue-400"
          >
            <Building2 className="h-3 w-3" /> Non-AC Hall
          </Badge>
        );
      case "AC_HALL":
        return (
          <Badge
            variant="outline"
            className="gap-1 border-indigo-500/20 bg-indigo-500/10 text-[10px] text-indigo-700 dark:text-indigo-400"
          >
            <HardHat className="h-3 w-3" /> AC Hall
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Helper for Headcount Span
  const getHeadcountSpan = (item: PriceListTableItem) => {
    if (!item.slabs || item.slabs.length === 0) return "No slabs";
    const min = Math.min(...item.slabs.map((s) => s.minHeadcount));
    const max = Math.max(...item.slabs.map((s) => s.maxHeadcount));
    return `${min} – ${max.toLocaleString("en-IN")}\u00A0Pax`;
  };

  // Confirm Delete Handler
  const handleConfirmDelete = async () => {
    if (!planToDelete || isDeleting) return;

    if ((planToDelete._count?.units || 0) > 0) {
      toast.error(
        `Cannot delete price list: it is currently attached to ${planToDelete._count?.units} unit(s). Reassign or detach all units first.`,
      );
      return;
    }

    setIsDeleting(true);

    try {
      const res = await deletePriceList(
        planToDelete.id,
        planToDelete.updatedAt,
      );
      if (!res.success) {
        toast.error(res.error || "Failed to delete price list.");
      } else {
        toast.success(
          `Price list "${planToDelete.name}" deleted successfully.`,
        );
        setPlanToDelete(null);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete price list.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Duplicate Plan Handler
  const handleConfirmDuplicate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planToDuplicate || !duplicateName.trim() || isDuplicating) return;

    setIsDuplicating(true);

    try {
      const res = await createPriceList({
        name: duplicateName.trim(),
        unitType: planToDuplicate.unitType as UnitType,
        maxGuestCapacity: planToDuplicate.maxGuestCapacity,
        slabs: planToDuplicate.slabs.map((s) => ({
          stayType: s.stayType as StayType,
          minHeadcount: Number(s.minHeadcount),
          maxHeadcount: Number(s.maxHeadcount),
          basePrice: Number(s.basePrice),
          requiredDeposit: Number(s.requiredDeposit),
        })),
      });

      if (!res.success) {
        toast.error(res.error || "Failed to duplicate rate plan.");
      } else {
        toast.success("Rate plan duplicated successfully.");
        setPlanToDuplicate(null);
        setDuplicateName("");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(
        err?.message || "An unexpected error occurred during duplication.",
      );
    } finally {
      setIsDuplicating(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Category Filter Tabs & Search Bar (Two-Tier Clean Structural Toolbar) */}
      <div className="border-border/60 flex flex-col gap-2.5 border-b pb-2">
        {/* Tier 1: Category Filter Tabs (Ribbon) */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto [-webkit-overflow-scrolling:touch]">
          <div className="border-border/80 bg-surface-subtle/50 inline-flex shrink-0 items-center rounded-lg border p-0.5 gap-0.5">
            {[
              { id: "ALL", label: `All plans (${priceLists.length})` },
              { id: "DOME", label: "Domes" },
              { id: "A_FRAME", label: "A-Frames" },
              { id: "NON_AC_HALL", label: "Non-AC Hall" },
              { id: "AC_HALL", label: "AC Hall" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap transition-all duration-100 ease-[var(--ease-snappy)] select-none active:scale-[0.98]",
                  categoryFilter === tab.id
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
              placeholder="Search price plans…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              spellCheck={false}
              className="bg-background border-border/80 focus-visible:ring-ring h-8 px-3 pr-8 text-base focus-visible:ring-1 md:text-xs"
              aria-label="Search price plans"
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
            {filteredList.length === priceLists.length
              ? `${priceLists.length}\u00A0plans`
              : `Showing ${filteredList.length} of ${priceLists.length}\u00A0plans`}
          </div>
        </div>
      </div>

      {/* Price Lists Table Card */}
      <div className="bg-card overflow-hidden rounded-xl border border-border shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border text-xs font-semibold">
              <tr>
                <th className="px-3 py-2.5 whitespace-nowrap border-b border-border">Profile name</th>
                <th className="px-3 py-2.5 whitespace-nowrap border-b border-border">Category</th>
                <th className="px-3 py-2.5 whitespace-nowrap border-b border-border">Capacity span</th>
                <th className="px-3 py-2.5 whitespace-nowrap border-b border-border">Total tiers</th>
                <th className="px-3 py-2.5 whitespace-nowrap border-b border-border">
                  Linked inventory
                </th>
                <th className="px-3 py-2.5 whitespace-nowrap border-b border-border">Last modified</th>
                <th className="px-3 py-2.5 text-right whitespace-nowrap border-b border-border">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-muted-foreground py-12 text-center"
                  >
                    <Layers className="text-muted-foreground/40 mx-auto mb-2 h-8 w-8" />
                    <p className="text-foreground text-sm font-semibold">
                      No price lists found
                    </p>
                    <p className="mt-0.5 text-xs">
                      {searchQuery
                        ? "Try clearing your search query"
                        : "Click 'Create price list' above to set up dynamic tariffs."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const isExpanded = expandedRowId === item.id;
                  const linkedUnitsCount = item._count?.units || 0;
                  const activeModifiersCount = item._count?.modifiers || 0;

                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-muted/20 group transition-colors border-b border-border/60">
                        {/* Profile Name & Toggle */}
                        <td className="text-foreground px-3 py-2.5 font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedRowId(isExpanded ? null : item.id)
                              }
                              className="text-muted-foreground hover:text-foreground rounded-sm p-0.5 transition-colors"
                              title="Toggle slab preview"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <div>
                              <div className="text-foreground hover:text-primary font-semibold transition-colors">
                                <Link href={`/admin/pricing/${item.id}`}>
                                  {item.name}
                                </Link>
                              </div>
                              <div className="text-muted-foreground font-mono text-[10px]">
                                {item.slug}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {renderCategoryPill(item.unitType)}
                        </td>

                        {/* Capacity Span */}
                        <td className="px-3 py-2.5 font-mono font-medium whitespace-nowrap">
                          {getHeadcountSpan(item)}
                        </td>

                        {/* Slabs Count */}
                        <td className="px-3 py-2.5 font-mono whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className="px-1.5 py-0 text-[10px]"
                          >
                            {item.slabs?.length || item._count?.slabs || 0}{" "}
                            slabs
                          </Badge>
                        </td>

                        {/* Linked Units */}
                        <td className="px-3 py-2.5 font-mono whitespace-nowrap">
                          {linkedUnitsCount > 0 ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-400"
                            >
                              {linkedUnitsCount} unit(s) linked
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-muted-foreground text-[10px]"
                            >
                              0 units linked
                            </Badge>
                          )}
                        </td>

                        {/* Last Modified */}
                        <td className="text-muted-foreground px-3 py-2.5 font-mono text-[11px] whitespace-nowrap">
                          {new Date(item.updatedAt).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/admin/pricing/${item.id}`}
                              className={cn(
                                buttonVariants({
                                  variant: "ghost",
                                  size: "icon-xs",
                                }),
                                "text-muted-foreground hover:text-foreground h-7 w-7",
                              )}
                              title="Edit price slabs"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Link>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => {
                                setPlanToDuplicate(item);
                                setDuplicateName(`${item.name} (Copy)`);
                              }}
                              title="Duplicate rate plan"
                              className="text-muted-foreground hover:text-foreground h-7 w-7"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => setPlanToDelete(item)}
                              title="Delete price list"
                              className="text-destructive hover:bg-destructive/10 h-7 w-7"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Slab Breakdown Drawer */}
                      {isExpanded && (
                        <tr className="bg-muted/10 border-b">
                          <td colSpan={7} className="p-4">
                            <div className="bg-card space-y-3 rounded-lg border p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
                                  <Sparkles className="text-primary h-3.5 w-3.5" />
                                  Configured Slabs Breakdown for {item.name}
                                </span>
                                <Link
                                  href={`/admin/pricing/${item.id}`}
                                  className={cn(
                                    buttonVariants({
                                      variant: "outline",
                                      size: "compact",
                                    }),
                                    "h-6 gap-1 text-[10px]",
                                  )}
                                >
                                  Edit in Slab Builder{" "}
                                  <ArrowRight className="h-2.5 w-2.5" />
                                </Link>
                              </div>

                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                {Array.from(
                                  new Set(item.slabs.map((s) => s.stayType)),
                                ).map((slot) => {
                                  const slotSlabs = item.slabs
                                    .filter((s) => s.stayType === slot)
                                    .sort(
                                      (a, b) => a.minHeadcount - b.minHeadcount,
                                    );

                                  return (
                                    <div
                                      key={slot}
                                      className="bg-muted/20 space-y-2 rounded-md border p-2.5"
                                    >
                                      <div className="text-foreground flex items-center justify-between text-[11px] font-semibold">
                                        <span>{slot.replace("_", " ")}</span>
                                        <span className="text-muted-foreground font-mono text-[10px]">
                                          {slotSlabs.length} tier(s)
                                        </span>
                                      </div>

                                      <div className="space-y-1 font-mono text-[11px]">
                                        {slotSlabs.map((s, idx) => (
                                          <div
                                            key={idx}
                                            className="bg-card flex items-center justify-between rounded-sm border p-1.5 text-[11px]"
                                          >
                                            <span>
                                              {s.minHeadcount} &ndash;{" "}
                                              {s.maxHeadcount} Pax
                                            </span>
                                            <div className="flex items-center gap-2">
                                              <span className="text-foreground font-bold">
                                                ₹
                                                {s.basePrice.toLocaleString(
                                                  "en-IN",
                                                )}
                                              </span>
                                              <span className="text-muted-foreground text-[10px]">
                                                (Adv: ₹
                                                {s.requiredDeposit.toLocaleString(
                                                  "en-IN",
                                                )}
                                                )
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation / Guard Dialog */}
      <Dialog
        open={!!planToDelete}
        onOpenChange={(open) => !isDeleting && !open && setPlanToDelete(null)}
      >
        <DialogContent className="p-6 sm:max-w-md">
          <DialogHeader className="gap-2">
            <div className="text-destructive flex items-center gap-3">
              <div className="bg-destructive/10 ring-destructive/20 rounded-full p-2.5 ring-1">
                {planToDelete && (planToDelete._count?.units || 0) > 0 ? (
                  <ShieldAlert className="text-destructive h-5 w-5" />
                ) : (
                  <AlertTriangle className="text-destructive h-5 w-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-foreground text-base font-semibold">
                  {planToDelete && (planToDelete._count?.units || 0) > 0
                    ? "Delete Blocked: Rate Plan in Use"
                    : "Delete Price List"}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs">
                  {planToDelete && (planToDelete._count?.units || 0) > 0
                    ? "Active units are currently dependent on this tariff plan"
                    : "Permanently delete this dynamic pricing plan"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {planToDelete && (
            <div className="space-y-3 py-2 text-xs">
              {(planToDelete._count?.units || 0) > 0 ? (
                <div className="space-y-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 font-mono text-rose-800 dark:text-rose-300">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    PRICE_LIST_IN_USE Violation
                  </div>
                  <p>
                    <strong>&quot;{planToDelete.name}&quot;</strong> is
                    currently attached to{" "}
                    <strong>{planToDelete._count?.units} resort unit(s)</strong>
                    .
                  </p>
                  <p className="text-[11px] opacity-90">
                    To prevent leaving inventory units without tariff rules, you
                    must reassign or detach all units in the Units Manager
                    before deleting this price list.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-foreground">
                    Are you sure you want to permanently delete{" "}
                    <strong>&quot;{planToDelete.name}&quot;</strong>?
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    This action will remove all{" "}
                    {planToDelete.slabs?.length || 0} configured headcount
                    slabs. Historical bookings will remain insulated by rate
                    snapshotting.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="bg-muted/30 -mx-6 -mb-6 gap-2 rounded-b-xl border-t p-4 pt-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setPlanToDelete(null)}
            >
              {planToDelete && (planToDelete._count?.units || 0) > 0
                ? "Understood"
                : "Cancel"}
            </Button>

            {planToDelete && (planToDelete._count?.units || 0) === 0 && (
              <Button
                type="button"
                variant="destructive"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Confirm Delete"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Rate Plan Dialog */}
      <Dialog
        open={!!planToDuplicate}
        onOpenChange={(open) =>
          !isDuplicating && !open && setPlanToDuplicate(null)
        }
      >
        <DialogContent className="p-6 sm:max-w-md">
          <DialogHeader className="gap-2">
            <DialogTitle className="text-foreground flex items-center gap-2 text-base font-semibold">
              <Copy className="text-primary h-4 w-4" /> Duplicate Price List
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Clone all {planToDuplicate?.slabs.length} slabs to a new profile
              for seasonal adjustments
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmDuplicate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label
                htmlFor="dup-name"
                className="text-foreground text-xs font-semibold"
              >
                New Profile Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="dup-name"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                placeholder="e.g., Standard Dome - Diwali High Season"
                className="text-base md:text-xs"
                required
                disabled={isDuplicating}
              />
            </div>

            <DialogFooter className="bg-muted/30 -mx-6 -mb-6 gap-2 rounded-b-xl border-t p-4 pt-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isDuplicating}
                onClick={() => setPlanToDuplicate(null)}
                className="transition-transform duration-100 ease-out select-none active:scale-[0.98]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={isDuplicating || !duplicateName.trim()}
                className="transition-transform duration-100 ease-out select-none active:scale-[0.98]"
              >
                {isDuplicating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cloning...
                  </>
                ) : (
                  "Clone Price List"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PriceListsTable;
