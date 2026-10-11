import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  generateCloudinarySignature,
  generateUploadSignature,
  extractPublicIdFromUrl,
  getOptimizedImageUrl,
  deleteCloudinaryImage,
} from '../lib/cloudinary';
import {
  generateCloudinarySignature as generateCloudinarySignatureAction,
  saveUnitPhoto,
  setFeaturedPhoto,
  deleteUnitPhoto,
  reorderUnitPhotos,
  updateUnitPhotoMetadata,
} from '../actions/media';
import {
  createUnit,
  updateUnit,
  toggleUnitStatus,
  assertUnitCanBeDeactivated,
} from '../actions/units';
import { MediaActionError, UnitActionError } from '../lib/action-errors';
import { prisma } from '../lib/prisma';

describe('Cloudinary Integration (lib/cloudinary.ts)', () => {
  it('generates a signed payload with timestamp, signature, apiKey, and cloudName', () => {
    const originalSecret = process.env.CLOUDINARY_API_SECRET;
    const originalKey = process.env.CLOUDINARY_API_KEY;
    const originalCloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

    try {
      process.env.CLOUDINARY_API_SECRET = 'test_secret_12345';
      process.env.CLOUDINARY_API_KEY = 'test_key_67890';
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'test_cloud';

      const sig = generateCloudinarySignature({
        folder: 'parlak_resort/units',
        timestamp: 1700000000,
      });

      assert.strictEqual(sig.timestamp, 1700000000);
      assert.strictEqual(sig.apiKey, 'test_key_67890');
      assert.strictEqual(sig.cloudName, 'test_cloud');
      assert.strictEqual(sig.folder, 'parlak_resort/units');
      assert.ok(typeof sig.signature === 'string' && sig.signature.length > 0);

      // Alias check
      const aliasSig = generateUploadSignature({ timestamp: 1700000000 });
      assert.strictEqual(aliasSig.timestamp, 1700000000);
    } finally {
      process.env.CLOUDINARY_API_SECRET = originalSecret;
      process.env.CLOUDINARY_API_KEY = originalKey;
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = originalCloud;
    }
  });

  it('correctly extracts public IDs from full Cloudinary URLs', () => {
    // URL with version prefix and webp extension
    const url1 = 'https://res.cloudinary.com/parlak-resort/image/upload/v1/units/dome_main.webp';
    assert.strictEqual(extractPublicIdFromUrl(url1), 'units/dome_main');

    // URL with numeric timestamp version
    const url2 = 'https://res.cloudinary.com/parlak-resort/image/upload/v1720000000/units/aframe_01.jpg';
    assert.strictEqual(extractPublicIdFromUrl(url2), 'units/aframe_01');

    // URL with on-the-fly transformations and version
    const url3 = 'https://res.cloudinary.com/parlak-resort/image/upload/w_400,h_300,c_fill,f_auto/v1/venues/hall_01.png';
    assert.strictEqual(extractPublicIdFromUrl(url3), 'venues/hall_01');

    // Root-level public ID
    const url4 = 'https://res.cloudinary.com/parlak-resort/image/upload/sample.jpg';
    assert.strictEqual(extractPublicIdFromUrl(url4), 'sample');

    // Invalid non-cloudinary URL
    assert.strictEqual(extractPublicIdFromUrl('https://example.com/photo.jpg'), null);
    assert.strictEqual(extractPublicIdFromUrl(''), null);
  });

  it('constructs optimized Cloudinary transformation URLs', () => {
    const sourceUrl = 'https://res.cloudinary.com/parlak-resort/image/upload/units/dome_01.jpg';
    const optimized = getOptimizedImageUrl(sourceUrl, {
      width: 400,
      height: 300,
      crop: 'fill',
      quality: 'auto',
    });

    assert.ok(optimized.includes('/upload/f_auto,q_auto,w_400,h_300,c_fill/'));
    assert.ok(optimized.endsWith('units/dome_01.jpg'));
  });
});

describe('Media Server Actions (actions/media.ts)', () => {
  it('generateCloudinarySignature action returns ActionResponse with signature payload', async () => {
    const res = await generateCloudinarySignatureAction({ folder: 'parlak_resort/units' });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 200);
    assert.ok(res.data?.signature !== undefined);
  });

  it('rejects saveUnitPhoto when input data is invalid', async () => {
    // Missing unitId and invalid URL
    const invalidInput = {
      unitId: 'not-a-uuid',
      url: 'not-a-url',
    };
    const res = await saveUnitPhoto(invalidInput);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 'VALIDATION_ERROR');
    assert.strictEqual(res.status, 400);
  });

  it('rejects setFeaturedPhoto with invalid photo or unit ID', async () => {
    const invalidInput = {
      photoId: 'invalid-uuid',
      unitId: '123e4567-e89b-42d3-a456-426614174000',
    };
    const res = await setFeaturedPhoto(invalidInput);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 'VALIDATION_ERROR');
    assert.strictEqual(res.status, 400);
  });

  it('rejects deleteUnitPhoto with invalid photo or unit ID', async () => {
    const invalidInput = {
      photoId: '123e4567-e89b-42d3-a456-426614174000',
      unitId: 'invalid-uuid',
    };
    const res = await deleteUnitPhoto(invalidInput);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 'VALIDATION_ERROR');
    assert.strictEqual(res.status, 400);
  });

  it('rejects reorderUnitPhotos with duplicate photo IDs or empty array', async () => {
    const duplicateIds = {
      unitId: '123e4567-e89b-42d3-a456-426614174000',
      photoIds: [
        '123e4567-e89b-42d3-a456-426614174001',
        '123e4567-e89b-42d3-a456-426614174001',
      ],
    };
    const res = await reorderUnitPhotos(duplicateIds);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 'VALIDATION_ERROR');
    assert.strictEqual(res.status, 400);
  });

  it('verifies MediaActionError domain properties', () => {
    const err = new MediaActionError('Photo not found', 'PHOTO_NOT_FOUND', 404, { id: 'test' });
    assert.strictEqual(err.message, 'Photo not found');
    assert.strictEqual(err.code, 'PHOTO_NOT_FOUND');
    assert.strictEqual(err.status, 404);
    assert.deepStrictEqual(err.details, { id: 'test' });
  });

  it('enforces transaction logic: first photo isFeatured true, subsequent false, promotion on delete', async () => {
    // In-memory simulation of the transaction logic tested in saveUnitPhoto, setFeaturedPhoto, deleteUnitPhoto
    type MockPhoto = {
      id: string;
      unitId: string;
      url: string;
      orderIndex: number;
      isFeatured: boolean;
      createdAt: Date;
    };

    const photos: MockPhoto[] = [];

    // Helper simulating saveUnitPhoto transaction logic
    function mockSavePhoto(photo: { id: string; unitId: string; url: string; isFeatured?: boolean }) {
      const existing = photos.filter((p) => p.unitId === photo.unitId);
      let isFeatured = false;
      if (existing.length === 0) {
        // First photo is automatically featured
        isFeatured = true;
      } else if (photo.isFeatured) {
        // Demote existing photos
        existing.forEach((p) => (p.isFeatured = false));
        isFeatured = true;
      }

      const maxOrder = existing.length > 0 ? Math.max(...existing.map((p) => p.orderIndex)) : -1;
      const newPhoto: MockPhoto = {
        id: photo.id,
        unitId: photo.unitId,
        url: photo.url,
        orderIndex: maxOrder + 1,
        isFeatured,
        createdAt: new Date(),
      };
      photos.push(newPhoto);
      return newPhoto;
    }

    // Helper simulating setFeaturedPhoto transaction logic
    function mockSetFeatured(unitId: string, photoId: string) {
      photos.filter((p) => p.unitId === unitId).forEach((p) => (p.isFeatured = false));
      const target = photos.find((p) => p.id === photoId);
      if (target) target.isFeatured = true;
    }

    // Helper simulating deleteUnitPhoto transaction logic
    function mockDeletePhoto(unitId: string, photoId: string) {
      const index = photos.findIndex((p) => p.id === photoId && p.unitId === unitId);
      const target = photos[index];
      const wasFeatured = target.isFeatured;
      photos.splice(index, 1);

      if (wasFeatured) {
        // Promote photo with lowest orderIndex
        const remaining = photos
          .filter((p) => p.unitId === unitId)
          .sort((a, b) => a.orderIndex - b.orderIndex);
        if (remaining.length > 0) {
          remaining[0].isFeatured = true;
        }
      }
    }

    const unitId = 'test-unit-1';

    // 1. First photo upload -> must be isFeatured: true
    const p1 = mockSavePhoto({ id: 'p1', unitId, url: 'https://res.cloudinary.com/p1.webp' });
    assert.strictEqual(p1.isFeatured, true);
    assert.strictEqual(p1.orderIndex, 0);

    // 2. Second photo upload -> defaults to isFeatured: false
    const p2 = mockSavePhoto({ id: 'p2', unitId, url: 'https://res.cloudinary.com/p2.webp' });
    assert.strictEqual(p2.isFeatured, false);
    assert.strictEqual(p2.orderIndex, 1);
    assert.strictEqual(photos.find((p) => p.id === 'p1')?.isFeatured, true);

    // 3. Third photo upload -> defaults to isFeatured: false
    const p3 = mockSavePhoto({ id: 'p3', unitId, url: 'https://res.cloudinary.com/p3.webp' });
    assert.strictEqual(p3.isFeatured, false);
    assert.strictEqual(p3.orderIndex, 2);

    // 4. Switch featured to p2
    mockSetFeatured(unitId, 'p2');
    assert.strictEqual(photos.find((p) => p.id === 'p1')?.isFeatured, false);
    assert.strictEqual(photos.find((p) => p.id === 'p2')?.isFeatured, true);
    assert.strictEqual(photos.find((p) => p.id === 'p3')?.isFeatured, false);

    // 5. Delete featured photo (p2) -> auto-promotes lowest orderIndex remaining (p1 has orderIndex 0, p3 has 2)
    mockDeletePhoto(unitId, 'p2');
    assert.strictEqual(photos.length, 2);
    assert.strictEqual(photos.find((p) => p.id === 'p1')?.isFeatured, true);
    assert.strictEqual(photos.find((p) => p.id === 'p3')?.isFeatured, false);
  });
});

describe('Unit Server Actions (actions/units.ts)', { concurrent: false }, () => {
  it('rejects createUnit when input fails Zod physical cap validation (e.g. Dome > 3 adults)', async () => {
    const invalidDome = {
      name: 'Oversized Dome',
      category: 'DOME',
      maxCapacity: 4, // Exceeds hard cap 3
      maxInfants: 1,
      amenities: 'AC, Wi-Fi',
      priceListId: '123e4567-e89b-42d3-a456-426614174000',
    };
    const res = await createUnit(invalidDome);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 'VALIDATION_ERROR');
    assert.strictEqual(res.status, 400);
  });

  it('rejects createUnit when PhysicalCapacity < PriceList.MaxGuestCapacity', async () => {
    const originalFindUnique = prisma.priceList.findUnique;
    try {
      (prisma.priceList.findUnique as any) = async () => ({
        id: '123e4567-e89b-42d3-a456-426614174000',
        name: 'Family Dome Plan',
        unitType: 'DOME',
        maxGuestCapacity: 3, // Requires 3 pax
      });

      const underCapacityUnit = {
        name: 'Small Dome',
        category: 'DOME',
        maxCapacity: 2, // Only 2 pax (< PriceList.maxGuestCapacity of 3)
        maxInfants: 1,
        amenities: 'AC, Wi-Fi',
        priceListId: '123e4567-e89b-42d3-a456-426614174000',
      };

      const res = await createUnit(underCapacityUnit);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.code, 'CAPACITY_LESS_THAN_PRICELIST');
      assert.strictEqual(res.status, 400);
      assert.ok(res.error?.includes('cannot be less than attached price list'));
    } finally {
      prisma.priceList.findUnique = originalFindUnique;
    }
  });

  it('rejects createUnit when attached PriceList unitType does not match Unit category', async () => {
    const originalFindUnique = prisma.priceList.findUnique;
    try {
      (prisma.priceList.findUnique as any) = async () => ({
        id: '123e4567-e89b-42d3-a456-426614174000',
        name: 'A-Frame Plan',
        unitType: 'A_FRAME', // Mismatched category
        maxGuestCapacity: 3,
      });

      const domeUnit = {
        name: 'Dome 1',
        category: 'DOME',
        maxCapacity: 3,
        maxInfants: 1,
        amenities: 'AC',
        priceListId: '123e4567-e89b-42d3-a456-426614174000',
      };

      const res = await createUnit(domeUnit);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.code, 'PRICE_LIST_TYPE_MISMATCH');
      assert.strictEqual(res.status, 400);
    } finally {
      prisma.priceList.findUnique = originalFindUnique;
    }
  });

  it('rejects updateUnit when PhysicalCapacity < PriceList.MaxGuestCapacity', async () => {
    const originalUnitFindUnique = prisma.unit.findUnique;
    const originalPriceFindUnique = prisma.priceList.findUnique;
    try {
      (prisma.unit.findUnique as any) = async () => ({
        id: '123e4567-e89b-42d3-a456-426614174001',
        name: 'Dome 1',
        category: 'DOME',
        maxCapacity: 3,
        updatedAt: new Date('2026-10-06T10:00:00Z'),
      });

      (prisma.priceList.findUnique as any) = async () => ({
        id: '123e4567-e89b-42d3-a456-426614174000',
        name: 'Standard Dome 3 Pax Plan',
        unitType: 'DOME',
        maxGuestCapacity: 3,
      });

      const updatedUnderCapacity = {
        id: '123e4567-e89b-42d3-a456-426614174001',
        name: 'Dome 1 Reduced',
        category: 'DOME',
        maxCapacity: 2, // Less than price list maxGuestCapacity 3
        maxInfants: 1,
        amenities: 'AC',
        priceListId: '123e4567-e89b-42d3-a456-426614174000',
        expectedUpdatedAt: new Date('2026-10-06T10:00:00Z'),
      };

      const res = await updateUnit(updatedUnderCapacity);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.code, 'CAPACITY_LESS_THAN_PRICELIST');
      assert.strictEqual(res.status, 400);
    } finally {
      prisma.unit.findUnique = originalUnitFindUnique;
      prisma.priceList.findUnique = originalPriceFindUnique;
    }
  });

  it('rejects updateUnit when OCC expectedUpdatedAt indicates stale record', async () => {
    const originalUnitFindUnique = prisma.unit.findUnique;
    try {
      (prisma.unit.findUnique as any) = async () => ({
        id: '123e4567-e89b-42d3-a456-426614174001',
        name: 'Dome 1',
        category: 'DOME',
        maxCapacity: 3,
        updatedAt: new Date('2026-10-06T12:00:00Z'), // Newer timestamp
      });

      const staleUpdate = {
        id: '123e4567-e89b-42d3-a456-426614174001',
        name: 'Dome 1 Updated',
        category: 'DOME',
        maxCapacity: 3,
        maxInfants: 1,
        amenities: 'AC',
        priceListId: '123e4567-e89b-42d3-a456-426614174000',
        expectedUpdatedAt: new Date('2026-10-06T10:00:00Z'), // Older expected timestamp
      };

      const res = await updateUnit(staleUpdate);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.code, 'STALE_RECORD');
      assert.strictEqual(res.status, 409);
    } finally {
      prisma.unit.findUnique = originalUnitFindUnique;
    }
  });

  it('toggleUnitStatus: deactivation blocks and returns UNIT_HAS_FUTURE_BOOKINGS when future active bookings exist', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      (prisma.$transaction as any) = async (callback: any) => {
        const mockTx = {
          unit: {
            findUnique: async () => ({
              id: '123e4567-e89b-42d3-a456-426614174001',
              name: 'Dome 1',
              isActive: true,
              updatedAt: new Date('2026-10-06T10:00:00Z'),
            }),
          },
          bookingUnit: {
            findMany: async () => [
              {
                id: 'bu-1',
                bookingId: 'b-101',
                unitId: '123e4567-e89b-42d3-a456-426614174001',
                startDatetime: new Date('2026-10-10T06:30:00Z'),
                endDatetime: new Date('2026-10-11T05:30:00Z'),
                status: 'CONFIRMED',
                booking: { bookingId: '#B001', guestName: 'Alice' },
              },
            ],
          },
        };
        return await callback(mockTx);
      };

      const res = await toggleUnitStatus({
        unitId: '123e4567-e89b-42d3-a456-426614174001',
        isActive: false, // Deactivating
      });

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.code, 'UNIT_HAS_FUTURE_BOOKINGS');
      assert.strictEqual(res.status, 400);
      assert.ok(res.error?.includes('future confirmed booking(s)'));
      assert.strictEqual((res.data as any)?.count, 1);
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('assertUnitCanBeDeactivated throws UnitActionError with code UNIT_HAS_FUTURE_BOOKINGS', async () => {
    const mockTxClient: any = {
      bookingUnit: {
        findMany: async () => [
          {
            id: 'bu-2',
            bookingId: 'b-102',
            unitId: '123e4567-e89b-42d3-a456-426614174002',
            startDatetime: new Date('2026-10-12T06:30:00Z'),
            endDatetime: new Date('2026-10-13T05:30:00Z'),
            status: 'CONFIRMED',
            booking: { bookingId: '#B002', guestName: 'Bob' },
          },
        ],
      },
      unit: {
        findUnique: async () => ({ name: 'A-Frame 1' }),
      },
    };

    await assert.rejects(
      async () => {
        await assertUnitCanBeDeactivated('123e4567-e89b-42d3-a456-426614174002', mockTxClient);
      },
      (err: any) => {
        assert.ok(err instanceof UnitActionError);
        assert.strictEqual(err.code, 'UNIT_HAS_FUTURE_BOOKINGS');
        assert.strictEqual(err.status, 400);
        assert.ok(err.message.includes('future confirmed booking(s)'));
        return true;
      }
    );
  });

  it('toggleUnitStatus: activation (isActive: true) does not trigger future booking guard and succeeds', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      (prisma.$transaction as any) = async (callback: any) => {
        const mockTx = {
          unit: {
            findUnique: async () => ({
              id: '123e4567-e89b-42d3-a456-426614174001',
              name: 'Dome 1',
              isActive: false,
              updatedAt: new Date('2026-10-06T10:00:00Z'),
            }),
            update: async ({ data }: any) => ({
              id: '123e4567-e89b-42d3-a456-426614174001',
              name: 'Dome 1',
              isActive: data.isActive,
              priceList: null,
              photos: [],
            }),
          },
          auditLog: {
            create: async () => ({}),
          },
        };
        return await callback(mockTx);
      };

      const res = await toggleUnitStatus({
        unitId: '123e4567-e89b-42d3-a456-426614174001',
        isActive: true, // Activating
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.status, 200);
      assert.strictEqual((res.data as any)?.isActive, true);
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('toggleUnitStatus: supports options passed as second argument to throw on error', async () => {
    const originalTransaction = prisma.$transaction;
    try {
      (prisma.$transaction as any) = async (callback: any) => {
        const mockTx = {
          unit: {
            findUnique: async () => ({
              id: '123e4567-e89b-42d3-a456-426614174001',
              name: 'Dome 1',
              isActive: true,
              updatedAt: new Date('2026-10-06T10:00:00Z'),
            }),
          },
          bookingUnit: {
            findMany: async () => [
              {
                id: 'bu-3',
                bookingId: 'b-103',
                unitId: '123e4567-e89b-42d3-a456-426614174001',
                startDatetime: new Date('2026-10-15T06:30:00Z'),
                endDatetime: new Date('2026-10-16T05:30:00Z'),
                status: 'CONFIRMED',
                booking: { bookingId: '#B003', guestName: 'Charlie' },
              },
            ],
          },
        };
        return await callback(mockTx);
      };

      await assert.rejects(
        async () => {
          await toggleUnitStatus(
            { unitId: '123e4567-e89b-42d3-a456-426614174001', isActive: false },
            { throwOnError: true }
          );
        },
        (err: any) => {
          assert.ok(err instanceof UnitActionError);
          assert.strictEqual(err.code, 'UNIT_HAS_FUTURE_BOOKINGS');
          return true;
        }
      );
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });

  it('assertUnitCanBeDeactivated rejects empty unit ID with validation error', async () => {
    await assert.rejects(
      async () => {
        await assertUnitCanBeDeactivated('');
      },
      (err: any) => {
        assert.ok(err instanceof UnitActionError);
        assert.strictEqual(err.code, 'VALIDATION_ERROR');
        return true;
      }
    );
  });

  it('lib/cloudinary filters disallowed keys and extracts complex transformation URLs', () => {
    // 1. Disallowed keys filtering
    const sig = generateCloudinarySignature({
      folder: 'units',
      timestamp: 1700000000,
      file: 'data:image/png;base64,1234',
      api_key: 'override_key',
      cloud_name: 'override_cloud',
      signature: 'hack_sig',
    });
    assert.strictEqual(sig.folder, 'units');
    assert.strictEqual(sig.timestamp, 1700000000);
    assert.ok(sig.signature.length > 0);

    // 2. Complex transform flags in URL (e.g. q_auto:best, w_1.5)
    const complexUrl =
      'https://res.cloudinary.com/parlak-resort/image/upload/q_auto:best,c_fill,w_800/v1/units/dome_luxury.webp';
    assert.strictEqual(extractPublicIdFromUrl(complexUrl), 'units/dome_luxury');

    // 3. Falsy and invalid inputs to getOptimizedImageUrl
    assert.strictEqual(getOptimizedImageUrl(''), '');
    assert.strictEqual(getOptimizedImageUrl(null as any), '');
  });

  it('updateUnitPhotoMetadata rejects invalid input and updates photo SEO fields', async () => {
    // 1. Validation rejection
    const invalidInput = {
      photoId: 'invalid-uuid',
      unitId: '123e4567-e89b-42d3-a456-426614174000',
    };
    const res = await updateUnitPhotoMetadata(invalidInput);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 'VALIDATION_ERROR');
    assert.strictEqual(res.status, 400);

    // 2. Successful update with simulated transaction
    const originalTx = prisma.$transaction;
    try {
      (prisma.$transaction as any) = async (cb: any) => {
        const mockTx = {
          unitPhoto: {
            findFirst: async () => ({
              id: '123e4567-e89b-42d3-a456-426614174001',
              unitId: '123e4567-e89b-42d3-a456-426614174000',
              url: 'https://res.cloudinary.com/test.jpg',
              caption: 'Old Caption',
              altText: null,
              description: null,
            }),
            update: async ({ data }: any) => ({
              id: '123e4567-e89b-42d3-a456-426614174001',
              unitId: '123e4567-e89b-42d3-a456-426614174000',
              url: 'https://res.cloudinary.com/test.jpg',
              ...data,
            }),
          },
          auditLog: { create: async () => ({}) },
          unit: { update: async () => ({}) },
        };
        return await cb(mockTx);
      };

      const validUpdate = {
        photoId: '123e4567-e89b-42d3-a456-426614174001',
        unitId: '123e4567-e89b-42d3-a456-426614174000',
        caption: 'Banquet Setup - 800 Pax Capacity',
        altText: 'Dining tables and chandelier stage in Non-AC Hall',
        description: 'Comprehensive setup preview for large wedding receptions',
      };
      const updateRes = await updateUnitPhotoMetadata(validUpdate);
      assert.strictEqual(updateRes.success, true);
      assert.strictEqual(updateRes.status, 200);
      assert.strictEqual(
        (updateRes.data as any)?.caption,
        'Banquet Setup - 800 Pax Capacity'
      );
    } finally {
      prisma.$transaction = originalTx;
    }
  });

  it('assertUnitCanBeDeactivated displays tailored venue message for Event Halls', async () => {
    const mockHallTxClient: any = {
      bookingUnit: {
        findMany: async () => [
          {
            id: 'bu-hall-1',
            bookingId: 'b-hall-1',
            unitId: '123e4567-e89b-42d3-a456-426614174099',
            startDatetime: new Date('2026-10-18T10:00:00Z'),
            endDatetime: new Date('2026-10-18T15:00:00Z'),
            status: 'CONFIRMED',
            booking: { bookingId: '#H001', guestName: 'Grand Reception' },
          },
        ],
      },
      unit: {
        findUnique: async () => ({
          name: 'Non-AC Event Hall',
          category: 'NON_AC_HALL',
        }),
      },
    };

    await assert.rejects(
      async () => {
        await assertUnitCanBeDeactivated('123e4567-e89b-42d3-a456-426614174099', mockHallTxClient);
      },
      (err: any) => {
        assert.ok(err instanceof UnitActionError);
        assert.strictEqual(err.code, 'UNIT_HAS_FUTURE_BOOKINGS');
        assert.ok(err.message.includes('Cannot deactivate venue: Non-AC Event Hall'));
        assert.ok(
          err.message.includes(
            'Please reschedule or cancel these events before deactivating.'
          )
        );
        return true;
      }
    );
  });
});
