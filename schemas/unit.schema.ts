import { z } from 'zod';
import { UnitTypeEnum } from './price.schema';

/**
 * Unit Physical Capacity Boundaries & Constants from Parlak Domain
 */
export const UNIT_CAPACITY_LIMITS = {
  DOME: {
    maxAdults: 3,
    maxInfants: 2,
    extraBedsAllowed: false,
    defaultAdvanceSeed: 2000,
  },
  A_FRAME: {
    maxAdults: 5,
    maxInfants: 4,
    extraBedsAllowed: false,
    defaultAdvanceSeed: 2000,
  },
  NON_AC_HALL: {
    maxCapacity: 1200,
    maxInfants: 0,
  },
  AC_HALL: {
    maxCapacity: 2000,
    maxInfants: 0,
  },
} as const;

/**
 * Standard Amenities for Unit Configuration
 */
export const STANDARD_AMENITIES = [
  'Private Pool',
  'AC',
  'Wi-Fi',
  'Smart TV',
  'Bluetooth Speaker',
  'Common Refrigerator',
  'UPS',
  'Attached Bathroom',
  'Double Bed',
  'Queen Bed',
] as const;

/**
 * Identifier schemas for Unit and PriceList.
 * Accepts standard UUIDs as well as domain slug identifiers (e.g. 'dome-1', 'price-list-dome').
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNIT_SLUG_REGEX = /^(dome-\d+|aframe-\d+|hall-non-ac|hall-ac)$/i;
const PRICE_LIST_SLUG_REGEX = /^price-list-[a-zA-Z0-9_-]+$/i;

export const unitIdSchema = z
  .string({ message: 'Invalid unit ID' })
  .trim()
  .refine(
    (val) => UUID_REGEX.test(val) || UNIT_SLUG_REGEX.test(val),
    { message: 'Invalid unit ID format' }
  );

export const priceListIdSchema = z
  .string({ message: 'Mandatory price list attachment is required' })
  .trim()
  .refine(
    (val) => UUID_REGEX.test(val) || PRICE_LIST_SLUG_REGEX.test(val),
    { message: 'Invalid price list ID format' }
  );

/**
 * Base Unit Object Definition before superRefine validation
 */
export const unitBaseSchema = z.object({
  id: unitIdSchema.optional(),
  name: z
    .string({ message: 'Unit name is required' })
    .trim()
    .min(1, 'Unit name is required')
    .max(100, 'Unit name cannot exceed 100 characters'),
  category: UnitTypeEnum,
  isActive: z.boolean().default(true),
  maxCapacity: z
    .number({ message: 'Physical capacity must be an integer' })
    .int('Physical capacity must be an integer')
    .min(1, 'Physical capacity must be at least 1'),
  maxInfants: z
    .number({ message: 'Max infants must be an integer' })
    .int('Max infants must be an integer')
    .min(0, 'Max infants cannot be negative')
    .default(0),
  amenities: z
    .union([
      z.string().trim(),
      z.array(z.string()).transform((arr) =>
        arr
          .map((s) => s.trim())
          .filter(Boolean)
          .join(', ')
      ),
    ])
    .default(''),
  priceListId: priceListIdSchema,
  expectedUpdatedAt: z.coerce.date().optional(),
});

/**
 * Unit Creation & Update Schema
 * Validates physical capacities, unit categories, and mandatory rate plan attachment.
 */
export const unitSchema = unitBaseSchema.superRefine((data, ctx) => {
  // Validate unit-specific hard caps
  if (data.category === 'DOME') {
    if (data.maxCapacity > UNIT_CAPACITY_LIMITS.DOME.maxAdults) {
      ctx.addIssue({
        code: 'custom',
        message: `Domes have a hard physical cap of ${UNIT_CAPACITY_LIMITS.DOME.maxAdults} adults. Strictly no extra beds permitted.`,
        path: ['maxCapacity'],
      });
    }
    if (data.maxInfants > UNIT_CAPACITY_LIMITS.DOME.maxInfants) {
      ctx.addIssue({
        code: 'custom',
        message: `Domes support a maximum of ${UNIT_CAPACITY_LIMITS.DOME.maxInfants} infants.`,
        path: ['maxInfants'],
      });
    }
  } else if (data.category === 'A_FRAME') {
    if (data.maxCapacity > UNIT_CAPACITY_LIMITS.A_FRAME.maxAdults) {
      ctx.addIssue({
        code: 'custom',
        message: `A-Frames have a hard physical cap of ${UNIT_CAPACITY_LIMITS.A_FRAME.maxAdults} adults. Strictly no extra beds permitted.`,
        path: ['maxCapacity'],
      });
    }
    if (data.maxInfants > UNIT_CAPACITY_LIMITS.A_FRAME.maxInfants) {
      ctx.addIssue({
        code: 'custom',
        message: `A-Frames support a maximum of ${UNIT_CAPACITY_LIMITS.A_FRAME.maxInfants} infants.`,
        path: ['maxInfants'],
      });
    }
  } else if (data.category === 'NON_AC_HALL') {
    if (data.maxCapacity > UNIT_CAPACITY_LIMITS.NON_AC_HALL.maxCapacity) {
      ctx.addIssue({
        code: 'custom',
        message: `Non-AC Event Hall physical capacity cannot exceed ${UNIT_CAPACITY_LIMITS.NON_AC_HALL.maxCapacity} pax.`,
        path: ['maxCapacity'],
      });
    }
    if (data.maxInfants > 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Event Halls do not track separate infant capacity; all attendees are counted in total headcount.',
        path: ['maxInfants'],
      });
    }
  } else if (data.category === 'AC_HALL') {
    if (data.maxCapacity > UNIT_CAPACITY_LIMITS.AC_HALL.maxCapacity) {
      ctx.addIssue({
        code: 'custom',
        message: `AC Event Hall physical capacity cannot exceed ${UNIT_CAPACITY_LIMITS.AC_HALL.maxCapacity} pax.`,
        path: ['maxCapacity'],
      });
    }
    if (data.maxInfants > 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Event Halls do not track separate infant capacity; all attendees are counted in total headcount.',
        path: ['maxInfants'],
      });
    }
  }
});

export type UnitInput = z.infer<typeof unitSchema>;

export const createUnitSchema = unitSchema;
export type CreateUnitInput = UnitInput;

export const updateUnitSchema = unitBaseSchema
  .extend({
    id: unitIdSchema,
    expectedUpdatedAt: z.coerce.date({
      message: 'Optimistic concurrency control timestamp is required',
    }),
  })
  .superRefine((data, ctx) => {
    if (data.category === 'DOME') {
      if (data.maxCapacity > UNIT_CAPACITY_LIMITS.DOME.maxAdults) {
        ctx.addIssue({
          code: 'custom',
          message: `Domes have a hard physical cap of ${UNIT_CAPACITY_LIMITS.DOME.maxAdults} adults. Strictly no extra beds permitted.`,
          path: ['maxCapacity'],
        });
      }
      if (data.maxInfants > UNIT_CAPACITY_LIMITS.DOME.maxInfants) {
        ctx.addIssue({
          code: 'custom',
          message: `Domes support a maximum of ${UNIT_CAPACITY_LIMITS.DOME.maxInfants} infants.`,
          path: ['maxInfants'],
        });
      }
    } else if (data.category === 'A_FRAME') {
      if (data.maxCapacity > UNIT_CAPACITY_LIMITS.A_FRAME.maxAdults) {
        ctx.addIssue({
          code: 'custom',
          message: `A-Frames have a hard physical cap of ${UNIT_CAPACITY_LIMITS.A_FRAME.maxAdults} adults. Strictly no extra beds permitted.`,
          path: ['maxCapacity'],
        });
      }
      if (data.maxInfants > UNIT_CAPACITY_LIMITS.A_FRAME.maxInfants) {
        ctx.addIssue({
          code: 'custom',
          message: `A-Frames support a maximum of ${UNIT_CAPACITY_LIMITS.A_FRAME.maxInfants} infants.`,
          path: ['maxInfants'],
        });
      }
    } else if (data.category === 'NON_AC_HALL') {
      if (data.maxCapacity > UNIT_CAPACITY_LIMITS.NON_AC_HALL.maxCapacity) {
        ctx.addIssue({
          code: 'custom',
          message: `Non-AC Event Hall physical capacity cannot exceed ${UNIT_CAPACITY_LIMITS.NON_AC_HALL.maxCapacity} pax.`,
          path: ['maxCapacity'],
        });
      }
      if (data.maxInfants > 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'Event Halls do not track separate infant capacity; all attendees are counted in total headcount.',
          path: ['maxInfants'],
        });
      }
    } else if (data.category === 'AC_HALL') {
      if (data.maxCapacity > UNIT_CAPACITY_LIMITS.AC_HALL.maxCapacity) {
        ctx.addIssue({
          code: 'custom',
          message: `AC Event Hall physical capacity cannot exceed ${UNIT_CAPACITY_LIMITS.AC_HALL.maxCapacity} pax.`,
          path: ['maxCapacity'],
        });
      }
      if (data.maxInfants > 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'Event Halls do not track separate infant capacity; all attendees are counted in total headcount.',
          path: ['maxInfants'],
        });
      }
    }
  });

export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;

/**
 * Toggle Unit Status Schema
 * Used when activating or deactivating a unit (with pre-deactivation future booking guardrail).
 */
export const toggleUnitStatusSchema = z.object({
  unitId: unitIdSchema,
  isActive: z.boolean(),
  expectedUpdatedAt: z.coerce.date().optional(),
});

export type ToggleUnitStatusInput = z.infer<typeof toggleUnitStatusSchema>;
