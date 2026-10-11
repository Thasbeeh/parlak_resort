"use client";

import * as React from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number;
  onChange: (val: number) => void;
  isError?: boolean;
}

export function CurrencyInput({
  value,
  onChange,
  className,
  isError,
  ...props
}: CurrencyInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    onChange(raw ? parseInt(raw, 10) : 0);
  };

  return (
    <InputGroup className={cn("w-full", className)} isError={isError}>
      <InputGroupAddon>
        <span
          className="font-mono text-sm text-muted-foreground select-none"
          aria-hidden="true"
        >
          ₹
        </span>
      </InputGroupAddon>
      <InputGroupInput
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        spellCheck={false}
        value={value ? value.toLocaleString("en-IN") : ""}
        onChange={handleChange}
        aria-invalid={isError ? "true" : undefined}
        className="font-mono text-base md:text-sm tabular-nums"
        placeholder="0…"
        {...props}
      />
    </InputGroup>
  );
}

export default CurrencyInput;
