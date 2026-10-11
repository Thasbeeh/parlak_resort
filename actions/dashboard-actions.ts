'use server';

import { revalidatePath } from 'next/cache';
import {
  checkInBooking,
  checkoutBooking,
  recordPayment,
  ActionResponse,
  BookingWithUnits,
} from './bookings';
import { BookingActionError } from '../lib/action-errors';

export async function dashboardCheckInAction(
  rawInput: unknown
): Promise<ActionResponse<BookingWithUnits>> {
  try {
    const data = await checkInBooking(rawInput, 'ADMIN');
    try {
      revalidatePath('/admin/dashboard');
    } catch {
      // Ignore when invoked outside Next.js request context (e.g. tests)
    }
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
      error: error instanceof Error ? error.message : 'Failed to check in guest',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

export async function dashboardCheckoutAction(
  rawInput: unknown
): Promise<ActionResponse<BookingWithUnits>> {
  try {
    const data = await checkoutBooking(rawInput, 'ADMIN');
    try {
      revalidatePath('/admin/dashboard');
    } catch {
      // Ignore when invoked outside Next.js request context (e.g. tests)
    }
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
      error: error instanceof Error ? error.message : 'Failed to check out guest',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}

export async function dashboardRecordPaymentAction(
  rawInput: unknown
): Promise<ActionResponse<BookingWithUnits>> {
  try {
    const data = await recordPayment(rawInput, 'ADMIN');
    try {
      revalidatePath('/admin/dashboard');
    } catch {
      // Ignore when invoked outside Next.js request context (e.g. tests)
    }
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
      error: error instanceof Error ? error.message : 'Failed to record payment',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }
}
