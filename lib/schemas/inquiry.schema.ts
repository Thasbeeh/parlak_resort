import { z } from 'zod';
import { UNIT_CAPACITY_LIMITS } from '../../schemas/unit.schema';

/**
 * Unit category definitions for public inquiries
 */
export const unitCategorySchema = z.enum([
  'DOME',
  'A_FRAME',
  'NON_AC_HALL',
  'AC_HALL',
  'HALL',
]);

export const roomCategorySchema = z.enum(['DOME', 'A_FRAME']);
export const hallCategorySchema = z.enum(['NON_AC_HALL', 'AC_HALL']);

export const stayTypeSchema = z.enum([
  'OVERNIGHT',
  'DAY_SLOT',
  'MORNING_SLOT',
  'EVENING_SLOT',
]);

export const roomStayTypeSchema = z.enum(['OVERNIGHT', 'DAY_SLOT']);
export const hallSlotTypeSchema = z.enum(['MORNING_SLOT', 'EVENING_SLOT']);

/**
 * Individual room configuration within a multi-room reservation request
 */
export const roomItemSchema = z.object({
  roomIndex: z.number().int().positive().optional().nullable(),
  adults: z.number().int().min(1, 'Each room requires at least 1 adult'),
  infants: z
    .number()
    .int()
    .min(0, 'Infants count cannot be negative')
    .nullish()
    .transform((val) => val ?? 0),
});

/**
 * Flexible phone number validator (10 to 15 digits)
 */
export const guestPhoneSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val) return true;
      const digitsOnly = val.replace(/\D/g, '');
      return digitsOnly.length >= 10 && digitsOnly.length <= 15;
    },
    { message: 'Phone number must contain between 10 and 15 digits' }
  )
  .optional()
  .nullable()
  .or(z.literal(''));

/**
 * Room Inquiry Schema (Domes & A-Frames)
 * Strictly enforces:
 * - Hard occupancy caps:
 *   - Dome: max 3 adults, max 2 infants per room.
 *   - A-Frame: max 5 adults, max 4 infants per room.
 * - Overnight stays require checkOutDate strictly after checkInDate.
 */
export const roomInquirySchema = z
  .object({
    type: z.literal('ROOM'),
    unitCategory: roomCategorySchema,
    unitId: z.string().optional().nullable(),
    stayType: roomStayTypeSchema,
    checkInDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Check-in date must be in YYYY-MM-DD format'),
    checkOutDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Check-out date must be in YYYY-MM-DD format')
      .optional()
      .nullable(),
    rooms: z
      .array(roomItemSchema)
      .min(1, 'At least one room must be selected'),
    guestName: z.string().trim().optional().nullable(),
    guestPhone: guestPhoneSchema,
    specialRequests: z.string().trim().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // 1. Overnight stay requires valid checkout after checkin
    if (data.stayType === 'OVERNIGHT') {
      if (!data.checkOutDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Check-out date is required for overnight stays',
          path: ['checkOutDate'],
        });
      } else if (data.checkOutDate <= data.checkInDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Check-out date must be strictly after check-in date',
          path: ['checkOutDate'],
        });
      }
    }

    // 2. Strict room occupancy limits from domain constants
    const isDome = data.unitCategory === 'DOME';
    const limits = isDome ? UNIT_CAPACITY_LIMITS.DOME : UNIT_CAPACITY_LIMITS.A_FRAME;
    const categoryLabel = isDome ? 'Dome' : 'A-Frame';

    data.rooms.forEach((room, index) => {
      if (room.adults > limits.maxAdults) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${categoryLabel} strictly allows a maximum of ${limits.maxAdults} adults per unit. Extra beds are not permitted.`,
          path: ['rooms', index, 'adults'],
        });
      }
      if (room.infants > limits.maxInfants) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${categoryLabel} strictly allows a maximum of ${limits.maxInfants} infants per unit.`,
          path: ['rooms', index, 'infants'],
        });
      }
    });
  });

/**
 * Hall Inquiry Schema (Event Venues)
 * Enforces physical venue capacity caps:
 * - Non-AC Hall: max 1,200 Pax
 * - AC Hall: max 2,000 Pax
 */
export const hallInquirySchema = z
  .object({
    type: z.literal('HALL'),
    unitCategory: hallCategorySchema,
    unitId: z.string().optional().nullable(),
    slotType: hallSlotTypeSchema,
    eventDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Event date must be in YYYY-MM-DD format'),
    headcount: z
      .number()
      .int()
      .min(1, 'Headcount must be at least 1 Pax'),
    attachedDomeRequested: z
      .boolean()
      .nullish()
      .transform((val) => Boolean(val)),
    guestName: z.string().trim().optional().nullable(),
    guestPhone: guestPhoneSchema,
    notes: z.string().trim().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const isNonAc = data.unitCategory === 'NON_AC_HALL';
    const maxCapacity = isNonAc
      ? UNIT_CAPACITY_LIMITS.NON_AC_HALL.maxCapacity
      : UNIT_CAPACITY_LIMITS.AC_HALL.maxCapacity;
    const venueName = isNonAc ? 'Non-AC Event Hall' : 'AC Event Hall';

    if (data.headcount > maxCapacity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${venueName} has a maximum physical capacity limit of ${maxCapacity.toLocaleString('en-IN')} Pax`,
        path: ['headcount'],
      });
    }
  });

/**
 * Discriminated union schema for POST /api/inquiry/generate
 */
export const inquiryGenerateSchema = z.discriminatedUnion('type', [
  roomInquirySchema,
  hallInquirySchema,
]);

/**
 * Query parameters schema for GET /api/availability
 */
export const availabilityQuerySchema = z.object({
  unitCategory: unitCategorySchema,
  unitId: z.string().optional().nullable(),
  stayType: stayTypeSchema.optional().default('OVERNIGHT'),
  startDatetime: z.string().optional().nullable(),
  endDatetime: z.string().optional().nullable(),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  requestedUnits: z.coerce.number().int().min(1).default(1),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional().nullable(),
});

export type RoomItem = z.infer<typeof roomItemSchema>;
export type RoomInquiryInput = z.infer<typeof roomInquirySchema>;
export type HallInquiryInput = z.infer<typeof hallInquirySchema>;
export type InquiryGenerateInput = z.infer<typeof inquiryGenerateSchema>;
export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;
