"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveSyncBadge } from "@/components/admin/LiveSyncBadge";
import { OfflineBanner } from "@/components/admin/OfflineBanner";
import { useAdminShell } from "@/components/admin/AdminShellContext";
import { AdminBrandLogo } from "@/components/admin/AdminBrandLogo";
import { logoutAdmin } from "@/actions/auth";

export interface AdminHeaderProps {
  adminUsername?: string;
  isSyncing?: boolean;
}

export function AdminHeader({
  adminUsername = "Admin",
  isSyncing: propIsSyncing,
}: AdminHeaderProps) {
  const { toggleMobileMenu, isSyncing: ctxSyncing, lastSyncedAt: ctxSyncedAt } = useAdminShell();
  const [isLoggingOut, startTransition] = React.useTransition();

  const isSyncing = propIsSyncing !== undefined ? propIsSyncing : ctxSyncing;

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAdmin();
    });
  };

  return (
    <header
      data-slot="admin-header"
      className="sticky top-0 z-30 flex flex-col w-full border-b border-border bg-background/95 backdrop-blur-md"
    >
      {/* Sliding Offline Alert Banner */}
      <OfflineBanner />

      {/* Main Header Bar */}
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left: Mobile Drawer Trigger & Brand Crest */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={toggleMobileMenu}
            className="flex size-11 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.98] transition-transform duration-100 ease-[var(--ease-snappy)] select-none md:hidden"
          >
            <Menu className="size-5" />
          </button>

          <Link
            href="/admin/dashboard"
            aria-label="Parlak Resort Admin Dashboard"
            className="flex items-center gap-2 md:hidden transition-opacity duration-150 hover:opacity-90 active:scale-[0.98]"
          >
            <AdminBrandLogo variant="full" size="sm" priority />
          </Link>

          <div className="hidden md:flex flex-col">
            <h1 className="text-sm font-semibold text-foreground">
              Operations Desk
            </h1>
            <p className="text-[11px] font-mono text-muted-foreground">
              Vallivattom, Kerala
            </p>
          </div>
        </div>

        {/* Right: SWR Live Sync Pill, Admin Badge & Logout */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <LiveSyncBadge isSyncing={isSyncing} lastSyncedAt={ctxSyncedAt} />

          {/* Admin Profile Pill */}
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-border/80 bg-surface-subtle px-2.5 py-1 text-xs">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
              {adminUsername.slice(0, 1).toUpperCase()}
            </span>
            <span className="font-mono text-xs text-foreground font-medium">
              {adminUsername}
            </span>
          </div>

          {/* Logout Trigger */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-label="Log out of admin session"
            className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="size-3.5" data-icon="inline-start" />
            <span className="hidden sm:inline">
              {isLoggingOut ? "Signing out…" : "Logout"}
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}

export default AdminHeader;
