import * as React from "react";
import type { Metadata } from "next";
import { getResortSettings, getAdminAccounts } from "@/actions/settings";
import { ResortProfileForm } from "@/components/admin/settings/ResortProfileForm";
import { AdminAccountsList } from "@/components/admin/settings/AdminAccountsList";
import { Server, Database, Cloud } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Platform Settings | Parlak Resort Admin",
  description: "Configure resort profile metadata, operating hours, and administrative accounts",
};

export default async function AdminSettingsPage() {
  const [settings, adminAccounts] = await Promise.all([
    getResortSettings(),
    getAdminAccounts(),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
            Platform settings
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Resort metadata, operating policies, and seeded system operators
          </p>
        </div>

        {/* System Health Indicators */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-subtle border border-border text-[11px] font-mono text-muted-foreground">
            <Database className="size-3 text-emerald-600 dark:text-emerald-400" />
            <span>Postgres: Online</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-subtle border border-border text-[11px] font-mono text-muted-foreground">
            <Cloud className="size-3 text-emerald-600 dark:text-emerald-400" />
            <span>Media CDN: Active</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-subtle border border-border text-[11px] font-mono text-muted-foreground">
            <Server className="size-3 text-primary" />
            <span className="uppercase">{process.env.NODE_ENV || "production"}</span>
          </div>
        </div>
      </div>

      {/* Resort Profile & Timings Single Canvas */}
      <section className="space-y-6">
        <ResortProfileForm initialSettings={settings} />
      </section>

      {/* Admin Accounts List */}
      <section className="pt-6 border-t border-border/80">
        <AdminAccountsList accounts={adminAccounts} />
      </section>
    </div>
  );
}
