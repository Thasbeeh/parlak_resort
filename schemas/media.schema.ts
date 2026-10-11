import { z } from 'zod';
import { unitIdSchema } from './unit.schema';

/**
 * Maximum allowed image upload size (3MB client-side limit)
 */
export const MAX_PHOTO_FILE_SIZE_BYTES = 3 * 1024 * 1024; // 3MB

/**
 * Unit Photo Upload & Metadata Schema
 * Enforces sequential photo metadata rules and single featured photo lifecycle.
 */
export const unitPhotoSchema = z.object({
  id: z.string().uuid().optional(),
  unitId: unitIdSchema,
  url: z.string({ message: 'Valid image URL is required' }).url('Must be a valid Cloudinary image URL'),
  caption: z.string().trim().max(150, 'Caption is too long').optional().nullable(),
  altText: z.string().trim().max(150, 'Alt text is too long').optional().nullable(),
  description: z.string().trim().max(500, 'Description is too long').optional().nullable(),
  orderIndex: z.number().int().min(0).default(0),
  isFeatured: z.boolean().default(false),
});

export type UnitPhotoInput = z.infer<typeof unitPhotoSchema>;

/**
 * Set Featured Photo Schema
 * Atomic transaction sets all existing unit photos to isFeatured: false, then target to true.
 */
export const setFeaturedPhotoSchema = z.object({
  photoId: z.string({ message: 'Invalid photo ID' }).uuid('Invalid photo ID'),
  unitId: unitIdSchema,
});

export type SetFeaturedPhotoInput = z.infer<typeof setFeaturedPhotoSchema>;

/**
 * Delete Unit Photo Schema
 * If target was isFeatured: true, auto-promotes lowest orderIndex photo to isFeatured: true.
 */
export const deleteUnitPhotoSchema = z.object({
  photoId: z.string({ message: 'Invalid photo ID' }).uuid('Invalid photo ID'),
  unitId: unitIdSchema,
});

export type DeleteUnitPhotoInput = z.infer<typeof deleteUnitPhotoSchema>;

/**
 * Reorder Unit Photos Schema
 * Updates orderIndex values for drag-and-drop gallery reordering.
 * Prevents duplicate photo IDs in reorder array.
 */
export const reorderUnitPhotosSchema = z
  .object({
    unitId: unitIdSchema,
    photoIds: z
      .array(z.string().uuid('Invalid photo ID in array'))
      .min(1, 'At least one photo ID is required to reorder'),
  })
  .refine((data) => new Set(data.photoIds).size === data.photoIds.length, {
    message: 'Photo IDs array cannot contain duplicate photo IDs',
    path: ['photoIds'],
  });

export type ReorderUnitPhotosInput = z.infer<typeof reorderUnitPhotosSchema>;

/**
 * Update Photo Metadata Schema
 * Supports editing Caption, Alt Text, and Description for SEO & accessibility without re-uploading.
 */
export const updateUnitPhotoMetadataSchema = z.object({
  photoId: z.string({ message: 'Invalid photo ID' }).uuid('Invalid photo ID'),
  unitId: unitIdSchema,
  caption: z.string().trim().max(150, 'Caption is too long').optional().nullable(),
  altText: z.string().trim().max(150, 'Alt text is too long').optional().nullable(),
  description: z.string().trim().max(500, 'Description is too long').optional().nullable(),
});

export type UpdateUnitPhotoMetadataInput = z.infer<typeof updateUnitPhotoMetadataSchema>;
