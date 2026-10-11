"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  priceListSchema,
  PriceListInput,
  UnitType,
  StayType,
  UNIT_STAY_TYPES,
  UNIT_MAX_CAPACITIES,
  generateSlug,
} from "@/schemas/price.schema";
import { createPriceList, updatePriceList } from "@/actions/price-lists";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { SlabGapIndicator } from "./SlabGapIndicator";
import { PriceCalculatorWidget } from "./PriceCalculatorWidget";
import {
  ChevronLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExistingPriceListData {
  id: string;
  name: string;
  slug: string;
  unitType: UnitType;
  maxGuestCapacity: number;
  slabs: Array<{
    id?: string;
    stayType: StayType;
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
  updatedAt: Date | string;
  units?: Array<{
    id: string;
    name: string;
    maxCapacity: number;
  }>;
}

export interface UnitPricingSlabBuilderProps {
  initialData?: ExistingPriceListData;
  isEditing?: boolean;
}

export function UnitPricingSlabBuilder({
  initialData,
  isEditing = false,
}: UnitPricingSlabBuilderProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = React.useState(false);

  const initialUnitType: UnitType = initialData?.unitType || "DOME";
  const [activeTab, setActiveTab] = React.useState<StayType>(
    initialUnitType === "NON_AC_HALL" || initialUnitType === "AC_HALL"
      ? "MORNING_SLOT"
      : "OVERNIGHT"
  );

  // Setup React Hook Form
  const defaultValues: PriceListInput = React.useMemo(() => {
    if (initialData) {
      return {
        id: initialData.id,
        name: initialData.name,
        slug: initialData.slug,
        unitType: initialData.unitType,
        maxGuestCapacity: initialData.maxGuestCapacity,
        slabs: initialData.slabs.map((s) => ({
          stayType: s.stayType,
          minHeadcount: Number(s.minHeadcount),
          maxHeadcount: Number(s.maxHeadcount),
          basePrice: Number(s.basePrice),
          requiredDeposit: Number(s.requiredDeposit),
        })),
        expectedUpdatedAt: new Date(initialData.updatedAt),
      };
    }

    // Default template for a new Dome Price List
    return {
      name: "",
      slug: "",
      unitType: "DOME",
      maxGuestCapacity: 3,
      slabs: [
        {
          stayType: "OVERNIGHT",
          minHeadcount: 1,
          maxHeadcount: 3,
          basePrice: 3500,
          requiredDeposit: 2000,
        },
        {
          stayType: "DAY_SLOT",
          minHeadcount: 1,
          maxHeadcount: 3,
          basePrice: 2500,
          requiredDeposit: 2000,
        },
      ],
    };
  }, [initialData]);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<PriceListInput>({
    resolver: zodResolver(priceListSchema) as any,
    defaultValues,
    mode: "onChange",
  });

  const { fields, append, remove, insert } = useFieldArray({
    control,
    name: "slabs",
  });

  const currentUnitType = watch("unitType");
  const currentMaxCapacity = watch("maxGuestCapacity");
  const currentSlabs = watch("slabs") || [];
  const currentName = watch("name");

  // Keep slug in sync if not custom edited
  React.useEffect(() => {
    if (!isEditing && currentName) {
      setValue("slug", generateSlug(currentName));
    }
  }, [currentName, isEditing, setValue]);

  // Adjust active tab if unitType changes
  React.useEffect(() => {
    const allowed = UNIT_STAY_TYPES[currentUnitType] || ["OVERNIGHT", "DAY_SLOT"];
    if (!allowed.includes(activeTab)) {
      setActiveTab(allowed[0]);
    }
  }, [currentUnitType, activeTab]);

  // Handle unit category change
  const handleUnitTypeChange = (newType: UnitType) => {
    if (newType === currentUnitType) return;
    setValue("unitType", newType, { shouldDirty: true, shouldValidate: true });

    const maxCap = UNIT_MAX_CAPACITIES[newType];
    setValue("maxGuestCapacity", maxCap, { shouldDirty: true, shouldValidate: true });

    // Seed default slabs for the new category
    const allowedSlots = UNIT_STAY_TYPES[newType];
    if (newType === "DOME") {
      setValue("slabs", [
        { stayType: "OVERNIGHT", minHeadcount: 1, maxHeadcount: 3, basePrice: 3500, requiredDeposit: 2000 },
        { stayType: "DAY_SLOT", minHeadcount: 1, maxHeadcount: 3, basePrice: 2500, requiredDeposit: 2000 },
      ], { shouldDirty: true, shouldValidate: true });
      setActiveTab("OVERNIGHT");
    } else if (newType === "A_FRAME") {
      setValue("slabs", [
        { stayType: "OVERNIGHT", minHeadcount: 1, maxHeadcount: 5, basePrice: 5000, requiredDeposit: 2000 },
        { stayType: "DAY_SLOT", minHeadcount: 1, maxHeadcount: 5, basePrice: 3500, requiredDeposit: 2000 },
      ], { shouldDirty: true, shouldValidate: true });
      setActiveTab("OVERNIGHT");
    } else if (newType === "NON_AC_HALL") {
      setValue("slabs", [
        { stayType: "MORNING_SLOT", minHeadcount: 1, maxHeadcount: 200, basePrice: 15000, requiredDeposit: 5000 },
        { stayType: "MORNING_SLOT", minHeadcount: 201, maxHeadcount: 1200, basePrice: 40000, requiredDeposit: 10000 },
        { stayType: "EVENING_SLOT", minHeadcount: 1, maxHeadcount: 200, basePrice: 20000, requiredDeposit: 5000 },
        { stayType: "EVENING_SLOT", minHeadcount: 201, maxHeadcount: 1200, basePrice: 50000, requiredDeposit: 10000 },
      ], { shouldDirty: true, shouldValidate: true });
      setActiveTab("MORNING_SLOT");
    } else if (newType === "AC_HALL") {
      setValue("slabs", [
        { stayType: "MORNING_SLOT", minHeadcount: 1, maxHeadcount: 500, basePrice: 30000, requiredDeposit: 10000 },
        { stayType: "MORNING_SLOT", minHeadcount: 501, maxHeadcount: 2000, basePrice: 75000, requiredDeposit: 20000 },
        { stayType: "EVENING_SLOT", minHeadcount: 1, maxHeadcount: 500, basePrice: 40000, requiredDeposit: 10000 },
        { stayType: "EVENING_SLOT", minHeadcount: 501, maxHeadcount: 2000, basePrice: 90000, requiredDeposit: 20000 },
      ], { shouldDirty: true, shouldValidate: true });
      setActiveTab("MORNING_SLOT");
    }
  };

  // Helper to add slab row for current active slot
  const handleAddSlabForActiveSlot = () => {
    const slotSlabs = currentSlabs.filter((s) => s.stayType === activeTab);
    const sorted = [...slotSlabs].sort((a, b) => a.minHeadcount - b.minHeadcount);

    let nextMin = 1;
    let nextMax = Math.min(currentMaxCapacity, 5);

    if (sorted.length > 0) {
      const highest = sorted[sorted.length - 1];
      nextMin = highest.maxHeadcount + 1;
      nextMax = Math.min(currentMaxCapacity, nextMin + 2);
      if (nextMin > currentMaxCapacity) {
        toast.error(
          `Cannot add slab beyond maximum capacity (${currentMaxCapacity} Pax).`
        );
        return;
      }
    }

    append({
      stayType: activeTab,
      minHeadcount: nextMin,
      maxHeadcount: Math.max(nextMin, nextMax),
      basePrice: sorted.length > 0 ? sorted[sorted.length - 1].basePrice + 1000 : 3000,
      requiredDeposit: sorted.length > 0 ? sorted[sorted.length - 1].requiredDeposit : 1500,
    });
  };

  // Helper to insert slab row directly below an existing tier
  const handleInsertSlabBelow = (targetGlobalIndex: number, slot: StayType) => {
    const currentItem = currentSlabs[targetGlobalIndex];
    const nextMin = currentItem ? currentItem.maxHeadcount + 1 : 1;
    const step = currentUnitType === "DOME" || currentUnitType === "A_FRAME" ? 2 : 50;
    const nextMax = Math.min(currentMaxCapacity, nextMin + step);

    if (nextMin > currentMaxCapacity) {
      toast.error(`Cannot insert tier beyond maximum capacity (${currentMaxCapacity} Pax).`);
      return;
    }

    insert(targetGlobalIndex + 1, {
      stayType: slot,
      minHeadcount: nextMin,
      maxHeadcount: Math.max(nextMin, nextMax),
      basePrice: currentItem ? currentItem.basePrice + 1000 : 3000,
      requiredDeposit: currentItem ? currentItem.requiredDeposit : 1500,
    });
  };

  // Reset Slabs handler (admin-front-end.md:417)
  const handleResetSlabs = () => {
    if (isEditing && initialData) {
      setValue(
        "slabs",
        initialData.slabs.map((s) => ({
          stayType: s.stayType,
          minHeadcount: Number(s.minHeadcount),
          maxHeadcount: Number(s.maxHeadcount),
          basePrice: Number(s.basePrice),
          requiredDeposit: Number(s.requiredDeposit),
        })),
        { shouldDirty: true, shouldValidate: true }
      );
      toast.info("Pricing slabs restored to saved profile values.");
    } else {
      handleUnitTypeChange(currentUnitType);
      toast.info("Pricing slabs reset to default category template.");
    }
  };

  // Validation diagnostics for Contiguous Bounds
  const validationDiagnostics = React.useMemo(() => {
    const allowed = UNIT_STAY_TYPES[currentUnitType] || ["OVERNIGHT", "DAY_SLOT"];
    const issues: string[] = [];

    // Check mandatory slot coverage
    for (const requiredSlot of allowed) {
      const slotSlabs = currentSlabs.filter((s) => s.stayType === requiredSlot);
      if (slotSlabs.length === 0) {
        issues.push(`Missing slabs for mandatory slot "${requiredSlot.replace("_", " ")}".`);
        continue;
      }

      const sorted = [...slotSlabs].sort((a, b) => a.minHeadcount - b.minHeadcount);

      // Floor check: lowest slab starts at 1 for Rooms, >= 1 for Halls (supports opening tiers per event_hall.md)
      const isRoomUnit = currentUnitType === "DOME" || currentUnitType === "A_FRAME";
      if (isRoomUnit && sorted[0].minHeadcount !== 1) {
        issues.push(
          `${requiredSlot.replace("_", " ")}: lowest tier must start at 1 Pax (currently starts at ${sorted[0].minHeadcount}).`
        );
      } else if (!isRoomUnit && sorted[0].minHeadcount < 1) {
        issues.push(
          `${requiredSlot.replace("_", " ")}: lowest tier must start at minHeadcount >= 1 (currently starts at ${sorted[0].minHeadcount}).`
        );
      }

      // Contiguity check
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        if (curr.minHeadcount !== prev.maxHeadcount + 1) {
          issues.push(
            `${requiredSlot.replace("_", " ")}: gap or overlap between ${prev.maxHeadcount} and ${curr.minHeadcount} Pax.`
          );
        }
      }

      // Max ceiling check
      const highest = sorted[sorted.length - 1];
      if (highest.maxHeadcount > currentMaxCapacity) {
        issues.push(
          `${requiredSlot.replace("_", " ")}: highest tier (${highest.maxHeadcount} Pax) exceeds maximum capacity (${currentMaxCapacity} Pax).`
        );
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }, [currentUnitType, currentMaxCapacity, currentSlabs]);

  // Form Submit Handler
  const onSubmit = async (data: PriceListInput) => {
    if (isSubmitting) return;

    if (!validationDiagnostics.isValid) {
      toast.error(
        validationDiagnostics.issues[0] || "Please resolve slab bounds errors before saving."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && initialData) {
        const payload = {
          ...data,
          id: initialData.id,
          expectedUpdatedAt: new Date(initialData.updatedAt),
        };

        const res = await updatePriceList(payload);
        if (!res.success) {
          toast.error(res.error || "Failed to update price list.");
        } else {
          toast.success("Price List saved successfully.");
          router.push("/admin/pricing");
          router.refresh();
        }
      } else {
        const res = await createPriceList(data);
        if (!res.success) {
          toast.error(res.error || "Failed to create price list.");
        } else {
          toast.success("Price List saved successfully.");
          router.push("/admin/pricing");
          router.refresh();
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred while saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const allowedSlots = UNIT_STAY_TYPES[currentUnitType] || ["OVERNIGHT", "DAY_SLOT"];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link
              href="/admin/pricing"
              className="hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Pricing
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">
              {isEditing ? `Edit ${initialData?.name || "Price List"}` : "Create New Price List"}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            {isEditing ? "Edit Dynamic Price List" : "Create Dynamic Price List"}
          </h1>
          <p className="text-xs text-muted-foreground">
            Configure headcount tiers, slot-specific tariffs, and required advance deposits
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (isDirty) {
                setShowDiscardDialog(true);
              } else {
                router.push("/admin/pricing");
              }
            }}
            className="transition-transform duration-100 ease-out active:scale-[0.98] select-none"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetSlabs}
            className="gap-1.5 transition-transform duration-100 ease-out active:scale-[0.98] select-none text-xs"
            title="Reset slabs to default template"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Slabs
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            loading={isSubmitting}
            disabled={isSubmitting || !validationDiagnostics.isValid}
            onClick={handleSubmit(onSubmit as any)}
            className="gap-1.5 transition-transform duration-100 ease-out active:scale-[0.98] select-none"
          >
            <Save className="h-3.5 w-3.5" />
            {isEditing ? "Save Changes" : "Create Price List"}
          </Button>
        </div>
      </div>

      {/* Main Form Body */}
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
        {/* Section 1: Rate Profile Meta */}
        <div className="p-5 rounded-xl border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Profile Configuration
            </h3>
            {isEditing && (
              <Badge variant="outline" className="font-mono text-[10px]">
                ID: {initialData?.id}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Profile Name */}
            <div className="space-y-1.5 md:col-span-1">
              <Label htmlFor="price-list-name" className="text-xs font-semibold">
                Profile Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="price-list-name"
                {...register("name")}
                placeholder="e.g., Standard Dome Rate Plan"
                className="text-base md:text-xs"
              />
              {errors.name && (
                <p className="text-[11px] text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Target Unit Category */}
            <div className="space-y-1.5 md:col-span-1">
              <Label htmlFor="unit-type" className="text-xs font-semibold">
                Unit Category <span className="text-destructive">*</span>
              </Label>
              <select
                id="unit-type"
                value={currentUnitType}
                disabled={isEditing && (initialData?.units?.length || 0) > 0}
                onChange={(e) => handleUnitTypeChange(e.target.value as UnitType)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-base md:text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="DOME">Geodesic Dome (Max 3 Pax)</option>
                <option value="A_FRAME">A-Frame (Max 5 Pax)</option>
                <option value="NON_AC_HALL">Non-AC Event Hall (Max 1,200 Pax)</option>
                <option value="AC_HALL">AC Event Hall (Max 2,000 Pax)</option>
              </select>
              {isEditing && (initialData?.units?.length || 0) > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Locked: Attached to {initialData?.units?.length} active unit(s).
                </p>
              )}
            </div>

            {/* Max Guest Capacity */}
            <div className="space-y-1.5 md:col-span-1">
              <Label htmlFor="max-capacity" className="text-xs font-semibold">
                Max Capacity Ceiling <span className="text-destructive">*</span>
              </Label>
              <Input
                id="max-capacity"
                type="number"
                min={1}
                max={UNIT_MAX_CAPACITIES[currentUnitType]}
                {...register("maxGuestCapacity", { valueAsNumber: true })}
                className="text-base md:text-xs font-mono tabular-nums"
              />
              <p className="text-[10px] text-muted-foreground">
                Domain ceiling: Max {UNIT_MAX_CAPACITIES[currentUnitType]} Pax for {currentUnitType}
              </p>
              {errors.maxGuestCapacity && (
                <p className="text-[11px] text-destructive">
                  {errors.maxGuestCapacity.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Contiguous Validation Banner */}
        <div
          className={cn(
            "p-3.5 rounded-xl border flex items-start gap-3 text-xs transition-colors",
            validationDiagnostics.isValid
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
          )}
        >
          {validationDiagnostics.isValid ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          )}

          <div className="space-y-1 flex-1">
            <div className="font-semibold flex items-center justify-between">
              <span>
                {validationDiagnostics.isValid
                  ? "Slab Structure Valid & Contiguous"
                  : "Contiguous Bounds Validation Failed"}
              </span>
              <span className="font-mono text-[11px]">
                {currentSlabs.length} Slabs Configured
              </span>
            </div>

            {validationDiagnostics.isValid ? (
              <p className="text-[11px] opacity-90">
                All mandatory slot types ({allowedSlots.map((s) => s.replace("_", " ")).join(" & ")}) contain gapless, non-overlapping headcount tiers {currentUnitType === "DOME" || currentUnitType === "A_FRAME" ? "starting at 1 Pax" : "starting at the opening tier"} up to {currentMaxCapacity} Pax.
              </p>
            ) : (
              <ul className="list-disc list-inside text-[11px] space-y-0.5 font-mono">
                {validationDiagnostics.issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Section 3: Dynamic Slab Builder Table with useFieldArray */}
        <div className="p-5 rounded-xl border bg-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Headcount Slab Builder
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Define contiguous guest brackets and base tariffs for each required slot
              </p>
            </div>

            {/* Slot Tabs with operational timings */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg border bg-muted/40">
              {allowedSlots.map((slot) => {
                const count = currentSlabs.filter((s) => s.stayType === slot).length;
                const slotTimeLabel =
                  slot === "OVERNIGHT"
                    ? "Overnight (12 PM – 11 AM)"
                    : slot === "DAY_SLOT"
                    ? "Day Slot (10 AM – 3 PM)"
                    : slot === "MORNING_SLOT"
                    ? "Morning Slot (10 AM – 3 PM)"
                    : "Evening Slot (5 PM – 10 PM)";

                return (
                  <Button
                    key={slot}
                    type="button"
                    size="compact"
                    variant={activeTab === slot ? "default" : "ghost"}
                    onClick={() => setActiveTab(slot)}
                    className="h-7 text-[11px] px-2.5 font-medium gap-1.5 select-none transition-transform duration-100 ease-out active:scale-[0.98]"
                  >
                    <span>{slotTimeLabel}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] px-1 py-0 font-mono",
                        activeTab === slot ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted"
                      )}
                    >
                      {count}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Slabs List for Currently Selected Slot */}
          <div className="space-y-3 pt-2">
            {(() => {
              // Get field items belonging to this slot
              const slotFieldsWithIndex = fields
                .map((field, index) => ({ field, index }))
                .filter(({ field }) => field.stayType === activeTab);

              if (slotFieldsWithIndex.length === 0) {
                return (
                  <div className="p-8 rounded-xl border border-dashed text-center bg-muted/10 space-y-2">
                    <p className="text-xs font-semibold text-foreground">
                      No pricing slabs configured for {activeTab.replace("_", " ")}.
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Domain rules require at least one valid slab for this slot.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddSlabForActiveSlot}
                      className="gap-1.5 mt-2"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add First Slab
                    </Button>
                  </div>
                );
              }

              return (
                <div className="space-y-2.5">
                  {slotFieldsWithIndex.map(({ field, index }, slotIndex) => {
                    const prevSlotItem =
                      slotIndex > 0 ? slotFieldsWithIndex[slotIndex - 1] : null;
                    const prevMax = prevSlotItem
                      ? currentSlabs[prevSlotItem.index]?.maxHeadcount
                      : null;
                    const currMin = currentSlabs[index]?.minHeadcount;

                    return (
                      <React.Fragment key={field.id}>
                        {/* Visual Gap Detector between adjacent tiers */}
                        {prevMax !== null && currMin !== undefined && (
                          <div className="px-2">
                            <SlabGapIndicator
                              prevMax={prevMax}
                              nextMin={currMin}
                              slotLabel={activeTab.replace("_", " ")}
                            />
                          </div>
                        )}

                        {/* Slab Row Card */}
                        <div className="p-3.5 rounded-lg border bg-card/80 hover:border-primary/40 transition-colors shadow-2xs space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-[10px] px-2 py-0.5 bg-muted">
                                Tier #{slotIndex + 1}
                              </Badge>
                              <span className="text-xs font-medium text-foreground">
                                {currentSlabs[index]?.minHeadcount} &ndash;{" "}
                                {currentSlabs[index]?.maxHeadcount} Pax
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleInsertSlabBelow(index, activeTab)}
                                title="Insert slab tier below"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground select-none transition-transform duration-100 ease-out active:scale-95"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => remove(index)}
                                title="Delete this slab tier"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10 select-none transition-transform duration-100 ease-out active:scale-95"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* Row Input Fields Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {/* Min Headcount */}
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">
                                Min Pax {slotIndex === 0 && (
                                  <span className="text-primary font-medium">
                                    ({currentUnitType === "DOME" || currentUnitType === "A_FRAME" ? "Starts at 1" : "Opening tier ≥ 1"})
                                  </span>
                                )}
                              </Label>
                              <Input
                                type="number"
                                min={1}
                                max={currentMaxCapacity}
                                {...register(`slabs.${index}.minHeadcount`, {
                                  valueAsNumber: true,
                                })}
                                className="h-8 text-base md:text-xs font-mono tabular-nums"
                              />
                            </div>

                            {/* Max Headcount */}
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">
                                Max Pax (≤ {currentMaxCapacity})
                              </Label>
                              <Input
                                type="number"
                                min={1}
                                max={currentMaxCapacity}
                                {...register(`slabs.${index}.maxHeadcount`, {
                                  valueAsNumber: true,
                                })}
                                className="h-8 text-base md:text-xs font-mono tabular-nums"
                              />
                            </div>

                            {/* Base Price */}
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">
                                Base Tariff (₹)
                              </Label>
                              <Controller
                                control={control}
                                name={`slabs.${index}.basePrice`}
                                render={({ field: cField }) => (
                                  <CurrencyInput
                                    value={cField.value || 0}
                                    onChange={(val) => cField.onChange(val)}
                                    className="h-8 text-base md:text-xs"
                                  />
                                )}
                              />
                            </div>

                            {/* Required Advance */}
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">
                                Advance Deposit (₹)
                              </Label>
                              <Controller
                                control={control}
                                name={`slabs.${index}.requiredDeposit`}
                                render={({ field: cField }) => (
                                  <CurrencyInput
                                    value={cField.value || 0}
                                    onChange={(val) => cField.onChange(val)}
                                    className="h-8 text-base md:text-xs"
                                  />
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}

                  {/* Add Next Slab Button */}
                  <div className="pt-2 flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddSlabForActiveSlot}
                      className="text-xs gap-1.5 h-8 select-none transition-transform duration-100 ease-out active:scale-[0.98]"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Tier to {activeTab.replace("_", " ")}
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Section 4: Interactive Test Simulator (PriceCalculatorWidget) */}
        <div className="pt-2">
          <PriceCalculatorWidget
            slabs={currentSlabs}
            unitType={currentUnitType}
            maxGuestCapacity={currentMaxCapacity}
            initialStayType={activeTab}
            modifiers={initialData?.modifiers as any}
          />
        </div>
      </form>

      {/* Discard Unsaved Changes Dialog */}
      <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="gap-2">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="rounded-full bg-amber-500/10 p-2.5 ring-1 ring-amber-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  Discard Unsaved Changes?
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  You have unsaved changes to this dynamic pricing plan
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <p className="text-xs text-muted-foreground py-2">
            Navigating away now will permanently discard any modifications made to headcount slabs and tariffs.
          </p>

          <DialogFooter className="sm:justify-end gap-2 pt-2 border-t -mx-6 -mb-6 p-4 bg-muted/30 rounded-b-xl">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDiscardDialog(false)}
            >
              Continue Editing
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setShowDiscardDialog(false);
                router.push("/admin/pricing");
              }}
            >
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default UnitPricingSlabBuilder;
