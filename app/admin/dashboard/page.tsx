import * as React from "react";
import type { Metadata } from "next";
import { getDashboardData } from "@/lib/dashboard-data";
import { DashboardClient } from "@/components/admin/dashboard/DashboardClient";

export const metadata: Metadata = {
  title: "Operations Cockpit | Parlak Resort Admin",
  description:
    "Real-time operational dashboard for resort revenue, arrivals, departures, and hall shift headcounts.",
};

// Next.js dynamic rendering ensures fresh server-side data on every navigation
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // RSC executes direct database query to provide instant fallbackData for SWR (0ms CLS)
  let initialData;
  try {
    initialData = await getDashboardData();
  } catch (error) {
    console.error("Dashboard RSC initial load error:", error);
    initialData = {
      summaryMetrics: {
        total30DayRevenue: 0,
        todayCheckinsCount: 0,
        todayCheckoutsCount: 0,
        residentOvernightGuests: 0,
      },
      hallOperations: {
        nonAcHall: { morningSlotHeadcount: 0, eveningSlotHeadcount: 0 },
        acHall: { morningSlotHeadcount: 0, eveningSlotHeadcount: 0 },
      },
      underpaidArrivals: [],
      todayRoster: [],
      lastSyncedAt: new Date().toISOString(),
    };
  }

  return <DashboardClient initialData={initialData} />;
}
