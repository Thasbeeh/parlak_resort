"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { CategoryTab, CategoryTabKey } from "./types";

export interface CategoryFilterTabsProps {
  tabs: CategoryTab[];
  selectedCategory: CategoryTabKey;
  onSelectCategory?: (key: CategoryTabKey) => void;
  className?: string;
}

/**
 * CategoryFilterTabs - Segmented Architectural Tab Ribbon
 * 
 * Enforces:
 * 1. 0ms Client Response: Immediate state dispatch + shallow URL sync via router.replace(..., { scroll: false }).
 * 2. Tabular Counts: font-mono tabular-nums with non-breaking spaces.
 * 3. Emil Kowalski Tactile Physics: active:scale-[0.98] with snappy bezier deceleration.
 * 4. Mobile Ergonomics: [-webkit-overflow-scrolling:touch] and overscroll-x-contain.
 */
export function CategoryFilterTabs({
  tabs,
  selectedCategory,
  onSelectCategory,
  className,
}: CategoryFilterTabsProps) {
  const router = useRouter();

  const handleTabClick = (key: CategoryTabKey) => {
    // 1. Instant client update (0ms response)
    if (onSelectCategory) {
      onSelectCategory(key);
    } else {
      // Standalone fallback: shallow URL replacement
      const nextUrl = key === "ALL" ? "/stays" : `/stays?category=${key}`;
      router.replace(nextUrl, { scroll: false });
    }
  };

  return (
    <nav
      aria-label="Filter accommodation and event venues"
      className={cn(
        "w-full overflow-x-auto scrollbar-none py-1 min-w-0 [-webkit-overflow-scrolling:touch] overscroll-x-contain",
        className
      )}
    >
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="inline-flex items-center gap-1.5 p-1.5 bg-surface-subtle/80 backdrop-blur-xs rounded-full border border-border/60 max-w-full"
      >
        {tabs.map((tab) => {
          const isSelected = selectedCategory === tab.key;

          return (
            <button
              key={tab.key}
              role="tab"
              id={`category-tab-${tab.key.toLowerCase()}`}
              aria-selected={isSelected}
              aria-controls="stays-catalog-grid"
              type="button"
              onClick={() => handleTabClick(tab.key)}
              className={cn(
                "inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-[background-color,color,transform] duration-150 ease-[var(--ease-snappy)] active:scale-[0.98] select-none shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/80"
              )}
            >
              <span className="whitespace-nowrap">{tab.label}</span>
              <span
                className={cn(
                  "font-mono tabular-nums text-[11px] px-2 py-0.5 rounded-full shrink-0 transition-colors",
                  isSelected
                    ? "bg-primary-foreground/20 text-primary-foreground font-semibold"
                    : "bg-muted text-muted-foreground font-normal"
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default CategoryFilterTabs;
