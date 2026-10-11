import { z } from 'zod';
import { StayTypeEnum } from './price.schema';
import { unitIdSchema } from './unit.schema';

/**
 * Booking Status Enum matching Prisma schema model Booking
 * Note: No 'PENDING' status exists because bookings are created manually
 * by Admins only after advance payment is verified via WhatsApp.
 */
export const BookingStatusEnum = z.enum([
  'CONFIRMED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'CANCELLED',
]);
export type BookingStatus = z.infer<typeof BookingStatusEnum>;

/**
 * Booking Unit Status Enum matching Prisma schema model BookingUnit
 * (includes MAINTENANCE_BLOCKED for database exclusion constraint calendar blocking)
 */
export const BookingUnitStatusEnum = z.enum([
  'CONFIRMED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'CANCELLED',
  'MAINTENANCE_BLOCKED',
]);
export type BookingUnitStatus = z.infer<typeof BookingUnitStatusEnum>;

/**
 * Single Receipt Line Item Schema (Stored in JSONB receiptLineItems on Booking model)
 * Used strictly for receipt generation and excluded from dashboard rent analytics.
 * Amount can be negative for courtesy waivers or price reductions per domain specification.
 */
export const receiptLineItemSchema = z.object({
  description: z
    .string({ message: 'Line item description is required' })
    .trim()
    .min(1, 'Line item description is required')
    .max(120, 'Line item description too long'),
  amount: z
    .number({ message: 'Line item amount must be a number' })
    .finite('Amount must be a finite number'),
});
export type ReceiptLineItem = z.infer<typeof receiptLineItemSchema>;

/**
 * Booking Unit Item Schema (matches Prisma model BookingUnit)
 * Supports multi-unit structures like Dome 1 + A-Frame 2 on one booking.
 */
export const bookingUnitItemSchema = z
  .object({
    id: z.string().uuid().optional(),
    bookingId: z.string().uuid().optional(),
    unitId: unitIdSchema,
    startDatetime: z.coerce.date({ message: 'Invalid start datetime format' }),
    endDatetime: z.coerce.date({ message: 'Invalid end datetime format' }),
    status: BookingUnitStatusEnum.default('CONFIRMED'),
    unitPrice: z
      .number({ message: 'Unit price must be a number' })
      .min(0, 'Unit price cannot be negative')
      .default(0),
    deposit: z
      .number({ message: 'Deposit must be a number' })
      .min(0, 'Deposit cannot be negative')
      .default(0),
    notes: z.string().trim().optional().nullable(),

    // Financial Snapshots for Baseline Scope Preservation (Prisma fields)
    bookedBaseRate: z.number().min(0).optional().nullable(),
    bookedMinHeadcount: z.number().int().min(1).optional().nullable(),
    bookedMaxHeadcount: z.number().int().min(1).optional().nullable(),

    // Occupancy context (Prisma fields)
    stayType: StayTypeEnum,
    headcount: z.number().int().min(0).optional().nullable(), // For Event Halls
    adults: z.number().int().min(0).optional().nullable(), // For Domes & A-Frames
    infants: z.number().int().min(0).optional().nullable(), // For Domes & A-Frames
    isComplimentary: z.boolean().default(false),
  })
  .refine((data) => data.endDatetime > data.startDatetime, {
    message: 'End datetime must be strictly after start datetime',
    path: ['endDatetime'],
  })
  .refine((data) => !data.isComplimentary || data.unitPrice === 0, {
    message: 'Complimentary attached units must have a unitPrice of 0',
    path: ['unitPrice'],
  })
  .superRefine((data, ctx) => {
    // Complimentary resting domes attached to Event Halls do not require separate room adult occupant minimums
    if (data.isComplimentary) {
      return;
    }

    const isRoomStay =
      data.stayType === 'OVERNIGHT' || data.stayType === 'DAY_SLOT';
    if (isRoomStay) {
      if (data.adults !== undefined && data.adults !== null && data.adults < 1) {
        ctx.addIssue({
          code: 'custom',
          message: 'Room bookings require at least 1 adult.',
          path: ['adults'],
        });
      }
    } else {
      // Event Halls
      if (
        data.headcount !== undefined &&
        data.headcount !== null &&
        data.headcount < 1
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'Event Hall bookings require an attendee headcount of at least 1.',
          path: ['headcount'],
        });
      }
    }
  });

export type BookingUnitItemInput = z.infer<typeof bookingUnitItemSchema>;

/**
 * Booking Base Definition before refinements
 */
export const bookingBaseSchema = z.object({
  id: z.string().uuid().optional(),
  bookingId: z
    .string()
    .trim()
    .regex(/^#?B\d+$/, 'Booking ID should follow format #B001 or B001')
    .optional(),

  // Flat CRM Fields (No relational Customers table)
  guestName: z
    .string({ message: 'Guest name is required' })
    .trim()
    .min(1, 'Guest name is required')
    .max(100, 'Guest name cannot exceed 100 characters'),
  guestPhone: z
    .string({ message: 'Guest phone is required' })
    .trim()
    .regex(
      /^\+?[0-9]{10,15}$/,
      'Phone number must contain 10 to 15 digits (optional leading +)'
    ),
  guestEmail: z
    .string()
    .trim()
    .email('Invalid email address')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  notes: z.string().trim().optional().nullable(),

  // Financial tracking (rentCharge is strictly unit rent)
  rentCharge: z
    .number({ message: 'Rent charge must be a number' })
    .finite('Rent charge must be finite')
    .min(0, 'Rent charge cannot be negative')
    .default(0),
  totalPaid: z
    .number({ message: 'Total paid must be a number' })
    .finite('Total paid must be finite')
    .min(0, 'Total paid cannot be negative')
    .default(0),

  status: BookingStatusEnum.default('CONFIRMED'),
  receiptLineItems: z.array(receiptLineItemSchema).optional().nullable(),

  // Cancellation & Refund (Prisma fields)
  refundAmount: z.number().min(0, 'Refund amount cannot be negative').optional().nullable(),
  cancelReason: z.string().trim().max(255).optional().nullable(),

  // Hall ↔ Dome bundling (Cascading Release)
  parentBookingId: z.string().uuid().optional().nullable(),

  // Multi-unit booking structure (min 1 unit required)
  units: z
    .array(bookingUnitItemSchema)
    .min(1, 'At least one unit must be included in the booking'),

  // Optimistic Concurrency Control (OCC)
  expectedUpdatedAt: z.coerce.date().optional(),
});

/**
 * Booking Creation & Updation Schema (matches Prisma model Booking)
 * 
 * Validates:
 * 1. Flat CRM fields and formatted phone numbers.
 * 2. Multi-unit arrays with no self-colliding internal schedules for the same physical unit.
 * 3. Cancellation refund ceiling: refundAmount cannot exceed totalPaid.
 */
export const bookingSchema = bookingBaseSchema.superRefine((data, ctx) => {
  // Check for internal unit schedule collisions within the same multi-unit payload
  for (let i = 0; i < data.units.length; i++) {
    for (let j = i + 1; j < data.units.length; j++) {
      const u1 = data.units[i];
      const u2 = data.units[j];
      if (u1.unitId === u2.unitId) {
        const u1Start = new Date(u1.startDatetime).getTime();
        const u1End = new Date(u1.endDatetime).getTime();
        const u2Start = new Date(u2.startDatetime).getTime();
        const u2End = new Date(u2.endDatetime).getTime();

        // Check if time ranges collide: (start1 < end2) && (end1 > start2)
        if (u1Start < u2End && u1End > u2Start) {
          ctx.addIssue({
            code: 'custom',
            message: `Booking contains conflicting overlapping time windows for the same unit ID (${u1.unitId}).`,
            path: ['units', j],
          });
        }
      }
    }
  }

  // Check refund ceiling on cancelled bookings
  if (
    data.status === 'CANCELLED' &&
    data.refundAmount !== undefined &&
    data.refundAmount !== null &&
    data.refundAmount > data.totalPaid
  ) {
    ctx.addIssue({
      code: 'custom',
      message: 'Refund amount cannot exceed total amount paid.',
      path: ['refundAmount'],
    });
  }
});

export type BookingInput = z.infer<typeof bookingSchema>;

export const createBookingSchema = bookingSchema;
export type CreateBookingInput = BookingInput;

export const updateBookingSchema = bookingBaseSchema
  .extend({
    id: z.string().uuid('Booking ID is required for update'),
    expectedUpdatedAt: z.coerce.date({
      message: 'Optimistic concurrency control timestamp is required',
    }),
  })
  .superRefine((data, ctx) => {
    // Re-apply same superRefine logic
    for (let i = 0; i < data.units.length; i++) {
      for (let j = i + 1; j < data.units.length; j++) {
        const u1 = data.units[i];
        const u2 = data.units[j];
        if (u1.unitId === u2.unitId) {
          const u1Start = new Date(u1.startDatetime).getTime();
          const u1End = new Date(u1.endDatetime).getTime();
          const u2Start = new Date(u2.startDatetime).getTime();
          const u2End = new Date(u2.endDatetime).getTime();

          if (u1Start < u2End && u1End > u2Start) {
            ctx.addIssue({
              code: 'custom',
              message: `Booking contains conflicting overlapping time windows for the same unit ID (${u1.unitId}).`,
              path: ['units', j],
            });
          }
        }
      }
    }

    if (
      data.status === 'CANCELLED' &&
      data.refundAmount !== undefined &&
      data.refundAmount !== null &&
      data.refundAmount > data.totalPaid
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Refund amount cannot exceed total amount paid.',
        path: ['refundAmount'],
      });
    }
  });

export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;

/**
 * Booking Identifier Validator
 * Accepts either a valid UUID (database ID) or human-readable format (#B001, B001).
 */
export const bookingIdOrUuidSchema = z
  .string({ message: 'Invalid booking ID' })
  .trim()
  .refine(
    (val) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ||
      /^#?B\d+$/i.test(val),
    { message: 'Invalid booking ID' }
  );

/**
 * Booking Checkout Guard Schema
 * Enforces the strict domain invariant: Checkout is only permitted when Final Balance Due == ₹0.
 * Balance Due = Math.round(rentCharge + sum(receiptLineItems)) - Math.round(totalPaid).
 */
export const checkoutBookingSchema = z
  .object({
    bookingId: bookingIdOrUuidSchema.optional(),
    id: bookingIdOrUuidSchema.optional(),
    rentCharge: z.number().min(0, 'Rent charge cannot be negative').optional(),
    totalPaid: z.number().min(0, 'Total paid cannot be negative').optional(),
    receiptLineItems: z.array(receiptLineItemSchema).optional().nullable(),
    expectedUpdatedAt: z.coerce.date({
      message: 'Optimistic concurrency control timestamp is required',
    }),
  })
  .refine((data) => data.bookingId !== undefined || data.id !== undefined, {
    message: 'Booking ID is required',
    path: ['bookingId'],
  })
  .superRefine((data, ctx) => {
    if (data.rentCharge !== undefined && data.totalPaid !== undefined) {
      const lineItemsTotal = (data.receiptLineItems ?? []).reduce(
        (sum, item) => sum + item.amount,
        0
      );
      const totalBilled = Math.round(data.rentCharge + lineItemsTotal);
      const balance = totalBilled - Math.round(data.totalPaid);

      if (Math.abs(balance) >= 1) {
        ctx.addIssue({
          code: 'custom',
          message: `Cannot check out: Outstanding balance of ₹${Math.round(balance)} must be collected or adjusted to ₹0 first.`,
          path: ['totalPaid'],
        });
      }
    }
  });

export type CheckoutBookingInput = z.infer<typeof checkoutBookingSchema>;

/**
 * Booking Cancellation Schema
 * Enforces refund amount boundaries (0 <= refundAmount <= totalPaid) and OCC timestamp.
 */
export const cancelBookingSchema = z
  .object({
    bookingId: bookingIdOrUuidSchema.optional(),
    id: bookingIdOrUuidSchema.optional(),
    totalPaid: z.number().min(0, 'Total paid cannot be negative').optional(),
    refundAmount: z
      .number({ message: 'Refund amount must be a number' })
      .min(0, 'Refund amount cannot be negative'),
    cancelReason: z
      .string({ message: 'Cancellation reason is required' })
      .trim()
      .min(1, 'Cancellation reason is required')
      .max(255, 'Cancellation reason cannot exceed 255 characters'),
    expectedUpdatedAt: z.coerce.date({
      message: 'Optimistic concurrency control timestamp is required',
    }),
  })
  .refine((data) => data.bookingId !== undefined || data.id !== undefined, {
    message: 'Booking ID is required',
    path: ['bookingId'],
  })
  .refine(
    (data) => data.totalPaid === undefined || data.refundAmount <= data.totalPaid,
    {
      message: 'Refund amount cannot exceed total amount paid',
      path: ['refundAmount'],
    }
  );

export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

/**
 * Add Receipt Line Item Schema
 * Pushes custom itemized charges/waivers directly into receiptLineItems JSONB array.
 */
export const addReceiptLineItemSchema = z
  .object({
    bookingId: bookingIdOrUuidSchema.optional(),
    id: bookingIdOrUuidSchema.optional(),
    description: z
      .string()
      .trim()
      .min(1, 'Line item description is required')
      .max(120, 'Line item description too long')
      .optional(),
    amount: z.number({ message: 'Line item amount must be a number' }).finite('Amount must be finite').optional(),
    lineItem: receiptLineItemSchema.optional(),
    expectedUpdatedAt: z.coerce.date().optional(),
  })
  .refine((data) => data.bookingId !== undefined || data.id !== undefined, {
    message: 'Booking ID is required',
    path: ['bookingId'],
  })
  .superRefine((data, ctx) => {
    if (!data.lineItem && (data.description === undefined || data.amount === undefined)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Line item description and amount are required',
        path: ['description'],
      });
    }
  });

export type AddReceiptLineItemInput = z.infer<typeof addReceiptLineItemSchema>;

/**
 * Maintenance Date Block Schema
 * Blocks unit inventory directly via BookingUnit without dummy guest bookings.
 * Protected by PostgreSQL GiST exclusion constraint (WHERE status NOT IN ('CANCELLED')).
 */
export const maintenanceBlockSchema = z
  .object({
    unitId: unitIdSchema,
    startDatetime: z.coerce.date({ message: 'Invalid start datetime format' }),
    endDatetime: z.coerce.date({ message: 'Invalid end datetime format' }),
    notes: z
      .string({ message: 'Maintenance notes/reason required' })
      .trim()
      .min(1, 'Maintenance reason or notes required'),
  })
  .refine((data) => data.endDatetime > data.startDatetime, {
    message: 'End datetime must be strictly after start datetime',
    path: ['endDatetime'],
  });

export type MaintenanceBlockInput = z.infer<typeof maintenanceBlockSchema>;

/**
 * Record Payment Schema
 * Enforces Multi-Admin Optimistic Concurrency Control (OCC) to eliminate
 * "Last Write Wins" race conditions (e.g. Admin B overwriting a payment recorded milliseconds earlier by Admin A).
 */
export const recordPaymentSchema = z
  .object({
    bookingId: bookingIdOrUuidSchema.optional(),
    id: bookingIdOrUuidSchema.optional(),
    amount: z
      .number({ message: 'Payment amount must be a number' })
      .finite('Payment amount must be finite')
      .positive('Payment amount must be greater than 0'),
    expectedUpdatedAt: z.coerce.date({
      message: 'Optimistic concurrency control timestamp is required',
    }),
  })
  .refine((data) => data.bookingId !== undefined || data.id !== undefined, {
    message: 'Booking ID is required',
    path: ['bookingId'],
  });

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

/**
 * Check-in Booking Schema
 * Transitions a booking and its associated units to CHECKED_IN.
 */
export const checkInBookingSchema = z
  .object({
    bookingId: bookingIdOrUuidSchema.optional(),
    id: bookingIdOrUuidSchema.optional(),
    expectedUpdatedAt: z.coerce.date({
      message: 'Optimistic concurrency control timestamp is required',
    }).optional(),
  })
  .refine((data) => data.bookingId !== undefined || data.id !== undefined, {
    message: 'Booking ID is required',
    path: ['bookingId'],
  });

export type CheckInBookingInput = z.infer<typeof checkInBookingSchema>;
