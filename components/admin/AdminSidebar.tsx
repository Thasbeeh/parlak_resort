"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  Home,
  Tag,
  Settings,
  ExternalLink,
  X,
} from "lucide-react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";
import { useAdminShell } from "@/components/admin/AdminShellContext";
import { AdminBrandLogo } from "@/components/admin/AdminBrandLogo";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcutDisplay: string;
  shortcutKey: string;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    shortcutDisplay: "⌘ 1",
    shortcutKey: "1",
  },
  {
    title: "Bookings",
    href: "/admin/bookings",
    icon: CalendarCheck,
    shortcutDisplay: "⌘ 2",
    shortcutKey: "2",
  },
  {
    title: "Units",
    href: "/admin/units",
    icon: Home,
    shortcutDisplay: "⌘ 3",
    shortcutKey: "3",
  },
  {
    title: "Pricing",
    href: "/admin/pricing",
    icon: Tag,
    shortcutDisplay: "⌘ 4",
    shortcutKey: "4",
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
    shortcutDisplay: "⌘ 5",
    shortcutKey: "5",
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { mobileMenuOpen, setMobileMenuOpen } = useAdminShell();

  // Keyboard shortcut routing (⌘1 to ⌘5)
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;

      const activeTag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
      if (
        activeTag === "input" ||
        activeTag === "textarea" ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const match = ADMIN_NAV_ITEMS.find((item) => item.shortcutKey === e.key);
      if (match) {
        e.preventDefault();
        router.push(match.href);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  const isRouteActive = (href: string) => {
    if (href === "/admin/dashboard") {
      return pathname === "/admin/dashboard" || pathname === "/admin";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between">
      {/* Brand & Crest Header */}
      <div>
        <div className="flex h-16 items-center px-4 md:px-3 lg:px-5 border-b border-border/80">
          <Link
            href="/admin/dashboard"
            aria-label="Parlak Resort Admin Dashboard"
            className="flex items-center gap-3 transition-opacity duration-150 hover:opacity-90 active:scale-[0.98]"
            onClick={() => setMobileMenuOpen(false)}
          >
            {/* Tablet Rail Mode (68px sidebar): Clean centered mark chip */}
            <div className="hidden md:flex lg:hidden size-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle border border-border/70 p-1 shadow-2xs">
              <AdminBrandLogo variant="mark" size="sm" priority />
            </div>

            {/* Desktop (lg) & Mobile Sheet Mode: Full brand lockup */}
            <div className="flex md:hidden lg:flex items-center gap-2.5">
              <AdminBrandLogo variant="full" size="md" priority />
              <div className="hidden xl:flex flex-col pl-2 border-l border-border/70">
                <span className="font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-none">
                  Cockpit
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Primary Navigation Links */}
        <nav
          aria-label="Administrative Navigation"
          className="flex flex-col gap-1.5 p-3"
        >
          {ADMIN_NAV_ITEMS.map((item) => {
            const active = isRouteActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                title={item.title}
                className={cn(
                  "group relative flex items-center rounded-md px-3 py-2.5 text-sm font-medium",
                  "transition-[background-color,color,transform] duration-150 ease-[var(--ease-snappy)]",
                  "active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "md:justify-center lg:justify-start",
                  active
                    ? "bg-primary/10 text-primary font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-surface-subtle hover:text-foreground"
                )}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-primary"
                  />
                )}
                <Icon
                  className={cn(
                    "size-5 shrink-0 transition-colors duration-150",
                    active
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span className="ml-3 truncate md:hidden lg:inline">
                  {item.title}
                </span>
                <span
                  aria-hidden="true"
                  className="ml-auto hidden lg:inline-flex rounded border border-border/80 bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground select-none"
                >
                  {item.shortcutDisplay}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Utilities */}
      <div className="border-t border-border/80 p-3">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground",
            "hover:bg-surface-subtle hover:text-foreground transition-colors duration-150 active:scale-[0.98]",
            "md:justify-center lg:justify-start"
          )}
          title="Open Public Sanctuary"
        >
          <ExternalLink className="size-4 shrink-0" />
          <span className="truncate md:hidden lg:inline">
            Public Website
          </span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop (260px) & Tablet (68px) Permanent Sidebar */}
      <aside
        data-slot="admin-sidebar"
        className={cn(
          "hidden md:flex flex-col fixed inset-y-0 left-0 z-40 bg-card border-r border-border",
          "md:w-[68px] lg:w-[260px]",
          "transition-[width] duration-200 ease-[var(--ease-snappy)]"
        )}
      >
        {navContent}
      </aside>

      {/* 2. Mobile Drawer Sheet (< 768px) via Base UI Dialog */}
      <DialogPrimitive.Root
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop
            className={cn(
              "fixed inset-0 z-50 bg-black/40 backdrop-blur-xs md:hidden",
              "transition-opacity duration-200 ease-[var(--ease-snappy)]",
              "data-[state=open]:opacity-100 data-[state=closed]:opacity-0"
            )}
          />
          <DialogPrimitive.Popup
            className={cn(
              "fixed inset-y-0 left-0 z-50 w-[280px] bg-card border-r border-border shadow-2xl md:hidden",
              "flex flex-col outline-none",
              "transition-transform duration-200 ease-[var(--ease-snappy)]",
              "data-[state=open]:translate-x-0 data-[state=closed]:-translate-x-full"
            )}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <DialogPrimitive.Title className="font-sans text-sm font-semibold text-foreground">
                Navigation
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                render={
                  <button
                    type="button"
                    aria-label="Close navigation drawer"
                    className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.98]"
                  />
                }
              >
                <X className="size-4" />
              </DialogPrimitive.Close>
            </div>
            <div className="flex-1 overflow-y-auto">
              {navContent}
            </div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* 3. Mobile Thumb-Zone Quick Bar (< 768px) per admin-front-end-2.md */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className={cn(
          "fixed bottom-0 inset-x-0 z-30 md:hidden",
          "h-14 bg-card/95 backdrop-blur-md border-t border-border",
          "flex items-center justify-around px-2",
          "pb-[env(safe-area-inset-bottom)]"
        )}
      >
        {ADMIN_NAV_ITEMS.map((item) => {
          const active = isRouteActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors duration-150 active:scale-[0.95]",
                active
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="mt-0.5 tracking-tight">{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export default AdminSidebar;
