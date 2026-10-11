"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ModifierItemData,
  TargetPriceListOption,
  ModifierModal,
} from "./ModifierModal";
import {
  deleteModifier,
  toggleModifierStatus,
} from "@/actions/modifiers";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Sparkles,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Search,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Loader2,
  Clock,
  CheckCircle2,
  Archive,
  Layers,
} from "lucide-react";
import { getISTDateString } from "@/lib/pricing/resolve-modifiers";
import { cn } from "@/lib/utils";

export interface ModifiersClientViewProps {
  modifiers: ModifierItemData[];
  priceListOptions: TargetPriceListOption[];
  todayIST: string;
}

export function ModifiersClientView({
  modifiers: initialModifiers,
  priceListOptions,
  todayIST,
}: ModifiersClientViewProps) {
  const router = useRouter();
  const [modifiers, setModifiers] = React.useState<ModifierItemData[]>(initialModifiers);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "ACTIVE_NOW" | "UPCOMING" | "EXPIRED">("ALL");
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL");
  const [showExpiredArchive, setShowExpiredArchive] = React.useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modifierToEdit, setModifierToEdit] = React.useState<ModifierItemData | null>(null);

  // Delete modal state
  const [modifierToDelete, setModifierToDelete] = React.useState<ModifierItemData | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Toggling status indicator
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setModifiers(initialModifiers);
  }, [initialModifiers]);

  // Categorize into Active/Upcoming vs Expired
  const { activeAndUpcoming, expired } = React.useMemo(() => {
    const activeAndUpcomingList: ModifierItemData[] = [];
    const expiredList: ModifierItemData[] = [];

    for (const mod of modifiers) {
      const endIST = getISTDateString(mod.endDate);
      if (endIST < todayIST) {
        expiredList.push(mod);
      } else {
        activeAndUpcomingList.push(mod);
      }
    }

    return {
      activeAndUpcoming: activeAndUpcomingList,
      expired: expiredList,
    };
  }, [modifiers, todayIST]);

  // Filter Active/Upcoming
  const filteredActive = React.useMemo(() => {
    if (statusFilter === "EXPIRED") return [];

    return activeAndUpcoming.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.priceList?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "ALL" || m.type === typeFilter;

      const startIST = getISTDateString(m.startDate);
      const endIST = getISTDateString(m.endDate);

      let matchesStatus = true;
      if (statusFilter === "ACTIVE_NOW") {
        matchesStatus = startIST <= todayIST && endIST >= todayIST && m.isActive;
      } else if (statusFilter === "UPCOMING") {
        matchesStatus = startIST > todayIST;
      }

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [activeAndUpcoming, searchQuery, typeFilter, statusFilter, todayIST]);

  // Filter Expired
  const filteredExpired = React.useMemo(() => {
    if (statusFilter === "ACTIVE_NOW" || statusFilter === "UPCOMING") return [];

    return expired.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.priceList?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "ALL" || m.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [expired, searchQuery, typeFilter, statusFilter]);

  // Active status toggle handler
  const handleToggleStatus = async (mod: ModifierItemData, newStatus: boolean) => {
    const endIST = getISTDateString(mod.endDate);
    if (endIST < todayIST) {
      toast.error("Cannot modify status of an expired price modifier.");
      return;
    }

    setTogglingId(mod.id);

    try {
      const res = await toggleModifierStatus(mod.id, newStatus, mod.updatedAt);
      if (!res.success) {
        toast.error(res.error || "Failed to update modifier status.");
      } else {
        toast.success(
          newStatus
            ? `Activated "${mod.name}".`
            : `Deactivated "${mod.name}".`
        );
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to toggle status.");
    } finally {
      setTogglingId(null);
    }
  };

  // Delete confirm handler
  const handleConfirmDelete = async () => {
    if (!modifierToDelete || isDeleting) return;

    const endIST = getISTDateString(modifierToDelete.endDate);
    if (endIST < todayIST) {
      toast.error(
        "Cannot delete an expired price modifier. Expired promotions are permanently locked for audit preservation."
      );
      return;
    }

    setIsDeleting(true);

    try {
      const res = await deleteModifier(modifierToDelete.id, modifierToDelete.updatedAt);
      if (!res.success) {
        toast.error(res.error || "Failed to delete modifier.");
      } else {
        toast.success(`Modifier "${modifierToDelete.name}" deleted.`);
        setModifierToDelete(null);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err?.message || "Internal error deleting modifier.");
    } finally {
      setIsDeleting(false);
    }
  };

  const renderStatusBadge = (mod: ModifierItemData) => {
    const startIST = getISTDateString(mod.startDate);
    const endIST = getISTDateString(mod.endDate);

    if (endIST < todayIST) {
      return (
        <Badge
          variant="outline"
          className="text-[10px] bg-muted text-muted-foreground border-border/80 gap-1 font-mono"
        >
          <Lock className="h-2.5 w-2.5 text-muted-foreground" />
          Expired & Locked
        </Badge>
      );
    }

    if (!mod.isActive) {
      return (
        <Badge
          variant="outline"
          className="text-[10px] bg-muted/40 text-muted-foreground"
        >
          Inactive
        </Badge>
      );
    }

    if (startIST <= todayIST && endIST >= todayIST) {
      return (
        <Badge
          variant="outline"
          className="text-[10px] bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 gap-1"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active Now
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className="text-[10px] bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400 gap-1"
      >
        <Clock className="h-3 w-3" />
        Upcoming
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs (admin-front-end.md:449) */}
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl border bg-muted/40">
            {[
              { id: "ALL", label: "All Rules" },
              { id: "ACTIVE_NOW", label: "Active Now" },
              { id: "UPCOMING", label: "Upcoming" },
              { id: "EXPIRED", label: "Expired" },
            ].map((tab) => (
              <Button
                key={tab.id}
                type="button"
                size="compact"
                variant={statusFilter === tab.id ? "default" : "ghost"}
                onClick={() => {
                  setStatusFilter(tab.id as any);
                  if (tab.id === "EXPIRED") setShowExpiredArchive(true);
                }}
                className="h-7 text-[11px] px-2.5 font-medium select-none transition-transform duration-100 ease-out active:scale-[0.98]"
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Rule Type Filter */}
          <div className="flex items-center gap-1 p-1 rounded-xl border bg-muted/20">
            {[
              { id: "ALL", label: "All Types" },
              { id: "WEEKEND", label: "Weekend" },
              { id: "SEASONAL", label: "Seasonal" },
            ].map((tab) => (
              <Button
                key={tab.id}
                type="button"
                size="compact"
                variant={typeFilter === tab.id ? "secondary" : "ghost"}
                onClick={() => setTypeFilter(tab.id)}
                className="h-7 text-[11px] px-2 font-medium select-none transition-transform duration-100 ease-out active:scale-[0.98]"
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-60">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rules or plans…"
              className="px-3 text-base md:text-xs h-9 bg-card"
            />
          </div>

          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={() => {
              setModifierToEdit(null);
              setModalOpen(true);
            }}
            className="text-xs gap-1.5 h-9 shrink-0 select-none transition-transform duration-100 ease-out active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />
            Create modifier
          </Button>
        </div>
      </div>

      {/* Active & Upcoming Modifiers Table */}
      {statusFilter !== "EXPIRED" && (
        <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Active & Scheduled Modifiers
            <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 bg-muted">
              {filteredActive.length}
            </Badge>
          </h2>
          <span className="text-[11px] text-muted-foreground">
            Evaluated night-by-night against IST calendar
          </span>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-muted/40 border-b text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Modifier Rule</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Target Rate Plan</th>
                  <th className="py-3 px-4">Validity Range (IST)</th>
                  <th className="py-3 px-4">Variance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredActive.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">
                      <Sparkles className="h-7 w-7 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="font-semibold text-foreground text-xs">
                        No active or upcoming modifiers found
                      </p>
                      <p className="text-[11px] mt-0.5">
                        Click &apos;+ Create Modifier&apos; to configure weekend surcharges or seasonal discounts.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredActive.map((mod) => {
                    const startIST = getISTDateString(mod.startDate);
                    const endIST = getISTDateString(mod.endDate);
                    const isTogglingThis = togglingId === mod.id;

                    return (
                      <tr key={mod.id} className="hover:bg-muted/20 transition-colors border-b border-border/60">
                        {/* Name */}
                        <td className="py-3.5 px-4 font-medium text-foreground">
                          <div className="font-semibold">{mod.name}</div>
                        </td>

                        {/* Type Badge */}
                        <td className="py-3.5 px-4">
                          {mod.type === "WEEKEND" ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
                            >
                              WEEKEND
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-300"
                            >
                              SEASONAL
                            </Badge>
                          )}
                        </td>

                        {/* Target Plan */}
                        <td className="py-3.5 px-4 text-muted-foreground font-mono">
                          {mod.priceList?.name || "Target Plan"}
                        </td>

                        {/* Date Range */}
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          {startIST} &rarr; {endIST}
                        </td>

                        {/* Variance */}
                        <td className="py-3.5 px-4 font-mono font-bold">
                          <span
                            className={cn(
                              mod.percentage > 0
                                ? "text-primary"
                                : mod.percentage < 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-muted-foreground"
                            )}
                          >
                            {mod.percentage > 0 ? `+${mod.percentage}%` : `${mod.percentage}%`}
                          </span>
                        </td>

                        {/* Status Toggle */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            {renderStatusBadge(mod)}
                            <Switch
                              checked={mod.isActive}
                              disabled={isTogglingThis}
                              onCheckedChange={(checked) => handleToggleStatus(mod, checked)}
                              title="Toggle rule status"
                            />
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => {
                                setModifierToEdit(mod);
                                setModalOpen(true);
                              }}
                              title="Edit modifier"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => setModifierToDelete(mod)}
                              title="Delete modifier"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

      {/* Expired Modifiers Collapsible Archive */}
      {statusFilter !== "ACTIVE_NOW" && statusFilter !== "UPCOMING" && (
        <div className="space-y-3 pt-4 border-t">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowExpiredArchive(!showExpiredArchive)}
            className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
          >
            <Archive className="h-4 w-4 text-muted-foreground" />
            <span>Expired Modifiers Archive</span>
            <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 bg-muted">
              {filteredExpired.length} Locked
            </Badge>
            {showExpiredArchive ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>

          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Lock className="h-3 w-3 text-amber-500" />
            Permanently locked for historical revenue audit
          </span>
        </div>

        {showExpiredArchive && (
          <div className="rounded-xl border bg-muted/10 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-muted/40 border-b text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Archived Rule</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Target Rate Plan</th>
                    <th className="py-3 px-4">Validity Range (IST)</th>
                    <th className="py-3 px-4">Variance</th>
                    <th className="py-3 px-4">Audit Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpired.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        <Lock className="h-6 w-6 mx-auto text-muted-foreground/30 mb-1" />
                        <p className="text-xs font-medium">No expired modifiers in the archive.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredExpired.map((mod) => {
                      const startIST = getISTDateString(mod.startDate);
                      const endIST = getISTDateString(mod.endDate);

                      return (
                        <tr
                          key={mod.id}
                          className="bg-muted/5 opacity-80 hover:opacity-100 transition-opacity border-b border-border/60"
                        >
                          <td className="py-3 px-4 font-medium text-foreground">
                            <div className="flex items-center gap-1.5">
                              <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span>{mod.name}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              {mod.type}
                            </Badge>
                          </td>

                          <td className="py-3 px-4 text-muted-foreground font-mono">
                            {mod.priceList?.name || "Target Plan"}
                          </td>

                          <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                            {startIST} &rarr; {endIST}
                          </td>

                          <td className="py-3 px-4 font-mono font-medium text-muted-foreground">
                            {mod.percentage > 0 ? `+${mod.percentage}%` : `${mod.percentage}%`}
                          </td>

                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-muted text-muted-foreground border-border/80 gap-1 font-mono"
                            >
                              <Lock className="h-2.5 w-2.5" /> Read-Only
                            </Badge>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="compact"
                              onClick={() => {
                                setModifierToEdit(mod);
                                setModalOpen(true);
                              }}
                              className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )}

      {/* Create / Edit Modal */}
      <ModifierModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        modifierToEdit={modifierToEdit}
        priceListOptions={priceListOptions}
        onSuccess={() => router.refresh()}
      />

      {/* Delete Confirmation Modal */}
      <Dialog
        open={!!modifierToDelete}
        onOpenChange={(open) => !isDeleting && !open && setModifierToDelete(null)}
      >
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="gap-2">
            <div className="flex items-center gap-3 text-destructive">
              <div className="rounded-full bg-destructive/10 p-2.5 ring-1 ring-destructive/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  Delete Price Modifier
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Remove this scheduled dynamic tariff adjustment rule
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {modifierToDelete && (
            <div className="py-2 space-y-2 text-xs">
              <p className="text-foreground">
                Are you sure you want to delete{" "}
                <strong>&quot;{modifierToDelete.name}&quot;</strong>?
              </p>
              <p className="text-muted-foreground text-[11px]">
                This modifier applies a{" "}
                <strong>
                  {modifierToDelete.percentage > 0
                    ? `+${modifierToDelete.percentage}% surge`
                    : `${modifierToDelete.percentage}% discount`}
                </strong>{" "}
                between {getISTDateString(modifierToDelete.startDate)} and{" "}
                {getISTDateString(modifierToDelete.endDate)}. Removing it will revert bookings to the base price list.
              </p>
            </div>
          )}

          <DialogFooter className="sm:justify-end gap-2 pt-2 border-t -mx-6 -mb-6 p-4 bg-muted/30 rounded-b-xl">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setModifierToDelete(null)}
              className="select-none transition-transform duration-100 ease-out active:scale-[0.98]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="select-none transition-transform duration-100 ease-out active:scale-[0.98]"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete Rule"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ModifiersClientView;
