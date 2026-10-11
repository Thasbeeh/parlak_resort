import { describe, it, expect } from "vitest";
import * as React from "react";
import { AdminBrandLogo } from "@/components/admin/AdminBrandLogo";

describe("AdminBrandLogo Component", () => {
  it("exports the AdminBrandLogo component", () => {
    expect(AdminBrandLogo).toBeDefined();
    expect(typeof AdminBrandLogo).toBe("function");
  });

  it("renders mark variant correctly", () => {
    const element = AdminBrandLogo({ variant: "mark", size: "sm" });
    expect(element).toBeDefined();
    expect(element?.props?.className).toContain("size-7");
  });

  it("renders full variant correctly with light and dark mode images", () => {
    const element = AdminBrandLogo({ variant: "full", size: "md" });
    expect(element).toBeDefined();
    expect(element?.props?.className).toContain("h-9.5");
    
    // Children should include both light and dark Image components
    const children = React.Children.toArray(element?.props?.children);
    expect(children.length).toBe(2);
  });

  it("renders responsive variant with tablet rail mark and desktop full lockup", () => {
    const element = AdminBrandLogo({ variant: "responsive", size: "md" });
    expect(element).toBeDefined();

    const children = React.Children.toArray(element?.props?.children);
    expect(children.length).toBe(2);
  });

  it("respects size prop across xs, sm, md, lg, xl", () => {
    const sizes = ["xs", "sm", "md", "lg", "xl"] as const;
    sizes.forEach((size) => {
      const full = AdminBrandLogo({ variant: "full", size });
      expect(full).toBeDefined();

      const mark = AdminBrandLogo({ variant: "mark", size });
      expect(mark).toBeDefined();
    });
  });
});
