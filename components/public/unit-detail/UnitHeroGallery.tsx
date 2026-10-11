"use client";

import * as React from "react";
import Image from "next/image";
import {
  Maximize2,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UnitDetailPhoto } from "./types";

export interface UnitHeroGalleryProps {
  photos: UnitDetailPhoto[];
  unitName: string;
  badge?: string;
  className?: string;
}

/**
 * UnitHeroGallery - Immersive Accommodation Cover & High-Res Lightbox
 * 
 * Enforces:
 * 1. Thumbnail Sizing Law: Horizontal thumbnail strip chips strictly measure
 *    between 36px and 48px square (`size-10 sm:size-11 rounded-lg border overflow-hidden`).
 * 2. High-Res Lightbox: Accessible modal with dark backdrop blur, Prev/Next buttons,
 *    keyboard arrow navigation (← / → / Esc), and photo captions.
 * 3. Emil Kowalski Interaction Standards: Tactile compression (`active:scale-95`),
 *    smooth ease-out transitions (`ease-[var(--ease-snappy)]`), and zero scroll triggers.
 * 4. Next/Image LCP Optimization: Primary cover photo loads with `priority` and responsive sizes.
 */
export function UnitHeroGallery({
  photos,
  unitName,
  badge,
  className,
}: UnitHeroGalleryProps) {
  // Guarantee at least 1 photo
  const safePhotos = React.useMemo(() => {
    if (photos && photos.length > 0) return photos;
    return [
      {
        id: "fallback-photo",
        url: "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/dome_main.webp",
        alt: unitName,
        caption: unitName,
        isFeatured: true,
        orderIndex: 1,
      },
    ];
  }, [photos, unitName]);

  // Find index of featured photo, default to 0
  const initialIndex = React.useMemo(() => {
    const featuredIdx = safePhotos.findIndex((p) => p.isFeatured);
    return featuredIdx >= 0 ? featuredIdx : 0;
  }, [safePhotos]);

  const [activeIndex, setActiveIndex] = React.useState<number>(initialIndex);
  const [isLightboxOpen, setIsLightboxOpen] = React.useState<boolean>(false);

  const activePhoto = safePhotos[activeIndex] || safePhotos[0];

  // Lightbox keyboard navigation (ArrowLeft, ArrowRight, Escape)
  React.useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
      } else if (e.key === "ArrowLeft") {
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : safePhotos.length - 1));
      } else if (e.key === "ArrowRight") {
        setActiveIndex((prev) => (prev < safePhotos.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, safePhotos.length]);

  // Lock body scroll when Lightbox is open
  React.useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLightboxOpen]);

  return (
    <section aria-label={`${unitName} photo gallery`} className={cn("w-full min-w-0 space-y-3", className)}>
      {/* 1. Main Cover Image Container */}
      <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border/80 bg-surface-subtle group shadow-xs">
        <Image
          src={activePhoto.url}
          alt={activePhoto.alt || unitName}
          fill
          priority
          sizes="(min-width: 1280px) 65vw, (min-width: 768px) 60vw, 100vw"
          className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.02]"
        />

        {/* Ambient Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-80 pointer-events-none" />

        {/* Top Floating Badge Bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          {badge ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/95 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full shadow-xs font-mono select-none">
              <Sparkles className="size-3 text-amber-400 shrink-0" />
              <span>{badge}</span>
            </span>
          ) : <span />}

          {/* Photo Counter Pill */}
          <span className="text-xs font-mono tabular-nums text-white/90 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full shadow-xs select-none">
            {activeIndex + 1}&nbsp;/&nbsp;{safePhotos.length}
          </span>
        </div>

        {/* Bottom Information & Lightbox Trigger Pill */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
          {activePhoto.caption && (
            <p className="text-xs text-white/95 font-medium line-clamp-1 max-w-[70%] drop-shadow-sm select-none">
              {activePhoto.caption}
            </p>
          )}

          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            aria-label="View photo in full screen lightbox"
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-black/70 hover:bg-black/85 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-white shadow-sm border border-white/10 transition-transform duration-100 ease-[var(--ease-snappy)] active:scale-95 select-none shrink-0 cursor-pointer"
          >
            <Maximize2 className="size-3.5" />
            <span className="hidden sm:inline">View Gallery</span>
          </button>
        </div>
      </div>

      {/* 2. 36px–48px Thumbnail Strip (Mandatory Sizing Law) */}
      {safePhotos.length > 1 && (
        <div
          role="region"
          aria-label="Photo thumbnails"
          className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar min-w-0"
        >
          {safePhotos.map((photo, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={photo.id || `thumb-${idx}`}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`View photo ${idx + 1}: ${photo.alt || unitName}`}
                aria-current={isSelected ? "true" : undefined}
                className={cn(
                  "relative size-10 sm:size-11 rounded-lg border overflow-hidden shrink-0 cursor-pointer",
                  "transition-all duration-150 ease-[var(--ease-snappy)] active:scale-95 select-none",
                  isSelected
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary shadow-xs"
                    : "border-border/70 opacity-60 hover:opacity-100 hover:border-foreground/30"
                )}
              >
                <Image
                  src={photo.url}
                  alt={photo.alt || `${unitName} thumbnail ${idx + 1}`}
                  fill
                  sizes="48px"
                  className="object-cover object-center"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* 3. High-Resolution Lightbox Zoom Modal */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${unitName} photo viewer`}
          className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 backdrop-blur-md p-4 sm:p-6 duration-200 animate-in fade-in-0"
        >
          {/* Lightbox Header Bar */}
          <div className="flex items-center justify-between gap-4 text-white z-10 w-full max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold tracking-tight text-white/90">
                {unitName}
              </span>
              <span className="text-xs font-mono tabular-nums text-white/60 bg-white/10 px-2.5 py-0.5 rounded-full">
                {activeIndex + 1}&nbsp;/&nbsp;{safePhotos.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              aria-label="Close photo lightbox"
              className="size-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-transform duration-100 active:scale-90 cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Lightbox Main Stage */}
          <div className="relative flex-1 flex items-center justify-center w-full max-w-5xl mx-auto my-4 overflow-hidden">
            <div className="relative w-full h-[65vh] sm:h-[75vh]">
              <Image
                src={activePhoto.url}
                alt={activePhoto.alt || unitName}
                fill
                sizes="(min-width: 1280px) 1200px, 100vw"
                className="object-contain"
                priority
              />
            </div>

            {/* Previous Photo Button */}
            {safePhotos.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setActiveIndex((prev) => (prev > 0 ? prev - 1 : safePhotos.length - 1))
                }
                aria-label="Previous photo"
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 flex items-center justify-center transition-transform duration-100 active:scale-90 cursor-pointer shadow-lg"
              >
                <ChevronLeft className="size-5" />
              </button>
            )}

            {/* Next Photo Button */}
            {safePhotos.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setActiveIndex((prev) => (prev < safePhotos.length - 1 ? prev + 1 : 0))
                }
                aria-label="Next photo"
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 flex items-center justify-center transition-transform duration-100 active:scale-90 cursor-pointer shadow-lg"
              >
                <ChevronRight className="size-5" />
              </button>
            )}
          </div>

          {/* Lightbox Footer Bar with Caption & Miniature Chips */}
          <div className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white/90 z-10 pt-2 border-t border-white/10">
            <p className="text-xs sm:text-sm font-medium text-white/80 line-clamp-1">
              {activePhoto.caption || activePhoto.alt || unitName}
            </p>

            {/* Miniature Jump Chips */}
            {safePhotos.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                {safePhotos.map((photo, idx) => (
                  <button
                    key={`lb-thumb-${photo.id || idx}`}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    aria-label={`Jump to photo ${idx + 1}`}
                    className={cn(
                      "relative size-9 rounded-md border overflow-hidden shrink-0 cursor-pointer transition-transform duration-100 active:scale-95",
                      idx === activeIndex
                        ? "ring-2 ring-primary border-primary"
                        : "border-white/20 opacity-50 hover:opacity-100"
                    )}
                  >
                    <Image
                      src={photo.url}
                      alt=""
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default UnitHeroGallery;
