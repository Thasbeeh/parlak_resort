'use server';

import { prisma } from '@/lib/prisma';
import { resortProfileSchema, type ResortProfileInput } from '@/schemas/settings.schema';
import { SITE_CONFIG } from '@/lib/constants';
import { revalidatePath } from 'next/cache';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[] | undefined>;
  code?: string;
  status?: number;
}

export interface AdminAccountItem {
  id: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_RESORT_PROFILE: ResortProfileInput = {
  resortName: SITE_CONFIG.name,
  tagline: SITE_CONFIG.tagline,
  phone: SITE_CONFIG.phone.display,
  whatsapp: SITE_CONFIG.phone.display,
  email: SITE_CONFIG.email,
  address: SITE_CONFIG.address.formatted,
  overnightCheckIn: SITE_CONFIG.policies.timings.overnight.checkIn,
  overnightCheckOut: SITE_CONFIG.policies.timings.overnight.checkOut,
  daySlotCheckIn: SITE_CONFIG.policies.timings.daySlot.checkIn,
  daySlotCheckOut: SITE_CONFIG.policies.timings.daySlot.checkOut,
  diningUntil: SITE_CONFIG.policies.timings.dining.menuAvailableUntil,
  poolUntil: '10:00 PM IST',
};

/**
 * Fetches current resort settings from database or default constants
 */
export async function getResortSettings(): Promise<ResortProfileInput> {
  try {
    const record = await prisma.setting.findUnique({
      where: { key: 'resort_profile' },
    });

    if (record?.value) {
      const parsed = JSON.parse(record.value);
      return {
        ...DEFAULT_RESORT_PROFILE,
        ...parsed,
      };
    }
  } catch (error) {
    console.error('Failed to load resort profile setting:', error);
  }

  return DEFAULT_RESORT_PROFILE;
}

const DEFAULT_CANCELLATION_POLICY =
  "All cancellations and scope reductions must be requested via WhatsApp with your Booking ID. Baseline scope rent remains locked to original contracted rates. Standard packages are billed as flat baseline blocks with no deductions for shortened hours. Reductions in nights, slots, or headcount slabs are treated as Partial Cancellations; refund amounts are assessed manually by Management based on advance notice. Booking advances are non-refundable and credited directly towards booking rent.";

/**
 * Fetches current cancellation policy from database or default policy
 */
export async function getCancellationPolicy(): Promise<string> {
  try {
    const record = await prisma.setting.findUnique({
      where: { key: 'cancellation_policy' },
    });

    if (record?.value) {
      try {
        const parsed = JSON.parse(record.value);
        if (typeof parsed === 'string') return parsed;
        if (typeof parsed === 'object' && parsed !== null && parsed.policyText) {
          return String(parsed.policyText);
        }
      } catch {
        return record.value;
      }
    }
  } catch (error) {
    console.error('Failed to load cancellation policy setting:', error);
  }

  return DEFAULT_CANCELLATION_POLICY;
}


/**
 * Updates resort settings in PostgreSQL Setting model
 */
export async function updateResortSettingsAction(
  rawInput: unknown,
  modifiedBy: string = 'ADMIN'
): Promise<ActionResponse<ResortProfileInput>> {
  const parseResult = resortProfileSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0]?.message ?? 'Invalid settings data';
    return {
      success: false,
      error: firstIssue,
      code: 'VALIDATION_ERROR',
      status: 400,
      errors: parseResult.error.flatten().fieldErrors,
    };
  }

  const data = parseResult.data;

  try {
    const jsonString = JSON.stringify(data);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.setting.findUnique({
        where: { key: 'resort_profile' },
      });

      await tx.setting.upsert({
        where: { key: 'resort_profile' },
        update: { value: jsonString },
        create: {
          key: 'resort_profile',
          value: jsonString,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'UPDATE_SETTINGS',
          entityType: 'Setting',
          entityId: 'resort_profile',
          modifiedBy,
          oldValue: existing?.value ? JSON.parse(existing.value) : null,
          newValue: data as any,
        },
      });
    });

    try {
      revalidatePath('/admin/settings');
      revalidatePath('/admin/bookings/[id]/print', 'page');
      revalidatePath('/contact');
    } catch {
      // Ignore in non-request contexts (e.g. tests or build pre-render)
    }

    return {
      success: true,
      data,
      status: 200,
    };
  } catch (error) {
    console.error('Failed to update resort settings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

/**
 * Returns read-only overview of seeded admin accounts (Max 3 accounts)
 */
export async function getAdminAccounts(): Promise<AdminAccountItem[]> {
  try {
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return admins;
  } catch (error) {
    console.error('Failed to load admin accounts:', error);
    return [];
  }
}
