import {
  PriceModifierLike,
  PriceSlabLike,
  resolveModifiers,
  calculateModifiedPrice,
  resolveSlabForHeadcount,
} from './resolve-modifiers';
import {
  getISTDateString,
  addDaysToISTDate,
  calculateNightsBetween,
  createISTDateTime,
} from '../date-utils';

export const RESORT_WHATSAPP_PHONE = '918891931123';

/**
 * Formats a calendar date string (YYYY-MM-DD) into clean English format.
 * E.g. "2026-10-15" -> "15 Oct 2026"
 */
export function formatDisplayDate(dateInput: Date | string): string {
  const dateStr = getISTDateString(dateInput);
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${day} ${monthNames[month - 1]} ${year}`;
}

export interface NightBreakdownItem {
  date: string;
  dayOfWeek: string;
  isWeekend: boolean;
  baseRatePerUnit: number;
  appliedModifier: {
    name: string;
    type: string;
    percentage: number;
  } | null;
  effectiveRatePerUnit: number;
}

export interface RoomQuoteParams {
  unitCategory: 'DOME' | 'A_FRAME';
  unitName?: string;
  stayType: 'OVERNIGHT' | 'DAY_SLOT';
  checkInDate: string; // YYYY-MM-DD
  checkOutDate?: string | null; // YYYY-MM-DD
  rooms: Array<{
    roomIndex?: number | null;
    adults: number;
    infants: number;
  }>;
  priceList: {
    slabs: PriceSlabLike[];
    modifiers: PriceModifierLike[];
  };
  guestName?: string | null;
  guestPhone?: string | null;
  specialRequests?: string | null;
}

export interface RoomInquiryQuoteResult {
  type: 'ROOM';
  unitCategory: 'DOME' | 'A_FRAME';
  unitName: string;
  stayType: 'OVERNIGHT' | 'DAY_SLOT';
  checkInDate: string;
  checkOutDate: string;
  totalNights: number;
  totalRooms: number;
  totalAdults: number;
  totalInfants: number;
  rooms: Array<{
    roomIndex?: number | null;
    adults: number;
    infants: number;
  }>;
  nightsBreakdown: NightBreakdownItem[];
  totalStayRent: number;
  totalRent: number;
  requiredAdvanceTotal: number;
  requiredAdvance: number;
  remainingBalance: number;
  balanceDue: number;
  whatsappMessage: string;
  whatsappUrl: string;
}

export interface MatchedSlabResult {
  minHeadcount: number;
  maxHeadcount: number;
  basePrice: number;
  requiredDeposit: number;
  isFloorApplied: boolean;
}

export interface HallQuoteParams {
  unitCategory: 'NON_AC_HALL' | 'AC_HALL';
  venueName?: string;
  slotType: 'MORNING_SLOT' | 'EVENING_SLOT';
  eventDate: string; // YYYY-MM-DD
  headcount: number;
  attachedDomeRequested?: boolean;
  priceList: {
    slabs: PriceSlabLike[];
    modifiers: PriceModifierLike[];
  };
  guestName?: string | null;
  guestPhone?: string | null;
  notes?: string | null;
}

export interface HallInquiryQuoteResult {
  type: 'HALL';
  unitCategory: 'NON_AC_HALL' | 'AC_HALL';
  venueName: string;
  slotType: 'MORNING_SLOT' | 'EVENING_SLOT';
  slotLabel: string;
  slotTimings: string;
  eventDate: string;
  headcount: number;
  matchedSlab: MatchedSlabResult;
  appliedModifier: {
    name: string;
    type: string;
    percentage: number;
  } | null;
  totalVenueRent: number;
  totalRent: number;
  requiredAdvance: number;
  remainingBalance: number;
  balanceDue: number;
  attachedDomeRequested: boolean;
  attachedDomeStatus: 'COMPLIMENTARY' | 'ON_REQUEST' | 'NOT_REQUESTED';
  whatsappMessage: string;
  whatsappUrl: string;
}

/**
 * Compiles a WhatsApp URL with target phone and encoded message text
 */
export function compileWhatsAppUrl(
  message: string,
  phone: string = RESORT_WHATSAPP_PHONE
): string {
  const sanitizedPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Compiles a Price-Free WhatsApp message for room reservations
 * Guaranteed to strictly exclude all price and financial figures.
 */
export function compileRoomWhatsAppMessage(params: {
  unitCategory: 'DOME' | 'A_FRAME';
  stayType: 'OVERNIGHT' | 'DAY_SLOT';
  checkInDate: string;
  checkOutDate?: string | null;
  totalNights: number;
  rooms: Array<{ roomIndex?: number | null; adults: number; infants: number }>;
  guestName?: string | null;
  guestPhone?: string | null;
  specialRequests?: string | null;
}): string {
  const {
    unitCategory,
    stayType,
    checkInDate,
    checkOutDate,
    totalNights,
    rooms,
    guestName,
    guestPhone,
    specialRequests,
  } = params;

  const isDome = unitCategory === 'DOME';
  const unitTypeLabel = isDome ? 'Luxury Geodesic Dome' : 'A-Frame Luxury Cabin';
  const stayTypeLabel =
    stayType === 'OVERNIGHT'
      ? 'Overnight Stay (12:00 PM Check-in \u2794 11:00 AM Check-out)'
      : 'Day Slot (10:00 AM \u2013 3:00 PM IST)';

  const formattedIn = formatDisplayDate(checkInDate);
  const formattedOut = checkOutDate ? formatDisplayDate(checkOutDate) : formattedIn;

  let datesLine: string;
  if (stayType === 'OVERNIGHT') {
    const nightSuffix = totalNights === 1 ? '1 Night' : `${totalNights} Nights`;
    datesLine = `*Dates:* ${formattedIn} to ${formattedOut} (${nightSuffix})`;
  } else {
    datesLine = `*Dates:* ${formattedIn} (Day Slot)`;
  }

  const totalRooms = rooms.length;
  const roomUnitSuffix = totalRooms === 1 ? '1 Unit' : `${totalRooms} Units`;
  const roomLines = rooms.map((r, i) => {
    const adultsText = `${r.adults} ${r.adults === 1 ? 'Adult' : 'Adults'}`;
    const infantsText =
      r.infants > 0 ? `, ${r.infants} ${r.infants === 1 ? 'Infant' : 'Infants'}` : '';
    return `\u2022 Room ${r.roomIndex ?? i + 1}: ${adultsText}${infantsText}`;
  });

  const guestDetailsLines = [
    `\u2022 Name: ${guestName?.trim() || 'Not specified'}`,
    `\u2022 Contact: ${guestPhone?.trim() || 'Not specified'}`,
  ];
  if (specialRequests && specialRequests.trim()) {
    guestDetailsLines.push(`\u2022 Special Requests: ${specialRequests.trim()}`);
  }

  const noteLine = isDome
    ? '_Note: Max 3 adults & 2 infants per Dome. Strictly NO extra beds. Please confirm availability, official quote, and payment details for booking advance._'
    : '_Note: Max 5 adults & 4 infants per A-Frame. Strictly NO extra beds. Please confirm availability, official quote, and payment details for booking advance._';

  const divider = '\u2500'.repeat(28);

  return [
    '*PARLAK RESORT - STAY RESERVATION REQUEST*',
    divider,
    `*Unit Type:* ${unitTypeLabel}`,
    `*Stay Type:* ${stayTypeLabel}`,
    datesLine,
    '',
    `*Requested Rooms (${roomUnitSuffix}):*`,
    roomLines.join('\n'),
    '',
    '*Guest Details:*',
    guestDetailsLines.join('\n'),
    '',
    noteLine,
  ].join('\n');
}

/**
 * Compiles a Price-Free WhatsApp message for Event Hall inquiries
 * Guaranteed to strictly exclude all price and financial figures.
 */
export function compileHallWhatsAppMessage(params: {
  unitCategory: 'NON_AC_HALL' | 'AC_HALL';
  eventDate: string;
  slotType: 'MORNING_SLOT' | 'EVENING_SLOT';
  headcount: number;
  matchedSlab: { minHeadcount: number; maxHeadcount: number };
  attachedDomeRequested?: boolean;
  guestName?: string | null;
  guestPhone?: string | null;
  notes?: string | null;
}): string {
  const {
    unitCategory,
    eventDate,
    slotType,
    headcount,
    matchedSlab,
    attachedDomeRequested,
    guestName,
    guestPhone,
    notes,
  } = params;

  const isNonAc = unitCategory === 'NON_AC_HALL';
  const venueLabel = isNonAc
    ? 'Non-AC Event Hall (Max 1,200 Pax)'
    : 'AC Event Hall (Max 2,000 Pax)';

  const slotTypeLabel =
    slotType === 'MORNING_SLOT'
      ? 'Morning Slot (10:00 AM \u2013 3:00 PM IST)'
      : 'Evening Slot (5:00 PM \u2013 10:00 PM IST)';

  const formattedDate = formatDisplayDate(eventDate);
  const slabLabel = `${matchedSlab.minHeadcount}\u2013${matchedSlab.maxHeadcount} Pax`;

  const organizerLines = [
    `\u2022 Name: ${guestName?.trim() || 'Not specified'}`,
    `\u2022 Contact: ${guestPhone?.trim() || 'Not specified'}`,
  ];
  if (notes && notes.trim()) {
    organizerLines.push(`\u2022 Notes / Setup Requirements: ${notes.trim()}`);
  }

  const domeStatusText = attachedDomeRequested
    ? 'Yes (Subject to schedule & room inventory clearance)'
    : 'No';

  const divider = '\u2500'.repeat(28);

  return [
    '*PARLAK RESORT - EVENT VENUE INQUIRY*',
    divider,
    `*Venue:* ${venueLabel}`,
    `*Event Date:* ${formattedDate}`,
    `*Slot Type:* ${slotTypeLabel}`,
    `*Expected Headcount:* ${headcount} Guests (Slab: ${slabLabel})`,
    '',
    '*Organizer Details:*',
    organizerLines.join('\n'),
    '',
    `\u2022 Attached Dome Request: ${domeStatusText}`,
    '',
    '_Notice: Swimming pool access is strictly excluded for event attendees under all circumstances. Please confirm availability, official quote, and payment details for booking advance._',
  ].join('\n');
}

/**
 * Calculates a verified on-screen estimate and compiles price-free WhatsApp URL for rooms
 */
export function calculateRoomInquiryQuote(params: RoomQuoteParams): RoomInquiryQuoteResult {
  const {
    unitCategory,
    unitName = unitCategory === 'DOME' ? 'Dome 1' : 'A-Frame 1',
    stayType,
    checkInDate,
    checkOutDate,
    rooms,
    priceList,
    guestName,
    guestPhone,
    specialRequests,
  } = params;

  const totalRooms = rooms.length;
  const totalAdults = rooms.reduce((acc, r) => acc + r.adults, 0);
  const totalInfants = rooms.reduce((acc, r) => acc + r.infants, 0);

  const isOvernight = stayType === 'OVERNIGHT';
  const totalNights =
    isOvernight && checkOutDate
      ? Math.max(1, calculateNightsBetween(checkInDate, checkOutDate))
      : 0;

  const resolvedCheckOut =
    isOvernight && checkOutDate ? checkOutDate : checkInDate;

  // For iteration: overnight runs totalNights, day slot runs 1 day
  const iterationDays = isOvernight ? Math.max(1, totalNights) : 1;

  // Pre-resolve slabs per room based on adults
  const roomSlabs = rooms.map((r) => {
    const slab = resolveSlabForHeadcount(priceList.slabs, r.adults, stayType);
    if (!slab) {
      // Fallback to lowest slab for stayType if available
      const matching = priceList.slabs
        .filter((s) => s.stayType === stayType)
        .sort((a, b) => a.minHeadcount - b.minHeadcount);
      return matching[0] ?? {
        basePrice: unitCategory === 'DOME' ? 3500 : 5000,
        requiredDeposit: 2000,
        minHeadcount: 1,
        maxHeadcount: 3,
        stayType,
      };
    }
    return slab;
  });

  // Dynamic advance calculation (sum of each room's required advance)
  const rawAdvanceTotal = roomSlabs.reduce(
    (sum, s) => sum + Math.round(s.requiredDeposit),
    0
  );

  const nightsBreakdown: NightBreakdownItem[] = [];
  let totalStayRent = 0;

  for (let i = 0; i < iterationDays; i++) {
    const nightDateStr = addDaysToISTDate(checkInDate, i);
    const nightDateTime = createISTDateTime(nightDateStr, '12:00');
    const resolution = resolveModifiers(nightDateTime, priceList.modifiers, stayType);

    const dayOfWeek = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone: 'Asia/Kolkata',
    }).format(nightDateTime);

    let nightBaseSum = 0;
    let nightEffectiveSum = 0;

    for (const slab of roomSlabs) {
      const roomBase = slab.basePrice;
      const roomEffective = calculateModifiedPrice(roomBase, resolution.effectivePercentage);
      nightBaseSum += roomBase;
      nightEffectiveSum += roomEffective;
    }

    const baseRatePerUnit = Math.round(nightBaseSum / totalRooms);
    const effectiveRatePerUnit = Math.round(nightEffectiveSum / totalRooms);

    totalStayRent += nightEffectiveSum;

    nightsBreakdown.push({
      date: nightDateStr,
      dayOfWeek,
      isWeekend: resolution.isWeekend,
      baseRatePerUnit,
      appliedModifier: resolution.appliedModifier
        ? {
            name: resolution.appliedModifier.name,
            type: resolution.appliedModifier.type,
            percentage: resolution.appliedModifier.percentage,
          }
        : null,
      effectiveRatePerUnit,
    });
  }

  totalStayRent = Math.round(totalStayRent);
  const requiredAdvanceTotal = Math.min(rawAdvanceTotal, totalStayRent);
  const remainingBalance = Math.max(0, totalStayRent - requiredAdvanceTotal);

  const whatsappMessage = compileRoomWhatsAppMessage({
    unitCategory,
    stayType,
    checkInDate,
    checkOutDate: resolvedCheckOut,
    totalNights: isOvernight ? Math.max(1, totalNights) : 0,
    rooms,
    guestName,
    guestPhone,
    specialRequests,
  });

  const whatsappUrl = compileWhatsAppUrl(whatsappMessage);

  return {
    type: 'ROOM',
    unitCategory,
    unitName,
    stayType,
    checkInDate,
    checkOutDate: resolvedCheckOut,
    totalNights,
    totalRooms,
    totalAdults,
    totalInfants,
    rooms,
    nightsBreakdown,
    totalStayRent,
    totalRent: totalStayRent,
    requiredAdvanceTotal,
    requiredAdvance: requiredAdvanceTotal,
    remainingBalance,
    balanceDue: remainingBalance,
    whatsappMessage,
    whatsappUrl,
  };
}

/**
 * Calculates a verified on-screen estimate and compiles price-free WhatsApp URL for Event Halls
 */
export function calculateHallInquiryQuote(params: HallQuoteParams): HallInquiryQuoteResult {
  const {
    unitCategory,
    venueName = unitCategory === 'NON_AC_HALL'
      ? 'Non-AC Event Hall'
      : 'AC Event Hall',
    slotType,
    eventDate,
    headcount,
    attachedDomeRequested = false,
    priceList,
    guestName,
    guestPhone,
    notes,
  } = params;

  const slotLabel = slotType === 'MORNING_SLOT' ? 'Morning Slot' : 'Evening Slot';
  const slotTimings =
    slotType === 'MORNING_SLOT'
      ? '10:00 AM \u2013 3:00 PM IST (Same Day)'
      : '5:00 PM \u2013 10:00 PM IST (Same Day)';

  // Find lowest slab for floor check
  const matchingSlabs = priceList.slabs
    .filter((s) => s.stayType === slotType)
    .sort((a, b) => a.minHeadcount - b.minHeadcount);

  const lowestSlab = matchingSlabs[0];
  const isFloorApplied = lowestSlab ? headcount < lowestSlab.minHeadcount : false;

  const matchedSlab = resolveSlabForHeadcount(priceList.slabs, headcount, slotType);

  if (!matchedSlab) {
    throw new Error(
      `No price slab available for headcount ${headcount} and slot ${slotType}`
    );
  }

  // Resolve modifiers for the event date in IST
  const eventDateTime = createISTDateTime(
    eventDate,
    slotType === 'MORNING_SLOT' ? '10:00' : '17:00'
  );
  const resolution = resolveModifiers(eventDateTime, priceList.modifiers, slotType);

  const totalVenueRent = calculateModifiedPrice(
    matchedSlab.basePrice,
    resolution.effectivePercentage
  );
  const requiredAdvance = Math.min(Math.round(matchedSlab.requiredDeposit), totalVenueRent);
  const remainingBalance = Math.max(0, totalVenueRent - requiredAdvance);

  // Attached Dome Qualification (>= 400 Pax qualifies for complimentary)
  let attachedDomeStatus: 'COMPLIMENTARY' | 'ON_REQUEST' | 'NOT_REQUESTED';
  if (attachedDomeRequested) {
    attachedDomeStatus = headcount >= 400 ? 'COMPLIMENTARY' : 'ON_REQUEST';
  } else {
    attachedDomeStatus = 'NOT_REQUESTED';
  }

  const slabResult: MatchedSlabResult = {
    minHeadcount: matchedSlab.minHeadcount,
    maxHeadcount: matchedSlab.maxHeadcount,
    basePrice: matchedSlab.basePrice,
    requiredDeposit: matchedSlab.requiredDeposit,
    isFloorApplied,
  };

  const whatsappMessage = compileHallWhatsAppMessage({
    unitCategory,
    eventDate,
    slotType,
    headcount,
    matchedSlab: slabResult,
    attachedDomeRequested,
    guestName,
    guestPhone,
    notes,
  });

  const whatsappUrl = compileWhatsAppUrl(whatsappMessage);

  return {
    type: 'HALL',
    unitCategory,
    venueName,
    slotType,
    slotLabel,
    slotTimings,
    eventDate,
    headcount,
    matchedSlab: slabResult,
    appliedModifier: resolution.appliedModifier
      ? {
          name: resolution.appliedModifier.name,
          type: resolution.appliedModifier.type,
          percentage: resolution.appliedModifier.percentage,
        }
      : null,
    totalVenueRent,
    totalRent: totalVenueRent,
    requiredAdvance,
    remainingBalance,
    balanceDue: remainingBalance,
    attachedDomeRequested,
    attachedDomeStatus,
    whatsappMessage,
    whatsappUrl,
  };
}
