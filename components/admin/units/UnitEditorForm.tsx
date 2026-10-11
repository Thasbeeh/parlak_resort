"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateUnit } from "@/actions/units";
import { toast } from "@/components/ui/toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ImageUploadArea } from "./ImageUploadArea";
import { SortableGallery, GalleryPhoto } from "./SortableGallery";
import {
  PreDeactivationGuardDialog,
  ConflictingBooking,
} from "./PreDeactivationGuardDialog";
import {
  ChevronLeft,
  Save,
  Loader2,
  ShieldAlert,
  Tent,
  Home,
  Building2,
  HardHat,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { UNIT_CAPACITY_LIMITS } from "@/schemas/unit.schema";
import { cn } from "@/lib/utils";

export interface CompatiblePriceList {
  id: string;
  name: string;
  slug: string;
  unitType: string;
  maxGuestCapacity: number;
}

export interface UnitDetailData {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
  maxCapacity: number;
  maxInfants: number;
  amenities: string;
  priceListId: string;
  updatedAt: Date | string;
  priceList: CompatiblePriceList;
  photos: GalleryPhoto[];
}

export interface UnitEditorFormProps {
  unit: UnitDetailData;
  compatiblePriceLists: CompatiblePriceList[];
}

export function UnitEditorForm({
  unit: initialUnit,
  compatiblePriceLists,
}: UnitEditorFormProps) {
  const router = useRouter();
  const [unit, setUnit] = React.useState<UnitDetailData>(initialUnit);

  // Form Fields
  const [name, setName] = React.useState(initialUnit.name);
  const [maxCapacity, setMaxCapacity] = React.useState(initialUnit.maxCapacity);
  const [maxInfants, setMaxInfants] = React.useState(initialUnit.maxInfants);
  const [amenities, setAmenities] = React.useState(initialUnit.amenities);
  const [priceListId, setPriceListId] = React.useState(initialUnit.priceListId);
  const [isActive, setIsActive] = React.useState(initialUnit.isActive);

  const [isSaving, setIsSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"basic" | "media">("basic");
  const [guardDialogOpen, setGuardDialogOpen] = React.useState(false);
  const [conflictingBookings, setConflictingBookings] = React.useState<
    ConflictingBooking[]
  >([]);

  // Keep internal unit synced while preserving draft form edits
  const lastUnitIdRef = React.useRef(initialUnit.id);
  React.useEffect(() => {
    if (lastUnitIdRef.current !== initialUnit.id) {
      lastUnitIdRef.current = initialUnit.id;
      setName(initialUnit.name);
      setMaxCapacity(initialUnit.maxCapacity);
      setMaxInfants(initialUnit.maxInfants);
      setAmenities(initialUnit.amenities);
      setPriceListId(initialUnit.priceListId);
      setIsActive(initialUnit.isActive);
    }
    setUnit(initialUnit);
  }, [initialUnit]);

  // Selected price list
  const selectedPriceList = compatiblePriceLists.find((p) => p.id === priceListId);

  // Domain Capacity Safeguard Check:
  // PriceList.maxGuestCapacity <= Unit.physicalCapacity
  const isCapacitySafeguardViolated =
    selectedPriceList && selectedPriceList.maxGuestCapacity > maxCapacity;

  // Domain Hard Physical Cap Checks
  const getCapacityError = (): string | null => {
    if (unit.category === "DOME") {
      if (maxCapacity > UNIT_CAPACITY_LIMITS.DOME.maxAdults) {
        return `Domes have a hard physical cap of ${UNIT_CAPACITY_LIMITS.DOME.maxAdults} adults. Strictly no extra beds permitted.`;
      }
      if (maxInfants > UNIT_CAPACITY_LIMITS.DOME.maxInfants) {
        return `Domes support a maximum of ${UNIT_CAPACITY_LIMITS.DOME.maxInfants} infants.`;
      }
    } else if (unit.category === "A_FRAME") {
      if (maxCapacity > UNIT_CAPACITY_LIMITS.A_FRAME.maxAdults) {
        return `A-Frames have a hard physical cap of ${UNIT_CAPACITY_LIMITS.A_FRAME.maxAdults} adults. Strictly no extra beds permitted.`;
      }
      if (maxInfants > UNIT_CAPACITY_LIMITS.A_FRAME.maxInfants) {
        return `A-Frames support a maximum of ${UNIT_CAPACITY_LIMITS.A_FRAME.maxInfants} infants.`;
      }
    } else if (unit.category === "NON_AC_HALL") {
      if (maxCapacity > UNIT_CAPACITY_LIMITS.NON_AC_HALL.maxCapacity) {
        return `Non-AC Event Hall capacity cannot exceed ${UNIT_CAPACITY_LIMITS.NON_AC_HALL.maxCapacity} pax.`;
      }
    } else if (unit.category === "AC_HALL") {
      if (maxCapacity > UNIT_CAPACITY_LIMITS.AC_HALL.maxCapacity) {
        return `AC Event Hall capacity cannot exceed ${UNIT_CAPACITY_LIMITS.AC_HALL.maxCapacity} pax.`;
      }
    }
    return null;
  };

  const capacityError = getCapacityError();

  const isFormDirty =
    name !== unit.name ||
    maxCapacity !== unit.maxCapacity ||
    maxInfants !== unit.maxInfants ||
    amenities !== unit.amenities ||
    priceListId !== unit.priceListId ||
    isActive !== unit.isActive;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (capacityError) {
      toast.error(capacityError);
      return;
    }

    if (isCapacitySafeguardViolated) {
      toast.error(
        `Capacity mismatch: Selected price list requires up to ${selectedPriceList?.maxGuestCapacity} guests, exceeding the unit's physical limit of ${maxCapacity}.`
      );
      return;
    }

    setIsSaving(true);

    try {
      const res = await updateUnit({
        id: unit.id,
        name: name.trim(),
        category: unit.category as any,
        isActive,
        maxCapacity,
        maxInfants,
        amenities: amenities.trim(),
        priceListId,
        expectedUpdatedAt: new Date(unit.updatedAt),
      });

      if (!res.success) {
        if (res.code === "STALE_RECORD" || res.status === 409) {
          toast.error(
            "Conflict: This unit was modified by another Admin. Please refresh to view the latest details."
          );
        } else if (res.code === "UNIT_HAS_FUTURE_BOOKINGS") {
          const details = (res.data as any)?.bookings || [];
          setConflictingBookings(details);
          setGuardDialogOpen(true);
        } else {
          toast.error(res.error || "Failed to update unit configuration");
        }
      } else {
        toast.success("Unit configuration saved successfully.");
        router.refresh();
      }
    } catch (err: any) {
      if (err?.code === "UNIT_HAS_FUTURE_BOOKINGS") {
        setConflictingBookings(err?.details?.bookings || []);
        setGuardDialogOpen(true);
      } else {
        toast.error(err?.message || "Internal error saving unit");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryIcon = () => {
    switch (unit.category) {
      case "DOME":
        return Tent;
      case "A_FRAME":
        return Home;
      default:
        return Building2;
    }
  };

  const CategoryIcon = getCategoryIcon();

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link
              href="/admin/units"
              className="hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Units & Inventory
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{unit.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {unit.name}
            </h1>
            <Badge variant="outline" className="text-xs">
              <CategoryIcon className="h-3.5 w-3.5 mr-1" />
              {unit.category.replace("_", " ")}
            </Badge>
          </div>
        </div>

        {/* Top Save Button */}
        <div className="flex items-center gap-2">
          <Link
            href="/admin/units"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "text-xs",
            })}
          >
            Cancel & Back
          </Link>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleSubmit}
            loading={isSaving}
            disabled={
              isSaving ||
              !isFormDirty ||
              !!capacityError ||
              isCapacitySafeguardViolated
            }
            className="text-xs font-medium active:scale-[0.98] transition-transform select-none"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Save changes
          </Button>
        </div>
      </div>

      {/* Tabs: Basic Information vs Media Gallery */}
      <div className="inline-flex rounded-lg border bg-surface-subtle p-1">
        <button
          type="button"
          onClick={() => setActiveTab("basic")}
          className={cn(
            "rounded-md px-4 py-2 text-xs font-medium transition-all duration-100 ease-[var(--ease-snappy)] active:scale-[0.98]",
            activeTab === "basic"
              ? "bg-background text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Basic Information & Tariff
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("media")}
          className={cn(
            "rounded-md px-4 py-2 text-xs font-medium transition-all duration-100 ease-[var(--ease-snappy)] active:scale-[0.98] flex items-center gap-1.5",
            activeTab === "media"
              ? "bg-background text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Media & Photo Gallery
          <span className="font-mono text-[10px] bg-muted px-1.5 py-0.2 rounded-full">
            {unit.photos.length}
          </span>
        </button>
      </div>

      {/* TAB 1: BASIC INFORMATION */}
      {activeTab === "basic" && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-6">
            <div className="border-b pb-4">
              <h2 className="font-heading text-base font-semibold text-foreground">
                General Configuration
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Update unit identification, active public status, and physical boundaries
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Unit Name */}
              <div className="space-y-1.5">
                <Label htmlFor="unit-name" className="text-xs font-semibold">
                  Unit Name
                </Label>
                <Input
                  id="unit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dome 1, A-Frame 2"
                  required
                  className="text-sm"
                />
              </div>

              {/* Category (Disabled / Read-only) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Category (Fixed Inventory Type)
                </Label>
                <Input
                  value={unit.category.replace("_", " ")}
                  disabled
                  className="text-sm bg-muted/50 cursor-not-allowed font-medium"
                />
              </div>

              {/* Active / Inactive Status Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/10 md:col-span-2">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-foreground">
                    Public Booking Availability
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Active units are displayed for reservations; inactive units render as &quot;Sold Out&quot;.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={isActive}
                    onCheckedChange={(checked) => setIsActive(checked)}
                  />
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      isActive
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-muted-foreground"
                    )}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>

            {/* Physical Capacities */}
            <div className="border-t pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Physical Capacity Guardrails
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Hard limits enforced by the resort domain. Extra beds are strictly prohibited.
                  </p>
                </div>
              </div>

              {capacityError && (
                <Alert variant="destructive" className="py-2.5">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {capacityError}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="max-capacity" className="text-xs font-semibold">
                    {unit.category === "NON_AC_HALL" || unit.category === "AC_HALL"
                      ? "Max Capacity (Pax)"
                      : "Max Adult Capacity"}
                  </Label>
                  <Input
                    id="max-capacity"
                    type="number"
                    min={1}
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(parseInt(e.target.value) || 1)}
                    className="text-sm font-mono"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {unit.category === "DOME" && "Hard cap: Max 3 adults."}
                    {unit.category === "A_FRAME" && "Hard cap: Max 5 adults."}
                    {unit.category === "NON_AC_HALL" && "Max: 1,200 pax."}
                    {unit.category === "AC_HALL" && "Max: 2,000 pax."}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="max-infants" className="text-xs font-semibold">
                    Max Infants (&lt; 3 years)
                  </Label>
                  <Input
                    id="max-infants"
                    type="number"
                    min={0}
                    disabled={
                      unit.category === "NON_AC_HALL" || unit.category === "AC_HALL"
                    }
                    value={maxInfants}
                    onChange={(e) => setMaxInfants(parseInt(e.target.value) || 0)}
                    className="text-sm font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {unit.category === "DOME" && "Sharing existing bed; max 2 infants."}
                    {unit.category === "A_FRAME" && "Sharing existing bed; max 4 infants."}
                    {(unit.category === "NON_AC_HALL" || unit.category === "AC_HALL") &&
                      "Event Halls do not track infant capacities."}
                  </p>
                </div>
              </div>
            </div>

            {/* Amenities Section */}
            <div className="border-t pt-5 space-y-2">
              <Label htmlFor="unit-amenities" className="text-xs font-semibold">
                Amenities & Features (Comma-separated)
              </Label>
              <Textarea
                id="unit-amenities"
                value={amenities}
                onChange={(e) => setAmenities(e.target.value)}
                placeholder="Attached Bath, AC, Wi-Fi, Smart TV, Pool access, BBQ grill"
                rows={3}
                className="text-sm resize-none"
              />
              <p className="text-[11px] text-muted-foreground">
                Enter amenities separated by commas. These will appear as feature chips on cards and guest itineraries.
              </p>
            </div>
          </div>

          {/* Rate Plan & Price List Association */}
          <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-5">
            <div className="border-b pb-4">
              <h2 className="font-heading text-base font-semibold text-foreground">
                Tariff & Price List Association
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Every unit must be attached to a category-matched Price List
              </p>
            </div>

            {/* Capacity Safeguard Banner */}
            {isCapacitySafeguardViolated && (
              <Alert variant="destructive" className="border-destructive/30 bg-destructive/10 text-destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle className="text-xs font-bold uppercase tracking-wider">
                  Capacity Safeguard Violation
                </AlertTitle>
                <AlertDescription className="text-xs leading-relaxed mt-1">
                  Selected Price List maximum guest capacity (
                  <strong>{selectedPriceList.maxGuestCapacity} Pax</strong>) exceeds
                  this unit&apos;s physical limit (<strong>{maxCapacity} Pax</strong>).
                  Per domain rules, a unit cannot be linked to a rate plan designed for more guests than it physically accommodates.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="unit-pricelist" className="text-xs font-semibold">
                Assigned Price List (Strictly Category-Filtered)
              </Label>
              <select
                id="unit-pricelist"
                value={priceListId}
                onChange={(e) => setPriceListId(e.target.value)}
                className={cn(
                  "h-10 w-full rounded-md border bg-background px-3 py-2 text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none [-webkit-appearance:none]",
                  isCapacitySafeguardViolated
                    ? "border-destructive text-destructive ring-1 ring-destructive"
                    : "border-input"
                )}
              >
                {compatiblePriceLists.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.name} (Max {pl.maxGuestCapacity.toLocaleString()} Pax)
                  </option>
                ))}
              </select>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span>
                  Showing {compatiblePriceLists.length} rate plans compatible with{" "}
                  <strong>{unit.category.replace("_", " ")}</strong>
                </span>
                {selectedPriceList && (
                  <span className="font-mono">
                    Plan Ceiling: {selectedPriceList.maxGuestCapacity.toLocaleString()} Pax
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions Bottom */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/admin/units"
              className={buttonVariants({
                variant: "outline",
              })}
            >
              Cancel
            </Link>
            <Button
              type="submit"
              variant="default"
              loading={isSaving}
              disabled={
                isSaving ||
                !isFormDirty ||
                !!capacityError ||
                isCapacitySafeguardViolated
              }
              className="text-xs font-medium active:scale-[0.98] transition-transform select-none"
            >
              Save configuration
            </Button>
          </div>
        </form>
      )}

      {/* TAB 2: MEDIA GALLERY */}
      {activeTab === "media" && (
        <div className="space-y-6">
          {/* Upload Dropzone */}
          <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
            <div>
              <h2 className="font-heading text-base font-semibold text-foreground">
                Upload New Photos
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Maximum 3MB per photo file.
              </p>
            </div>

            <ImageUploadArea
              unitId={unit.id}
              onUploadSuccess={() => router.refresh()}
            />
          </div>

          {/* Sortable Gallery Grid */}
          <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
            <div className="border-b pb-4 flex items-center justify-between">
              <div>
                <h2 className="font-heading text-base font-semibold text-foreground">
                  Photo Gallery & Sequence
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Drag tiles to reorder. Exactly one photo is maintained as the Featured Cover.
                </p>
              </div>

              {unit.photos.length > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  Cover: {unit.photos.find((p) => p.isFeatured)?.caption || "Photo #1"}
                </Badge>
              )}
            </div>

            <SortableGallery
              unitId={unit.id}
              photos={unit.photos}
              onPhotosChange={() => router.refresh()}
            />
          </div>
        </div>
      )}

      {/* Pre-Deactivation Guard Dialog */}
      <PreDeactivationGuardDialog
        open={guardDialogOpen}
        onOpenChange={setGuardDialogOpen}
        unitName={unit.name}
        conflictingBookings={conflictingBookings}
      />
    </div>
  );
}
