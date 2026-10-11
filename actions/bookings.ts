import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import {
  createBookingSchema,
  CreateBookingInput,
  updateBookingSchema,
  UpdateBookingInput,
  cancelBookingSchema,
  CancelBookingInput,
  checkoutBookingSchema,
  CheckoutBookingInput,
  addReceiptLineItemSchema,
  AddReceiptLineItemInput,
  recordPaymentSchema,
  RecordPaymentInput,
  checkInBookingSchema,
  CheckInBookingInput,
  maintenanceBlockSchema,
  MaintenanceBlockInput,
} from '../schemas/booking.schema';
import {
  calculateNightsBetween,
  getISTDateString,
} from '../lib/date-utils';
import {
  calculateNightByNightStayRate,
  calculateModifiedPrice,
  resolveModifiers,
  resolveSlabForHeadcount,
} from '../lib/pricing/resolve-modifiers';
import {
  calculateUnitIncrementalCharge,
  calculateBookingRentRecalculation,
} from '../lib/calculate-rent';
import {
  NEON_TRANSACTION_OPTIONS,
  BookingActionError,
  UnitScheduleCollisionError,
  isUnitScheduleCollision,
} from '../lib/action-errors';

/**
 * Standard typed action response envelope
 */
export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[] | undefined>;
  code?: string;
  status?: number;
};

/**
 * Type representing a booking with its attached units and unit details
 */
export type BookingWithUnits = Prisma.BookingGetPayload<{
  include: {
    units: {
      include: {
        unit: {
          select: {
            id: true;
            name: true;
            category: true;
          };
        };
      };
    };
  };
}>;

export { isUnitScheduleCollision } from '../lib/action-errors';

/**
 * Generates the next sequential human-readable booking ID (e.g. #B001, #B002).
 * Verifies that the candidate ID does not collide with existing database records.
 */
export async function generateNextBookingId(
  tx: Prisma.TransactionClient
): Promise<string> {
  const lastBooking = await tx.booking.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { bookingId: true },
  });

  let nextNum = 1;
  if (lastBooking?.bookingId) {
    const match = lastBooking.bookingId.match(/#?B(\d+)/i);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    } else {
      const count = await tx.booking.count();
      nextNum = count + 1;
    }
  }

  let candidate = `#B${String(nextNum).padStart(3, '0')}`;
  // Guard against concurrency collisions by testing existence if supported
  if (typeof tx.booking.findUnique === 'function') {
    while (
      await tx.booking.findUnique({
        where: { bookingId: candidate },
        select: { id: true },
      })
    ) {
      nextNum++;
      candidate = `#B${String(nextNum).padStart(3, '0')}`;
    }
  }

  return candidate;
}

/**
 * Creates a new Booking and its associated BookingUnits inside an atomic Prisma transaction.
 *
 * 100% aligned with:
 * - docs/admin_panel/rooms.md
 * - docs/admin_panel/event_hall.md
 * - prisma/schema.prisma
 *
 * Enforces:
 * 1. Zod payload validation (guest details, phone numbers, multi-unit schedules, no internal collisions).
 * 2. Active PriceList/PriceSlab resolution and initial price snapshotting:
 *    - Queries active PriceList and matching PriceSlab for each unit.
 *    - Calculates initial `unitPrice` and `bookedBaseRate` (with night-by-night and weekend/seasonal modifiers).
 *    - Snapshots `bookedBaseRate`, `bookedMinHeadcount`, and `bookedMaxHeadcount` for baseline scope preservation.
 *    - Seamlessly supports complimentary attached Domes (e.g., Hall headcount >= 400 Pax).
 * 3. Strict Capacity & Age Guards:
 *    - Domes: Max 3 adults, max 2 infants. Strictly NO extra beds.
 *    - A-Frames: Max 5 adults, max 4 infants. Strictly NO extra beds.
 *    - Event Halls: Headcount strictly capped at physical venue capacity.
 * 4. Atomic insertion of Booking and BookingUnit records with sequential booking ID and AuditLog tracking.
 * 5. Crucial Error Handling:
 *    - Catches Prisma P2002 / PostgreSQL 23P01 targeting `no_overlapping_unit_bookings`.
 *    - Explicitly throws a `UNIT_SCHEDULE_COLLISION` error with targeted UI messaging.
 */
export async function createBooking(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<BookingWithUnits> {
  // 1. Validate payload using createBookingSchema
  const parseResult = createBookingSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const firstIssue =
      parseResult.error.issues[0]?.message ?? 'Invalid booking data provided';
    throw new BookingActionError(
      firstIssue,
      'VALIDATION_ERROR',
      400,
      parseResult.error.flatten().fieldErrors
    );
  }

  const data: CreateBookingInput = parseResult.data;

  // Track unit details for meaningful collision messages if error occurs
  const unitInfoMap = new Map<string, { name: string; category: string }>();

  try {
    const createdBooking = await prisma.$transaction(async (tx) => {
      // If bundling to a parent booking, assert parent exists
      if (data.parentBookingId) {
        const parent = await tx.booking.findUnique({
          where: { id: data.parentBookingId },
          select: { id: true },
        });
        if (!parent) {
          throw new BookingActionError(
            `Parent booking with ID ${data.parentBookingId} does not exist.`,
            'PARENT_BOOKING_NOT_FOUND',
            404
          );
        }
      }

      // 2. Snapshot initial prices for each unit in the bundle
      const unitsWithSnapshots = [];

      for (const unitItem of data.units) {
        // Query unit and attached active PriceList with its slabs and active modifiers
        const unit = await tx.unit.findUnique({
          where: { id: unitItem.unitId },
          include: {
            priceList: {
              include: {
                slabs: {
                  orderBy: [{ stayType: 'asc' }, { minHeadcount: 'asc' }],
                },
                modifiers: {
                  where: { isActive: true },
                },
              },
            },
          },
        });

        if (!unit) {
          throw new BookingActionError(
            `Unit with ID ${unitItem.unitId} was not found.`,
            'UNIT_NOT_FOUND',
            404
          );
        }

        unitInfoMap.set(unit.id, { name: unit.name, category: unit.category });

        if (!unit.isActive) {
          throw new BookingActionError(
            `Cannot book inactive unit: "${unit.name}" is marked as Sold Out/Inactive.`,
            'UNIT_INACTIVE',
            400
          );
        }

        // Capacity guards according to Parlak Resort domain rules (rooms.md & event_hall.md)
        const isHall =
          unit.category === 'NON_AC_HALL' || unit.category === 'AC_HALL';

        if (unit.category === 'DOME') {
          if ((unitItem.adults ?? 0) > 3) {
            throw new BookingActionError(
              `Hard cap exceeded: Dome (${unit.name}) allows a maximum of 3 adults. Strictly NO extra beds.`,
              'CAPACITY_EXCEEDED',
              400
            );
          }
          if ((unitItem.infants ?? 0) > 2) {
            throw new BookingActionError(
              `Hard cap exceeded: Dome (${unit.name}) allows a maximum of 2 infants.`,
              'CAPACITY_EXCEEDED',
              400
            );
          }
        }

        if (unit.category === 'A_FRAME') {
          if ((unitItem.adults ?? 0) > 5) {
            throw new BookingActionError(
              `Hard cap exceeded: A-Frame (${unit.name}) allows a maximum of 5 adults. Strictly NO extra beds.`,
              'CAPACITY_EXCEEDED',
              400
            );
          }
          if ((unitItem.infants ?? 0) > 4) {
            throw new BookingActionError(
              `Hard cap exceeded: A-Frame (${unit.name}) allows a maximum of 4 infants.`,
              'CAPACITY_EXCEEDED',
              400
            );
          }
        }

        if (isHall && (unitItem.headcount ?? 0) > unit.maxCapacity) {
          throw new BookingActionError(
            `Attendee headcount (${unitItem.headcount}) exceeds venue physical capacity (${unit.maxCapacity} pax) for ${unit.name}.`,
            'CAPACITY_EXCEEDED',
            400
          );
        }

        if (!unit.priceList) {
          throw new BookingActionError(
            `Unit "${unit.name}" has no attached price list.`,
            'PRICE_LIST_MISSING',
            400
          );
        }

        // Determine effective headcount for slab lookup
        const effectiveHeadcount = isHall
          ? (unitItem.headcount && unitItem.headcount > 0 ? unitItem.headcount : 1)
          : (unitItem.adults && unitItem.adults > 0 ? unitItem.adults : 1);

        // Resolve matching pricing slab
        // If a room (Dome/A-Frame) is attached to a MORNING_SLOT, fall back to DAY_SLOT slab (both are 10 AM - 3 PM)
        let resolvedStayType = unitItem.stayType;
        if (!isHall && unitItem.stayType === 'MORNING_SLOT') {
          resolvedStayType = 'DAY_SLOT';
        }

        let slab = resolveSlabForHeadcount(
          unit.priceList.slabs,
          effectiveHeadcount,
          resolvedStayType
        );

        // If complimentary attached dome without slot-specific slab (e.g. attached to Evening Slot),
        // fallback gracefully to any available slab to extract headcount metadata
        if (!slab && unitItem.isComplimentary) {
          slab = unit.priceList.slabs[0] ?? null;
        }

        if (!slab && !unitItem.isComplimentary) {
          throw new BookingActionError(
            `No pricing slab configured for stay type "${unitItem.stayType}" and headcount ${effectiveHeadcount} on unit "${unit.name}".`,
            'NO_MATCHING_PRICE_SLAB',
            400
          );
        }

        // Baseline rate snapshotting
        let bookedBaseRate: number;
        let deposit: number;
        let calculatedUnitPrice: number;
        const bookedMinHeadcount = slab?.minHeadcount ?? 1;
        const bookedMaxHeadcount = slab?.maxHeadcount ?? unit.maxCapacity;

        if (unitItem.isComplimentary) {
          // Attached complimentary dome (e.g. Hall headcount >= 400)
          bookedBaseRate = 0;
          deposit = 0;
          calculatedUnitPrice = 0;
        } else {
          bookedBaseRate = slab?.basePrice ?? 0;
          deposit =
            unitItem.deposit !== undefined && unitItem.deposit > 0
              ? unitItem.deposit
              : slab?.requiredDeposit ?? 0;

          if (unitItem.stayType === 'OVERNIGHT') {
            const nights = calculateNightsBetween(
              unitItem.startDatetime,
              unitItem.endDatetime
            );
            const stayCalc = calculateNightByNightStayRate({
              checkInDate: unitItem.startDatetime,
              numberOfNights: Math.max(1, nights),
              basePricePerNight: slab?.basePrice ?? 0,
              modifiers: unit.priceList.modifiers,
              stayType: 'OVERNIGHT',
            });
            calculatedUnitPrice = stayCalc.totalStayRent;
          } else {
            // DAY_SLOT, MORNING_SLOT, EVENING_SLOT
            const modRes = resolveModifiers(
              unitItem.startDatetime,
              unit.priceList.modifiers,
              unitItem.stayType
            );
            calculatedUnitPrice = calculateModifiedPrice(
              slab?.basePrice ?? 0,
              modRes.effectivePercentage
            );
          }
        }

        // Admin custom override preserves negotiated rent if explicitly provided > 0
        const finalUnitPrice =
          unitItem.isComplimentary
            ? 0
            : unitItem.unitPrice !== undefined && unitItem.unitPrice > 0
            ? unitItem.unitPrice
            : calculatedUnitPrice;

        unitsWithSnapshots.push({
          unitId: unitItem.unitId,
          startDatetime: new Date(unitItem.startDatetime),
          endDatetime: new Date(unitItem.endDatetime),
          status: unitItem.status ?? 'CONFIRMED',
          unitPrice: finalUnitPrice,
          deposit,
          notes: unitItem.notes,
          bookedBaseRate,
          bookedMinHeadcount,
          bookedMaxHeadcount,
          stayType: unitItem.stayType,
          headcount: unitItem.headcount,
          adults: unitItem.adults,
          infants: unitItem.infants,
          isComplimentary: unitItem.isComplimentary ?? false,
        });
      }

      // Calculate total rent charge
      const totalUnitsRent = unitsWithSnapshots.reduce(
        (sum, u) => sum + u.unitPrice,
        0
      );
      const finalRentCharge =
        data.rentCharge && data.rentCharge > 0 ? data.rentCharge : totalUnitsRent;

      // Sequential Booking ID assignment
      let bookingId = data.bookingId;
      if (!bookingId) {
        bookingId = await generateNextBookingId(tx);
      } else if (!bookingId.startsWith('#')) {
        bookingId = `#${bookingId}`;
      }

      // 3. Create Booking and nested BookingUnits
      const booking = await tx.booking.create({
        data: {
          bookingId,
          guestName: data.guestName,
          guestPhone: data.guestPhone,
          guestEmail: data.guestEmail,
          notes: data.notes,
          rentCharge: finalRentCharge,
          totalPaid: data.totalPaid ?? 0,
          status: data.status ?? 'CONFIRMED',
          receiptLineItems: data.receiptLineItems
            ? JSON.parse(JSON.stringify(data.receiptLineItems))
            : undefined,
          refundAmount: data.refundAmount ?? 0,
          cancelReason: data.cancelReason,
          parentBookingId: data.parentBookingId,
          units: {
            create: unitsWithSnapshots.map((u) => ({
              unitId: u.unitId,
              startDatetime: u.startDatetime,
              endDatetime: u.endDatetime,
              status: u.status,
              unitPrice: u.unitPrice,
              deposit: u.deposit,
              notes: u.notes,
              bookedBaseRate: u.bookedBaseRate,
              bookedMinHeadcount: u.bookedMinHeadcount,
              bookedMaxHeadcount: u.bookedMaxHeadcount,
              stayType: u.stayType,
              headcount: u.headcount,
              adults: u.adults,
              infants: u.infants,
              isComplimentary: u.isComplimentary,
            })),
          },
        },
        include: {
          units: {
            include: {
              unit: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                },
              },
            },
          },
        },
      });

      // Administrative AuditLog capture
      await tx.auditLog.create({
        data: {
          action: 'CREATE_BOOKING',
          entityType: 'Booking',
          entityId: booking.id,
          modifiedBy,
          newValue: JSON.parse(JSON.stringify(booking)),
        },
      });

      return booking;
    }, NEON_TRANSACTION_OPTIONS);

    return createdBooking;
  } catch (error) {
    // Check if error is a Booking ID collision
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const targetStr = JSON.stringify(error.meta?.target ?? '');
      const msg = error.message.toLowerCase();
      if (targetStr.includes('bookingId') || msg.includes('booking_bookingid_key')) {
        throw new BookingActionError(
          `Booking ID "${data.bookingId}" is already taken. Please choose a different ID or leave empty to auto-generate.`,
          'BOOKING_ID_ALREADY_EXISTS',
          409
        );
      }
    }

    // 4. Crucial Error Handling: Check for GiST exclusion violation or P2002
    if (isUnitScheduleCollision(error)) {
      // Find colliding unit name if identifiable
      let collidingUnitName = 'Selected Unit';
      let collidingUnitId: string | undefined;
      let collidingCategory: string | undefined;

      const errorStr = String(error instanceof Error ? error.message : error);

      // Attempt to identify specific colliding unit ID from PostgreSQL detail string
      for (const u of data.units) {
        if (errorStr.includes(u.unitId)) {
          const info = unitInfoMap.get(u.unitId);
          if (info) {
            collidingUnitName = info.name;
            collidingUnitId = u.unitId;
            collidingCategory = info.category;
            break;
          }
        }
      }

      // If not identified in error string, fall back to first unit in bundle
      if (!collidingUnitId && data.units.length > 0) {
        const firstUnit = data.units[0];
        const info = unitInfoMap.get(firstUnit.unitId);
        if (info) {
          collidingUnitName = info.name;
          collidingUnitId = firstUnit.unitId;
          collidingCategory = info.category;
        }
      }

      // Domain-specific UI alerts (event_hall.md lines 117-118 & rooms.md line 199)
      const hasHall = data.units.some(
        (u) =>
          unitInfoMap.get(u.unitId)?.category === 'NON_AC_HALL' ||
          unitInfoMap.get(u.unitId)?.category === 'AC_HALL'
      );
      const isDomeCollisionInHallBundle =
        hasHall && collidingCategory === 'DOME';

      const alertMessage = isDomeCollisionInHallBundle
        ? `Cannot attach Dome ${collidingUnitName}: It is already booked during this time window.`
        : `Cannot save booking: ${collidingUnitName} is already booked during this time window.`;

      throw new UnitScheduleCollisionError(alertMessage, {
        code: 'UNIT_SCHEDULE_COLLISION',
        unitId: collidingUnitId,
        unitName: collidingUnitName,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Re-throw if already a domain error or other exception
    throw error;
  }
}

/**
 * Server Action wrapper returning standard ActionResponse envelope
 * for direct form or useActionState bindings.
 */
export async function createBookingAction(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<ActionResponse<BookingWithUnits>> {
  try {
    const data = await createBooking(rawInput, modifiedBy);
    return {
      success: true,
      data,
      status: 201,
    };
  } catch (error) {
    if (error instanceof BookingActionError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        status: error.status,
        data: error.details as BookingWithUnits | undefined,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create booking due to an internal server error',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Updates an existing Booking and its BookingUnits inside an atomic Prisma transaction.
 *
 * Enforces:
 * 1. Zod updateBookingSchema validation.
 * 2. Multi-Admin Optimistic Concurrency Control (OCC) using expectedUpdatedAt.
 *    If record is stale (updatedAt > expectedUpdatedAt), throws BOOKING_STALE_RECORD (409).
 * 3. Scope-Based Recalculation using calculate-rent.ts:
 *    - Baseline Scope Preservation: Original contracted tariff locked to snapshot bookedBaseRate.
 *    - Incremental Scope Expansion: Evaluated against current active Price List.
 *    - Headcount Upgrades: Apples-to-Apples Algebraic Floor formula.
 *    - Extra Nights & Hours: Evaluated at new active rates / hourly tariffs.
 *    - Scope Reductions: Flat baseline block rule (no auto-refunds).
 * 4. Schedule collision detection (PostgreSQL 23P01 / Prisma P2002).
 * 5. Immutable AuditLog tracking.
 */
export async function updateBooking(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<BookingWithUnits> {
  const parseResult = updateBookingSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const firstIssue =
      parseResult.error.issues[0]?.message ?? 'Invalid booking update data provided';
    throw new BookingActionError(
      firstIssue,
      'VALIDATION_ERROR',
      400,
      parseResult.error.flatten().fieldErrors
    );
  }

  const data: UpdateBookingInput = parseResult.data;
  const unitInfoMap = new Map<string, { name: string; category: string }>();

  try {
    const updatedResult = await prisma.$transaction(async (tx) => {
      // 1. Fetch existing booking with units and unit details
      const existing = await tx.booking.findUnique({
        where: { id: data.id },
        include: {
          units: {
            include: {
              unit: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                },
              },
            },
          },
        },
      });

      if (!existing) {
        throw new BookingActionError(
          `Booking with ID ${data.id} does not exist.`,
          'BOOKING_NOT_FOUND',
          404
        );
      }

      // 2. Enforce Multi-Admin Optimistic Concurrency Control (OCC)
      if (existing.updatedAt.getTime() > new Date(data.expectedUpdatedAt).getTime()) {
        throw new BookingActionError(
          'Conflict: This booking was modified by another Admin. Please refresh to view the latest details.',
          'BOOKING_STALE_RECORD',
          409
        );
      }

      // 3. Process each unit and compute scope-based recalculation
      const updatedUnitsWithSnapshots = [];
      const unitRecalcResults = [];

      for (const unitItem of data.units) {
        const unit = await tx.unit.findUnique({
          where: { id: unitItem.unitId },
          include: {
            priceList: {
              include: {
                slabs: {
                  orderBy: [{ stayType: 'asc' }, { minHeadcount: 'asc' }],
                },
                modifiers: {
                  where: { isActive: true },
                },
              },
            },
          },
        });

        if (!unit) {
          throw new BookingActionError(
            `Unit with ID ${unitItem.unitId} was not found.`,
            'UNIT_NOT_FOUND',
            404
          );
        }

        unitInfoMap.set(unit.id, { name: unit.name, category: unit.category });

        if (!unit.isActive) {
          throw new BookingActionError(
            `Cannot book inactive unit: "${unit.name}" is marked as Sold Out/Inactive.`,
            'UNIT_INACTIVE',
            400
          );
        }

        const isHall =
          unit.category === 'NON_AC_HALL' || unit.category === 'AC_HALL';

        if (unit.category === 'DOME') {
          if ((unitItem.adults ?? 0) > 3) {
            throw new BookingActionError(
              `Hard cap exceeded: Dome (${unit.name}) allows a maximum of 3 adults. Strictly NO extra beds.`,
              'CAPACITY_EXCEEDED',
              400
            );
          }
          if ((unitItem.infants ?? 0) > 2) {
            throw new BookingActionError(
              `Hard cap exceeded: Dome (${unit.name}) allows a maximum of 2 infants.`,
              'CAPACITY_EXCEEDED',
              400
            );
          }
        }

        if (unit.category === 'A_FRAME') {
          if ((unitItem.adults ?? 0) > 5) {
            throw new BookingActionError(
              `Hard cap exceeded: A-Frame (${unit.name}) allows a maximum of 5 adults. Strictly NO extra beds.`,
              'CAPACITY_EXCEEDED',
              400
            );
          }
          if ((unitItem.infants ?? 0) > 4) {
            throw new BookingActionError(
              `Hard cap exceeded: A-Frame (${unit.name}) allows a maximum of 4 infants.`,
              'CAPACITY_EXCEEDED',
              400
            );
          }
        }

        if (isHall && (unitItem.headcount ?? 0) > unit.maxCapacity) {
          throw new BookingActionError(
            `Attendee headcount (${unitItem.headcount}) exceeds venue physical capacity (${unit.maxCapacity} pax) for ${unit.name}.`,
            'CAPACITY_EXCEEDED',
            400
          );
        }

        if (!unit.priceList) {
          throw new BookingActionError(
            `Unit "${unit.name}" has no attached price list.`,
            'PRICE_LIST_MISSING',
            400
          );
        }

        // Match existing unit for scope comparison
        const origUnit = existing.units.find(
          (u) => (unitItem.id && u.id === unitItem.id) || u.unitId === unitItem.unitId
        );

        // Perform scope-based recalculation via calculate-rent.ts
        const recalc = calculateUnitIncrementalCharge({
          originalUnit: origUnit
            ? {
                id: origUnit.id,
                unitId: origUnit.unitId,
                startDatetime: origUnit.startDatetime,
                endDatetime: origUnit.endDatetime,
                stayType: origUnit.stayType,
                unitPrice: origUnit.unitPrice,
                bookedBaseRate: origUnit.bookedBaseRate,
                bookedMinHeadcount: origUnit.bookedMinHeadcount,
                bookedMaxHeadcount: origUnit.bookedMaxHeadcount,
                headcount: origUnit.headcount,
                adults: origUnit.adults,
                infants: origUnit.infants,
                isComplimentary: origUnit.isComplimentary,
              }
            : null,
          newUnit: {
            id: unitItem.id,
            unitId: unitItem.unitId,
            startDatetime: unitItem.startDatetime,
            endDatetime: unitItem.endDatetime,
            stayType: unitItem.stayType,
            headcount: unitItem.headcount,
            adults: unitItem.adults,
            infants: unitItem.infants,
            isComplimentary: unitItem.isComplimentary,
            unitPrice: unitItem.unitPrice,
          },
          activePriceList: {
            id: unit.priceList.id,
            unitType: unit.category,
            maxGuestCapacity: unit.priceList.maxGuestCapacity,
            slabs: unit.priceList.slabs,
            modifiers: unit.priceList.modifiers,
          },
        });

        unitRecalcResults.push(recalc);

        // Snapshot assignment
        let finalUnitPrice: number;
        let bookedBaseRate: number;
        let deposit: number;

        if (unitItem.isComplimentary) {
          finalUnitPrice = 0;
          bookedBaseRate = 0;
          deposit = 0;
        } else {
          // Admin explicit unitPrice override takes priority if provided
          finalUnitPrice =
            unitItem.unitPrice !== undefined && unitItem.unitPrice > 0
              ? unitItem.unitPrice
              : recalc.newUnitPrice;

          bookedBaseRate =
            origUnit && origUnit.unitId === unitItem.unitId
              ? origUnit.bookedBaseRate ?? recalc.newUnitPrice
              : unit.priceList.slabs[0]?.basePrice ?? recalc.newUnitPrice;

          deposit =
            unitItem.deposit !== undefined
              ? unitItem.deposit
              : origUnit?.deposit ?? 0;
        }

        updatedUnitsWithSnapshots.push({
          unitId: unitItem.unitId,
          startDatetime: new Date(unitItem.startDatetime),
          endDatetime: new Date(unitItem.endDatetime),
          status: unitItem.status ?? existing.status,
          unitPrice: finalUnitPrice,
          deposit,
          notes: unitItem.notes,
          bookedBaseRate,
          bookedMinHeadcount:
            origUnit && origUnit.unitId === unitItem.unitId
              ? origUnit.bookedMinHeadcount ?? 1
              : unit.priceList.slabs[0]?.minHeadcount ?? 1,
          bookedMaxHeadcount:
            origUnit && origUnit.unitId === unitItem.unitId
              ? origUnit.bookedMaxHeadcount ?? unit.maxCapacity
              : unit.maxCapacity,
          stayType: unitItem.stayType,
          headcount: unitItem.headcount,
          adults: unitItem.adults,
          infants: unitItem.infants,
          isComplimentary: unitItem.isComplimentary ?? false,
        });
      }

      // Find Hall unit if present in this booking to mirror hours to attached Domes (event_hall.md lines 79 & 112)
      const hallUnitItem = updatedUnitsWithSnapshots.find((u) => {
        const cat = unitInfoMap.get(u.unitId)?.category;
        return cat === 'NON_AC_HALL' || cat === 'AC_HALL';
      });

      if (hallUnitItem) {
        // 1. Mirror hours to attached Domes in the same booking
        for (const u of updatedUnitsWithSnapshots) {
          const cat = unitInfoMap.get(u.unitId)?.category;
          if (cat === 'DOME' && u !== hallUnitItem) {
            u.startDatetime = new Date(hallUnitItem.startDatetime);
            u.endDatetime = new Date(hallUnitItem.endDatetime);
          }
        }

        // 2. Mirror hours to bundled child bookings (e.g. attached Domes in child bookings)
        const childBookings = await tx.booking.findMany({
          where: { parentBookingId: existing.id },
          include: {
            units: {
              include: {
                unit: {
                  select: { id: true, name: true, category: true },
                },
              },
            },
          },
        });

        for (const child of childBookings) {
          for (const cu of child.units) {
            unitInfoMap.set(cu.unitId, { name: cu.unit.name, category: cu.unit.category });
          }
          await tx.bookingUnit.updateMany({
            where: { bookingId: child.id },
            data: {
              startDatetime: new Date(hallUnitItem.startDatetime),
              endDatetime: new Date(hallUnitItem.endDatetime),
            },
          });
        }
      }

      // Compute hybrid rent charge
      const overallRecalc = calculateBookingRentRecalculation({
        originalRentCharge: existing.rentCharge,
        unitResults: unitRecalcResults,
        customRentOverride: data.rentCharge,
      });

      // If data.rentCharge was explicitly provided and differs from existing, respect override
      const finalRentCharge =
        data.rentCharge !== undefined &&
        data.rentCharge > 0 &&
        data.rentCharge !== existing.rentCharge
          ? data.rentCharge
          : overallRecalc.finalRentCharge;

      // Atomic replacement of units: delete old units and insert updated
      await tx.bookingUnit.deleteMany({
        where: { bookingId: existing.id },
      });

      await tx.bookingUnit.createMany({
        data: updatedUnitsWithSnapshots.map((u) => ({
          ...u,
          bookingId: existing.id,
        })),
      });

      // Update Booking record
      const updatedBooking = await tx.booking.update({
        where: { id: existing.id },
        data: {
          guestName: data.guestName,
          guestPhone: data.guestPhone,
          guestEmail: data.guestEmail,
          notes: data.notes,
          rentCharge: finalRentCharge,
          totalPaid: data.totalPaid !== undefined ? data.totalPaid : existing.totalPaid,
          status: data.status ?? existing.status,
          receiptLineItems: data.receiptLineItems
            ? JSON.parse(JSON.stringify(data.receiptLineItems))
            : existing.receiptLineItems,
          refundAmount:
            data.refundAmount !== undefined ? data.refundAmount : existing.refundAmount,
          cancelReason:
            data.cancelReason !== undefined ? data.cancelReason : existing.cancelReason,
          parentBookingId:
            data.parentBookingId !== undefined
              ? data.parentBookingId
              : existing.parentBookingId,
        },
        include: {
          units: {
            include: {
              unit: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                },
              },
            },
          },
        },
      });

      // Capture administrative AuditLog
      await tx.auditLog.create({
        data: {
          action: 'UPDATE_BOOKING',
          entityType: 'Booking',
          entityId: existing.id,
          modifiedBy,
          oldValue: JSON.parse(JSON.stringify(existing)),
          newValue: JSON.parse(JSON.stringify(updatedBooking)),
        },
      });

      return updatedBooking;
    }, NEON_TRANSACTION_OPTIONS);

    return updatedResult;
  } catch (error) {
    if (isUnitScheduleCollision(error)) {
      let collidingUnitName = 'Selected Unit';
      let collidingUnitId: string | undefined;
      let collidingCategory: string | undefined;

      const errorStr = String(error instanceof Error ? error.message : error);

      for (const u of data.units) {
        if (errorStr.includes(u.unitId)) {
          const info = unitInfoMap.get(u.unitId);
          if (info) {
            collidingUnitName = info.name;
            collidingUnitId = u.unitId;
            collidingCategory = info.category;
            break;
          }
        }
      }

      if (!collidingUnitId) {
        // Also check if any other unit in unitInfoMap matches error string (e.g. child bundled dome)
        for (const [unitId, info] of unitInfoMap.entries()) {
          if (errorStr.includes(unitId)) {
            collidingUnitName = info.name;
            collidingUnitId = unitId;
            collidingCategory = info.category;
            break;
          }
        }
      }

      if (!collidingUnitId && data.units.length > 0) {
        const firstUnit = data.units[0];
        const info = unitInfoMap.get(firstUnit.unitId);
        if (info) {
          collidingUnitName = info.name;
          collidingUnitId = firstUnit.unitId;
          collidingCategory = info.category;
        }
      }

      const hasHall =
        data.units.some(
          (u) =>
            unitInfoMap.get(u.unitId)?.category === 'NON_AC_HALL' ||
            unitInfoMap.get(u.unitId)?.category === 'AC_HALL'
        ) ||
        Array.from(unitInfoMap.values()).some(
          (info) => info.category === 'NON_AC_HALL' || info.category === 'AC_HALL'
        );
      const isDomeCollisionInHallBundle =
        hasHall && collidingCategory === 'DOME';

      const alertMessage = isDomeCollisionInHallBundle
        ? `Cannot reschedule: Attached Dome ${collidingUnitName} is already booked on the new date.`
        : `Cannot save booking: ${collidingUnitName} is already booked during this time window.`;

      throw new UnitScheduleCollisionError(alertMessage, {
        code: 'UNIT_SCHEDULE_COLLISION',
        unitId: collidingUnitId,
        unitName: collidingUnitName,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    throw error;
  }
}

/**
 * Server Action wrapper for updateBooking.
 */
export async function updateBookingAction(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<ActionResponse<BookingWithUnits>> {
  try {
    const data = await updateBooking(rawInput, modifiedBy);
    return {
      success: true,
      data,
      status: 200,
    };
  } catch (error) {
    if (error instanceof BookingActionError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        status: error.status,
        data: error.details as BookingWithUnits | undefined,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update booking due to an internal server error',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Cancels a Booking and releases inventory atomically.
 *
 * Enforces:
 * 1. Zod cancelBookingSchema validation (0 <= refundAmount <= totalPaid, OCC timestamp).
 * 2. Multi-Admin Optimistic Concurrency Control (expectedUpdatedAt).
 * 3. Atomic database transaction cascading:
 *    - Parent booking status = 'CANCELLED'
 *    - Parent BookingUnits status = 'CANCELLED'
 *    - Bundled child bookings (parentBookingId == id) status = 'CANCELLED'
 *    - All child BookingUnits status = 'CANCELLED' (releasing attached Domes)
 * 4. Updates refundAmount and cancelReason. (Database trigger automatically recomputes netRevenue).
 * 5. Immutable AuditLog tracking.
 */
export async function cancelBooking(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<BookingWithUnits> {
  const parseResult = cancelBookingSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const firstIssue =
      parseResult.error.issues[0]?.message ?? 'Invalid cancellation data provided';
    throw new BookingActionError(
      firstIssue,
      'VALIDATION_ERROR',
      400,
      parseResult.error.flatten().fieldErrors
    );
  }

  const data: CancelBookingInput = parseResult.data;
  const targetId = (data.bookingId || data.id) as string;

  const cancelledBooking = await prisma.$transaction(async (tx) => {
    // 1. Fetch booking with units and bundled bookings
    const isUuid =
      typeof targetId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);

    const existing = isUuid
      ? await tx.booking.findUnique({
          where: { id: targetId },
          include: {
            units: {
              include: {
                unit: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                  },
                },
              },
            },
            bundledBookings: {
              include: {
                units: true,
              },
            },
          },
        })
      : await tx.booking.findFirst({
          where: { bookingId: targetId },
          include: {
            units: {
              include: {
                unit: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                  },
                },
              },
            },
            bundledBookings: {
              include: {
                units: true,
              },
            },
          },
        });

    if (!existing) {
      throw new BookingActionError(
        `Booking with ID ${targetId} was not found.`,
        'BOOKING_NOT_FOUND',
        404
      );
    }

    // 2. Enforce Multi-Admin Optimistic Concurrency Control (OCC)
    if (existing.updatedAt.getTime() > new Date(data.expectedUpdatedAt).getTime()) {
      throw new BookingActionError(
        'Conflict: This booking was modified by another Admin. Please refresh to view the latest details.',
        'BOOKING_STALE_RECORD',
        409
      );
    }

    // 3. Validate refund amount ceiling
    if (data.refundAmount > existing.totalPaid) {
      throw new BookingActionError(
        `Refund amount (₹${data.refundAmount}) cannot exceed total amount paid (₹${existing.totalPaid}).`,
        'REFUND_EXCEEDS_TOTAL_PAID',
        400
      );
    }

    // 4. Update parent booking record
    const updated = await tx.booking.update({
      where: { id: existing.id },
      data: {
        status: 'CANCELLED',
        refundAmount: data.refundAmount,
        cancelReason: data.cancelReason,
      },
      include: {
        units: {
          include: {
            unit: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        },
      },
    });

    // 5. Cascade status = 'CANCELLED' to all parent BookingUnits
    await tx.bookingUnit.updateMany({
      where: { bookingId: existing.id },
      data: { status: 'CANCELLED' },
    });

    // 6. Cascade status = 'CANCELLED' to child bundled bookings where parentBookingId == id
    await tx.booking.updateMany({
      where: { parentBookingId: existing.id },
      data: {
        status: 'CANCELLED',
        cancelReason: data.cancelReason
          ? `Parent booking cancelled: ${data.cancelReason}`
          : 'Parent booking cancelled',
      },
    });

    // 7. Cascade status = 'CANCELLED' to all child BookingUnits (attached Domes)
    const childBookingIds = (existing.bundledBookings || []).map((b) => b.id);
    if (childBookingIds.length > 0) {
      await tx.bookingUnit.updateMany({
        where: { bookingId: { in: childBookingIds } },
        data: { status: 'CANCELLED' },
      });
    }
    await tx.bookingUnit.updateMany({
      where: {
        booking: {
          parentBookingId: existing.id,
        },
      },
      data: { status: 'CANCELLED' },
    });

    // 8. Capture administrative AuditLog
    await tx.auditLog.create({
      data: {
        action: 'CANCEL_BOOKING',
        entityType: 'Booking',
        entityId: existing.id,
        modifiedBy,
        oldValue: JSON.parse(JSON.stringify(existing)),
        newValue: JSON.parse(JSON.stringify(updated)),
      },
    });

    return updated;
  }, NEON_TRANSACTION_OPTIONS);

  return cancelledBooking;
}

/**
 * Server Action wrapper for cancelBooking.
 */
export async function cancelBookingAction(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<ActionResponse<BookingWithUnits>> {
  try {
    const data = await cancelBooking(rawInput, modifiedBy);
    return {
      success: true,
      data,
      status: 200,
    };
  } catch (error) {
    if (error instanceof BookingActionError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        status: error.status,
        data: error.details as BookingWithUnits | undefined,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to cancel booking due to an internal server error',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Appends a custom line item object into the receiptLineItems JSONB array on a Booking.
 *
 * Used strictly for receipt generation and excluded from dashboard rent analytics.
 */
export async function addReceiptLineItem(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<BookingWithUnits> {
  const parseResult = addReceiptLineItemSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const firstIssue =
      parseResult.error.issues[0]?.message ?? 'Invalid receipt line item data provided';
    throw new BookingActionError(
      firstIssue,
      'VALIDATION_ERROR',
      400,
      parseResult.error.flatten().fieldErrors
    );
  }

  const data: AddReceiptLineItemInput = parseResult.data;
  const targetId = (data.bookingId || data.id) as string;

  const updatedBooking = await prisma.$transaction(async (tx) => {
    const isUuid =
      typeof targetId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);

    const existing = isUuid
      ? await tx.booking.findUnique({
          where: { id: targetId },
          include: {
            units: {
              include: {
                unit: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                  },
                },
              },
            },
          },
        })
      : await tx.booking.findFirst({
          where: { bookingId: targetId },
          include: {
            units: {
              include: {
                unit: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                  },
                },
              },
            },
          },
        });

    if (!existing) {
      throw new BookingActionError(
        `Booking with ID ${targetId} was not found.`,
        'BOOKING_NOT_FOUND',
        404
      );
    }

    // OCC verification if expectedUpdatedAt was supplied
    if (
      data.expectedUpdatedAt &&
      existing.updatedAt.getTime() > new Date(data.expectedUpdatedAt).getTime()
    ) {
      throw new BookingActionError(
        'Conflict: This booking was modified by another Admin. Please refresh to view the latest details.',
        'BOOKING_STALE_RECORD',
        409
      );
    }

    const currentItems = Array.isArray(existing.receiptLineItems)
      ? (existing.receiptLineItems as Array<{ description: string; amount: number }>)
      : [];

    const newItem = {
      description: (data.description ?? data.lineItem?.description ?? '').trim(),
      amount: data.amount ?? data.lineItem?.amount ?? 0,
    };

    const updatedItems = [...currentItems, newItem];

    const updated = await tx.booking.update({
      where: { id: existing.id },
      data: {
        receiptLineItems: updatedItems,
      },
      include: {
        units: {
          include: {
            unit: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        action: 'ADD_RECEIPT_LINE_ITEM',
        entityType: 'Booking',
        entityId: existing.id,
        modifiedBy,
        oldValue: JSON.parse(JSON.stringify(existing)),
        newValue: JSON.parse(JSON.stringify(updated)),
      },
    });

    return updated;
  }, NEON_TRANSACTION_OPTIONS);

  return updatedBooking;
}

/**
 * Server Action wrapper for addReceiptLineItem.
 */
export async function addReceiptLineItemAction(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<ActionResponse<BookingWithUnits>> {
  try {
    const data = await addReceiptLineItem(rawInput, modifiedBy);
    return {
      success: true,
      data,
      status: 200,
    };
  } catch (error) {
    if (error instanceof BookingActionError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        status: error.status,
        data: error.details as BookingWithUnits | undefined,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to add receipt line item due to an internal server error',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Removes a line item at the specified index from the receiptLineItems JSONB array.
 */
export async function removeReceiptLineItem(
  rawInput: {
    bookingId?: string;
    id?: string;
    index: number;
    expectedUpdatedAt?: Date | string;
  },
  modifiedBy: string = 'ADMIN'
): Promise<BookingWithUnits> {
  const targetId = (rawInput.bookingId || rawInput.id) as string;
  if (!targetId || typeof rawInput.index !== 'number' || rawInput.index < 0) {
    throw new BookingActionError(
      'Valid booking ID and line item index are required',
      'VALIDATION_ERROR',
      400
    );
  }

  const updatedBooking = await prisma.$transaction(async (tx) => {
    const isUuid =
      typeof targetId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);

    const existing = isUuid
      ? await tx.booking.findUnique({
          where: { id: targetId },
          include: {
            units: {
              include: {
                unit: { select: { id: true, name: true, category: true } },
              },
            },
          },
        })
      : await tx.booking.findFirst({
          where: { bookingId: targetId },
          include: {
            units: {
              include: {
                unit: { select: { id: true, name: true, category: true } },
              },
            },
          },
        });

    if (!existing) {
      throw new BookingActionError(
        `Booking with ID ${targetId} was not found.`,
        'BOOKING_NOT_FOUND',
        404
      );
    }

    if (
      rawInput.expectedUpdatedAt &&
      existing.updatedAt.getTime() > new Date(rawInput.expectedUpdatedAt).getTime()
    ) {
      throw new BookingActionError(
        'Conflict: This booking was modified by another Admin. Please refresh to view the latest details.',
        'BOOKING_STALE_RECORD',
        409
      );
    }

    const currentItems = Array.isArray(existing.receiptLineItems)
      ? (existing.receiptLineItems as Array<{ description: string; amount: number }>)
      : [];

    if (rawInput.index >= currentItems.length) {
      throw new BookingActionError(
        'Line item index out of bounds',
        'VALIDATION_ERROR',
        400
      );
    }

    const updatedItems = currentItems.filter((_, i) => i !== rawInput.index);

    const updated = await tx.booking.update({
      where: { id: existing.id },
      data: {
        receiptLineItems: updatedItems,
      },
      include: {
        units: {
          include: {
            unit: { select: { id: true, name: true, category: true } },
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        action: 'REMOVE_RECEIPT_LINE_ITEM',
        entityType: 'Booking',
        entityId: existing.id,
        modifiedBy,
        oldValue: JSON.parse(JSON.stringify(existing)),
        newValue: JSON.parse(JSON.stringify(updated)),
      },
    });

    return updated;
  }, NEON_TRANSACTION_OPTIONS);

  return updatedBooking;
}

/**
 * Server Action wrapper for removeReceiptLineItem.
 */
export async function removeReceiptLineItemAction(
  rawInput: {
    bookingId?: string;
    id?: string;
    index: number;
    expectedUpdatedAt?: Date | string;
  },
  modifiedBy: string = 'ADMIN'
): Promise<ActionResponse<BookingWithUnits>> {
  try {
    const data = await removeReceiptLineItem(rawInput, modifiedBy);
    return {
      success: true,
      data,
      status: 200,
    };
  } catch (error) {
    if (error instanceof BookingActionError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        status: error.status,
        data: error.details as BookingWithUnits | undefined,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to remove receipt line item due to an internal server error',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Checks out a booking, strictly enforcing the domain checkout guard invariant:
 * Final Balance Due == (Rent Charge + Receipt Line Items) - Total Paid MUST be ₹0 (Math.abs(balance) < 1).
 */
export async function checkoutBooking(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<BookingWithUnits> {
  const parseResult = checkoutBookingSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const firstIssue =
      parseResult.error.issues[0]?.message ?? 'Invalid checkout data provided';
    throw new BookingActionError(
      firstIssue,
      'VALIDATION_ERROR',
      400,
      parseResult.error.flatten().fieldErrors
    );
  }

  const data: CheckoutBookingInput = parseResult.data;
  const targetId = (data.bookingId || data.id) as string;

  const checkedOutBooking = await prisma.$transaction(async (tx) => {
    const isUuid =
      typeof targetId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);

    const existing = isUuid
      ? await tx.booking.findUnique({
          where: { id: targetId },
          include: {
            units: {
              include: {
                unit: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                  },
                },
              },
            },
          },
        })
      : await tx.booking.findFirst({
          where: { bookingId: targetId },
          include: {
            units: {
              include: {
                unit: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                  },
                },
              },
            },
          },
        });

    if (!existing) {
      throw new BookingActionError(
        `Booking with ID ${targetId} was not found.`,
        'BOOKING_NOT_FOUND',
        404
      );
    }

    if (existing.status === 'CANCELLED') {
      throw new BookingActionError(
        'Cannot check out a cancelled booking.',
        'INVALID_STATUS_TRANSITION',
        400
      );
    }

    if (existing.status === 'CHECKED_OUT') {
      throw new BookingActionError(
        'Booking is already checked out.',
        'INVALID_STATUS_TRANSITION',
        400
      );
    }

    // 1. Enforce OCC
    if (existing.updatedAt.getTime() > new Date(data.expectedUpdatedAt).getTime()) {
      throw new BookingActionError(
        'Conflict: This booking was modified by another Admin. Please refresh to view the latest details.',
        'BOOKING_STALE_RECORD',
        409
      );
    }

    // 2. Strict Checkout Guard: Sum rent + line items, subtract totalPaid
    const lineItems = Array.isArray(existing.receiptLineItems)
      ? (existing.receiptLineItems as Array<{ description?: string; amount?: number }>)
      : [];
    const lineItemsTotal = lineItems.reduce(
      (sum, item) => sum + (Number(item?.amount) || 0),
      0
    );
    const totalBilled = Math.round(existing.rentCharge + lineItemsTotal);
    const balance = totalBilled - Math.round(existing.totalPaid);

    if (Math.abs(balance) >= 1) {
      throw new BookingActionError(
        `Cannot check out: Outstanding balance of ₹${Math.abs(Math.round(balance)).toLocaleString('en-IN')} must be collected or adjusted to ₹0 first.`,
        'OUTSTANDING_BALANCE_NOT_ZERO',
        400,
        {
          balance,
          totalBilled,
          totalPaid: existing.totalPaid,
          rentCharge: existing.rentCharge,
          lineItemsTotal,
        }
      );
    }

    // 3. Mark booking as CHECKED_OUT
    const updated = await tx.booking.update({
      where: { id: existing.id },
      data: {
        status: 'CHECKED_OUT',
      },
      include: {
        units: {
          include: {
            unit: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        },
      },
    });

    // 4. Update units to CHECKED_OUT (excluding CANCELLED or MAINTENANCE_BLOCKED)
    await tx.bookingUnit.updateMany({
      where: {
        bookingId: existing.id,
        status: { notIn: ['CANCELLED', 'MAINTENANCE_BLOCKED'] },
      },
      data: { status: 'CHECKED_OUT' },
    });

    // 5. Capture administrative AuditLog
    await tx.auditLog.create({
      data: {
        action: 'CHECKOUT_BOOKING',
        entityType: 'Booking',
        entityId: existing.id,
        modifiedBy,
        oldValue: JSON.parse(JSON.stringify(existing)),
        newValue: JSON.parse(JSON.stringify(updated)),
      },
    });

    return updated;
  }, NEON_TRANSACTION_OPTIONS);

  return checkedOutBooking;
}

/**
 * Server Action wrapper for checkoutBooking.
 */
export async function checkoutBookingAction(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<ActionResponse<BookingWithUnits>> {
  try {
    const data = await checkoutBooking(rawInput, modifiedBy);
    return {
      success: true,
      data,
      status: 200,
    };
  } catch (error) {
    if (error instanceof BookingActionError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        status: error.status,
        data: error.details as BookingWithUnits | undefined,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to check out booking due to an internal server error',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Records a payment against a Booking, strictly enforcing Multi-Admin Optimistic Concurrency Control (OCC).
 * Eliminates "Last Write Wins" race conditions (e.g. Admin B overwriting payment recorded milliseconds earlier by Admin A).
 * (rooms.md line 61).
 */
export async function recordPayment(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<BookingWithUnits> {
  const parseResult = recordPaymentSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const firstIssue =
      parseResult.error.issues[0]?.message ?? 'Invalid payment data provided';
    throw new BookingActionError(
      firstIssue,
      'VALIDATION_ERROR',
      400,
      parseResult.error.flatten().fieldErrors
    );
  }

  const data: RecordPaymentInput = parseResult.data;
  const targetId = (data.bookingId || data.id) as string;

  const updatedBooking = await prisma.$transaction(async (tx) => {
    const isUuid =
      typeof targetId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);

    const existing = isUuid
      ? await tx.booking.findUnique({
          where: { id: targetId },
          include: {
            units: {
              include: {
                unit: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                  },
                },
              },
            },
          },
        })
      : await tx.booking.findFirst({
          where: { bookingId: targetId },
          include: {
            units: {
              include: {
                unit: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                  },
                },
              },
            },
          },
        });

    if (!existing) {
      throw new BookingActionError(
        `Booking with ID ${targetId} was not found.`,
        'BOOKING_NOT_FOUND',
        404
      );
    }

    // 1. Enforce Multi-Admin Optimistic Concurrency Control (OCC)
    if (existing.updatedAt.getTime() > new Date(data.expectedUpdatedAt).getTime()) {
      throw new BookingActionError(
        'Conflict: This booking was modified by another Admin. Please refresh to view the latest details.',
        'BOOKING_STALE_RECORD',
        409
      );
    }

    const newTotalPaid = Math.round(existing.totalPaid + data.amount);

    // 2. Update Booking totalPaid (PostgreSQL trigger automatically recomputes netRevenue)
    const updated = await tx.booking.update({
      where: { id: existing.id },
      data: {
        totalPaid: newTotalPaid,
      },
      include: {
        units: {
          include: {
            unit: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        },
      },
    });

    // 3. Capture administrative AuditLog
    await tx.auditLog.create({
      data: {
        action: 'RECORD_PAYMENT',
        entityType: 'Booking',
        entityId: existing.id,
        modifiedBy,
        oldValue: JSON.parse(JSON.stringify(existing)),
        newValue: JSON.parse(JSON.stringify(updated)),
      },
    });

    return updated;
  }, NEON_TRANSACTION_OPTIONS);

  return updatedBooking;
}

/**
 * Server Action wrapper for recordPayment.
 */
export async function recordPaymentAction(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<ActionResponse<BookingWithUnits>> {
  try {
    const data = await recordPayment(rawInput, modifiedBy);
    return {
      success: true,
      data,
      status: 200,
    };
  } catch (error) {
    if (error instanceof BookingActionError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        status: error.status,
        data: error.details as BookingWithUnits | undefined,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to record payment due to an internal server error',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Transitions a booking and its active units to CHECKED_IN.
 */
export async function checkInBooking(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<BookingWithUnits> {
  const parseResult = checkInBookingSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const firstIssue =
      parseResult.error.issues[0]?.message ?? 'Invalid check-in data provided';
    throw new BookingActionError(
      firstIssue,
      'VALIDATION_ERROR',
      400,
      parseResult.error.flatten().fieldErrors
    );
  }

  const data: CheckInBookingInput = parseResult.data;
  const targetId = (data.bookingId || data.id) as string;

  const checkedInBooking = await prisma.$transaction(async (tx) => {
    const isUuid =
      typeof targetId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);

    const existing = isUuid
      ? await tx.booking.findUnique({
          where: { id: targetId },
          include: {
            units: {
              include: {
                unit: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                  },
                },
              },
            },
          },
        })
      : await tx.booking.findFirst({
          where: { bookingId: targetId },
          include: {
            units: {
              include: {
                unit: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                  },
                },
              },
            },
          },
        });

    if (!existing) {
      throw new BookingActionError(
        `Booking with ID ${targetId} was not found.`,
        'BOOKING_NOT_FOUND',
        404
      );
    }

    if (existing.status === 'CANCELLED') {
      throw new BookingActionError(
        'Cannot check in a cancelled booking.',
        'INVALID_STATUS_TRANSITION',
        400
      );
    }

    // Optional OCC check
    if (
      data.expectedUpdatedAt &&
      existing.updatedAt.getTime() > new Date(data.expectedUpdatedAt).getTime()
    ) {
      throw new BookingActionError(
        'Conflict: This booking was modified by another Admin. Please refresh to view the latest details.',
        'BOOKING_STALE_RECORD',
        409
      );
    }

    const updated = await tx.booking.update({
      where: { id: existing.id },
      data: {
        status: 'CHECKED_IN',
      },
      include: {
        units: {
          include: {
            unit: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        },
      },
    });

    await tx.bookingUnit.updateMany({
      where: {
        bookingId: existing.id,
        status: { notIn: ['CANCELLED', 'MAINTENANCE_BLOCKED'] },
      },
      data: {
        status: 'CHECKED_IN',
      },
    });

    await tx.auditLog.create({
      data: {
        action: 'CHECK_IN_BOOKING',
        entityType: 'Booking',
        entityId: existing.id,
        modifiedBy,
        oldValue: JSON.parse(JSON.stringify(existing)),
        newValue: JSON.parse(JSON.stringify(updated)),
      },
    });

    return updated;
  }, NEON_TRANSACTION_OPTIONS);

  return checkedInBooking;
}

/**
 * Server Action wrapper for checkInBooking.
 */
export async function checkInBookingAction(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<ActionResponse<BookingWithUnits>> {
  try {
    const data = await checkInBooking(rawInput, modifiedBy);
    return {
      success: true,
      data,
      status: 200,
    };
  } catch (error) {
    if (error instanceof BookingActionError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        status: error.status,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to check in booking due to an internal server error',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Creates a standalone maintenance block directly in BookingUnit with status: 'MAINTENANCE_BLOCKED'.
 * Protected by PostgreSQL GiST exclusion constraint (WHERE status NOT IN ('CANCELLED')).
 * (rooms.md line 94).
 */
export async function createMaintenanceBlock(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<Prisma.BookingUnitGetPayload<{ include: { unit: true } }>> {
  const parseResult = maintenanceBlockSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const firstIssue =
      parseResult.error.issues[0]?.message ?? 'Invalid maintenance block data provided';
    throw new BookingActionError(
      firstIssue,
      'VALIDATION_ERROR',
      400,
      parseResult.error.flatten().fieldErrors
    );
  }

  const data: MaintenanceBlockInput = parseResult.data;

  try {
    const block = await prisma.$transaction(async (tx) => {
      const unit = await tx.unit.findUnique({
        where: { id: data.unitId },
      });

      if (!unit) {
        throw new BookingActionError(
          `Unit with ID ${data.unitId} was not found.`,
          'UNIT_NOT_FOUND',
          404
        );
      }

      const createdUnit = await tx.bookingUnit.create({
        data: {
          unitId: data.unitId,
          startDatetime: new Date(data.startDatetime),
          endDatetime: new Date(data.endDatetime),
          status: 'MAINTENANCE_BLOCKED',
          unitPrice: 0,
          stayType:
            unit.category === 'NON_AC_HALL' || unit.category === 'AC_HALL'
              ? 'MORNING_SLOT'
              : 'OVERNIGHT',
          notes: data.notes,
        },
        include: {
          unit: true,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'CREATE_MAINTENANCE_BLOCK',
          entityType: 'BookingUnit',
          entityId: createdUnit.id,
          modifiedBy,
          newValue: JSON.parse(JSON.stringify(createdUnit)),
        },
      });

      return createdUnit;
    }, NEON_TRANSACTION_OPTIONS);

    return block;
  } catch (error) {
    if (isUnitScheduleCollision(error)) {
      throw new UnitScheduleCollisionError(
        'Cannot block dates: Selected unit already has active reservations during this window.',
        { unitId: data.unitId }
      );
    }
    throw error;
  }
}

/**
 * Server Action wrapper for createMaintenanceBlock.
 */
export async function createMaintenanceBlockAction(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<ActionResponse<Prisma.BookingUnitGetPayload<{ include: { unit: true } }>>> {
  try {
    const data = await createMaintenanceBlock(rawInput, modifiedBy);
    return {
      success: true,
      data,
      status: 201,
    };
  } catch (error) {
    if (error instanceof BookingActionError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        status: error.status,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create maintenance block due to an internal server error',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Fetches all Bookings with associated BookingUnits and Unit details.
 * Supports filtering by status and search queries (bookingId, guestName, guestPhone).
 */
export async function getBookings(filter?: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<ActionResponse<BookingWithUnits[]>> {
  try {
    const where: Prisma.BookingWhereInput = {};

    if (filter?.status && filter.status !== 'ALL') {
      where.status = filter.status;
    }

    if (filter?.search) {
      const q = filter.search.trim();
      where.OR = [
        { bookingId: { contains: q, mode: 'insensitive' } },
        { guestName: { contains: q, mode: 'insensitive' } },
        { guestPhone: { contains: q } },
      ];
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        units: {
          include: {
            unit: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
          orderBy: { startDatetime: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filter?.limit ?? 50,
      skip: filter?.offset ?? 0,
    });

    return {
      success: true,
      data: bookings as unknown as BookingWithUnits[],
      status: 200,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch bookings',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Fetches a single Booking by database UUID or human-readable bookingId (#B001).
 * Includes attached units, unit category metadata, and parent/bundled relationships.
 */
export async function getBookingById(
  idOrBookingId: string
): Promise<ActionResponse<BookingWithUnits>> {
  try {
    const isUuid =
      typeof idOrBookingId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrBookingId);

    const booking = isUuid
      ? await prisma.booking.findUnique({
          where: { id: idOrBookingId },
          include: {
            units: {
              include: {
                unit: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                  },
                },
              },
              orderBy: { startDatetime: 'asc' },
            },
          },
        })
      : await prisma.booking.findFirst({
          where: { bookingId: idOrBookingId },
          include: {
            units: {
              include: {
                unit: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                  },
                },
              },
              orderBy: { startDatetime: 'asc' },
            },
          },
        });

    if (!booking) {
      return {
        success: false,
        error: `Booking ${idOrBookingId} not found`,
        code: 'BOOKING_NOT_FOUND',
        status: 404,
      };
    }

    return {
      success: true,
      data: booking as unknown as BookingWithUnits,
      status: 200,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch booking',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Structured receipt and tax invoice payload
 */
export interface BookingReceiptData {
  booking: BookingWithUnits;
  displayId: string;
  totalRent: number;
  lineItems: Array<{ description: string; amount: number }>;
  lineItemsTotal: number;
  totalBilled: number;
  totalPaid: number;
  balanceDue: number;
  isPaidInFull: boolean;
}

/**
 * Fetches structured receipt and tax invoice data for a booking.
 * 100% aligned with /admin/bookings/[id]/print specification in docs/admin_panel/admin-front-end.md.
 */
export async function getBookingReceiptData(
  idOrBookingId: string
): Promise<ActionResponse<BookingReceiptData>> {
  const result = await getBookingById(idOrBookingId);
  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error || `Booking ${idOrBookingId} not found`,
      code: result.code || 'BOOKING_NOT_FOUND',
      status: result.status || 404,
    };
  }

  const booking = result.data;
  const rawLineItems = Array.isArray(booking.receiptLineItems)
    ? (booking.receiptLineItems as Array<{ description?: string; amount?: number }>)
    : [];
  const lineItems = rawLineItems.map((li) => ({
    description: String(li.description || '').trim() || 'Service Charge',
    amount: Number(li.amount) || 0,
  }));
  const lineItemsTotal = lineItems.reduce((acc, it) => acc + it.amount, 0);
  const totalRent = Math.round(booking.rentCharge || 0);
  const totalBilled = Math.round(totalRent + lineItemsTotal);
  const totalPaid = Math.round(booking.totalPaid || 0);
  const balanceDue = totalBilled - totalPaid;
  const isPaidInFull = Math.abs(balanceDue) < 1;

  return {
    success: true,
    data: {
      booking,
      displayId: booking.bookingId || `#${booking.id.slice(-6)}`,
      totalRent,
      lineItems,
      lineItemsTotal,
      totalBilled,
      totalPaid,
      balanceDue,
      isPaidInFull,
    },
    status: 200,
  };
}


