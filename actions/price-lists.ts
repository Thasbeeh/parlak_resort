'use server';

import { prisma } from '../lib/prisma';
import {
  createPriceListSchema,
  updatePriceListSchema,
  generateSlug,
  UnitType,
} from '../schemas/price.schema';
import { Prisma } from '@prisma/client';
import { getISTDateString } from '../lib/pricing/resolve-modifiers';
import {
  NEON_TRANSACTION_OPTIONS,
  PriceListActionError,
} from '../lib/action-errors';

/**
 * Standard typed action response envelope
 */
export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[] | undefined>;
  code?: string;
  status?: number;
}

/**
 * Creates a new Price List with its contiguous pricing slabs atomically.
 *
 * Enforces:
 * 1. Zod superRefine schema validation (contiguous slabs, physical capacity limits).
 * 2. Automatic unique slug generation from name if omitted.
 * 3. Atomic insertion of PriceList and child PriceSlab records.
 * 4. Immutable administrative AuditLog tracking.
 */
export async function createPriceList(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<ActionResponse> {
  try {
    const parseResult = createPriceListSchema.safeParse(rawInput);
    if (!parseResult.success) {
      return {
        success: false,
        error:
          parseResult.error.issues[0]?.message ??
          'Invalid price list data provided',
        errors: parseResult.error.flatten().fieldErrors,
        code: 'VALIDATION_ERROR',
        status: 400,
      };
    }

    const { name, unitType, maxGuestCapacity, slabs, modifiers } = parseResult.data;
    const slug = parseResult.data.slug || generateSlug(name);

    // Pre-check slug uniqueness for cleaner API feedback
    const existingSlug = await prisma.priceList.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      return {
        success: false,
        error: `A price list with the slug "${slug}" already exists. Please choose a different profile name.`,
        code: 'SLUG_ALREADY_EXISTS',
        status: 409,
      };
    }

    // Atomic creation inside Prisma transaction
    const createdPriceList = await prisma.$transaction(async (tx) => {
      const priceList = await tx.priceList.create({
        data: {
          name,
          slug,
          unitType,
          maxGuestCapacity,
          slabs: {
            create: slabs.map((slab) => ({
              stayType: slab.stayType,
              minHeadcount: slab.minHeadcount,
              maxHeadcount: slab.maxHeadcount,
              basePrice: slab.basePrice,
              requiredDeposit: slab.requiredDeposit,
            })),
          },
          modifiers:
            modifiers && modifiers.length > 0
              ? {
                  create: modifiers.map((mod) => ({
                    name: mod.name,
                    type: mod.type,
                    percentage: mod.percentage,
                    startDate: mod.startDate,
                    endDate: mod.endDate,
                    isActive: mod.isActive ?? true,
                  })),
                }
              : undefined,
        },
        include: {
          slabs: {
            orderBy: [{ stayType: 'asc' }, { minHeadcount: 'asc' }],
          },
          modifiers: true,
        },
      });

      // Audit Log capture
      await tx.auditLog.create({
        data: {
          action: 'CREATE_PRICE_LIST',
          entityType: 'PriceList',
          entityId: priceList.id,
          modifiedBy,
          newValue: JSON.parse(JSON.stringify(priceList)),
        },
      });

      return priceList;
    }, NEON_TRANSACTION_OPTIONS);

    return {
      success: true,
      data: createdPriceList,
      status: 201,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return {
          success: false,
          error: 'A price list with this name or slug already exists.',
          code: 'SLUG_ALREADY_EXISTS',
          status: 409,
        };
      }
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create price list due to an internal error',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Updates an existing Price List and its slabs atomically.
 *
 * Enforces:
 * 1. Zod superRefine schema validation.
 * 2. Multi-Admin Optimistic Concurrency Control (OCC) using expectedUpdatedAt.
 * 3. Physical capacity guardrails against all currently attached units.
 * 4. Atomic slab replacement (deleteMany + createMany) preventing intermediate 0-slab states.
 * 5. Immutable administrative AuditLog tracking.
 */
export async function updatePriceList(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<ActionResponse> {
  try {
    const parseResult = updatePriceListSchema.safeParse(rawInput);
    if (!parseResult.success) {
      return {
        success: false,
        error:
          parseResult.error.issues[0]?.message ??
          'Invalid price list update data',
        errors: parseResult.error.flatten().fieldErrors,
        code: 'VALIDATION_ERROR',
        status: 400,
      };
    }

    const {
      id,
      name,
      unitType,
      maxGuestCapacity,
      slabs,
      expectedUpdatedAt,
    } = parseResult.data;
    const slug = parseResult.data.slug || generateSlug(name);

    const updatedPriceList = await prisma.$transaction(async (tx) => {
      // 1. Fetch current price list with attached units and slabs
      const existing = await tx.priceList.findUnique({
        where: { id },
        include: {
          slabs: true,
          units: {
            select: {
              id: true,
              name: true,
              maxCapacity: true,
            },
          },
        },
      });

      if (!existing) {
        throw new PriceListActionError(
          'Target price list does not exist.',
          'NOT_FOUND',
          404
        );
      }

      // 2. Enforce Multi-Admin Optimistic Concurrency Control (OCC)
      if (existing.updatedAt.getTime() > expectedUpdatedAt.getTime()) {
        throw new PriceListActionError(
          'Conflict: This price list was modified by another Admin. Please refresh to view the latest details.',
          'STALE_RECORD',
          409
        );
      }

      // Category immutability guard: cannot change unitType if actively attached to units
      if (existing.units.length > 0 && unitType !== existing.unitType) {
        throw new PriceListActionError(
          `Cannot change unit type from "${existing.unitType}" to "${unitType}" while attached to ${existing.units.length} unit(s). Reassign or detach all units first.`,
          'CANNOT_CHANGE_UNIT_TYPE_OF_ATTACHED_PRICE_LIST',
          400
        );
      }

      // 3. Enforce Physical Capacity Guardrail against all currently attached units
      const conflictingCapacityUnits = existing.units.filter(
        (unit) => maxGuestCapacity > unit.maxCapacity
      );
      if (conflictingCapacityUnits.length > 0) {
        const details = conflictingCapacityUnits
          .map((u) => `"${u.name}" (capacity ceiling: ${u.maxCapacity})`)
          .join(', ');
        throw new PriceListActionError(
          `Cannot update price list max guest capacity to ${maxGuestCapacity}: Exceeds physical capacity ceiling of attached unit(s): ${details}. Adjust unit capacities or detach them first.`,
          'CAPACITY_EXCEEDS_ATTACHED_UNIT',
          400
        );
      }

      for (const slab of slabs) {
        const conflictingSlabUnits = existing.units.filter(
          (unit) => slab.maxHeadcount > unit.maxCapacity
        );
        if (conflictingSlabUnits.length > 0) {
          const details = conflictingSlabUnits
            .map((u) => `"${u.name}" (capacity ceiling: ${u.maxCapacity})`)
            .join(', ');
          throw new PriceListActionError(
            `Slab max headcount (${slab.maxHeadcount}) for ${slab.stayType} exceeds physical capacity ceiling of attached unit(s): ${details}.`,
            'SLAB_EXCEEDS_ATTACHED_UNIT',
            400
          );
        }
      }

      // 4. Verify slug collision if slug changed
      if (slug !== existing.slug) {
        const slugOwner = await tx.priceList.findUnique({
          where: { slug },
        });
        if (slugOwner && slugOwner.id !== id) {
          throw new PriceListActionError(
            `The slug "${slug}" is already in use by another price list.`,
            'SLUG_ALREADY_EXISTS',
            409
          );
        }
      }

      // 5. Atomic slab replacement: delete existing slabs and recreate new slabs
      await tx.priceSlab.deleteMany({
        where: { priceListId: id },
      });

      await tx.priceSlab.createMany({
        data: slabs.map((slab) => ({
          priceListId: id,
          stayType: slab.stayType,
          minHeadcount: slab.minHeadcount,
          maxHeadcount: slab.maxHeadcount,
          basePrice: slab.basePrice,
          requiredDeposit: slab.requiredDeposit,
        })),
      });

      // 6. Update master PriceList attributes
      const updated = await tx.priceList.update({
        where: { id },
        data: {
          name,
          slug,
          unitType,
          maxGuestCapacity,
        },
        include: {
          slabs: {
            orderBy: [{ stayType: 'asc' }, { minHeadcount: 'asc' }],
          },
          modifiers: true,
          units: {
            select: {
              id: true,
              name: true,
              category: true,
              maxCapacity: true,
            },
          },
        },
      });

      // 7. Audit Logging
      await tx.auditLog.create({
        data: {
          action: 'UPDATE_PRICE_LIST',
          entityType: 'PriceList',
          entityId: id,
          modifiedBy,
          oldValue: JSON.parse(JSON.stringify(existing)),
          newValue: JSON.parse(JSON.stringify(updated)),
        },
      });

      return updated;
    }, NEON_TRANSACTION_OPTIONS);

    return {
      success: true,
      data: updatedPriceList,
      status: 200,
    };
  } catch (error) {
    if (error instanceof PriceListActionError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        status: error.status,
      };
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return {
          success: false,
          error: 'A price list with this slug or name already exists.',
          code: 'SLUG_ALREADY_EXISTS',
          status: 409,
        };
      }
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update price list due to an internal error',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Retrieves all price lists with their slabs, active modifiers, and attached unit counts.
 */
export async function getPriceLists(unitType?: UnitType): Promise<ActionResponse> {
  try {
    const priceLists = await prisma.priceList.findMany({
      where: unitType ? { unitType } : undefined,
      include: {
        slabs: {
          orderBy: [{ stayType: 'asc' }, { minHeadcount: 'asc' }],
        },
        modifiers: {
          where: { isActive: true },
          orderBy: { startDate: 'asc' },
        },
        _count: {
          select: {
            units: true,
            modifiers: true,
            slabs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: priceLists,
      status: 200,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch price lists',
      code: 'QUERY_ERROR',
      status: 500,
    };
  }
}

/**
 * Retrieves a single price list by its ID with slabs, modifiers, and attached unit details.
 */
export async function getPriceListById(id: string): Promise<ActionResponse> {
  try {
    const priceList = await prisma.priceList.findUnique({
      where: { id },
      include: {
        slabs: {
          orderBy: [{ stayType: 'asc' }, { minHeadcount: 'asc' }],
        },
        modifiers: {
          orderBy: { startDate: 'asc' },
        },
        units: {
          select: {
            id: true,
            name: true,
            category: true,
            maxCapacity: true,
            isActive: true,
          },
        },
      },
    });

    if (!priceList) {
      return {
        success: false,
        error: 'Price list not found',
        code: 'NOT_FOUND',
        status: 404,
      };
    }

    return {
      success: true,
      data: priceList,
      status: 200,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch price list',
      code: 'QUERY_ERROR',
      status: 500,
    };
  }
}

/**
 * Deletes a price list enforcing the domain Deletion Safeguard:
 * Restricts deletion if actively attached to any units.
 */
export async function deletePriceList(
  id: string,
  expectedUpdatedAt?: Date | string,
  modifiedBy: string = 'ADMIN'
): Promise<ActionResponse> {
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.priceList.findUnique({
        where: { id },
        include: {
          units: {
            select: { id: true, name: true },
          },
          modifiers: {
            select: { id: true, name: true, endDate: true },
          },
        },
      });

      if (!existing) {
        return {
          success: false,
          error: 'Price list not found',
          code: 'NOT_FOUND',
          status: 404,
        };
      }

      // Optional OCC check
      if (expectedUpdatedAt) {
        const expectedTime = new Date(expectedUpdatedAt).getTime();
        if (existing.updatedAt.getTime() > expectedTime) {
          return {
            success: false,
            error:
              'Conflict: This price list was modified by another Admin. Please refresh.',
            code: 'STALE_RECORD',
            status: 409,
          };
        }
      }

      // Safeguard 1: Check attached units
      if (existing.units.length > 0) {
        const names = existing.units.map((u) => u.name).join(', ');
        return {
          success: false,
          error: `Cannot delete price list: it is currently attached to ${existing.units.length} unit(s) (${names}). Reassign or detach all units first.`,
          code: 'PRICE_LIST_IN_USE',
          status: 400,
        };
      }

      // Safeguard 2: Check for expired modifiers permanently locked for audit preservation
      const todayIST = getISTDateString(new Date());
      const expiredModifiers = existing.modifiers.filter(
        (m) => getISTDateString(m.endDate) < todayIST
      );
      if (expiredModifiers.length > 0) {
        const names = expiredModifiers.map((m) => m.name).join(', ');
        return {
          success: false,
          error: `Cannot delete price list: it contains ${expiredModifiers.length} expired promotion(s) (${names}) that are permanently locked for historical audit preservation.`,
          code: 'EXPIRED_MODIFIER_LOCKED',
          status: 400,
        };
      }

      await tx.priceList.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          action: 'DELETE_PRICE_LIST',
          entityType: 'PriceList',
          entityId: id,
          modifiedBy,
          oldValue: JSON.parse(JSON.stringify(existing)),
        },
      });

      return {
        success: true,
        data: { id },
        status: 200,
      };
    }, NEON_TRANSACTION_OPTIONS);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003' || error.code === 'P2014') {
        return {
          success: false,
          error:
            'Cannot delete price list: it is currently attached to one or more units. Reassign or detach all units first.',
          code: 'PRICE_LIST_IN_USE',
          status: 400,
        };
      }
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to delete price list',
      code: 'DELETE_ERROR',
      status: 500,
    };
  }
}
