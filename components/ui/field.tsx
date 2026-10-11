import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export function FieldGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="field-group"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  );
}

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "vertical" | "horizontal";
  "data-invalid"?: boolean;
  "data-disabled"?: boolean;
  disabled?: boolean;
}

export function Field({
  className,
  orientation = "vertical",
  "data-invalid": isInvalid,
  "data-disabled": isDataDisabled,
  disabled,
  ...props
}: FieldProps) {
  const isDisabled = isDataDisabled || disabled;

  return (
    <div
      data-slot="field"
      data-invalid={isInvalid ? "true" : undefined}
      data-disabled={isDisabled ? "true" : undefined}
      className={cn(
        "group/field flex",
        orientation === "horizontal"
          ? "flex-row items-center gap-2"
          : "flex-col gap-1.5",
        isDisabled && "opacity-50 pointer-events-none",
        className
      )}
      {...props}
    />
  );
}

export interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export function FieldLabel({ className, ...props }: FieldLabelProps) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        "group-data-[invalid=true]/field:text-destructive",
        className
      )}
      {...props}
    />
  );
}

export function FieldDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="field-description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

export function FieldError({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  if (!children) return null;
  return (
    <p
      data-slot="field-error"
      role="alert"
      className={cn("text-xs font-medium text-destructive", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function FieldSet({
  className,
  ...props
}: React.FieldsetHTMLAttributes<HTMLFieldSetElement>) {
  return (
    <fieldset
      data-slot="fieldset"
      className={cn("flex flex-col gap-3 border-none p-0 m-0", className)}
      {...props}
    />
  );
}

export interface FieldLegendProps
  extends React.HTMLAttributes<HTMLLegendElement> {
  variant?: "title" | "label";
}

export function FieldLegend({
  className,
  variant = "title",
  ...props
}: FieldLegendProps) {
  return (
    <legend
      data-slot="field-legend"
      className={cn(
        "font-semibold text-foreground",
        variant === "label" ? "text-xs" : "text-sm",
        className
      )}
      {...props}
    />
  );
}
