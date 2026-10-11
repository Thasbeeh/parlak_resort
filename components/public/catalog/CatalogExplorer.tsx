"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CategoryFilterTabs } from "./CategoryFilterTabs";
import { UnitCardsGrid } from "./UnitCardsGrid";
import type { CatalogUnitItem, CategoryTab, CategoryTabKey } from "./types";

export interface CatalogExplorerProps {
  initialUnits: CatalogUnitItem[];
  categoryTabs: CategoryTab[];
  initialCategory?: CategoryTabKey;
  className?: string;
}

const VALID_CATEGORIES: CategoryTabKey[] = ["ALL", "DOMES", "A_FRAMES", "EVENT_HALLS"];

/**
 * CatalogExplorer - Client Coordinator for Unified Stays & Venues Listing
 * 
 * Enforces:
 * 1. 0ms Client-Side Filter Response: Immediate local React state update without network roundtrip.
 * 2. Shallow URL Synchronization: router.replace(..., { scroll: false }) ensures bookmarkability
 *    and URL deep-linking without scrolling or page re-renders.
 * 3. Browser History Resilience: useSearchParams keeps tabs in sync when user triggers Back/Forward buttons.
 * 4. Responsive Matrix: Renders CategoryFilterTabs and UnitCardsGrid with zero layout shifts.
 */
export function CatalogExplorer({
  initialUnits,
  categoryTabs,
  initialCategory = "ALL",
  className,
}: CatalogExplorerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Local state for 0ms instantaneous client filtering
  const [selectedCategory, setSelectedCategory] = React.useState<CategoryTabKey>(() => {
    return initialCategory;
  });

  // Keep state synchronized with URL search params on external navigation (Back/Forward)
  React.useEffect(() => {
    const queryCategory = searchParams.get("category")?.toUpperCase() as CategoryTabKey | undefined;
    if (queryCategory && VALID_CATEGORIES.includes(queryCategory)) {
      setSelectedCategory((prev) => (prev !== queryCategory ? queryCategory : prev));
    } else if (!queryCategory) {
      setSelectedCategory((prev) => (prev !== "ALL" ? "ALL" : prev));
    }
  }, [searchParams]);

  // Handle immediate user tab click
  const handleSelectCategory = React.useCallback(
    (key: CategoryTabKey) => {
      // 1. Instant 0ms client UI update
      setSelectedCategory(key);

      // 2. Shallow URL synchronization preserving scroll position and existing query parameters
      const params = new URLSearchParams(searchParams.toString());
      if (key === "ALL") {
        params.delete("category");
      } else {
        params.set("category", key);
      }
      const queryString = params.toString();
      const nextUrl = queryString ? `/stays?${queryString}` : "/stays";
      router.replace(nextUrl, { scroll: false });
    },
    [router, searchParams]
  );

  // Compute 0ms filtered units in memory
  const filteredUnits = React.useMemo(() => {
    if (selectedCategory === "ALL") return initialUnits;
    if (selectedCategory === "DOMES") {
      return initialUnits.filter((u) => u.category === "DOME");
    }
    if (selectedCategory === "A_FRAMES") {
      return initialUnits.filter((u) => u.category === "A_FRAME");
    }
    if (selectedCategory === "EVENT_HALLS") {
      return initialUnits.filter(
        (u) =>
          u.category === "NON_AC_HALL" ||
          u.category === "AC_HALL" ||
          u.category === "HALL"
      );
    }
    return initialUnits;
  }, [initialUnits, selectedCategory]);

  return (
    <div className={className}>
      {/* 1. Category Filter Segmented Tabs */}
      <div className="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <CategoryFilterTabs
          tabs={categoryTabs}
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
        />

        {/* Live Filter Counter Indicator */}
        <div className="text-xs font-mono text-muted-foreground self-end sm:self-center shrink-0">
          Showing <span className="font-semibold text-foreground tabular-nums">{filteredUnits.length}</span> of{" "}
          <span className="font-semibold text-foreground tabular-nums">{initialUnits.length}</span> listings
        </div>
      </div>

      {/* 2. Responsive Unit Cards Grid Matrix */}
      <div id="stays-catalog-grid" tabIndex={-1} className="outline-none min-w-0 w-full">
        <UnitCardsGrid
          units={filteredUnits}
          onResetFilter={() => handleSelectCategory("ALL")}
        />
      </div>
    </div>
  );
}

export default CatalogExplorer;
