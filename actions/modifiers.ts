'use server';

import { prisma } from '../lib/prisma';
import {
  createPriceModifierSchema,
  updatePriceModifierSchema,
} from '../schemas/price.schema';
import { getISTDateString } from '../lib/pricing/resolve-modifiers';
import {
  NEON_TRANSACTION_OPTIONS,
  ModifierActionError,
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
 * Creates a new Price Modifier (WEEKEND surge or SEASONAL promotion).
 *
 * Enforces:
 * 1. Zod schema validation (date range bounded, percentage -80% to +200%).
 * 2. Target Price List existence.
 * 3. Timeline immutability: Cannot backdate a new promotion to start in the past (IST).
 * 4. Immutable administrative AuditLog tracking.
 */
export async function createModifier(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<ActionResponse> {
  try {
    const parseResult = createPriceModifierSchema.safeParse(rawInput);
    if (!parseResult.success) {
      return {
        success: false,
        error:
          parseResult.error.issues[0]?.message ??
          'Invalid price modifier data provided',
        errors: parseResult.error.flatten().fieldErrors,
        code: 'VALIDATION_ERROR',
        status: 400,
      };
    }

    const {
      priceListId,
      name,
      type,
      percentage,
      startDate,
      endDate,
      isActive,
    } = parseResult.data;

    // 1. Timeline Guard: Start date cannot be in the past in Asia/Kolkata (IST)
    const todayIST = getISTDateString(new Date());
    const startIST = getISTDateString(startDate);
    if (startIST < todayIST) {
      return {
        success: false,
        error:
          'Cannot create a price modifier with a start date in the past.',
        code: 'PAST_START_DATE',
        status: 400,
      };
    }

    // 2. Check target price list exists
    const priceList = await prisma.priceList.findUnique({
      where: { id: priceListId },
    });
    if (!priceList) {
      return {
        success: false,
        error: 'Target price list does not exist.',
        code: 'PRICE_LIST_NOT_FOUND',
        status: 404,
      };
    }

    const createdModifier = await prisma.$transaction(async (tx) => {
      const modifier = await tx.priceModifier.create({
        data: {
          priceListId,
          name,
          type,
          percentage,
          startDate,
          endDate,
          isActive: isActive ?? true,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'CREATE_PRICE_MODIFIER',
          entityType: 'PriceModifier',
          entityId: modifier.id,
          modifiedBy,
          newValue: JSON.parse(JSON.stringify(modifier)),
        },
      });

      return modifier;
    }, NEON_TRANSACTION_OPTIONS);

    return {
      success: true,
      data: createdModifier,
      status: 201,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create price modifier due to an internal error',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Updates an existing Price Modifier.
 *
 * Enforces:
 * 1. Zod schema validation.
 * 2. Multi-Admin Optimistic Concurrency Control (OCC) via expectedUpdatedAt.
 * 3. Timeline Mutability Rules (parlak-domain):
 *    - Expired promotions (endDate < today in IST) are permanently locked (read-only archive).
 *    - Active or started promotions (startDate <= today in IST) strictly cannot have
 *      their past startDate modified.
 *    - Future endDate can be adjusted, but cannot be moved into the past.
 * 4. Immutable administrative AuditLog tracking.
 */
export async function updateModifier(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<ActionResponse> {
  try {
    const parseResult = updatePriceModifierSchema.safeParse(rawInput);
    if (!parseResult.success) {
      return {
        success: false,
        error:
          parseResult.error.issues[0]?.message ??
          'Invalid price modifier update data',
        errors: parseResult.error.flatten().fieldErrors,
        code: 'VALIDATION_ERROR',
        status: 400,
      };
    }

    const {
      id,
      name,
      type,
      percentage,
      startDate,
      endDate,
      isActive,
      expectedUpdatedAt,
    } = parseResult.data;

    const updatedModifier = await prisma.$transaction(async (tx) => {
      const existing = await tx.priceModifier.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new ModifierActionError(
          'Target price modifier does not exist.',
          'NOT_FOUND',
          404
        );
      }

      // 1. Optimistic Concurrency Control (OCC)
      if (existing.updatedAt.getTime() > expectedUpdatedAt.getTime()) {
        throw new ModifierActionError(
          'Conflict: This price modifier was modified by another Admin. Please refresh to view the latest details.',
          'STALE_RECORD',
          409
        );
      }

      // 2. Timeline Constraints & Timeline Immutability Checks (in Asia/Kolkata IST)
      const todayIST = getISTDateString(new Date());
      const existingEndIST = getISTDateString(existing.endDate);
      const existingStartIST = getISTDateString(existing.startDate);
      const newStartIST = getISTDateString(startDate);
      const newEndIST = getISTDateString(endDate);

      // Rule: Expired promotions are permanently locked
      if (existingEndIST < todayIST) {
        throw new ModifierActionError(
          'Cannot modify an expired price modifier. Expired promotions are permanently locked for historical audit preservation.',
          'EXPIRED_MODIFIER_LOCKED',
          400
        );
      }

      // Rule: Active or already started promotions cannot mutate their past startDate
      if (existingStartIST <= todayIST && newStartIST !== existingStartIST) {
        throw new ModifierActionError(
          `Cannot modify the start date of an active or started promotion (original start date: ${existingStartIST}). Past start dates are immutable.`,
          'PAST_START_DATE_IMMUTABLE',
          400
        );
      }

      // Rule: Active or already started promotions cannot mutate their type (e.g. WEEKEND to SEASONAL)
      if (existingStartIST <= todayIST && type !== existing.type) {
        throw new ModifierActionError(
          `Cannot change the type of an active or started promotion (type: ${existing.type}). Create a separate promotion instead.`,
          'CANNOT_CHANGE_ACTIVE_MODIFIER_TYPE',
          400
        );
      }

      // Rule: Future promotions cannot be shifted into the past
      if (existingStartIST > todayIST && newStartIST < todayIST) {
        throw new ModifierActionError(
          'Cannot shift promotion start date to a past date.',
          'PAST_START_DATE',
          400
        );
      }

      // Rule: End date cannot be in the past
      if (newEndIST < todayIST) {
        throw new ModifierActionError(
          'Promotion end date cannot be moved into the past.',
          'END_DATE_IN_PAST',
          400
        );
      }

      // 3. Update Modifier
      const updated = await tx.priceModifier.update({
        where: { id },
        data: {
          name,
          type,
          percentage,
          startDate,
          endDate,
          isActive: isActive ?? existing.isActive,
        },
      });

      // 4. Audit Logging
      await tx.auditLog.create({
        data: {
          action: 'UPDATE_PRICE_MODIFIER',
          entityType: 'PriceModifier',
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
      data: updatedModifier,
      status: 200,
    };
  } catch (error) {
    if (error instanceof ModifierActionError) {
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
          : 'Failed to update price modifier due to an internal error',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Retrieves all modifiers, optionally filtered by priceListId.
 */
export async function getModifiers(
  priceListId?: string
): Promise<ActionResponse> {
  try {
    const modifiers = await prisma.priceModifier.findMany({
      where: priceListId ? { priceListId } : undefined,
      include: {
        priceList: {
          select: {
            id: true,
            name: true,
            unitType: true,
          },
        },
      },
      orderBy: [{ startDate: 'asc' }],
    });

    return {
      success: true,
      data: modifiers,
      status: 200,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch modifiers',
      code: 'QUERY_ERROR',
      status: 500,
    };
  }
}

/**
 * Retrieves a single modifier by ID.
 */
export async function getModifierById(id: string): Promise<ActionResponse> {
  try {
    const modifier = await prisma.priceModifier.findUnique({
      where: { id },
      include: {
        priceList: {
          select: {
            id: true,
            name: true,
            unitType: true,
          },
        },
      },
    });

    if (!modifier) {
      return {
        success: false,
        error: 'Price modifier not found',
        code: 'NOT_FOUND',
        status: 404,
      };
    }

    return {
      success: true,
      data: modifier,
      status: 200,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch modifier',
      code: 'QUERY_ERROR',
      status: 500,
    };
  }
}

/**
 * Deletes a modifier with timeline safeguards (expired promotions are read-only).
 */
export async function deleteModifier(
  id: string,
  expectedUpdatedAt?: Date | string,
  modifiedBy: string = 'ADMIN'
): Promise<ActionResponse> {
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.priceModifier.findUnique({
        where: { id },
      });

      if (!existing) {
        return {
          success: false,
          error: 'Price modifier not found',
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
              'Conflict: This price modifier was modified by another Admin. Please refresh.',
            code: 'STALE_RECORD',
            status: 409,
          };
        }
      }

      // Safeguard: Expired promotions are permanently locked
      const todayIST = getISTDateString(new Date());
      const existingEndIST = getISTDateString(existing.endDate);
      if (existingEndIST < todayIST) {
        return {
          success: false,
          error:
            'Cannot delete an expired price modifier. Expired promotions are permanently locked for historical audit preservation.',
          code: 'EXPIRED_MODIFIER_LOCKED',
          status: 400,
        };
      }

      await tx.priceModifier.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          action: 'DELETE_PRICE_MODIFIER',
          entityType: 'PriceModifier',
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
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to delete modifier',
      code: 'DELETE_ERROR',
      status: 500,
    };
  }
}

/**
 * Toggles a modifier's active status with OCC and expired locks.
 */
export async function toggleModifierStatus(
  id: string,
  isActive: boolean,
  expectedUpdatedAt: Date | string,
  modifiedBy: string = 'ADMIN'
): Promise<ActionResponse> {
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.priceModifier.findUnique({
        where: { id },
      });

      if (!existing) {
        return {
          success: false,
          error: 'Price modifier not found',
          code: 'NOT_FOUND',
          status: 404,
        };
      }

      // OCC check
      const expectedTime = new Date(expectedUpdatedAt).getTime();
      if (existing.updatedAt.getTime() > expectedTime) {
        return {
          success: false,
          error:
            'Conflict: This price modifier was modified by another Admin. Please refresh.',
          code: 'STALE_RECORD',
          status: 409,
        };
      }

      // Expired lock check
      const todayIST = getISTDateString(new Date());
      const existingEndIST = getISTDateString(existing.endDate);
      if (existingEndIST < todayIST) {
        return {
          success: false,
          error:
            'Cannot toggle status of an expired price modifier. Expired promotions are locked.',
          code: 'EXPIRED_MODIFIER_LOCKED',
          status: 400,
        };
      }

      const updated = await tx.priceModifier.update({
        where: { id },
        data: { isActive },
      });

      await tx.auditLog.create({
        data: {
          action: 'UPDATE_PRICE_MODIFIER',
          entityType: 'PriceModifier',
          entityId: id,
          modifiedBy,
          oldValue: JSON.parse(JSON.stringify(existing)),
          newValue: JSON.parse(JSON.stringify(updated)),
        },
      });

      return {
        success: true,
        data: updated,
        status: 200,
      };
    }, NEON_TRANSACTION_OPTIONS);
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to toggle modifier status',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}
