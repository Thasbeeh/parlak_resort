'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  Home,
  Users,
  Baby,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
  Trash2,
  Building,
  Tag,
  CreditCard,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { CollisionAlert, CollisionDetails } from './CollisionAlert';
import { createBookingAction } from '@/actions/bookings';
import {
  STANDARD_SLOT_TIMINGS,
  StandardPresetType,
  getISTDateString,
  mapPresetToDateRange,
  formatISTDateTime,
} from '@/lib/date-utils';
import {
  calculateNightByNightStayRate,
  calculateModifiedPrice,
  resolveModifiers,
  resolveSlabForHeadcount,
} from '@/lib/pricing/resolve-modifiers';
import type { Prisma } from '@prisma/client';

export type UnitWithPriceList = Prisma.UnitGetPayload<{
  include: {
    priceList: {
      include: {
        slabs: true;
        modifiers: true;
      };
    };
    photos: true;
  };
}>;

interface UnitSelectionState {
  unitId: string;
  adults: number;
  infants: number;
  headcount?: number;
  isComplimentary: boolean;
  customPriceOverride?: number;
}

interface AvailabilityConflict {
  bookingUnitId: string;
  bookingId: string | null;
  guestName: string;
  guestPhone: string | null;
  startDatetime: string;
  endDatetime: string;
  status: string;
  stayType: string;
  isComplimentary: boolean;
  isMaintenance: boolean;
}

interface UnitAvailability {
  isAvailable: boolean;
  conflicts: AvailabilityConflict[];
}

interface BookingCreationFormProps {
  units: UnitWithPriceList[];
}

export function BookingCreationForm({ units }: BookingCreationFormProps) {
  const router = useRouter();

  // 1. Guest CRM state
  const [guestName, setGuestName] = React.useState('');
  const [guestPhone, setGuestPhone] = React.useState('');
  const [guestEmail, setGuestEmail] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [phoneTouched, setPhoneTouched] = React.useState(false);

  // 2. Timing & Slot Presets state
  const todayIST = React.useMemo(() => getISTDateString(new Date()), []);
  const [date, setDate] = React.useState(todayIST);
  const [preset, setPreset] = React.useState<StandardPresetType>('OVERNIGHT');
  const [nights, setNights] = React.useState(1);

  // 3. Unit Selection state
  const [selectedUnits, setSelectedUnits] = React.useState<Map<string, UnitSelectionState>>(
    new Map()
  );

  // Hall specific state
  const [hallHeadcount, setHallHeadcount] = React.useState<number>(100);
  const [attachedDomeId, setAttachedDomeId] = React.useState<string | null>(null);

  // 4. Financial Tracking state
  const [customRentOverride, setCustomRentOverride] = React.useState<number | null>(null);
  const [totalPaid, setTotalPaid] = React.useState<number>(0);
  const [paidTouched, setPaidTouched] = React.useState(false);

  // 5. Availability & Concurrency state
  const [isCheckingAvailability, setIsCheckingAvailability] = React.useState(false);
  const [availabilityMap, setAvailabilityMap] = React.useState<Record<string, UnitAvailability>>({});
  const [collisionError, setCollisionError] = React.useState<CollisionDetails | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Compute Active Time Window
  const timeWindow = React.useMemo(() => {
    try {
      return mapPresetToDateRange(preset, date, preset === 'OVERNIGHT' ? nights : 1);
    } catch {
      return {
        startDatetime: new Date(),
        endDatetime: new Date(),
      };
    }
  }, [preset, date, nights]);

  // Query Live Availability from API
  const fetchAvailability = React.useCallback(async () => {
    if (!timeWindow.startDatetime || !timeWindow.endDatetime) return;

    setIsCheckingAvailability(true);
    try {
      const params = new URLSearchParams({
        startDatetime: timeWindow.startDatetime.toISOString(),
        endDatetime: timeWindow.endDatetime.toISOString(),
      });
      const res = await fetch(`/api/admin/bookings/check-availability?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.availabilityMap) {
          setAvailabilityMap(json.availabilityMap);
        }
      }
    } catch (err) {
      console.error('Failed to fetch live availability:', err);
    } finally {
      setIsCheckingAvailability(false);
    }
  }, [timeWindow.startDatetime, timeWindow.endDatetime]);

  React.useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Validation rules
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  const isPhoneValid = phoneRegex.test(guestPhone.trim());
  const phoneErrorMessage = React.useMemo(() => {
    if (!phoneTouched) return null;
    const trimmed = guestPhone.trim();
    if (!trimmed) return 'Guest phone number is required';
    if (!phoneRegex.test(trimmed)) {
      return 'Phone number must contain 10 to 15 digits (optional leading +)';
    }
    return null;
  }, [guestPhone, phoneTouched]);

  // Group units by category
  const domes = React.useMemo(() => units.filter((u) => u.category === 'DOME'), [units]);
  const aFrames = React.useMemo(() => units.filter((u) => u.category === 'A_FRAME'), [units]);
  const halls = React.useMemo(
    () => units.filter((u) => u.category === 'NON_AC_HALL' || u.category === 'AC_HALL'),
    [units]
  );

  // Check if an Event Hall is selected
  const selectedHallUnit = React.useMemo(() => {
    for (const [unitId] of selectedUnits) {
      const u = units.find((item) => item.id === unitId);
      if (u && (u.category === 'NON_AC_HALL' || u.category === 'AC_HALL')) {
        return u;
      }
    }
    return null;
  }, [selectedUnits, units]);

  const isHallSelected = !!selectedHallUnit;
  const isComplimentaryEligible = isHallSelected && (hallHeadcount ?? 0) >= 400;

  // Set default initial unit if none selected
  React.useEffect(() => {
    if (selectedUnits.size === 0 && domes.length > 0) {
      const firstAvailable = domes.find((d) => availabilityMap[d.id]?.isAvailable !== false) || domes[0];
      setSelectedUnits(
        new Map([
          [
            firstAvailable.id,
            {
              unitId: firstAvailable.id,
              adults: 2,
              infants: 0,
              isComplimentary: false,
            },
          ],
        ])
      );
    }
  }, [domes, availabilityMap, selectedUnits.size]);

  // Synchronize slot preset with category selection
  const handlePresetSelect = (newPreset: StandardPresetType) => {
    setPreset(newPreset);
    setCollisionError(null);

    // If switching to Hall preset, ensure a Hall is selectable/selected
    if (newPreset === 'MORNING_SLOT' || newPreset === 'EVENING_SLOT') {
      if (!isHallSelected && halls.length > 0) {
        const firstHall = halls[0];
        const newMap = new Map();
        newMap.set(firstHall.id, {
          unitId: firstHall.id,
          adults: 0,
          infants: 0,
          headcount: hallHeadcount,
          isComplimentary: false,
        });
        setSelectedUnits(newMap);
      }
    } else if (isHallSelected && (newPreset === 'OVERNIGHT' || newPreset === 'DAY_SLOT')) {
      // Switched back to room preset, replace hall with dome
      if (domes.length > 0) {
        const newMap = new Map();
        newMap.set(domes[0].id, {
          unitId: domes[0].id,
          adults: 2,
          infants: 0,
          isComplimentary: false,
        });
        setSelectedUnits(newMap);
        setAttachedDomeId(null);
      }
    }
  };

  // Toggle selection for rooms
  const handleToggleRoomUnit = (unit: UnitWithPriceList) => {
    setCollisionError(null);
    setSelectedUnits((prev) => {
      const next = new Map(prev);
      if (next.has(unit.id)) {
        if (next.size > 1) {
          next.delete(unit.id);
        } else {
          toast.info('At least one unit must remain selected in the reservation.');
        }
      } else {
        // Enforce hard cap defaults: Domes default to 2 adults (cap 3), A-Frames default to 4 adults (cap 5)
        const defaultAdults = unit.category === 'DOME' ? 2 : 4;
        next.set(unit.id, {
          unitId: unit.id,
          adults: defaultAdults,
          infants: 0,
          isComplimentary: false,
        });
      }
      return next;
    });
  };

  // Select Event Hall
  const handleSelectHall = (unit: UnitWithPriceList) => {
    setCollisionError(null);
    setSelectedUnits((prev) => {
      const next = new Map();
      next.set(unit.id, {
        unitId: unit.id,
        adults: 0,
        infants: 0,
        headcount: hallHeadcount,
        isComplimentary: false,
      });
      // Retain attached dome if already selected
      if (attachedDomeId) {
        next.set(attachedDomeId, {
          unitId: attachedDomeId,
          adults: 0,
          infants: 0,
          isComplimentary: isComplimentaryEligible,
        });
      }
      return next;
    });
  };

  // Attach / Detach Resting Dome to Event Hall
  const handleToggleAttachedDome = (dome: UnitWithPriceList) => {
    setCollisionError(null);
    if (attachedDomeId === dome.id) {
      // Detach
      setAttachedDomeId(null);
      setSelectedUnits((prev) => {
        const next = new Map(prev);
        next.delete(dome.id);
        return next;
      });
    } else {
      // Attach
      setAttachedDomeId(dome.id);
      setSelectedUnits((prev) => {
        const next = new Map(prev);
        // Remove previous attached dome if any
        if (attachedDomeId) {
          next.delete(attachedDomeId);
        }
        next.set(dome.id, {
          unitId: dome.id,
          adults: 0,
          infants: 0,
          isComplimentary: isComplimentaryEligible,
        });
        return next;
      });
    }
  };

  // Update headcount for Hall and synchronize attached dome complimentary status
  const handleHeadcountChange = (val: number) => {
    const clamped = Math.max(1, Math.min(val, selectedHallUnit?.maxCapacity ?? 2000));
    setHallHeadcount(clamped);

    if (selectedHallUnit) {
      setSelectedUnits((prev) => {
        const next = new Map(prev);
        const hallState = next.get(selectedHallUnit.id);
        if (hallState) {
          next.set(selectedHallUnit.id, {
            ...hallState,
            headcount: clamped,
          });
        }
        // Update attached dome complimentary status
        if (attachedDomeId && next.has(attachedDomeId)) {
          const domeState = next.get(attachedDomeId)!;
          next.set(attachedDomeId, {
            ...domeState,
            isComplimentary: clamped >= 400,
          });
        }
        return next;
      });
    }
  };

  // Update occupancy for room unit
  const handleOccupancyChange = (
    unitId: string,
    field: 'adults' | 'infants',
    delta: number,
    cap: number
  ) => {
    setSelectedUnits((prev) => {
      const next = new Map(prev);
      const state = next.get(unitId);
      if (state) {
        const current = state[field] ?? 0;
        const updated = Math.max(field === 'adults' ? 1 : 0, Math.min(current + delta, cap));
        next.set(unitId, {
          ...state,
          [field]: updated,
        });
      }
      return next;
    });
  };

  // -------------------------------------------------------------
  // DYNAMIC PRICING ENGINE & SLAB RESOLUTION
  // -------------------------------------------------------------
  const pricingBreakdown = React.useMemo(() => {
    let totalCalculatedRent = 0;
    let totalRequiredDeposit = 0;
    const unitCalculations: Array<{
      unit: UnitWithPriceList;
      unitId: string;
      basePrice: number;
      appliedPercentage: number;
      modifierName: string | null;
      calculatedRent: number;
      deposit: number;
      isComplimentary: boolean;
      slabName?: string;
    }> = [];

    for (const [unitId, selState] of selectedUnits) {
      const unit = units.find((u) => u.id === unitId);
      if (!unit || !unit.priceList) continue;

      if (selState.isComplimentary) {
        unitCalculations.push({
          unit,
          unitId,
          basePrice: 0,
          appliedPercentage: 0,
          modifierName: 'Complimentary Attached Dome (₹0)',
          calculatedRent: 0,
          deposit: 0,
          isComplimentary: true,
        });
        continue;
      }

      const isHall = unit.category === 'NON_AC_HALL' || unit.category === 'AC_HALL';
      const effectiveHeadcount = isHall
        ? (selState.headcount && selState.headcount > 0 ? selState.headcount : 1)
        : (selState.adults && selState.adults > 0 ? selState.adults : 1);

      let effectiveStayType: string = preset;
      if (!isHall && preset === 'MORNING_SLOT') {
        effectiveStayType = 'DAY_SLOT';
      }

      const slab = resolveSlabForHeadcount(
        unit.priceList.slabs,
        effectiveHeadcount,
        effectiveStayType as any
      );

      const basePrice = slab?.basePrice ?? 0;
      const deposit = slab?.requiredDeposit ?? 0;
      let calculatedRent = basePrice;
      let appliedPercentage = 0;
      let modifierName: string | null = null;

      if (preset === 'OVERNIGHT') {
        const stayCalc = calculateNightByNightStayRate({
          checkInDate: timeWindow.startDatetime,
          numberOfNights: Math.max(1, nights),
          basePricePerNight: basePrice,
          modifiers: unit.priceList.modifiers.filter((m) => m.isActive),
          stayType: 'OVERNIGHT',
        });
        calculatedRent = stayCalc.totalStayRent;
        const highestMod = stayCalc.nightlyBreakdown.find((b) => b.appliedModifier !== null);
        if (highestMod?.appliedModifier) {
          appliedPercentage = highestMod.percentage;
          modifierName = `${highestMod.appliedModifier.name} (${appliedPercentage > 0 ? '+' : ''}${appliedPercentage}%)`;
        }
      } else {
        const modRes = resolveModifiers(
          timeWindow.startDatetime,
          unit.priceList.modifiers.filter((m) => m.isActive),
          effectiveStayType as any
        );
        appliedPercentage = modRes.effectivePercentage;
        calculatedRent = calculateModifiedPrice(basePrice, appliedPercentage);
        if (modRes.appliedModifier) {
          modifierName = `${modRes.appliedModifier.name} (${appliedPercentage > 0 ? '+' : ''}${appliedPercentage}%)`;
        }
      }

      totalCalculatedRent += calculatedRent;
      totalRequiredDeposit += deposit;

      unitCalculations.push({
        unit,
        unitId,
        basePrice,
        appliedPercentage,
        modifierName,
        calculatedRent,
        deposit,
        isComplimentary: false,
        slabName: slab ? `${slab.minHeadcount}–${slab.maxHeadcount} Pax Slab` : undefined,
      });
    }

    const finalRent =
      customRentOverride !== null && customRentOverride >= 0
        ? customRentOverride
        : totalCalculatedRent;

    return {
      unitCalculations,
      totalCalculatedRent,
      finalRent,
      totalRequiredDeposit,
    };
  }, [selectedUnits, units, preset, nights, timeWindow.startDatetime, customRentOverride]);

  // Set initial default totalPaid to required deposit once computed
  React.useEffect(() => {
    if (!paidTouched && pricingBreakdown.totalRequiredDeposit > 0) {
      setTotalPaid(pricingBreakdown.totalRequiredDeposit);
    }
  }, [pricingBreakdown.totalRequiredDeposit, paidTouched]);

  const balanceDue = Math.max(0, pricingBreakdown.finalRent - (totalPaid || 0));

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneTouched(true);
    setCollisionError(null);

    if (!guestName.trim()) {
      toast.error('Guest full name is required.');
      return;
    }

    if (!isPhoneValid) {
      toast.error('Please enter a valid 10 to 15-digit phone number.');
      return;
    }

    if (selectedUnits.size === 0) {
      toast.error('At least one unit must be selected.');
      return;
    }

    // Build payload matching createBookingSchema
    const unitsPayload = Array.from(selectedUnits.values()).map((sel) => {
      const u = units.find((item) => item.id === sel.unitId);
      const isHall = u?.category === 'NON_AC_HALL' || u?.category === 'AC_HALL';

      let unitStayType = preset;
      if (!isHall && preset === 'MORNING_SLOT') {
        unitStayType = 'DAY_SLOT';
      }

      const calc = pricingBreakdown.unitCalculations.find((c) => c.unitId === sel.unitId);

      return {
        unitId: sel.unitId,
        startDatetime: timeWindow.startDatetime,
        endDatetime: timeWindow.endDatetime,
        status: 'CONFIRMED' as const,
        unitPrice: sel.isComplimentary ? 0 : (calc?.calculatedRent ?? 0),
        deposit: sel.isComplimentary ? 0 : (calc?.deposit ?? 0),
        stayType: unitStayType as any,
        adults: isHall || sel.isComplimentary ? null : sel.adults,
        infants: isHall || sel.isComplimentary ? null : sel.infants,
        headcount: isHall ? sel.headcount : null,
        isComplimentary: sel.isComplimentary,
      };
    });

    const payload = {
      guestName: guestName.trim(),
      guestPhone: guestPhone.trim(),
      guestEmail: guestEmail.trim() ? guestEmail.trim() : null,
      notes: notes.trim() ? notes.trim() : null,
      rentCharge: pricingBreakdown.finalRent,
      totalPaid: totalPaid || 0,
      status: 'CONFIRMED' as const,
      units: unitsPayload,
    };

    setIsSubmitting(true);
    try {
      const response = await createBookingAction(payload);

      if (response.success && response.data) {
        toast.success(`Booking ${response.data.bookingId} confirmed successfully!`);
        router.push('/admin/bookings');
        router.refresh();
      } else {
        // Concurrency or Validation Error
        if (response.code === 'UNIT_SCHEDULE_COLLISION' || response.status === 409) {
          const details = response.data as any;
          setCollisionError({
            code: 'UNIT_SCHEDULE_COLLISION',
            unitName: details?.unitName || 'Selected Unit',
            unitId: details?.unitId,
            conflictingBookingId: details?.bookingId || details?.conflictingBookingId,
            message: response.error || 'This unit is already booked during this time window.',
          });
          // Smoothly scroll to the collision alert
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          toast.error(response.error || 'Failed to create booking.');
        }
      }
    } catch (err: any) {
      console.error('Submission failed:', err);
      toast.error(err?.message || 'Unexpected error creating reservation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 1. Concurrency Collision Alert Banner */}
      {collisionError && (
        <CollisionAlert
          collision={collisionError}
          onDismiss={() => setCollisionError(null)}
          className="mb-6"
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Guest CRM, Timing, Inventory, Occupancy */}
        <div className="lg:col-span-8 space-y-8">
          {/* SECTION 1: Guest CRM Details */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Guest Information</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="guestName" className="text-xs font-medium">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="guestName"
                  required
                  placeholder="e.g. Rashid Ahmed"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="text-base md:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="guestPhone" className="text-xs font-medium">
                  WhatsApp / Phone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="guestPhone"
                  type="tel"
                  inputMode="numeric"
                  required
                  placeholder="+919876543210"
                  value={guestPhone}
                  onChange={(e) => {
                    setGuestPhone(e.target.value);
                    if (!phoneTouched) setPhoneTouched(true);
                  }}
                  onBlur={() => setPhoneTouched(true)}
                  className={cn(
                    'text-base md:text-sm font-mono',
                    phoneErrorMessage && 'border-destructive focus-visible:ring-destructive'
                  )}
                />
                {phoneErrorMessage && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1 font-medium">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {phoneErrorMessage}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="guestEmail" className="text-xs font-medium">
                  Email Address <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  id="guestEmail"
                  type="email"
                  placeholder="guest@example.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="text-base md:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bookingNotes" className="text-xs font-medium">
                  Special Notes / WhatsApp Inquiries{' '}
                  <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  id="bookingNotes"
                  placeholder="e.g. Late check-in requested, BBQ kit"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="text-base md:text-sm"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Timing & Slot Presets */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Timing & Slot Presets</h3>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs hidden sm:flex">
                Asia/Kolkata (IST)
              </Badge>
            </div>

            {/* Tactile Slot Preset Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => handlePresetSelect('OVERNIGHT')}
                className={cn(
                  'flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/40 select-none',
                  preset === 'OVERNIGHT'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs font-semibold'
                    : 'border-border bg-background/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                <span className="text-xs font-bold uppercase tracking-wider">Overnight Stay</span>
                <span className="text-[11px] mt-0.5 opacity-80">12 PM – 11 AM</span>
                <span className="text-[10px] text-muted-foreground mt-1">Domes & A-Frames</span>
              </button>

              <button
                type="button"
                onClick={() => handlePresetSelect('DAY_SLOT')}
                className={cn(
                  'flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/40 select-none',
                  preset === 'DAY_SLOT'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs font-semibold'
                    : 'border-border bg-background/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                <span className="text-xs font-bold uppercase tracking-wider">Day Slot</span>
                <span className="text-[11px] mt-0.5 opacity-80">10 AM – 3 PM</span>
                <span className="text-[10px] text-muted-foreground mt-1">5-Hour Leisure</span>
              </button>

              <button
                type="button"
                onClick={() => handlePresetSelect('MORNING_SLOT')}
                className={cn(
                  'flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/40 select-none',
                  preset === 'MORNING_SLOT'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs font-semibold'
                    : 'border-border bg-background/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                <span className="text-xs font-bold uppercase tracking-wider">Hall Morning</span>
                <span className="text-[11px] mt-0.5 opacity-80">10 AM – 3 PM</span>
                <span className="text-[10px] text-muted-foreground mt-1">Event Hall Slot</span>
              </button>

              <button
                type="button"
                onClick={() => handlePresetSelect('EVENING_SLOT')}
                className={cn(
                  'flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/40 select-none',
                  preset === 'EVENING_SLOT'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs font-semibold'
                    : 'border-border bg-background/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                <span className="text-xs font-bold uppercase tracking-wider">Hall Evening</span>
                <span className="text-[11px] mt-0.5 opacity-80">5 PM – 10 PM</span>
                <span className="text-[10px] text-muted-foreground mt-1">Event Hall Slot</span>
              </button>
            </div>

            {/* Date and Nights Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="checkInDate" className="text-xs font-medium">
                  {preset === 'OVERNIGHT' ? 'Check-in Date' : 'Event / Gathering Date'}
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="checkInDate"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="pl-9 text-base md:text-sm font-mono"
                  />
                </div>
              </div>

              {preset === 'OVERNIGHT' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="stayNights" className="text-xs font-medium">
                    Number of Nights
                  </Label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setNights(n)}
                        className={cn(
                          'flex-1 py-2 text-xs font-semibold rounded-md border transition-all active:scale-[0.98]',
                          nights === n
                            ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                            : 'border-border bg-background hover:bg-muted text-muted-foreground'
                        )}
                      >
                        {n} {n === 1 ? 'Night' : 'Nights'}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Fixed Duration</Label>
                  <div className="h-9 px-3 rounded-md bg-muted/50 border border-border flex items-center text-xs font-medium text-muted-foreground">
                    Flat 5-Hour Standard Slot Package
                  </div>
                </div>
              )}
            </div>

            {/* Resolved Datetime Display Banner */}
            <div className="rounded-lg bg-muted/60 p-3 border border-border text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Timeline:</span>
                <span className="font-mono text-muted-foreground">
                  {formatISTDateTime(timeWindow.startDatetime)}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono text-muted-foreground">
                  {formatISTDateTime(timeWindow.endDatetime)}
                </span>
              </div>
              {isCheckingAvailability && (
                <div className="flex items-center gap-1.5 text-primary text-[11px] font-medium">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Checking Live Schedule...</span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: Unit Selection & Inventory Cockpit */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Home className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Physical Unit Selection & Bundling
                  </h3>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {selectedUnits.size} Unit{selectedUnits.size > 1 ? 's' : ''} Selected
              </Badge>
            </div>

            {/* ROOMS: Geodesic Domes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <span>Geodesic Domes</span>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    (Hard Cap: 3 Adults / 2 Infants)
                  </span>
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {domes.map((unit) => {
                  const isSelected = selectedUnits.has(unit.id);
                  const isAttachedResting = attachedDomeId === unit.id;
                  const avail = availabilityMap[unit.id];
                  const isFree = avail ? avail.isAvailable : true;

                  return (
                    <div
                      key={unit.id}
                      onClick={() => {
                        if (!isHallSelected) {
                          handleToggleRoomUnit(unit);
                        }
                      }}
                      className={cn(
                        'relative rounded-xl border p-4 transition-all duration-150 select-none flex flex-col justify-between gap-3',
                        !isHallSelected && 'cursor-pointer active:scale-[0.98]',
                        isSelected
                          ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                          : 'border-border bg-card hover:bg-muted/40',
                        !isFree && 'border-destructive/30 bg-destructive/5'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{unit.name}</span>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Standard Cap: 3 pax • Extra beds: strictly 0
                          </p>
                        </div>

                        {/* Availability Chip */}
                        <div>
                          {isCheckingAvailability ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Checking
                            </span>
                          ) : isFree ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Available
                            </span>
                          ) : (
                            <span
                              title={
                                avail?.conflicts[0]
                                  ? `Booked (${avail.conflicts[0].bookingId || 'Stay'})`
                                  : 'Booked'
                              }
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-destructive/10 text-destructive border border-destructive/20"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                              Booked
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Conflict details hint if unavailable */}
                      {!isFree && avail?.conflicts[0] && (
                        <div className="text-[11px] text-destructive/90 bg-destructive/10 px-2 py-1 rounded border border-destructive/20">
                          Conflict: {avail.conflicts[0].bookingId || 'Overlapping Stay'} (
                          {avail.conflicts[0].guestName})
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ROOMS: A-Frames */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <span>A-Frame Cottages</span>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    (Hard Cap: 5 Adults / 4 Infants • Double + Queen beds)
                  </span>
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {aFrames.map((unit) => {
                  const isSelected = selectedUnits.has(unit.id);
                  const avail = availabilityMap[unit.id];
                  const isFree = avail ? avail.isAvailable : true;

                  return (
                    <div
                      key={unit.id}
                      onClick={() => {
                        if (!isHallSelected) {
                          handleToggleRoomUnit(unit);
                        }
                      }}
                      className={cn(
                        'relative rounded-xl border p-4 transition-all duration-150 select-none flex flex-col justify-between gap-3',
                        !isHallSelected && 'cursor-pointer active:scale-[0.98]',
                        isSelected
                          ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                          : 'border-border bg-card hover:bg-muted/40',
                        !isFree && 'border-destructive/30 bg-destructive/5'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{unit.name}</span>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Standard Cap: 5 pax • Extra beds: strictly 0
                          </p>
                        </div>

                        <div>
                          {isCheckingAvailability ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Checking
                            </span>
                          ) : isFree ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-destructive/10 text-destructive border border-destructive/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                              Booked
                            </span>
                          )}
                        </div>
                      </div>

                      {!isFree && avail?.conflicts[0] && (
                        <div className="text-[11px] text-destructive/90 bg-destructive/10 px-2 py-1 rounded border border-destructive/20">
                          Conflict: {avail.conflicts[0].bookingId || 'Overlapping Stay'} (
                          {avail.conflicts[0].guestName})
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* EVENT HALLS */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <span>Event Halls & Banquets</span>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    (Booked by Morning / Evening Slots • Pool excluded)
                  </span>
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {halls.map((unit) => {
                  const isSelected = selectedUnits.has(unit.id);
                  const avail = availabilityMap[unit.id];
                  const isFree = avail ? avail.isAvailable : true;

                  return (
                    <div
                      key={unit.id}
                      onClick={() => handleSelectHall(unit)}
                      className={cn(
                        'relative rounded-xl border p-4 transition-all duration-150 cursor-pointer select-none flex flex-col justify-between gap-3 active:scale-[0.98]',
                        isSelected
                          ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                          : 'border-border bg-card hover:bg-muted/40',
                        !isFree && 'border-destructive/30 bg-destructive/5'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{unit.name}</span>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Max Capacity: {unit.maxCapacity.toLocaleString()} Pax • Slabs applied
                          </p>
                        </div>

                        <div>
                          {isCheckingAvailability ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Checking
                            </span>
                          ) : isFree ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-destructive/10 text-destructive border border-destructive/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                              Booked
                            </span>
                          )}
                        </div>
                      </div>

                      {!isFree && avail?.conflicts[0] && (
                        <div className="text-[11px] text-destructive/90 bg-destructive/10 px-2 py-1 rounded border border-destructive/20">
                          Conflict: {avail.conflicts[0].bookingId || 'Event Slot Overlap'} (
                          {avail.conflicts[0].guestName})
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* EVENT HALL DOME SUB-PANEL */}
            {isHallSelected && (
              <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4 animate-in fade-in zoom-in-96 duration-150 ease-[var(--ease-snappy)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <h4 className="text-sm font-semibold text-foreground">
                      Event Hall Resting Dome Sub-Panel
                    </h4>
                  </div>
                  {isComplimentaryEligible ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs">
                      Eligible for 1 Complimentary Attached Dome
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Headcount &lt; 400 Pax (Custom / Bundled Tariff)
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Resting Domes attached to the Event Hall automatically synchronize their timing with the
                  event slot ({preset === 'MORNING_SLOT' ? '10 AM–3 PM' : '5 PM–10 PM'}). Overlapping overnight
                  stays show in red.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {domes.map((dome) => {
                    const isAttached = attachedDomeId === dome.id;
                    const avail = availabilityMap[dome.id];
                    const isFree = avail ? avail.isAvailable : true;

                    return (
                      <div
                        key={dome.id}
                        className={cn(
                          'rounded-lg border p-3 flex items-center justify-between gap-3 transition-all',
                          isAttached
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-border bg-background'
                        )}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">{dome.name}</span>
                            {isAttached && (
                              <Badge className="bg-emerald-600 text-[10px] py-0 px-1.5 h-4">
                                Attached {isComplimentaryEligible ? '• ₹0 Free' : ''}
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px]">
                            {isFree ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Available during slot
                              </span>
                            ) : (
                              <span className="text-destructive font-medium flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                                Overlap: {avail?.conflicts[0]?.bookingId || 'Overnight Guest'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <Button
                            type="button"
                            size="sm"
                            variant={isAttached ? 'default' : 'outline'}
                            onClick={() => handleToggleAttachedDome(dome)}
                            className={cn(
                              'h-8 text-xs active:scale-[0.98]',
                              isAttached && 'bg-emerald-600 hover:bg-emerald-700'
                            )}
                          >
                            {isAttached ? 'Remove' : 'Attach Dome'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: Occupancy & Capacity Enforcement */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Occupancy Specifications</h3>
                  <p className="text-xs text-muted-foreground">
                    Strict capacity hard caps • Zero event type tracking per domain spec
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                No Extra Beds Policy
              </Badge>
            </div>

            {isHallSelected ? (
              /* EVENT HALL HEADCOUNT */
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {selectedHallUnit?.name} Attendee Headcount
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Slab tariff applies dynamically based on guest count (1 to{' '}
                        {selectedHallUnit?.maxCapacity} Pax)
                      </p>
                    </div>
                    <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
                      {hallHeadcount} Pax
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={selectedHallUnit?.maxCapacity ?? 2000}
                      value={hallHeadcount}
                      onChange={(e) => handleHeadcountChange(parseInt(e.target.value, 10) || 1)}
                      className="text-base md:text-sm font-mono max-w-[200px]"
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      {[100, 250, 400, 600, 800, 1000].map((presetPax) => (
                        <button
                          key={presetPax}
                          type="button"
                          onClick={() => handleHeadcountChange(presetPax)}
                          className={cn(
                            'px-2.5 py-1 text-xs rounded-md border transition-all active:scale-[0.98]',
                            hallHeadcount === presetPax
                              ? 'border-primary bg-primary text-primary-foreground font-semibold'
                              : 'border-border bg-background hover:bg-muted text-muted-foreground'
                          )}
                        >
                          {presetPax} Pax
                        </button>
                      ))}
                    </div>
                  </div>

                  {hallHeadcount >= 400 ? (
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2.5 rounded-md border border-emerald-500/20">
                      <Sparkles className="h-4 w-4 shrink-0" />
                      <span>
                        Eligible for 1 Complimentary Attached Resting Dome (Headcount $\ge$ 400 Pax).
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Reaching 400+ attendees unlocks 1 complimentary resting Dome during event hours.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ROOMS ADULTS & INFANTS */
              <div className="space-y-4">
                {Array.from(selectedUnits.entries()).map(([unitId, selState]) => {
                  const unit = units.find((u) => u.id === unitId);
                  if (!unit) return null;

                  const isDome = unit.category === 'DOME';
                  const maxAdults = isDome ? 3 : 5;
                  const maxInfants = isDome ? 2 : 4;

                  return (
                    <div
                      key={unitId}
                      className="rounded-lg border border-border p-4 bg-muted/20 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{unit.name}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {isDome ? 'Max 3 Adults / 2 Infants' : 'Max 5 Adults / 4 Infants'}
                          </Badge>
                        </div>
                        <span className="text-xs text-destructive font-medium">Strictly 0 Extra Beds</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Adults Counter */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-foreground flex items-center gap-1">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              Adults (3+ years)
                            </span>
                            <span className="font-mono text-muted-foreground">
                              {selState.adults} / {maxAdults}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={selState.adults <= 1}
                              onClick={() =>
                                handleOccupancyChange(unitId, 'adults', -1, maxAdults)
                              }
                              className="h-9 w-9 p-0 text-base active:scale-[0.98]"
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={maxAdults}
                              value={selState.adults}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val)) {
                                  handleOccupancyChange(
                                    unitId,
                                    'adults',
                                    val - selState.adults,
                                    maxAdults
                                  );
                                }
                              }}
                              className="text-center font-mono text-base md:text-sm h-9"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={selState.adults >= maxAdults}
                              onClick={() =>
                                handleOccupancyChange(unitId, 'adults', 1, maxAdults)
                              }
                              className="h-9 w-9 p-0 text-base active:scale-[0.98]"
                            >
                              +
                            </Button>
                          </div>
                        </div>

                        {/* Infants Counter */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-foreground flex items-center gap-1">
                              <Baby className="h-3.5 w-3.5 text-muted-foreground" />
                              Infants (Under 3 years)
                            </span>
                            <span className="font-mono text-muted-foreground">
                              {selState.infants} / {maxInfants}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={selState.infants <= 0}
                              onClick={() =>
                                handleOccupancyChange(unitId, 'infants', -1, maxInfants)
                              }
                              className="h-9 w-9 p-0 text-base active:scale-[0.98]"
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              max={maxInfants}
                              value={selState.infants}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val)) {
                                  handleOccupancyChange(
                                    unitId,
                                    'infants',
                                    val - selState.infants,
                                    maxInfants
                                  );
                                }
                              }}
                              className="text-center font-mono text-base md:text-sm h-9"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={selState.infants >= maxInfants}
                              onClick={() =>
                                handleOccupancyChange(unitId, 'infants', 1, maxInfants)
                              }
                              className="h-9 w-9 p-0 text-base active:scale-[0.98]"
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Live Pricing Summary Card & Submission CTA */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-md sticky top-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Live Pricing Summary</h3>
                  <p className="text-xs text-muted-foreground">Dynamic slab & modifier resolution</p>
                </div>
              </div>
            </div>

            {/* Itemized Unit Calculations */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Itemized Tariffs
              </span>

              <div className="space-y-2.5">
                {pricingBreakdown.unitCalculations.map((calc) => (
                  <div
                    key={calc.unitId}
                    className="p-3 rounded-lg bg-muted/30 border border-border space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{calc.unit.name}</span>
                      <span className="font-mono font-bold text-foreground tabular-nums">
                        ₹&nbsp;{calc.calculatedRent.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-muted-foreground">
                      <span>{calc.slabName || 'Base Tariff'}</span>
                      {calc.modifierName && (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          {calc.modifierName}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Calculated Unit Rent:</span>
                <span className="font-mono font-medium text-foreground tabular-nums">
                  ₹&nbsp;{pricingBreakdown.totalCalculatedRent.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Rent Charge Override Input */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <Label htmlFor="rentChargeOverride" className="font-semibold text-foreground">
                    Agreed Rent Charge (₹)
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Admin Override</span>
                </div>
                <Input
                  id="rentChargeOverride"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={
                    customRentOverride !== null
                      ? customRentOverride
                      : pricingBreakdown.totalCalculatedRent
                  }
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setCustomRentOverride(isNaN(val) ? 0 : val);
                  }}
                  className="text-base md:text-sm font-mono font-bold tabular-nums"
                />
              </div>

              {/* Required Advance Notice */}
              <div className="flex items-center justify-between text-xs bg-muted/40 p-2.5 rounded-lg border border-border">
                <span className="text-muted-foreground">Required Advance:</span>
                <span className="font-mono font-semibold text-primary tabular-nums">
                  ₹&nbsp;{pricingBreakdown.totalRequiredDeposit.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Advance Paid via WhatsApp / UPI */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <Label htmlFor="totalPaidInput" className="font-semibold text-foreground">
                    Advance Collected / Total Paid (₹) <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[10px] text-muted-foreground">UPI / WhatsApp</span>
                </div>
                <Input
                  id="totalPaidInput"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={totalPaid}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setTotalPaid(isNaN(val) ? 0 : val);
                    setPaidTouched(true);
                  }}
                  className="text-base md:text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums"
                />
              </div>

              {/* Outstanding Balance Due */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-medium text-muted-foreground">Balance Due at Check-in:</span>
                <span
                  className={cn(
                    'font-mono font-bold tabular-nums',
                    balanceDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'
                  )}
                >
                  ₹&nbsp;{balanceDue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Submission Action CTA */}
            <div className="pt-2">
              <Button
                type="submit"
                loading={isSubmitting}
                disabled={isSubmitting || selectedUnits.size === 0}
                className="w-full h-11 text-base font-semibold shadow-md active:scale-[0.98] transition-transform select-none"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirm reservation
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
