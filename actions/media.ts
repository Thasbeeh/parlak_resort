'use server';

import { prisma } from '../lib/prisma';
import {
  unitPhotoSchema,
  setFeaturedPhotoSchema,
  deleteUnitPhotoSchema,
  reorderUnitPhotosSchema,
  updateUnitPhotoMetadataSchema,
  UnitPhotoInput,
  SetFeaturedPhotoInput,
  DeleteUnitPhotoInput,
  ReorderUnitPhotosInput,
  UpdateUnitPhotoMetadataInput,
} from '../schemas/media.schema';
import {
  generateCloudinarySignature as generateSignatureLib,
  deleteCloudinaryImage,
  CloudinarySignatureResult,
} from '../lib/cloudinary';
import { Prisma } from '@prisma/client';
import { NEON_TRANSACTION_OPTIONS, MediaActionError } from '../lib/action-errors';

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
 * Generates signed credentials for direct client-to-Cloudinary uploads.
 * Bypasses Vercel's 4.5MB serverless payload limit without exposing the API secret.
 */
export async function generateCloudinarySignature(
  paramsToSign: Record<string, string | number | boolean> = {}
): Promise<ActionResponse<CloudinarySignatureResult>> {
  try {
    const result = generateSignatureLib(paramsToSign);
    return {
      success: true,
      data: result,
      status: 200,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to generate Cloudinary upload signature',
      code: 'CLOUDINARY_SIGNATURE_ERROR',
      status: 500,
    };
  }
}

/**
 * Saves a new unit photo URL with application-level featured photo exclusivity.
 *
 * Transaction logic:
 * 1. Checks target Unit existence.
 * 2. If it is the unit's first photo (count === 0), atomically sets isFeatured: true.
 * 3. If subsequent photo:
 *    - Defaults to isFeatured: false.
 *    - If explicitly requested as isFeatured: true, sets all existing photos to false first.
 *    - If no featured photo currently exists, auto-promotes to true to preserve invariant.
 * 4. Determines orderIndex (highest existing orderIndex + 1 if not specified).
 * 5. Records immutable AuditLog.
 */
export async function saveUnitPhoto(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<ActionResponse> {
  try {
    const parseResult = unitPhotoSchema.safeParse(rawInput);
    if (!parseResult.success) {
      return {
        success: false,
        error:
          parseResult.error.issues[0]?.message ??
          'Invalid unit photo data provided',
        errors: parseResult.error.flatten().fieldErrors,
        code: 'VALIDATION_ERROR',
        status: 400,
      };
    }

    const { unitId, url, caption, altText, description, orderIndex, isFeatured } =
      parseResult.data;

    const savedPhoto = await prisma.$transaction(async (tx) => {
      // 1. Ensure target Unit exists
      const unit = await tx.unit.findUnique({
        where: { id: unitId },
      });
      if (!unit) {
        throw new MediaActionError('Unit not found', 'UNIT_NOT_FOUND', 404);
      }

      // 2. Fetch existing photos for the unit
      const existingPhotos = await tx.unitPhoto.findMany({
        where: { unitId },
        orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
      });

      const photoCount = existingPhotos.length;
      let finalIsFeatured = false;

      if (photoCount === 0) {
        // First photo invariant: automatically marked as featured
        finalIsFeatured = true;
      } else if (isFeatured) {
        // Subsequent upload explicitly marked featured: demote all other photos
        finalIsFeatured = true;
        await tx.unitPhoto.updateMany({
          where: { unitId },
          data: { isFeatured: false },
        });
      } else {
        // If existing photos somehow lack a featured photo, ensure invariant
        const hasFeatured = existingPhotos.some((p) => p.isFeatured);
        finalIsFeatured = !hasFeatured;
      }

      // Determine orderIndex
      let finalOrderIndex = orderIndex;
      if (finalOrderIndex === 0 && photoCount > 0) {
        const maxOrder = Math.max(...existingPhotos.map((p) => p.orderIndex), -1);
        finalOrderIndex = maxOrder + 1;
      }

      // 3. Create UnitPhoto record
      const photo = await tx.unitPhoto.create({
        data: {
          unitId,
          url,
          caption: caption ?? null,
          altText: altText ?? null,
          description: description ?? null,
          orderIndex: finalOrderIndex,
          isFeatured: finalIsFeatured,
        },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          action: 'SAVE_UNIT_PHOTO',
          entityType: 'UnitPhoto',
          entityId: photo.id,
          modifiedBy,
          newValue: JSON.parse(JSON.stringify(photo)),
        },
      });

      // Bump unit updatedAt to reflect media modification
      await tx.unit.update({
        where: { id: unitId },
        data: { updatedAt: new Date() },
      });

      return photo;
    }, NEON_TRANSACTION_OPTIONS);

    return {
      success: true,
      data: savedPhoto,
      status: 201,
    };
  } catch (error) {
    if (error instanceof MediaActionError) {
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
          : 'Failed to save unit photo due to an internal error',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Sets a specific photo as the featured photo for a unit.
 *
 * Transaction logic:
 * 1. Validates that the target photo exists and belongs to the specified unit.
 * 2. Sets isFeatured: false for all photos belonging to the unit.
 * 3. Sets target photo to isFeatured: true.
 * 4. Records immutable AuditLog.
 */
export async function setFeaturedPhoto(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<ActionResponse> {
  try {
    const parseResult = setFeaturedPhotoSchema.safeParse(rawInput);
    if (!parseResult.success) {
      return {
        success: false,
        error:
          parseResult.error.issues[0]?.message ??
          'Invalid photo identification data provided',
        errors: parseResult.error.flatten().fieldErrors,
        code: 'VALIDATION_ERROR',
        status: 400,
      };
    }

    const { photoId, unitId } = parseResult.data;

    const featuredPhoto = await prisma.$transaction(async (tx) => {
      // 1. Verify photo exists and belongs to unit
      const targetPhoto = await tx.unitPhoto.findFirst({
        where: { id: photoId, unitId },
      });

      if (!targetPhoto) {
        throw new MediaActionError(
          'Target photo not found for the specified unit',
          'PHOTO_NOT_FOUND',
          404
        );
      }

      // 2. Clear featured flag on all unit photos
      await tx.unitPhoto.updateMany({
        where: { unitId },
        data: { isFeatured: false },
      });

      // 3. Mark target photo as featured
      const updatedPhoto = await tx.unitPhoto.update({
        where: { id: photoId },
        data: { isFeatured: true },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          action: 'SET_FEATURED_PHOTO',
          entityType: 'UnitPhoto',
          entityId: photoId,
          modifiedBy,
          oldValue: JSON.parse(JSON.stringify(targetPhoto)),
          newValue: JSON.parse(JSON.stringify(updatedPhoto)),
        },
      });

      // Bump unit updatedAt to reflect media modification
      await tx.unit.update({
        where: { id: unitId },
        data: { updatedAt: new Date() },
      });

      return updatedPhoto;
    }, NEON_TRANSACTION_OPTIONS);

    return {
      success: true,
      data: featuredPhoto,
      status: 200,
    };
  } catch (error) {
    if (error instanceof MediaActionError) {
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
          : 'Failed to set featured photo due to an internal error',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Deletes a unit photo and preserves the single featured photo invariant.
 *
 * Transaction logic:
 * 1. Validates that the target photo exists and belongs to the specified unit.
 * 2. Deletes the target photo.
 * 3. If the deleted photo was isFeatured: true:
 *    - Queries remaining photos ordered by lowest orderIndex (and earliest createdAt).
 *    - Auto-promotes the first remaining photo to isFeatured: true.
 * 4. Records immutable AuditLog.
 * 5. Attempts Cloudinary asset deletion cleanup asynchronously.
 */
export async function deleteUnitPhoto(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<ActionResponse> {
  try {
    const parseResult = deleteUnitPhotoSchema.safeParse(rawInput);
    if (!parseResult.success) {
      return {
        success: false,
        error:
          parseResult.error.issues[0]?.message ??
          'Invalid photo identification data provided',
        errors: parseResult.error.flatten().fieldErrors,
        code: 'VALIDATION_ERROR',
        status: 400,
      };
    }

    const { photoId, unitId } = parseResult.data;

    const deletionResult = await prisma.$transaction(async (tx) => {
      // 1. Verify photo exists and belongs to unit
      const targetPhoto = await tx.unitPhoto.findFirst({
        where: { id: photoId, unitId },
      });

      if (!targetPhoto) {
        throw new MediaActionError(
          'Target photo not found for the specified unit',
          'PHOTO_NOT_FOUND',
          404
        );
      }

      const wasFeatured = targetPhoto.isFeatured;

      // 2. Delete target photo
      await tx.unitPhoto.delete({
        where: { id: photoId },
      });

      let promotedPhoto = null;

      // 3. If target was featured (or if no photo remains featured), auto-promote the photo with lowest orderIndex
      const hasFeaturedRemaining = await tx.unitPhoto.findFirst({
        where: { unitId, isFeatured: true },
      });

      if (!hasFeaturedRemaining) {
        const nextPhoto = await tx.unitPhoto.findFirst({
          where: { unitId },
          orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
        });

        if (nextPhoto) {
          promotedPhoto = await tx.unitPhoto.update({
            where: { id: nextPhoto.id },
            data: { isFeatured: true },
          });
        }
      }

      // Bump unit updatedAt to lock row and reflect media modification
      await tx.unit.update({
        where: { id: unitId },
        data: { updatedAt: new Date() },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          action: 'DELETE_UNIT_PHOTO',
          entityType: 'UnitPhoto',
          entityId: photoId,
          modifiedBy,
          oldValue: JSON.parse(JSON.stringify(targetPhoto)),
          newValue: promotedPhoto
            ? { promotedFeaturedPhotoId: promotedPhoto.id }
            : Prisma.JsonNull,
        },
      });

      return {
        deletedPhotoId: photoId,
        promotedPhoto,
        url: targetPhoto.url,
      };
    }, NEON_TRANSACTION_OPTIONS);

    // 5. Best-effort Cloudinary asset cleanup
    try {
      await deleteCloudinaryImage(deletionResult.url);
    } catch (cleanupErr) {
      console.warn(
        `Cloudinary asset deletion skipped or failed for ${deletionResult.url}:`,
        cleanupErr
      );
    }

    return {
      success: true,
      data: {
        deletedPhotoId: deletionResult.deletedPhotoId,
        promotedPhoto: deletionResult.promotedPhoto,
      },
      status: 200,
    };
  } catch (error) {
    if (error instanceof MediaActionError) {
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
          : 'Failed to delete unit photo due to an internal error',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Reorders unit photos for gallery drag-and-drop sequencing.
 *
 * Transaction logic:
 * 1. Validates all photoIds belong to the specified unit.
 * 2. Sequentially sets orderIndex to match array position.
 * 3. Records immutable AuditLog.
 */
export async function reorderUnitPhotos(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<ActionResponse> {
  try {
    const parseResult = reorderUnitPhotosSchema.safeParse(rawInput);
    if (!parseResult.success) {
      return {
        success: false,
        error:
          parseResult.error.issues[0]?.message ??
          'Invalid reorder photo data provided',
        errors: parseResult.error.flatten().fieldErrors,
        code: 'VALIDATION_ERROR',
        status: 400,
      };
    }

    const { unitId, photoIds } = parseResult.data;

    await prisma.$transaction(async (tx) => {
      // 1. Verify all photo IDs belong to this unit
      const existingPhotos = await tx.unitPhoto.findMany({
        where: {
          unitId,
          id: { in: photoIds },
        },
        select: { id: true },
      });

      if (existingPhotos.length !== photoIds.length) {
        throw new MediaActionError(
          'One or more photo IDs do not belong to the specified unit',
          'INVALID_PHOTO_IDS',
          400
        );
      }

      // 2. Update orderIndex sequentially
      for (let index = 0; index < photoIds.length; index++) {
        await tx.unitPhoto.update({
          where: { id: photoIds[index] },
          data: { orderIndex: index },
        });
      }

      // 3. Audit Log
      await tx.auditLog.create({
        data: {
          action: 'REORDER_UNIT_PHOTOS',
          entityType: 'Unit',
          entityId: unitId,
          modifiedBy,
          newValue: { photoIdsOrder: photoIds },
        },
      });

      // Bump unit updatedAt to reflect media modification
      await tx.unit.update({
        where: { id: unitId },
        data: { updatedAt: new Date() },
      });
    }, NEON_TRANSACTION_OPTIONS);

    return {
      success: true,
      data: { unitId, reorderedCount: photoIds.length },
      status: 200,
    };
  } catch (error) {
    if (error instanceof MediaActionError) {
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
          : 'Failed to reorder unit photos due to an internal error',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Fetches all photos for a unit ordered by display sequence.
 */
export async function getUnitPhotos(unitId: string): Promise<ActionResponse> {
  try {
    if (!unitId) {
      return {
        success: false,
        error: 'Unit ID is required',
        code: 'VALIDATION_ERROR',
        status: 400,
      };
    }

    const photos = await prisma.unitPhoto.findMany({
      where: { unitId },
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
    });

    return {
      success: true,
      data: photos,
      status: 200,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch unit photos',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Updates SEO and accessibility metadata (caption, altText, description) for an existing photo.
 * Aligns directly with docs/admin_panel/rooms.md and docs/admin_panel/event_hall.md.
 */
export async function updateUnitPhotoMetadata(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<ActionResponse> {
  try {
    const parseResult = updateUnitPhotoMetadataSchema.safeParse(rawInput);
    if (!parseResult.success) {
      return {
        success: false,
        error:
          parseResult.error.issues[0]?.message ??
          'Invalid photo metadata provided',
        errors: parseResult.error.flatten().fieldErrors,
        code: 'VALIDATION_ERROR',
        status: 400,
      };
    }

    const { photoId, unitId, caption, altText, description } = parseResult.data;

    const updatedPhoto = await prisma.$transaction(async (tx) => {
      const existing = await tx.unitPhoto.findFirst({
        where: { id: photoId, unitId },
      });

      if (!existing) {
        throw new MediaActionError(
          'Target photo not found for the specified unit',
          'PHOTO_NOT_FOUND',
          404
        );
      }

      const photo = await tx.unitPhoto.update({
        where: { id: photoId },
        data: {
          caption: caption !== undefined ? caption : existing.caption,
          altText: altText !== undefined ? altText : existing.altText,
          description: description !== undefined ? description : existing.description,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'UPDATE_UNIT_PHOTO_METADATA',
          entityType: 'UnitPhoto',
          entityId: photoId,
          modifiedBy,
          oldValue: JSON.parse(JSON.stringify(existing)),
          newValue: JSON.parse(JSON.stringify(photo)),
        },
      });

      await tx.unit.update({
        where: { id: unitId },
        data: { updatedAt: new Date() },
      });

      return photo;
    }, NEON_TRANSACTION_OPTIONS);

    return {
      success: true,
      data: updatedPhoto,
      status: 200,
    };
  } catch (error) {
    if (error instanceof MediaActionError) {
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
          : 'Failed to update photo metadata due to an internal error',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}
