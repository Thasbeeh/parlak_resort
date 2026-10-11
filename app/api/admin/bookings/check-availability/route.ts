import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { mapPresetToDateRange } from '../../../../../lib/date-utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/bookings/check-availability
 * 
 * Checks schedule availability for physical units and attached resting Domes
 * across target dates/times, matching PostgreSQL GiST exclusion semantics:
 * (status NOT IN ('CANCELLED') AND startDatetime < targetEnd AND endDatetime > targetStart)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const startParam = searchParams.get('startDatetime');
    const endParam = searchParams.get('endDatetime');
    const dateParam = searchParams.get('date');
    const stayTypeParam = searchParams.get('stayType');
    const nightsParam = searchParams.get('nights');
    const unitIdsParam = searchParams.get('unitIds');
    const excludeBookingId = searchParams.get('excludeBookingId');

    let startDatetime: Date;
    let endDatetime: Date;

    if (startParam && endParam) {
      startDatetime = new Date(startParam);
      endDatetime = new Date(endParam);
    } else if (dateParam && stayTypeParam) {
      const nights = nightsParam ? parseInt(nightsParam, 10) : 1;
      const range = mapPresetToDateRange(stayTypeParam, dateParam, isNaN(nights) ? 1 : nights);
      startDatetime = range.startDatetime;
      endDatetime = range.endDatetime;
    } else {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing required parameters: provide either (startDatetime, endDatetime) or (date, stayType).',
        },
        { status: 400 }
      );
    }

    if (
      isNaN(startDatetime.getTime()) ||
      isNaN(endDatetime.getTime()) ||
      endDatetime <= startDatetime
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid datetime range. endDatetime must be strictly after startDatetime.',
        },
        { status: 400 }
      );
    }

    const unitIdFilter = unitIdsParam
      ? unitIdsParam.split(',').map((id) => id.trim()).filter(Boolean)
      : undefined;

    // 1. Fetch active units
    const units = await prisma.unit.findMany({
      where: {
        isActive: true,
        ...(unitIdFilter && unitIdFilter.length > 0 ? { id: { in: unitIdFilter } } : {}),
      },
      select: {
        id: true,
        name: true,
        category: true,
        maxCapacity: true,
        maxInfants: true,
        priceListId: true,
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    // 2. Query all overlapping booking units across the requested timeline
    // Overlap condition: start < targetEnd AND end > targetStart AND status != 'CANCELLED'
    const overlappingUnits = await prisma.bookingUnit.findMany({
      where: {
        status: { notIn: ['CANCELLED'] },
        startDatetime: { lt: endDatetime },
        endDatetime: { gt: startDatetime },
        ...(excludeBookingId
          ? {
              OR: [
                { bookingId: null },
                { bookingId: { not: excludeBookingId } },
              ],
            }
          : {}),
      },
      include: {
        booking: {
          select: {
            id: true,
            bookingId: true,
            guestName: true,
            guestPhone: true,
            status: true,
          },
        },
      },
      orderBy: { startDatetime: 'asc' },
    });

    // 3. Build unit availability map and structured unit items
    const availabilityMap: Record<
      string,
      {
        isAvailable: boolean;
        conflicts: Array<{
          bookingUnitId: string;
          bookingId: string | null;
          guestName: string;
          guestPhone: string | null;
          startDatetime: string;
          endDatetime: string;
          status: string;
          stayType: string;
          isComplimentary: boolean;
          isMaintenance: boolean;
        }>;
      }
    > = {};

    const unitsResult = units.map((unit) => {
      const conflicts = overlappingUnits
        .filter((bu) => bu.unitId === unit.id)
        .map((bu) => ({
          bookingUnitId: bu.id,
          bookingId: bu.booking?.bookingId ?? null,
          guestName:
            bu.booking?.guestName ??
            (bu.status === 'MAINTENANCE_BLOCKED'
              ? 'Maintenance Block'
              : 'Confirmed Reservation'),
          guestPhone: bu.booking?.guestPhone ?? null,
          startDatetime: bu.startDatetime.toISOString(),
          endDatetime: bu.endDatetime.toISOString(),
          status: bu.status,
          stayType: bu.stayType,
          isComplimentary: bu.isComplimentary,
          isMaintenance: bu.status === 'MAINTENANCE_BLOCKED',
        }));

      const isAvailable = conflicts.length === 0;

      availabilityMap[unit.id] = {
        isAvailable,
        conflicts,
      };

      return {
        id: unit.id,
        name: unit.name,
        category: unit.category,
        maxCapacity: unit.maxCapacity,
        maxInfants: unit.maxInfants,
        isAvailable,
        conflicts,
      };
    });

    return NextResponse.json({
      success: true,
      startDatetime: startDatetime.toISOString(),
      endDatetime: endDatetime.toISOString(),
      units: unitsResult,
      availabilityMap,
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Internal server error checking availability',
      },
      { status: 500 }
    );
  }
}
