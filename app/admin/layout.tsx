import * as React from "react";
import { getCurrentAdmin } from "@/actions/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();

  return (
    <AdminShell adminUsername={admin?.username || "Admin"}>
      {children}
    </AdminShell>
  );
}
