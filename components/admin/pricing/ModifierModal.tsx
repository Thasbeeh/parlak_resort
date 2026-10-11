"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createModifier, updateModifier } from "@/actions/modifiers";
import { PriceModifierType } from "@/schemas/price.schema";
import { getISTDateString } from "@/lib/pricing/resolve-modifiers";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  Percent,
  AlertTriangle,
  Loader2,
  Lock,
  Tag,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TargetPriceListOption {
  id: string;
  name: string;
  unitType: string;
}

export interface ModifierItemData {
  id: string;
  priceListId: string;
  name: string;
  type: string;
  percentage: number;
  startDate: Date | string;
  endDate: Date | string;
  isActive: boolean;
  updatedAt: Date | string;
  priceList?: {
    id: string;
    name: string;
    unitType: string;
  };
}

export interface ModifierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modifierToEdit?: ModifierItemData | null;
  priceListOptions: TargetPriceListOption[];
  onSuccess?: () => void;
}

export function ModifierModal({
  open,
  onOpenChange,
  modifierToEdit,
  priceListOptions,
  onSuccess,
}: ModifierModalProps) {
  const router = useRouter();
  const isEditing = Boolean(modifierToEdit);

  const todayIST = React.useMemo(() => getISTDateString(new Date()), []);

  const [priceListId, setPriceListId] = React.useState<string>(
    modifierToEdit?.priceListId || priceListOptions[0]?.id || ""
  );
  const [name, setName] = React.useState<string>(modifierToEdit?.name || "");
  const [type, setType] = React.useState<PriceModifierType>(
    (modifierToEdit?.type as PriceModifierType) || "WEEKEND"
  );
  const [percentage, setPercentage] = React.useState<number>(
    modifierToEdit?.percentage ?? 15
  );
  const [startDateStr, setStartDateStr] = React.useState<string>(
    modifierToEdit ? getISTDateString(modifierToEdit.startDate) : todayIST
  );
  const [endDateStr, setEndDateStr] = React.useState<string>(
    modifierToEdit ? getISTDateString(modifierToEdit.endDate) : todayIST
  );
  const [isActive, setIsActive] = React.useState<boolean>(
    modifierToEdit?.isActive ?? true
  );

  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  // Sync state whenever modifierToEdit changes
  React.useEffect(() => {
    if (modifierToEdit) {
      setPriceListId(modifierToEdit.priceListId);
      setName(modifierToEdit.name);
      setType((modifierToEdit.type as PriceModifierType) || "WEEKEND");
      setPercentage(modifierToEdit.percentage);
      setStartDateStr(getISTDateString(modifierToEdit.startDate));
      setEndDateStr(getISTDateString(modifierToEdit.endDate));
      setIsActive(modifierToEdit.isActive);
    } else {
      setPriceListId(priceListOptions[0]?.id || "");
      setName("");
      setType("WEEKEND");
      setPercentage(15);
      setStartDateStr(todayIST);
      setEndDateStr(todayIST);
      setIsActive(true);
    }
  }, [modifierToEdit, priceListOptions, todayIST, open]);

  // Immutability checks for active vs expired promotions
  const isStarted = isEditing && startDateStr <= todayIST;
  const isExpired = isEditing && endDateStr < todayIST;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!priceListId) {
      toast.error("Please select a target price list.");
      return;
    }

    if (!name.trim()) {
      toast.error("Please enter a descriptive rule name.");
      return;
    }

    if (percentage < -80 || percentage > 200) {
      toast.error("Percentage variance must be between -80% and +200%.");
      return;
    }

    if (endDateStr < startDateStr) {
      toast.error("End date must be on or after start date.");
      return;
    }

    if (!isEditing && startDateStr < todayIST) {
      toast.error("Cannot create a price modifier with a start date in the past.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Build ISO date strings aligned with IST boundaries
      const startDateTime = new Date(`${startDateStr}T00:00:00+05:30`);
      const endDateTime = new Date(`${endDateStr}T23:59:59.999+05:30`);

      if (isEditing && modifierToEdit) {
        const res = await updateModifier({
          id: modifierToEdit.id,
          name: name.trim(),
          type,
          percentage: Number(percentage),
          startDate: startDateTime,
          endDate: endDateTime,
          isActive,
          expectedUpdatedAt: new Date(modifierToEdit.updatedAt),
        });

        if (!res.success) {
          toast.error(res.error || "Failed to update modifier.");
        } else {
          toast.success("Price modifier saved successfully.");
          onOpenChange(false);
          onSuccess?.();
          router.refresh();
        }
      } else {
        const res = await createModifier({
          priceListId,
          name: name.trim(),
          type,
          percentage: Number(percentage),
          startDate: startDateTime,
          endDate: endDateTime,
          isActive,
        });

        if (!res.success) {
          toast.error(res.error || "Failed to create modifier.");
        } else {
          toast.success(
            "Price modifier saved. Dynamic pricing updated across booking engine."
          );
          onOpenChange(false);
          onSuccess?.();
          router.refresh();
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isSubmitting && onOpenChange(val)}>
      <DialogContent className="sm:max-w-lg p-6">
        <DialogHeader className="gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                {isEditing ? "Edit price modifier" : "Create price modifier"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure dynamic percentage surges or promotional discounts (IST)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isExpired ? (
          <div className="py-4 space-y-3">
            <div className="p-3 rounded-lg border border-muted bg-muted/30 text-xs space-y-1.5 flex items-start gap-2.5 text-muted-foreground">
              <Lock className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <strong className="text-foreground">Expired Rule Locked:</strong> This modifier ended on{" "}
                <span className="font-mono">{endDateStr}</span> (IST) and is permanently archived for historical audit integrity. It cannot be edited or unexpired.
              </div>
            </div>

            <DialogFooter className="sm:justify-end pt-2 border-t -mx-6 -mb-6 p-4 bg-muted/30 rounded-b-xl">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Target Price List */}
            <div className="space-y-1">
              <Label htmlFor="mod-target-plan" className="text-xs font-semibold">
                Target Rate Plan <span className="text-destructive">*</span>
              </Label>
              <select
                id="mod-target-plan"
                value={priceListId}
                disabled={isEditing}
                onChange={(e) => setPriceListId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-base md:text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none [-webkit-appearance:none]"
              >
                {priceListOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name} ({opt.unitType})
                  </option>
                ))}
              </select>
            </div>

            {/* Rule Name */}
            <div className="space-y-1">
              <Label htmlFor="mod-name" className="text-xs font-semibold">
                Rule Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="mod-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Weekend standard (+15%) or Peak summer 2026…"
                className="text-base md:text-xs"
                required
              />
            </div>

            {/* Modifier Type: Strictly WEEKEND or SEASONAL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Rule Type <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={type === "WEEKEND" ? "default" : "outline"}
                  size="sm"
                  disabled={isStarted}
                  onClick={() => setType("WEEKEND")}
                  className="h-8 text-xs font-medium justify-center select-none transition-transform duration-100 ease-out active:scale-[0.98]"
                >
                  Weekend Rate
                </Button>
                <Button
                  type="button"
                  variant={type === "SEASONAL" ? "default" : "outline"}
                  size="sm"
                  disabled={isStarted}
                  onClick={() => setType("SEASONAL")}
                  className="h-8 text-xs font-medium justify-center select-none transition-transform duration-100 ease-out active:scale-[0.98]"
                >
                  Seasonal Promotion
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {type === "WEEKEND"
                  ? "Applies to Friday & Saturday nights (Overnight) or Saturday & Sunday (Day/Hall). Weekend strictly overrides Seasonal on weekends."
                  : "Applies across the full date range. Holiday rules are configured as Seasonal date ranges per domain rules."}
              </p>
            </div>

            {/* Percentage Adjustment */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="mod-pct" className="text-xs font-semibold">
                  Rate Variance (%) <span className="text-destructive">*</span>
                </Label>
                <span className="font-mono text-xs font-bold text-primary">
                  {percentage > 0 ? `+${percentage}% Surge` : percentage < 0 ? `${percentage}% Discount` : "0% (Base)"}
                </span>
              </div>
              <div className="relative">
                <Input
                  id="mod-pct"
                  type="number"
                  min={-80}
                  max={200}
                  step={1}
                  value={percentage}
                  onChange={(e) => setPercentage(parseFloat(e.target.value) || 0)}
                  className="text-base md:text-xs font-mono tabular-nums pr-8 font-semibold"
                  required
                />
                <span className="absolute right-3 top-2 text-xs text-muted-foreground select-none">
                  %
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Bounds: -80% (max discount) to +200% (max surge)
              </p>
            </div>

            {/* Date Range (IST) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="mod-start" className="text-xs font-semibold flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" /> Start Date (IST)
                </Label>
                <Input
                  id="mod-start"
                  type="date"
                  value={startDateStr}
                  min={isEditing ? undefined : todayIST}
                  disabled={isStarted}
                  onChange={(e) => setStartDateStr(e.target.value)}
                  className="text-base md:text-xs font-mono"
                  required
                />
                {isStarted && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                    Past start date immutable
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="mod-end" className="text-xs font-semibold flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" /> End Date (IST)
                </Label>
                <Input
                  id="mod-end"
                  type="date"
                  value={endDateStr}
                  min={startDateStr}
                  onChange={(e) => setEndDateStr(e.target.value)}
                  className="text-base md:text-xs font-mono"
                  required
                />
              </div>
            </div>

            {/* Active Status Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
              <div className="space-y-0.5">
                <Label htmlFor="mod-active-toggle" className="text-xs font-medium cursor-pointer">
                  Rule Active Status
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Inactive rules remain in catalog but do not modify booking calculations
                </p>
              </div>
              <Switch
                id="mod-active-toggle"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            <DialogFooter className="sm:justify-end gap-2 pt-2 border-t -mx-6 -mb-6 p-4 bg-muted/30 rounded-b-xl">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => onOpenChange(false)}
                className="select-none transition-transform duration-100 ease-out active:scale-[0.98]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                loading={isSubmitting}
                disabled={isSubmitting}
                className="select-none transition-transform duration-100 ease-out active:scale-[0.98]"
              >
                {isEditing ? "Update modifier" : "Create modifier"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ModifierModal;
