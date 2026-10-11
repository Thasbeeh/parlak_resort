"use client";

import * as React from "react";
import { type ResortProfileInput, resortProfileSchema } from "@/schemas/settings.schema";
import { updateResortSettingsAction } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ExternalLink, Check } from "lucide-react";

interface ResortProfileFormProps {
  initialSettings: ResortProfileInput;
}

export function ResortProfileForm({ initialSettings }: ResortProfileFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = React.useState<ResortProfileInput>(initialSettings);
  const [isPending, startTransition] = React.useTransition();
  const [errors, setErrors] = React.useState<Record<string, string[] | undefined>>({});
  const [hasSaved, setHasSaved] = React.useState(false);

  const handleChange = (field: keyof ResortProfileInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setHasSaved(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parseResult = resortProfileSchema.safeParse(formData);
    if (!parseResult.success) {
      setErrors(parseResult.error.flatten().fieldErrors);
      toast.error(parseResult.error.issues[0]?.message ?? "Please resolve validation errors");
      return;
    }

    setErrors({});
    startTransition(async () => {
      const res = await updateResortSettingsAction(parseResult.data);
      if (res.success && res.data) {
        setFormData(res.data);
        setHasSaved(true);
        toast.success("Resort profile and operating hours updated successfully");
      } else {
        if (res.errors) {
          setErrors(res.errors);
        }
        toast.error(res.error || "Failed to update resort settings");
      }
    });
  };

  const handleTestWhatsApp = () => {
    const rawDigits = formData.whatsapp.replace(/\D/g, "");
    if (!rawDigits || rawDigits.length < 10) {
      toast.error("Enter a valid 10+ digit WhatsApp phone number first");
      return;
    }
    const intlNumber = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits;
    window.open(`https://wa.me/${intlNumber}`, "_blank", "noopener,noreferrer");
  };

  return (
    <form onSubmit={handleSubmit} className="divide-y divide-border/60">
      {/* Identity & Legal Information */}
      <div className="pb-8 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Resort identity</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Public property name, branding tagline, and location details
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="resortName" className="text-xs font-medium text-foreground">
              Resort name
            </label>
            <Input
              id="resortName"
              name="resortName"
              value={formData.resortName}
              onChange={(e) => handleChange("resortName", e.target.value)}
              placeholder="Parlak Resort"
              isError={!!errors.resortName}
              disabled={isPending}
            />
            {errors.resortName && (
              <p className="text-xs text-destructive">{errors.resortName[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="tagline" className="text-xs font-medium text-foreground">
              Branding tagline
            </label>
            <Input
              id="tagline"
              name="tagline"
              value={formData.tagline || ""}
              onChange={(e) => handleChange("tagline", e.target.value)}
              placeholder="Luxury Geodesic Domes, Scenic A-Frames & Event Venues"
              isError={!!errors.tagline}
              disabled={isPending}
            />
            {errors.tagline && (
              <p className="text-xs text-destructive">{errors.tagline[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium text-foreground">
              Official email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="info.parlakresort@gmail.com"
              isError={!!errors.email}
              disabled={isPending}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email[0]}</p>
            )}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label htmlFor="address" className="text-xs font-medium text-foreground">
              Property address
            </label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="Vallivattom, S.N. Puram, Thrissur, Keralam 680661"
              isError={!!errors.address}
              disabled={isPending}
            />
            {errors.address && (
              <p className="text-xs text-destructive">{errors.address[0]}</p>
            )}
          </div>
        </div>
      </div>

      {/* Front Desk & Communication Hotlines */}
      <div className="py-8 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Communication channels</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Contact phone numbers printed on guest invoices and customer correspondence
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-xs font-medium text-foreground">
              Front desk voice line
            </label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="+91 98765 43210"
              className="font-mono tabular-nums text-xs"
              isError={!!errors.phone}
              disabled={isPending}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="whatsapp" className="text-xs font-medium text-foreground">
                WhatsApp hotline
              </label>
              <button
                type="button"
                onClick={handleTestWhatsApp}
                className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer active:scale-95 transition-transform"
              >
                <ExternalLink className="size-3" />
                <span>Test WhatsApp link</span>
              </button>
            </div>
            <Input
              id="whatsapp"
              name="whatsapp"
              value={formData.whatsapp}
              onChange={(e) => handleChange("whatsapp", e.target.value)}
              placeholder="+91 98765 43210"
              className="font-mono tabular-nums text-xs"
              isError={!!errors.whatsapp}
              disabled={isPending}
            />
            {errors.whatsapp && (
              <p className="text-xs text-destructive">{errors.whatsapp[0]}</p>
            )}
          </div>
        </div>
      </div>

      {/* Operating Timings */}
      <div className="py-8 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Standard operating timings</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Default operating windows printed on guest receipts and registration cards
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="overnightCheckIn" className="text-xs font-medium text-foreground">
              Overnight check-in
            </label>
            <Input
              id="overnightCheckIn"
              name="overnightCheckIn"
              value={formData.overnightCheckIn}
              onChange={(e) => handleChange("overnightCheckIn", e.target.value)}
              placeholder="02:00 PM IST"
              className="font-mono tabular-nums text-xs"
              isError={!!errors.overnightCheckIn}
              disabled={isPending}
            />
            {errors.overnightCheckIn && (
              <p className="text-xs text-destructive">{errors.overnightCheckIn[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="overnightCheckOut" className="text-xs font-medium text-foreground">
              Overnight check-out
            </label>
            <Input
              id="overnightCheckOut"
              name="overnightCheckOut"
              value={formData.overnightCheckOut}
              onChange={(e) => handleChange("overnightCheckOut", e.target.value)}
              placeholder="11:00 AM IST"
              className="font-mono tabular-nums text-xs"
              isError={!!errors.overnightCheckOut}
              disabled={isPending}
            />
            {errors.overnightCheckOut && (
              <p className="text-xs text-destructive">{errors.overnightCheckOut[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="daySlotCheckIn" className="text-xs font-medium text-foreground">
              Day slot check-in
            </label>
            <Input
              id="daySlotCheckIn"
              name="daySlotCheckIn"
              value={formData.daySlotCheckIn}
              onChange={(e) => handleChange("daySlotCheckIn", e.target.value)}
              placeholder="10:00 AM IST"
              className="font-mono tabular-nums text-xs"
              isError={!!errors.daySlotCheckIn}
              disabled={isPending}
            />
            {errors.daySlotCheckIn && (
              <p className="text-xs text-destructive">{errors.daySlotCheckIn[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="daySlotCheckOut" className="text-xs font-medium text-foreground">
              Day slot check-out
            </label>
            <Input
              id="daySlotCheckOut"
              name="daySlotCheckOut"
              value={formData.daySlotCheckOut}
              onChange={(e) => handleChange("daySlotCheckOut", e.target.value)}
              placeholder="06:00 PM IST"
              className="font-mono tabular-nums text-xs"
              isError={!!errors.daySlotCheckOut}
              disabled={isPending}
            />
            {errors.daySlotCheckOut && (
              <p className="text-xs text-destructive">{errors.daySlotCheckOut[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="diningUntil" className="text-xs font-medium text-foreground">
              Dining available until
            </label>
            <Input
              id="diningUntil"
              name="diningUntil"
              value={formData.diningUntil}
              onChange={(e) => handleChange("diningUntil", e.target.value)}
              placeholder="10:30 PM IST"
              className="font-mono tabular-nums text-xs"
              isError={!!errors.diningUntil}
              disabled={isPending}
            />
            {errors.diningUntil && (
              <p className="text-xs text-destructive">{errors.diningUntil[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="poolUntil" className="text-xs font-medium text-foreground">
              Pool hours until
            </label>
            <Input
              id="poolUntil"
              name="poolUntil"
              value={formData.poolUntil}
              onChange={(e) => handleChange("poolUntil", e.target.value)}
              placeholder="10:00 PM IST"
              className="font-mono tabular-nums text-xs"
              isError={!!errors.poolUntil}
              disabled={isPending}
            />
            {errors.poolUntil && (
              <p className="text-xs text-destructive">{errors.poolUntil[0]}</p>
            )}
          </div>
        </div>
      </div>

      {/* Submission Actions */}
      <div className="pt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {hasSaved && (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <Check className="size-3.5" />
              Settings saved
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="submit"
            variant="primary"
            loading={isPending}
            className="px-5 active:scale-[0.98] select-none"
          >
            Save settings
          </Button>
        </div>
      </div>
    </form>
  );
}

export default ResortProfileForm;
