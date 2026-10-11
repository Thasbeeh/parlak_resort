"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ToggleGroupType = "single" | "multiple";

interface ToggleGroupContextValue {
  type: ToggleGroupType;
  value: string | string[];
  onItemSelect: (itemValue: string) => void;
  disabled?: boolean;
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue | null>(
  null
);

export interface ToggleGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: ToggleGroupType;
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (val: any) => void;
  disabled?: boolean;
  spacing?: number;
}

export function ToggleGroup({
  className,
  type = "single",
  value: controlledValue,
  defaultValue,
  onValueChange,
  disabled = false,
  spacing = 1,
  children,
  ...props
}: ToggleGroupProps) {
  const [internalValue, setInternalValue] = React.useState<string | string[]>(
    controlledValue ?? defaultValue ?? (type === "multiple" ? [] : "")
  );

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const onItemSelect = React.useCallback(
    (itemValue: string) => {
      if (disabled) return;

      if (type === "single") {
        const newValue = value === itemValue ? "" : itemValue;
        if (controlledValue === undefined) {
          setInternalValue(newValue);
        }
        onValueChange?.(newValue);
      } else {
        const arr = Array.isArray(value) ? value : [];
        const exists = arr.includes(itemValue);
        const nextArr = exists
          ? arr.filter((v) => v !== itemValue)
          : [...arr, itemValue];
        if (controlledValue === undefined) {
          setInternalValue(nextArr);
        }
        onValueChange?.(nextArr);
      }
    },
    [disabled, type, value, controlledValue, onValueChange]
  );

  return (
    <ToggleGroupContext.Provider
      value={{ type, value, onItemSelect, disabled }}
    >
      <div
        role={type === "single" ? "radiogroup" : "group"}
        data-slot="toggle-group"
        className={cn(
          "inline-flex flex-wrap items-center rounded-lg border border-border bg-surface-subtle p-1",
          spacing === 2 && "gap-2",
          spacing === 1 && "gap-1",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </ToggleGroupContext.Provider>
  );
}

export interface ToggleGroupItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const ToggleGroupItem = React.forwardRef<
  HTMLButtonElement,
  ToggleGroupItemProps
>(({ className, value: itemValue, disabled: itemDisabled, children, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext);
  if (!context) {
    throw new Error("ToggleGroupItem must be used within a ToggleGroup");
  }

  const isSelected =
    context.type === "single"
      ? context.value === itemValue
      : Array.isArray(context.value) && context.value.includes(itemValue);

  const isDisabled = context.disabled || itemDisabled;

  return (
    <button
      ref={ref}
      type="button"
      role={context.type === "single" ? "radio" : "checkbox"}
      aria-checked={isSelected}
      data-state={isSelected ? "on" : "off"}
      disabled={isDisabled}
      onClick={() => context.onItemSelect(itemValue)}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium select-none cursor-pointer",
        "transition-[background-color,color,box-shadow,transform] duration-150 ease-[var(--ease-snappy)]",
        "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        "disabled:pointer-events-none disabled:opacity-50",
        isSelected
          ? "bg-background text-foreground shadow-xs font-semibold"
          : "text-muted-foreground hover:text-foreground hover:bg-background/50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
ToggleGroupItem.displayName = "ToggleGroupItem";
