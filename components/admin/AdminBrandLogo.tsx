"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import parlakLogoBlack from "@/public/images/brand/parlak logo black.png";
import parlakLogoWhite from "@/public/images/brand/parlak-logo-white.png";
import parlakEmblem from "@/public/images/brand/parlak-emblem.png";

export type AdminBrandLogoVariant = "full" | "mark" | "responsive";
export type AdminBrandLogoSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface AdminBrandLogoProps {
  variant?: AdminBrandLogoVariant;
  size?: AdminBrandLogoSize;
  priority?: boolean;
  className?: string;
  markClassName?: string;
  fullClassName?: string;
}

const SIZE_MAP = {
  xs: {
    mark: { width: 24, height: 24, className: "size-6" },
    full: { width: 45, height: 24, className: "h-6 w-auto" },
  },
  sm: {
    mark: { width: 28, height: 28, className: "size-7" },
    full: { width: 56, height: 30, className: "h-7.5 w-auto" },
  },
  md: {
    mark: { width: 36, height: 36, className: "size-9" },
    full: { width: 72, height: 38, className: "h-9.5 w-auto" },
  },
  lg: {
    mark: { width: 44, height: 44, className: "size-11" },
    full: { width: 90, height: 48, className: "h-12 w-auto" },
  },
  xl: {
    mark: { width: 64, height: 64, className: "size-16" },
    full: { width: 150, height: 80, className: "h-16 sm:h-20 w-auto" },
  },
} as const;

/**
 * AdminBrandLogo
 *
 * Official brand identity component for the Parlak Resort Admin Cockpit.
 * Renders the authentic Parlak Resort logo using Next.js Image with:
 * - Full lockup (`parlak logo black.png` for light, `parlak-logo-white.png` for dark)
 * - Square green cottage mark (`parlak-emblem.png`) for compact rails and chips
 * - Responsive switching between mark on tablet rail and full lockup on desktop
 * - Tactile, zero-CLS image dimensions and automatic format optimization (WebP/AVIF)
 */
export function AdminBrandLogo({
  variant = "full",
  size = "md",
  priority = false,
  className,
  markClassName,
  fullClassName,
}: AdminBrandLogoProps) {
  const config = SIZE_MAP[size];

  // Render Mark Only (for compact tablet rails, avatars, headers)
  if (variant === "mark") {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center shrink-0 select-none",
          config.mark.className,
          className
        )}
      >
        <Image
          src={parlakEmblem}
          alt="Parlak Resort"
          width={config.mark.width}
          height={config.mark.height}
          priority={priority}
          className={cn("object-contain", markClassName)}
        />
      </div>
    );
  }

  // Render Full Lockup (light & dark mode aware)
  if (variant === "full") {
    return (
      <div
        className={cn(
          "relative flex items-center shrink-0 select-none",
          config.full.className,
          className
        )}
      >
        {/* Light Mode Lockup */}
        <Image
          src={parlakLogoBlack}
          alt="Parlak Resort"
          width={config.full.width}
          height={config.full.height}
          priority={priority}
          className={cn(
            "object-contain dark:hidden",
            config.full.className,
            fullClassName
          )}
        />
        {/* Dark Mode Lockup */}
        <Image
          src={parlakLogoWhite}
          alt="Parlak Resort"
          width={config.full.width}
          height={config.full.height}
          priority={priority}
          className={cn(
            "hidden object-contain dark:block",
            config.full.className,
            fullClassName
          )}
        />
      </div>
    );
  }

  // Responsive Mode:
  // - Tablet rail (md:w-[68px]): Shows the green cottage mark chip
  // - Desktop (lg:w-[260px]) & Mobile drawer: Shows the full logo lockup
  return (
    <div className={cn("relative flex items-center shrink-0 select-none", className)}>
      {/* Tablet Rail Mode (68px sidebar): Compact Mark */}
      <div
        className={cn(
          "hidden md:flex lg:hidden items-center justify-center",
          config.mark.className,
          markClassName
        )}
      >
        <Image
          src={parlakEmblem}
          alt="Parlak Resort"
          width={config.mark.width}
          height={config.mark.height}
          priority={priority}
          className="object-contain"
        />
      </div>

      {/* Desktop (lg) & Mobile Sheet Mode: Full Lockup */}
      <div
        className={cn(
          "flex md:hidden lg:flex items-center",
          config.full.className,
          fullClassName
        )}
      >
        <Image
          src={parlakLogoBlack}
          alt="Parlak Resort"
          width={config.full.width}
          height={config.full.height}
          priority={priority}
          className="object-contain dark:hidden"
        />
        <Image
          src={parlakLogoWhite}
          alt="Parlak Resort"
          width={config.full.width}
          height={config.full.height}
          priority={priority}
          className="hidden object-contain dark:block"
        />
      </div>
    </div>
  );
}

export default AdminBrandLogo;
