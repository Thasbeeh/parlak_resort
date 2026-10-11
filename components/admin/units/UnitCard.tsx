"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { UnitStatusSwitch } from "./UnitStatusSwitch";
import {
  Users,
  Baby,
  Edit,
  Wrench,
  Sparkles,
  Tent,
  Home,
  Building2,
  HardHat,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface UnitCardData {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
  maxCapacity: number;
  maxInfants: number;
  amenities: string;
  updatedAt?: Date | string;
  priceList?: {
    id: string;
    name: string;
    maxGuestCapacity: number;
  } | null;
  photos?: Array<{
    id: string;
    url: string;
    caption?: string | null;
    isFeatured: boolean;
    orderIndex: number;
  }>;
}

export interface UnitCardProps {
  unit: UnitCardData;
  onOpenMaintenance: (unitId: string) => void;
  onStatusChange?: (unitId: string, newStatus: boolean) => void;
}

export function UnitCard({
  unit,
  onOpenMaintenance,
  onStatusChange,
}: UnitCardProps) {
  // Find featured photo or fallback to first photo
  const featuredPhoto =
    unit.photos?.find((p) => p.isFeatured) || unit.photos?.[0];

  // Format category badge and icon
  const getCategoryInfo = () => {
    switch (unit.category) {
      case "DOME":
        return {
          label: "Geodesic Dome",
          icon: Tent,
          color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
        };
      case "A_FRAME":
        return {
          label: "A-Frame Cottage",
          icon: Home,
          color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
        };
      case "NON_AC_HALL":
        return {
          label: "Non-AC Event Hall",
          icon: Building2,
          color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
        };
      case "AC_HALL":
        return {
          label: "AC Event Hall",
          icon: Building2,
          color: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
        };
      default:
        return {
          label: unit.category,
          icon: Building2,
          color: "bg-muted text-muted-foreground",
        };
    }
  };

  const catInfo = getCategoryInfo();
  const CategoryIcon = catInfo.icon;

  // Split amenities
  const amenityList = unit.amenities
    ? unit.amenities
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)
    : [];

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-xs transition-[border-color,box-shadow,transform] duration-200 ease-[var(--ease-snappy)] hover:shadow-md hover:border-primary/30",
        !unit.isActive && "opacity-90 bg-card/60"
      )}
    >
      {/* Thumbnail Cover Area */}
      <div className="relative aspect-16/9 w-full overflow-hidden bg-muted">
        {featuredPhoto?.url ? (
          <img
            src={featuredPhoto.url}
            alt={featuredPhoto.caption || unit.name}
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-muted to-muted/80 text-muted-foreground">
            <CategoryIcon className="h-10 w-10 stroke-[1.2] opacity-40" />
            <span className="text-[11px] font-medium tracking-wide uppercase opacity-60">
              No Cover Photo
            </span>
          </div>
        )}

        {/* Top Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
          <Badge
            variant="outline"
            className={cn(
              "backdrop-blur-md px-2.5 py-0.5 text-[11px] font-medium border shadow-xs pointer-events-auto",
              catInfo.color
            )}
          >
            <CategoryIcon className="h-3 w-3 mr-1 shrink-0" />
            {catInfo.label}
          </Badge>

          {featuredPhoto?.isFeatured ? (
            <Badge
              variant="outline"
              className="bg-background/90 text-foreground text-[10px] border-border shadow-xs backdrop-blur-md pointer-events-auto flex items-center gap-1"
            >
              <Sparkles className="h-3 w-3 text-amber-500" />
              Cover Photo
            </Badge>
          ) : null}
        </div>

        {/* Photo count indicator */}
        {unit.photos && unit.photos.length > 0 && (
          <div className="absolute bottom-2.5 right-2.5 rounded-md bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono text-white flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            <span>{unit.photos.length}</span>
          </div>
        )}
      </div>

      {/* Card Content Area */}
      <div className="flex flex-1 flex-col p-4 sm:p-5 gap-3.5">
        {/* Title and Switch row */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-heading text-lg font-semibold tracking-tight text-foreground">
              {unit.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Attached Rate Plan:{" "}
              <span className="font-medium text-foreground">
                {unit.priceList?.name || "None assigned"}
              </span>
            </p>
          </div>

          <div className="shrink-0 pt-0.5">
            <UnitStatusSwitch
              unitId={unit.id}
              unitName={unit.name}
              initialActive={unit.isActive}
              expectedUpdatedAt={unit.updatedAt}
              onStatusChange={(newStatus) => onStatusChange?.(unit.id, newStatus)}
            />
          </div>
        </div>

        {/* Capacity and Specs Strip */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="inline-flex items-center gap-1.5 rounded-lg border bg-surface-subtle px-2.5 py-1 text-muted-foreground">
            <Users className="h-3.5 w-3.5 text-foreground shrink-0" />
            <span>
              {unit.category === "NON_AC_HALL" || unit.category === "AC_HALL" ? (
                <>
                  Max{" "}
                  <strong className="font-mono text-foreground font-semibold">
                    {unit.maxCapacity.toLocaleString()}
                  </strong>{" "}
                  Pax
                </>
              ) : (
                <>
                  Max{" "}
                  <strong className="font-mono text-foreground font-semibold">
                    {unit.maxCapacity}
                  </strong>{" "}
                  Adults
                </>
              )}
            </span>
          </div>

          {unit.maxInfants > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-lg border bg-surface-subtle px-2.5 py-1 text-muted-foreground">
              <Baby className="h-3.5 w-3.5 text-foreground shrink-0" />
              <span>
                Max{" "}
                <strong className="font-mono text-foreground font-semibold">
                  {unit.maxInfants}
                </strong>{" "}
                Infants
              </span>
            </div>
          )}
        </div>

        {/* Amenities Preview */}
        {amenityList.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {amenityList.slice(0, 3).map((amenity, idx) => (
              <span
                key={idx}
                className="rounded-md bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {amenity}
              </span>
            ))}
            {amenityList.length > 3 && (
              <span className="rounded-md bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
                +{amenityList.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-auto pt-3 border-t flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenMaintenance(unit.id)}
            className="text-xs h-8 px-2.5 text-muted-foreground hover:text-foreground"
            title="Block dates for maintenance or buyout"
          >
            <Wrench className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
            Maintenance
          </Button>

          <Link
            href={`/admin/units/${unit.id}`}
            className={buttonVariants({
              variant: "default",
              size: "sm",
              className: "text-xs h-8 px-3 font-medium",
            })}
          >
            <Edit className="h-3.5 w-3.5 mr-1.5" />
            Manage Unit
          </Link>
        </div>
      </div>
    </div>
  );
}
