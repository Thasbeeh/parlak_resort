import * as React from "react";
import type { Metadata } from "next";
import { UnitPricingSlabBuilder } from "@/components/admin/pricing/UnitPricingSlabBuilder";

export const metadata: Metadata = {
  title: "Create Price List | Parlak Resort Admin",
  description: "Construct dynamic headcount slabs and tariffs for resort units",
};

export default function CreatePriceListPage() {
  return (
    <div className="py-2">
      <UnitPricingSlabBuilder isEditing={false} />
    </div>
  );
}
