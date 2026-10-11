import * as React from "react";
import { PublicHeader } from "@/components/public/chrome/PublicHeader";
import { PublicFooter } from "@/components/public/chrome/PublicFooter";
import { FloatingContactWidget } from "@/components/public/chrome/FloatingContactWidget";
import {
  JsonLd,
  RESORT_LODGING_BUSINESS_JSONLD,
} from "@/components/seo/JsonLd";

export default function PublicSanctuaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background text-foreground selection:bg-primary/15 selection:text-primary flex min-h-screen min-h-[100svh] min-h-[100dvh] flex-col overflow-x-hidden min-w-0 w-full max-w-full antialiased">
      {/* Schema.org LodgingBusiness Structured Data */}
      <JsonLd
        data={RESORT_LODGING_BUSINESS_JSONLD}
        id="lodging-business-jsonld"
      />

      {/* Persistent Frosted Header Bar */}
      <PublicHeader />

      {/* Main Content Area */}
      <main className="w-full max-w-full min-w-0 flex-1">{children}</main>

      {/* Comprehensive NAP Footer */}
      <PublicFooter />

      {/* Floating Action Quick Contact Widget */}
      <FloatingContactWidget />
    </div>
  );
}
