"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { SafeViewport } from "@/components/admin/SafeViewport";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminShellProvider } from "@/components/admin/AdminShellContext";
import { ToastProvider } from "@/components/ui/toast";

export interface AdminShellProps {
  children: React.ReactNode;
  adminUsername?: string;
}

export function AdminShell({ children, adminUsername }: AdminShellProps) {
  const pathname = usePathname();
  const isLoginPage =
    pathname === "/admin/login" || pathname.startsWith("/admin/login/");
  const isPrintPage = Boolean(
    pathname?.endsWith("/print") || pathname?.endsWith("/print/")
  );

  if (isLoginPage || isPrintPage) {
    return (
      <ToastProvider>
        <SafeViewport>{children}</SafeViewport>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <AdminShellProvider>
        <SafeViewport className="flex-row">
          <AdminSidebar />
          <div className="flex flex-1 flex-col md:pl-[68px] lg:pl-[260px] min-w-0 w-full max-w-full overflow-x-hidden">
            <AdminHeader adminUsername={adminUsername} />
            <main className="flex-1 w-full max-w-full min-w-0 p-4 md:p-6 lg:p-8 pb-20 md:pb-6 lg:pb-8">
              {children}
            </main>
          </div>
        </SafeViewport>
      </AdminShellProvider>
    </ToastProvider>
  );
}

export default AdminShell;
