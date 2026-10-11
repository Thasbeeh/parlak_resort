import { z } from 'zod';

/**
 * Unit category enums matching PostgreSQL / Prisma schema
 */
export const UnitTypeEnum = z.enum([
  'DOME',
  'A_FRAME',
  'NON_AC_HALL',
  'AC_HALL',
]);
export type UnitType = z.infer<typeof UnitTypeEnum>;

/**
 * Stay / gathering slot type enums matching domain specifications & Prisma schema
 */
export const StayTypeEnum = z.enum([
  'OVERNIGHT',
  'DAY_SLOT',
  'MORNING_SLOT',
  'EVENING_SLOT',
]);
export type StayType = z.infer<typeof StayTypeEnum>;

/**
 * Price modifier type enums (Weekend surge / Seasonal promotion)
 * Strictly matches parlak-domain: Seasonal Promotions (Date Range) and Weekend Rates (Sat/Sun)
 */
export const PriceModifierTypeEnum = z.enum(['WEEKEND', 'SEASONAL']);
export type PriceModifierType = z.infer<typeof PriceModifierTypeEnum>;

/**
 * Mandatory slot mappings per unit type.
 * - Domes & A-Frames strictly require both OVERNIGHT and DAY_SLOT slabs.
 * - Event Halls strictly require both MORNING_SLOT and EVENING_SLOT slabs.
 */
export const UNIT_STAY_TYPES: Record<UnitType, readonly StayType[]> = {
  DOME: ['OVERNIGHT', 'DAY_SLOT'] as const,
  A_FRAME: ['OVERNIGHT', 'DAY_SLOT'] as const,
  NON_AC_HALL: ['MORNING_SLOT', 'EVENING_SLOT'] as const,
  AC_HALL: ['MORNING_SLOT', 'EVENING_SLOT'] as const,
};

/**
 * Physical Capacity Ceilings from Parlak Resort domain rules
 */
export const UNIT_MAX_CAPACITIES: Record<UnitType, number> = {
  DOME: 3,
  A_FRAME: 5,
  NON_AC_HALL: 1200,
  AC_HALL: 2000,
};

/**
 * Helper utility to generate slug from profile name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const UUID_OR_SLUG_ID = z
  .string()
  .trim()
  .min(1, 'ID must not be empty');

/**
 * Individual Price Slab Schema (matches Prisma model PriceSlab)
 * Represents a single headcount tier (e.g. 1-2 pax: ₹4,000, 3-5 pax: ₹6,500)
 */
export const priceSlabSchema = z
  .object({
    id: UUID_OR_SLUG_ID.optional(),
    priceListId: UUID_OR_SLUG_ID.optional(),
    stayType: StayTypeEnum,
    minHeadcount: z
      .number({ message: 'Minimum headcount must be an integer' })
      .int('Minimum headcount must be an integer')
      .min(1, 'Minimum headcount must be at least 1'),
    maxHeadcount: z
      .number({ message: 'Maximum headcount must be an integer' })
      .int('Maximum headcount must be an integer')
      .min(1, 'Maximum headcount must be at least 1'),
    basePrice: z
      .number({ message: 'Base price must be a valid number' })
      .finite('Base price must be finite')
      .positive('Base price must be greater than 0'),
    requiredDeposit: z
      .number({ message: 'Required deposit must be a valid number' })
      .finite('Required deposit must be finite')
      .min(0, 'Required advance deposit cannot be negative'),
  })
  .refine((data) => data.minHeadcount <= data.maxHeadcount, {
    message: 'minHeadcount cannot exceed maxHeadcount',
    path: ['maxHeadcount'],
  })
  .refine((data) => data.requiredDeposit <= data.basePrice, {
    message: 'Required deposit cannot exceed base price',
    path: ['requiredDeposit'],
  });

export type PriceSlabInput = z.infer<typeof priceSlabSchema>;

/**
 * Base Price Modifier Schema Definition
 * 
 * Enforces parlak-domain rules:
 * 1. Percentage values strictly constrained between -80% and +200% (prevents extreme exploits/negative rent).
 * 2. Strict Date Range Requirement for ALL Modifiers: explicit startDate and endDate.
 * 3. Bounded range: endDate >= startDate (mirrors PostgreSQL constraint chk_pricemodifier_dates).
 */
export const priceModifierBaseSchema = z.object({
  id: UUID_OR_SLUG_ID.optional(),
  priceListId: UUID_OR_SLUG_ID.optional(),
  name: z
    .string({ message: 'Modifier name is required' })
    .trim()
    .min(1, 'Modifier name is required')
    .max(100, 'Modifier name must not exceed 100 characters'),
  type: PriceModifierTypeEnum,
  percentage: z
    .number({ message: 'Percentage variance must be a number' })
    .finite('Percentage variance must be finite')
    .min(-80, 'Discount percentage cannot exceed -80%')
    .max(200, 'Surge percentage cannot exceed +200%'),
  startDate: z.coerce.date({ message: 'Start date is required' }),
  endDate: z.coerce.date({ message: 'End date is required' }),
  isActive: z.boolean().default(true),
  expectedUpdatedAt: z.coerce.date().optional(),
});

export const priceModifierSchema = priceModifierBaseSchema.refine(
  (data) => data.endDate >= data.startDate,
  {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  }
);

export type PriceModifierInput = z.infer<typeof priceModifierSchema>;

/**
 * Standalone Price Modifier Creation Schema (requires target priceListId)
 */
export const createPriceModifierSchema = priceModifierBaseSchema
  .extend({
    priceListId: UUID_OR_SLUG_ID,
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export type CreatePriceModifierInput = z.infer<typeof createPriceModifierSchema>;

/**
 * Price Modifier Update Schema (requires modifier ID and OCC expectedUpdatedAt)
 */
export const updatePriceModifierSchema = priceModifierBaseSchema
  .extend({
    id: UUID_OR_SLUG_ID,
    expectedUpdatedAt: z.coerce.date({
      message: 'Optimistic concurrency control timestamp is required',
    }),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export type UpdatePriceModifierInput = z.infer<typeof updatePriceModifierSchema>;

/**
 * Base object definition for a Price List before superRefine validation
 * (matches Prisma model PriceList, including nested slabs and optional modifiers)
 */
export const priceListBaseSchema = z.object({
  id: UUID_OR_SLUG_ID.optional(),
  name: z
    .string({ message: 'Price list name is required' })
    .trim()
    .min(1, 'Price list name is required')
    .max(100, 'Price list name must not exceed 100 characters'),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase alphanumeric with hyphens'
    )
    .optional(),
  unitType: UnitTypeEnum,
  maxGuestCapacity: z
    .number({ message: 'Max guest capacity must be an integer' })
    .int('Max guest capacity must be an integer')
    .min(1, 'Max guest capacity must be at least 1'),
  slabs: z
    .array(priceSlabSchema)
    .min(1, 'At least one pricing slab is required'),
  modifiers: z.array(priceModifierSchema).optional(),
  expectedUpdatedAt: z.coerce.date().optional(),
});

/**
 * Helper to run contiguous and capacity validations on Price Lists
 */
function validatePriceList(
  data: z.infer<typeof priceListBaseSchema>,
  ctx: z.RefinementCtx
) {
  const allowedStayTypes = UNIT_STAY_TYPES[data.unitType];
  const maxAllowedCapacity = UNIT_MAX_CAPACITIES[data.unitType];

  // 1. Guardrail: Max capacity physical ceiling check
  if (data.maxGuestCapacity > maxAllowedCapacity) {
    ctx.addIssue({
      code: 'custom',
      message: `Max guest capacity for ${data.unitType} cannot exceed physical ceiling of ${maxAllowedCapacity}.`,
      path: ['maxGuestCapacity'],
    });
  }

  // 2. Verify that all slabs correspond to allowed stay types for this unit category
  data.slabs.forEach((slab, index) => {
    if (!allowedStayTypes.includes(slab.stayType)) {
      ctx.addIssue({
        code: 'custom',
        message: `Invalid stayType "${slab.stayType}" for unit type ${data.unitType}. Allowed: ${allowedStayTypes.join(', ')}`,
        path: ['slabs', index, 'stayType'],
      });
    }
  });

  // 3. Mandatory Slot Types Rule: Ensure slabs for all required slot types are defined
  for (const requiredType of allowedStayTypes) {
    const matchingSlabs = data.slabs.filter((s) => s.stayType === requiredType);
    if (matchingSlabs.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: `Price list for ${data.unitType} must define at least one slab for ${requiredType}`,
        path: ['slabs'],
      });
    }
  }

  // 4. Group slabs by stayType
  const slabsByStayType = new Map<StayType, (typeof data.slabs)[number][]>();
  for (const slab of data.slabs) {
    const group = slabsByStayType.get(slab.stayType) ?? [];
    group.push(slab);
    slabsByStayType.set(slab.stayType, group);
  }

  // 5. Validate contiguous sequence and bounds for each stayType
  const isRoomUnit = data.unitType === 'DOME' || data.unitType === 'A_FRAME';

  for (const [stayType, group] of slabsByStayType.entries()) {
    // Sort by minHeadcount ascending
    const sorted = [...group].sort((a, b) => a.minHeadcount - b.minHeadcount);

    if (sorted.length === 0) continue;

    // Rule: Floor check
    // Rooms must always start at minHeadcount === 1
    // Halls must start at minHeadcount >= 1 (supports opening tiers like 10 pax per event_hall.md)
    if (isRoomUnit && sorted[0].minHeadcount !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: `The lowest slab for ${stayType} must start at minHeadcount = 1 (found ${sorted[0].minHeadcount})`,
        path: ['slabs'],
      });
    } else if (!isRoomUnit && sorted[0].minHeadcount < 1) {
      ctx.addIssue({
        code: 'custom',
        message: `The lowest slab for ${stayType} must have minHeadcount >= 1 (found ${sorted[0].minHeadcount})`,
        path: ['slabs'],
      });
    }

    // Rule: Ensure sorted[i].minHeadcount === sorted[i-1].maxHeadcount + 1 (perfectly contiguous, no gaps/overlaps)
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const expectedMin = prev.maxHeadcount + 1;

      if (curr.minHeadcount !== expectedMin) {
        ctx.addIssue({
          code: 'custom',
          message: `Slabs for ${stayType} must be contiguous with no gaps or overlaps. Expected slab with minHeadcount ${expectedMin} following maxHeadcount ${prev.maxHeadcount}, but found ${curr.minHeadcount}`,
          path: ['slabs'],
        });
      }
    }

    // Rule: Ensure highest slab maxHeadcount <= maxGuestCapacity
    const highestSlab = sorted[sorted.length - 1];
    if (highestSlab.maxHeadcount > data.maxGuestCapacity) {
      ctx.addIssue({
        code: 'custom',
        message: `Highest slab maxHeadcount (${highestSlab.maxHeadcount}) for ${stayType} exceeds Price List maxGuestCapacity (${data.maxGuestCapacity})`,
        path: ['slabs'],
      });
    }
  }
}

/**
 * Price List Schema with High-Complexity Domain Guardrails
 */
export const priceListSchema = priceListBaseSchema.superRefine((data, ctx) => {
  validatePriceList(data, ctx);
});

export type PriceListInput = z.infer<typeof priceListSchema>;

export const createPriceListSchema = priceListSchema;
export type CreatePriceListInput = PriceListInput;

/**
 * Price List Update Schema (strictly enforces OCC expectedUpdatedAt timestamp)
 */
export const updatePriceListSchema = priceListBaseSchema
  .extend({
    id: UUID_OR_SLUG_ID,
    expectedUpdatedAt: z.coerce.date({
      message: 'Optimistic concurrency control timestamp is required',
    }),
  })
  .superRefine((data, ctx) => {
    validatePriceList(data, ctx);
  });

export type UpdatePriceListInput = z.infer<typeof updatePriceListSchema>;
