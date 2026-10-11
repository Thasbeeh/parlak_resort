"use client";

import * as React from "react";
import type { AdminAccountItem } from "@/actions/settings";
import { ShieldCheck, Lock } from "lucide-react";

interface AdminAccountsListProps {
  accounts: AdminAccountItem[];
}

export function AdminAccountsList({ accounts }: AdminAccountsListProps) {
  const formatDate = (dateInput: Date | string) => {
    try {
      const d = new Date(dateInput);
      return d.toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">Admin accounts</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Seeded administrative operators with full platform authorization
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-subtle border border-border text-xs text-muted-foreground">
          <Lock className="size-3" />
          <span>Registration disabled</span>
        </div>
      </div>

      <div className="rounded-lg border border-border/80 overflow-hidden bg-background">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-subtle/50 text-muted-foreground">
                <th className="py-2.5 px-3 font-medium">Username</th>
                <th className="py-2.5 px-3 font-medium">Role</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 font-medium">Seeded date</th>
                <th className="py-2.5 px-3 font-medium text-right">Identifier</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    No admin accounts found
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => (
                  <tr
                    key={acc.id}
                    className="h-11 hover:bg-surface-subtle/40 transition-colors border-b border-border/60"
                  >
                    <td className="py-2.5 px-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{acc.username}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-primary">
                        <ShieldCheck className="size-3 text-emerald-600 dark:text-emerald-400" />
                        SUPER_ADMIN
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        Active
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-muted-foreground">
                      {formatDate(acc.createdAt)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[11px] text-muted-foreground">
                      {acc.id.slice(0, 8)}…
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground leading-normal">
        All 3 administrative credentials are fixed in the persistent seed registry. External registration endpoints are sealed.
      </p>
    </div>
  );
}

export default AdminAccountsList;
