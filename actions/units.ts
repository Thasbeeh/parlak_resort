'use server';

import { prisma } from '../lib/prisma';
import {
  createUnitSchema,
  updateUnitSchema,
  toggleUnitStatusSchema,
  CreateUnitInput,
  UpdateUnitInput,
  ToggleUnitStatusInput,
} from '../schemas/unit.schema';
import { Prisma } from '@prisma/client';

import { deleteCloudinaryImage } from '../lib/cloudinary';
import {
  NEON_TRANSACTION_OPTIONS,
  UnitActionError,
  isUnitScheduleCollision,
  UnitScheduleCollisionError,
} from '../lib/action-errors';
import {
  maintenanceBlockSchema,
  MaintenanceBlockInput,
} from '../schemas/booking.schema';

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
 * Asserts that a unit has zero future active bookings before deactivation.
 * Throws UNIT_HAS_FUTURE_BOOKINGS if future active bookings exist.
 *
 * Query: endDatetime >= NOW() AND status NOT IN ('CANCELLED')
 */
export async function assertUnitCanBeDeactivated(
  unitId: string,
  txClient?: Prisma.TransactionClient
): Promise<void> {
  if (!unitId || typeof unitId !== 'string') {
    throw new UnitActionError('Unit ID is required', 'VALIDATION_ERROR', 400);
  }

  const dbClient = txClient || prisma;
  const now = new Date();

  const futureBookings = await dbClient.bookingUnit.findMany({
    where: {
      unitId,
      endDatetime: { gte: now },
      status: { notIn: ['CANCELLED'] },
    },
    include: {
      booking: {
        select: {
          bookingId: true,
          guestName: true,
          guestPhone: true,
        },
      },
    },
    orderBy: { startDatetime: 'asc' },
  });

  if (futureBookings.length > 0) {
    const unit = await dbClient.unit.findUnique({
      where: { id: unitId },
      select: { name: true, category: true },
    });

    const unitName = unit?.name || 'Unit';
    const isHall = unit?.category === 'NON_AC_HALL' || unit?.category === 'AC_HALL';
    const entityLabel = isHall ? 'venue' : 'unit';
    const actionAdvice = isHall
      ? 'Please reschedule or cancel these events before deactivating.'
      : 'Please reassign these guests to other rooms first.';

    const bookingDetails = futureBookings.map((b) => ({
      bookingUnitId: b.id,
      bookingId: b.booking?.bookingId ?? b.bookingId ?? 'N/A',
      guestName: b.booking?.guestName ?? 'Maintenance / Blocked',
      startDatetime: b.startDatetime,
      endDatetime: b.endDatetime,
      status: b.status,
    }));

    throw new UnitActionError(
      `Cannot deactivate ${entityLabel}: ${unitName} has ${futureBookings.length} future confirmed booking(s). ${actionAdvice}`,
      'UNIT_HAS_FUTURE_BOOKINGS',
      400,
      {
        count: futureBookings.length,
        bookings: bookingDetails,
      }
    );
  }
}

/**
 * Creates a new Unit (Dome, A-Frame, or Event Hall).
 *
 * Enforces:
 * 1. Zod schema validation (physical hard caps, category rules).
 * 2. Mandatory Price List attachment & category matching.
 * 3. Physical Capacity Safeguard: Unit.PhysicalCapacity >= PriceList.MaxGuestCapacity.
 * 4. Immutable administrative AuditLog tracking.
 */
export async function createUnit(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<ActionResponse> {
  try {
    const parseResult = createUnitSchema.safeParse(rawInput);
    if (!parseResult.success) {
      return {
        success: false,
        error:
          parseResult.error.issues[0]?.message ??
          'Invalid unit data provided',
        errors: parseResult.error.flatten().fieldErrors,
        code: 'VALIDATION_ERROR',
        status: 400,
      };
    }

    const {
      name,
      category,
      isActive,
      maxCapacity,
      maxInfants,
      amenities,
      priceListId,
    } = parseResult.data;

    // Fetch attached Price List to validate existence, category, and capacity safeguard
    const priceList = await prisma.priceList.findUnique({
      where: { id: priceListId },
    });

    if (!priceList) {
      return {
        success: false,
        error: 'Attached price list does not exist.',
        code: 'PRICE_LIST_NOT_FOUND',
        status: 404,
      };
    }

    if (priceList.unitType !== category) {
      return {
        success: false,
        error: `Price list unit type (${priceList.unitType}) does not match unit category (${category}).`,
        code: 'PRICE_LIST_TYPE_MISMATCH',
        status: 400,
      };
    }

    // Capacity Rule: Unit.PhysicalCapacity >= PriceList.MaxGuestCapacity
    if (maxCapacity < priceList.maxGuestCapacity) {
      return {
        success: false,
        error: `Unit physical capacity (${maxCapacity}) cannot be less than attached price list maximum guest capacity (${priceList.maxGuestCapacity}).`,
        code: 'CAPACITY_LESS_THAN_PRICELIST',
        status: 400,
      };
    }

    // Atomic insertion inside Prisma transaction
    const createdUnit = await prisma.$transaction(async (tx) => {
      const unit = await tx.unit.create({
        data: {
          name,
          category,
          isActive: isActive ?? true,
          maxCapacity,
          maxInfants: maxInfants ?? 0,
          amenities: amenities || '',
          priceListId,
        },
        include: {
          priceList: true,
          photos: true,
        },
      });

      // Audit Log capture
      await tx.auditLog.create({
        data: {
          action: 'CREATE_UNIT',
          entityType: 'Unit',
          entityId: unit.id,
          modifiedBy,
          newValue: JSON.parse(JSON.stringify(unit)),
        },
      });

      return unit;
    }, NEON_TRANSACTION_OPTIONS);

    return {
      success: true,
      data: createdUnit,
      status: 201,
    };
  } catch (error) {
    if (error instanceof UnitActionError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        status: error.status,
        data: error.details,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create unit due to an internal error',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Updates an existing Unit.
 *
 * Enforces:
 * 1. Optimistic Concurrency Control (OCC) via expectedUpdatedAt.
 * 2. Mandatory Price List attachment & category matching.
 * 3. Physical Capacity Safeguard: Unit.PhysicalCapacity >= PriceList.MaxGuestCapacity.
 * 4. Pre-deactivation future booking guard if changing isActive from true to false.
 * 5. Atomic update and immutable AuditLog.
 */
export async function updateUnit(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<ActionResponse> {
  try {
    const parseResult = updateUnitSchema.safeParse(rawInput);
    if (!parseResult.success) {
      return {
        success: false,
        error:
          parseResult.error.issues[0]?.message ??
          'Invalid unit update data provided',
        errors: parseResult.error.flatten().fieldErrors,
        code: 'VALIDATION_ERROR',
        status: 400,
      };
    }

    const {
      id,
      name,
      category,
      isActive,
      maxCapacity,
      maxInfants,
      amenities,
      priceListId,
      expectedUpdatedAt,
    } = parseResult.data;

    // Fetch existing unit
    const existingUnit = await prisma.unit.findUnique({
      where: { id },
      include: { priceList: true },
    });

    if (!existingUnit) {
      return {
        success: false,
        error: 'Unit not found',
        code: 'UNIT_NOT_FOUND',
        status: 404,
      };
    }

    // OCC Check
    const expectedTime = new Date(expectedUpdatedAt).getTime();
    if (existingUnit.updatedAt.getTime() > expectedTime) {
      return {
        success: false,
        error:
          'Conflict: This unit was modified by another Admin. Please refresh to view the latest details.',
        code: 'STALE_RECORD',
        status: 409,
      };
    }

    // Fetch target Price List
    const targetPriceList = await prisma.priceList.findUnique({
      where: { id: priceListId },
    });

    if (!targetPriceList) {
      return {
        success: false,
        error: 'Attached price list does not exist.',
        code: 'PRICE_LIST_NOT_FOUND',
        status: 404,
      };
    }

    if (targetPriceList.unitType !== category) {
      return {
        success: false,
        error: `Price list unit type (${targetPriceList.unitType}) does not match unit category (${category}).`,
        code: 'PRICE_LIST_TYPE_MISMATCH',
        status: 400,
      };
    }

    // Capacity Rule: Unit.PhysicalCapacity >= PriceList.MaxGuestCapacity
    if (maxCapacity < targetPriceList.maxGuestCapacity) {
      return {
        success: false,
        error: `Unit physical capacity (${maxCapacity}) cannot be less than attached price list maximum guest capacity (${targetPriceList.maxGuestCapacity}).`,
        code: 'CAPACITY_LESS_THAN_PRICELIST',
        status: 400,
      };
    }

    // Pre-deactivation Guard: if unit is being deactivated
    if (existingUnit.isActive && isActive === false) {
      await assertUnitCanBeDeactivated(id);
    }

    // Atomic update inside transaction
    const updatedUnit = await prisma.$transaction(async (tx) => {
      const unit = await tx.unit.update({
        where: { id },
        data: {
          name,
          category,
          isActive,
          maxCapacity,
          maxInfants: maxInfants ?? 0,
          amenities: amenities || '',
          priceListId,
        },
        include: {
          priceList: true,
          photos: true,
        },
      });

      // Audit Log capture
      await tx.auditLog.create({
        data: {
          action: 'UPDATE_UNIT',
          entityType: 'Unit',
          entityId: id,
          modifiedBy,
          oldValue: JSON.parse(JSON.stringify(existingUnit)),
          newValue: JSON.parse(JSON.stringify(unit)),
        },
      });

      return unit;
    }, NEON_TRANSACTION_OPTIONS);

    return {
      success: true,
      data: updatedUnit,
      status: 200,
    };
  } catch (error) {
    if (error instanceof UnitActionError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        status: error.status,
        data: error.details,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update unit due to an internal error',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Toggles a unit's active/inactive status.
 *
 * Guard condition for deactivation (isActive === false):
 * Queries for endDatetime >= NOW() AND status NOT IN ('CANCELLED').
 * If true, throws UNIT_HAS_FUTURE_BOOKINGS error.
 */
export async function toggleUnitStatus(
  inputOrUnitId: unknown,
  isActiveParam?: boolean | string | { throwOnError?: boolean },
  expectedUpdatedAtParam?: Date | string,
  modifiedByParam: string = 'ADMIN',
  optionsParam?: { throwOnError?: boolean }
): Promise<ActionResponse> {
  let options = optionsParam;
  if (typeof isActiveParam === 'object' && isActiveParam !== null) {
    options = isActiveParam as { throwOnError?: boolean };
  }

  try {
    let unitId: string;
    let isActive: boolean;
    let expectedUpdatedAt: Date | string | undefined;
    let modifiedBy = modifiedByParam || 'ADMIN';

    if (typeof inputOrUnitId === 'object' && inputOrUnitId !== null) {
      const parsed = toggleUnitStatusSchema.safeParse(inputOrUnitId);
      if (!parsed.success) {
        return {
          success: false,
          error:
            parsed.error.issues[0]?.message ??
            'Invalid toggle unit status parameters',
          errors: parsed.error.flatten().fieldErrors,
          code: 'VALIDATION_ERROR',
          status: 400,
        };
      }
      unitId = parsed.data.unitId;
      isActive = parsed.data.isActive;
      expectedUpdatedAt = parsed.data.expectedUpdatedAt;
      if (typeof isActiveParam === 'string') {
        modifiedBy = isActiveParam;
      } else if (typeof isActiveParam === 'object' && isActiveParam !== null) {
        options = isActiveParam as { throwOnError?: boolean };
      }
    } else if (typeof inputOrUnitId === 'string') {
      unitId = inputOrUnitId;
      isActive = Boolean(isActiveParam);
      expectedUpdatedAt = expectedUpdatedAtParam;
      modifiedBy = modifiedByParam || 'ADMIN';
    } else {
      return {
        success: false,
        error: 'Invalid arguments provided to toggleUnitStatus',
        code: 'VALIDATION_ERROR',
        status: 400,
      };
    }

    const updatedUnit = await prisma.$transaction(async (tx) => {
      // 1. Fetch unit
      const existingUnit = await tx.unit.findUnique({
        where: { id: unitId },
      });

      if (!existingUnit) {
        throw new UnitActionError('Unit not found', 'UNIT_NOT_FOUND', 404);
      }

      // 2. OCC Check if timestamp provided
      if (expectedUpdatedAt) {
        const expectedTime = new Date(expectedUpdatedAt).getTime();
        if (existingUnit.updatedAt.getTime() > expectedTime) {
          throw new UnitActionError(
            'Conflict: This unit was modified by another Admin. Please refresh.',
            'STALE_RECORD',
            409
          );
        }
      }

      // 3. Guard condition for deactivation:
      // Query for endDatetime >= NOW() AND status NOT IN ('CANCELLED').
      // If true, throw UNIT_HAS_FUTURE_BOOKINGS error.
      if (!isActive) {
        await assertUnitCanBeDeactivated(unitId, tx);
      }

      // 4. Update status
      const unit = await tx.unit.update({
        where: { id: unitId },
        data: { isActive },
        include: { priceList: true, photos: true },
      });

      // 5. Audit Log
      await tx.auditLog.create({
        data: {
          action: 'TOGGLE_UNIT_STATUS',
          entityType: 'Unit',
          entityId: unitId,
          modifiedBy,
          oldValue: JSON.parse(JSON.stringify(existingUnit)),
          newValue: JSON.parse(JSON.stringify(unit)),
        },
      });

      return unit;
    }, NEON_TRANSACTION_OPTIONS);

    return {
      success: true,
      data: updatedUnit,
      status: 200,
    };
  } catch (error) {
    if (error instanceof UnitActionError) {
      if (options?.throwOnError) {
        throw error;
      }
      return {
        success: false,
        error: error.message,
        code: error.code,
        status: error.status,
        data: error.details,
      };
    }

    if (options?.throwOnError) {
      throw error;
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to toggle unit status due to an internal error',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Fetches all Units with optional category or active filters.
 */
export async function getUnits(filter?: {
  category?: string;
  isActive?: boolean;
}): Promise<ActionResponse> {
  try {
    const where: Prisma.UnitWhereInput = {};

    if (filter?.category) {
      where.category = filter.category.toUpperCase();
    }

    if (filter?.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    const units = await prisma.unit.findMany({
      where,
      include: {
        priceList: true,
        photos: {
          orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    const DOMAIN_CATEGORY_ORDER: Record<string, number> = {
      DOME: 1,
      A_FRAME: 2,
      NON_AC_HALL: 3,
      AC_HALL: 4,
    };

    units.sort((a, b) => {
      const catDiff =
        (DOMAIN_CATEGORY_ORDER[a.category] ?? 99) -
        (DOMAIN_CATEGORY_ORDER[b.category] ?? 99);
      if (catDiff !== 0) return catDiff;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });

    return {
      success: true,
      data: units,
      status: 200,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch units',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Fetches a single Unit by ID with its PriceList and Photos.
 */
export async function getUnitById(id: string): Promise<ActionResponse> {
  try {
    if (!id) {
      return {
        success: false,
        error: 'Unit ID is required',
        code: 'VALIDATION_ERROR',
        status: 400,
      };
    }

    const unit = await prisma.unit.findUnique({
      where: { id },
      include: {
        priceList: {
          include: {
            slabs: {
              orderBy: [{ stayType: 'asc' }, { minHeadcount: 'asc' }],
            },
            modifiers: true,
          },
        },
        photos: {
          orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!unit) {
      return {
        success: false,
        error: 'Unit not found',
        code: 'NOT_FOUND',
        status: 404,
      };
    }

    return {
      success: true,
      data: unit,
      status: 200,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch unit',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Deletes a unit if no existing booking history or reservations exist.
 */
export async function deleteUnit(
  id: string,
  expectedUpdatedAt?: Date | string,
  modifiedBy: string = 'ADMIN'
): Promise<ActionResponse> {
  try {
    if (!id) {
      return {
        success: false,
        error: 'Unit ID is required',
        code: 'VALIDATION_ERROR',
        status: 400,
      };
    }

    const deletionResult = await prisma.$transaction(async (tx) => {
      const existing = await tx.unit.findUnique({
        where: { id },
        include: {
          bookingUnits: {
            take: 1,
          },
          photos: {
            select: { url: true },
          },
        },
      });

      if (!existing) {
        return {
          success: false,
          error: 'Unit not found',
          code: 'NOT_FOUND',
          status: 404,
        };
      }

      // Check OCC
      if (expectedUpdatedAt) {
        const expectedTime = new Date(expectedUpdatedAt).getTime();
        if (existing.updatedAt.getTime() > expectedTime) {
          return {
            success: false,
            error: 'Conflict: This unit was modified by another Admin. Please refresh.',
            code: 'STALE_RECORD',
            status: 409,
          };
        }
      }

      // Restrict deletion if unit has bookings
      if (existing.bookingUnits.length > 0) {
        return {
          success: false,
          error:
            'Cannot delete unit: Reservations or maintenance blocks exist for this unit. Deactivate the unit instead.',
          code: 'UNIT_HAS_BOOKINGS',
          status: 400,
        };
      }

      await tx.unit.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          action: 'DELETE_UNIT',
          entityType: 'Unit',
          entityId: id,
          modifiedBy,
          oldValue: JSON.parse(JSON.stringify(existing)),
        },
      });

      return {
        success: true,
        data: { id, name: existing.name },
        photos: existing.photos,
        status: 200,
      };
    }, NEON_TRANSACTION_OPTIONS);

    if (!deletionResult.success) {
      return deletionResult;
    }

    // Best-effort cleanup of Cloudinary images for deleted unit
    if (deletionResult.photos && deletionResult.photos.length > 0) {
      Promise.all(
        deletionResult.photos.map((p: { url: string }) => deleteCloudinaryImage(p.url))
      ).catch((cleanupErr) => {
        console.warn('Cloudinary photo cleanup skipped or failed for deleted unit:', cleanupErr);
      });
    }

    return {
      success: true,
      data: deletionResult.data,
      status: 200,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return {
        success: false,
        error: 'Cannot delete unit due to existing foreign key references.',
        code: 'RESTRICTED_RELATION',
        status: 400,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete unit',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Creates a maintenance date block directly in BookingUnit without requiring a dummy guest booking.
 * Guarded by PostgreSQL GiST exclusion constraint (no_overlapping_unit_bookings).
 */
export async function createMaintenanceBlock(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<Prisma.BookingUnitGetPayload<{ include: { unit: true } }>> {
  const parseResult = maintenanceBlockSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const firstIssue =
      parseResult.error.issues[0]?.message ?? 'Invalid maintenance block data provided';
    throw new UnitActionError(
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
        throw new UnitActionError(
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
 * Server Action envelope wrapper for createMaintenanceBlock.
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
    if (error instanceof UnitActionError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        status: error.status,
      };
    }

    if (error instanceof UnitScheduleCollisionError) {
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
