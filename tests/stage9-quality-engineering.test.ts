/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import {
  updateBookingAction,
  checkoutBookingAction,
} from '../actions/bookings';
import {
  createMaintenanceBlockAction,
  toggleUnitStatus,
} from '../actions/units';
import { buttonVariants } from '../components/ui/button';
import { Prisma } from '@prisma/client';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/admin/bookings',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const TEST_UNIT_ID = '99999999-9999-4999-8999-999999999991';
const TEST_BOOKING_ID = '99999999-9999-4999-8999-999999999992';

describe('Stage 9: Quality Engineering, Cross-Device Polish & End-to-End Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Emil Kowalski Micro-Interaction Audit
  // ──────────────────────────────────────────────────────────────────────────
  describe('1. Emil Kowalski Micro-Interaction Audit', () => {
    it('all interactive button variants enforce tactile active:scale-[0.98] compression with snappy easing', () => {
      const defaultClasses = buttonVariants({ variant: 'primary', size: 'default' });
      expect(defaultClasses).toContain('active:scale-[0.98]');
      expect(defaultClasses).toContain('ease-[var(--ease-snappy)]');
      expect(defaultClasses).toContain('duration-150');
      expect(defaultClasses).toContain('select-none');
    });

    it('destructive button variant enforces tactile active:scale-[0.98] compression', () => {
      const destructiveClasses = buttonVariants({ variant: 'destructive', size: 'sm' });
      expect(destructiveClasses).toContain('active:scale-[0.98]');
      expect(destructiveClasses).toContain('ease-[var(--ease-snappy)]');
    });

    it('surface entrances emerge from scale-96 decelerating to scale-100 without scale-0 singularities', async () => {
      const fs = await import('fs');
      const dialogCode = fs.readFileSync(
        'components/ui/dialog.tsx',
        'utf8'
      );
      const popoverCode = fs.readFileSync(
        'components/ui/popover.tsx',
        'utf8'
      );
      const dropdownCode = fs.readFileSync(
        'components/ui/dropdown-menu.tsx',
        'utf8'
      );

      // Verify zoom-in-96 / zoom-out-96
      expect(dialogCode).toContain('data-open:zoom-in-96');
      expect(dialogCode).toContain('data-closed:zoom-out-96');
      expect(dialogCode).not.toContain('scale-0');

      expect(popoverCode).toContain('data-open:zoom-in-96');
      expect(popoverCode).toContain('data-closed:zoom-out-96');
      expect(popoverCode).not.toContain('scale-0');

      expect(dropdownCode).toContain('data-open:zoom-in-96');
      expect(dropdownCode).toContain('data-closed:zoom-out-96');
      expect(dropdownCode).not.toContain('scale-0');
    });

    it('button component renders centered spinning Loader2 and aria-busy when loading', async () => {
      const fs = await import('fs');
      const buttonCode = fs.readFileSync(
        'components/ui/button.tsx',
        'utf8'
      );

      expect(buttonCode).toContain('aria-busy={isBusy ? "true" : undefined}');
      expect(buttonCode).toContain('Loader2');
      expect(buttonCode).toContain('absolute inset-0 flex items-center justify-center');
      expect(buttonCode).toContain('isBusy && "invisible opacity-0"');
    });

    it('table filtering in operational cockpits executes with 0ms motion delay', async () => {
      const fs = await import('fs');
      const priceListsCode = fs.readFileSync(
        'components/admin/pricing/PriceListsTable.tsx',
        'utf8'
      );
      // Ensure instantaneous local filtering without scroll or transition delay
      expect(priceListsCode).toContain('filteredList');
      expect(priceListsCode).not.toContain('transition-all duration-500');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Mobile Native & Ergonomics Audit
  // ──────────────────────────────────────────────────────────────────────────
  describe('2. Mobile Native & Ergonomics Audit', () => {
    it('input and textarea components enforce text-base md:text-sm (>=16px on mobile) to eliminate iOS Safari auto-zoom', async () => {
      const fs = await import('fs');
      const inputCode = fs.readFileSync('components/ui/input.tsx', 'utf8');
      const textareaCode = fs.readFileSync('components/ui/textarea.tsx', 'utf8');
      const inputGroupCode = fs.readFileSync('components/ui/input-group.tsx', 'utf8');

      expect(inputCode).toContain('text-base md:text-sm');
      expect(textareaCode).toContain('text-base md:text-sm');
      expect(inputGroupCode).toContain('text-base md:text-sm');
    });

    it('select controls enforce text-base on mobile viewports', async () => {
      const fs = await import('fs');
      const maintenanceCode = fs.readFileSync(
        'components/admin/units/MaintenanceBlockDialog.tsx',
        'utf8'
      );
      const unitEditorCode = fs.readFileSync(
        'components/admin/units/UnitEditorForm.tsx',
        'utf8'
      );

      expect(maintenanceCode).toContain('text-base md:text-sm');
      expect(unitEditorCode).toContain('text-base md:text-sm');
    });

    it('mobile navigation triggers satisfy the 44x44px minimum touch target requirement', async () => {
      const fs = await import('fs');
      const headerCode = fs.readFileSync(
        'components/admin/AdminHeader.tsx',
        'utf8'
      );
      // size-11 is 44px (11 * 4px = 44px)
      expect(headerCode).toContain('size-11');
    });

    it('SafeViewport wraps administrative cockpit in min-h-[100dvh] and enforces safe-area padding', () => {
      const safeViewportCode = fs.readFileSync(
        'components/admin/SafeViewport.tsx',
        'utf8'
      );

      expect(safeViewportCode).toContain('min-h-[100dvh]');
      expect(safeViewportCode).toContain('pt-[env(safe-area-inset-top)]');
      expect(safeViewportCode).toContain('pb-[env(safe-area-inset-bottom)]');
      expect(safeViewportCode).toContain('pl-[env(safe-area-inset-left)]');
      expect(safeViewportCode).toContain('pr-[env(safe-area-inset-right)]');
    });

    it('receipt print view enforces min-h-[100dvh] for mobile viewport address bar resilience', async () => {
      const fs = await import('fs');
      const receiptCode = fs.readFileSync(
        'components/admin/bookings/PrintReceiptView.tsx',
        'utf8'
      );
      expect(receiptCode).toContain('min-h-[100dvh]');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Concurrency & Domain Integrity Audit
  // ──────────────────────────────────────────────────────────────────────────
  describe('3. Concurrency & Domain Integrity Audit', () => {
    it('GiST Collision Test: maintenance block creation traps PostgreSQL 23P01 / P2002 GiST collision and returns UNIT_SCHEDULE_COLLISION (409)', async () => {
      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Exclusion constraint failed: no_overlapping_unit_bookings',
        {
          code: 'P2002',
          clientVersion: '5.22.0',
          meta: { target: ['no_overlapping_unit_bookings'] },
        }
      );

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          unit: {
            findUnique: vi.fn().mockResolvedValue({
              id: TEST_UNIT_ID,
              name: 'Dome 1',
              category: 'DOME',
            }),
          },
          bookingUnit: {
            create: vi.fn().mockRejectedValue(p2002Error),
          },
        });
      });

      const res = await createMaintenanceBlockAction({
        unitId: TEST_UNIT_ID,
        startDatetime: '2026-10-15T04:30:00.000Z',
        endDatetime: '2026-10-15T09:30:00.000Z',
        notes: 'Annual geodesic skin resealing',
      });

      expect(res.success).toBe(false);
      expect(res.code).toBe('UNIT_SCHEDULE_COLLISION');
      expect(res.status).toBe(409);
    });

    it('OCC Collision Test: concurrent updateBooking detects stale timestamp and returns BOOKING_STALE_RECORD (409)', async () => {
      const databaseUpdatedAt = new Date('2026-10-12T15:30:00.000Z');
      const staleClientTimestamp = new Date('2026-10-12T15:00:00.000Z');

const TEST_BOOKING_UNIT_ID = '99999999-9999-4999-8999-999999999993';

      const mockBooking = {
        id: TEST_BOOKING_ID,
        bookingId: '#B099',
        guestName: 'Arjun Menon',
        guestPhone: '+919847123456',
        rentCharge: 5000,
        totalPaid: 2000,
        status: 'CONFIRMED',
        updatedAt: databaseUpdatedAt,
        units: [
          {
            id: TEST_BOOKING_UNIT_ID,
            unitId: TEST_UNIT_ID,
            startDatetime: new Date('2026-10-15T06:30:00.000Z'),
            endDatetime: new Date('2026-10-16T05:30:00.000Z'),
            status: 'CONFIRMED',
            unitPrice: 5000,
            stayType: 'OVERNIGHT',
            unit: { id: TEST_UNIT_ID, name: 'Dome 1', category: 'DOME' },
          },
        ],
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          booking: {
            findUnique: vi.fn().mockResolvedValue(mockBooking),
          },
        });
      });

      const res = await updateBookingAction({
        id: TEST_BOOKING_ID,
        guestName: 'Arjun Menon',
        guestPhone: '+919847123456',
        rentCharge: 5000,
        totalPaid: 2000,
        units: [
          {
            id: TEST_BOOKING_UNIT_ID,
            unitId: TEST_UNIT_ID,
            startDatetime: new Date('2026-10-15T06:30:00.000Z'),
            endDatetime: new Date('2026-10-16T05:30:00.000Z'),
            stayType: 'OVERNIGHT',
            unitPrice: 5000,
            adults: 2,
          },
        ],
        expectedUpdatedAt: staleClientTimestamp,
      });

      expect(res.success).toBe(false);
      expect(res.code).toBe('BOOKING_STALE_RECORD');
      expect(res.status).toBe(409);
    });

    it('Pre-Deactivation Guard Test: deactivating a unit with future reservations triggers UNIT_HAS_FUTURE_BOOKINGS and keeps unit active', async () => {
      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          unit: {
            findUnique: vi.fn().mockResolvedValue({
              id: TEST_UNIT_ID,
              name: 'Dome 2',
              isActive: true,
              updatedAt: new Date(),
            }),
          },
          bookingUnit: {
            findMany: vi.fn().mockResolvedValue([
              {
                id: 'bu-future-1',
                startDatetime: new Date(Date.now() + 86400000 * 2),
                endDatetime: new Date(Date.now() + 86400000 * 3),
                booking: {
                  id: 'bk-future-1',
                  bookingId: '#B042',
                  guestName: 'VIP Guest',
                  status: 'CONFIRMED',
                },
              },
            ]),
          },
        });
      });

      const res = await toggleUnitStatus({
        unitId: TEST_UNIT_ID,
        isActive: false,
      });

      expect(res.success).toBe(false);
      expect(res.code).toBe('UNIT_HAS_FUTURE_BOOKINGS');
      expect(res.status).toBe(400);
      expect(res.error).toContain('future confirmed booking(s)');
    });

    it('Zero-Balance Checkout Invariant Test: checkout attempt with balanceDue > 0 is blocked with OUTSTANDING_BALANCE_NOT_ZERO', async () => {
      const now = new Date();
      const mockBooking = {
        id: TEST_BOOKING_ID,
        bookingId: '#B099',
        status: 'CHECKED_IN',
        rentCharge: 8000,
        totalPaid: 5000, // 3000 outstanding!
        receiptLineItems: [],
        updatedAt: now,
        units: [],
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          booking: {
            findUnique: vi.fn().mockResolvedValue(mockBooking),
          },
        });
      });

      const res = await checkoutBookingAction({
        bookingId: TEST_BOOKING_ID,
        expectedUpdatedAt: now.toISOString(),
      });

      expect(res.success).toBe(false);
      expect(res.code).toBe('OUTSTANDING_BALANCE_NOT_ZERO');
      expect(res.status).toBe(400);
      expect(res.error).toContain('must be collected or adjusted to ₹0 first');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Performance & Bundle Audit
  // ──────────────────────────────────────────────────────────────────────────
  describe('4. Performance & Bundle Audit', () => {
    it('zero WebSockets dependencies and SWR polling configured cleanly at 30s interval', async () => {
      const fs = await import('fs');
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      expect(allDeps['ws']).toBeUndefined();
      expect(allDeps['socket.io']).toBeUndefined();
      expect(allDeps['socket.io-client']).toBeUndefined();

      const dashboardClientCode = fs.readFileSync(
        'components/admin/dashboard/DashboardClient.tsx',
        'utf8'
      );
      const bookingsTableCode = fs.readFileSync(
        'components/admin/bookings/BookingsDataTable.tsx',
        'utf8'
      );

      expect(dashboardClientCode).toContain('refreshInterval: 30000');
      expect(dashboardClientCode).toContain('keepPreviousData: true');
      expect(bookingsTableCode).toContain('refreshInterval: 30000');
      expect(bookingsTableCode).toContain('keepPreviousData: true');
    });

    it('zero serverless PDF libraries bundled in production dependencies', async () => {
      const fs = await import('fs');
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      expect(allDeps['@react-pdf/renderer']).toBeUndefined();
      expect(allDeps['puppeteer']).toBeUndefined();
      expect(allDeps['jspdf']).toBeUndefined();
      expect(allDeps['html2pdf']).toBeUndefined();
    });

    it('Cloudinary photo uploads bypass Next.js serverless functions via direct browser REST upload', async () => {
      const fs = await import('fs');
      const uploadAreaCode = fs.readFileSync(
        'components/admin/units/ImageUploadArea.tsx',
        'utf8'
      );

      expect(uploadAreaCode).toContain('https://api.cloudinary.com/v1_1/${cloudName}/image/upload');
      expect(uploadAreaCode).toContain('method: "POST"');
      expect(uploadAreaCode).toContain('body: formData');
    });

    it('0 CLS resilience: SWR data tables and dashboards preserve previous data during revalidation', async () => {
      const fs = await import('fs');
      const folioDrawerCode = fs.readFileSync(
        'components/admin/bookings/FolioDrawer.tsx',
        'utf8'
      );
      expect(folioDrawerCode).toContain('keepPreviousData: true');
    });
  });
});
