/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../lib/prisma';
import {
  calculateRoomInquiryQuote,
  calculateHallInquiryQuote,
  compileRoomWhatsAppMessage,
  compileHallWhatsAppMessage,
  compileWhatsAppUrl,
  formatDisplayDate,
  RESORT_WHATSAPP_PHONE,
} from '../lib/pricing/inquiry';
import {
  roomInquirySchema,
  hallInquirySchema,
  inquiryGenerateSchema,
  availabilityQuerySchema,
} from '../lib/schemas/inquiry.schema';
import { GET as availabilityHandler } from '../app/api/availability/route';
import { POST as inquiryGenerateHandler } from '../app/api/inquiry/generate/route';
import { PriceModifierLike, PriceSlabLike } from '../lib/pricing/resolve-modifiers';

describe('Stage 10: Public Website Backend Foundations, Pricing Engine & Inquiry APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Mock Price Lists and Slabs for In-Memory Unit Testing
  const mockDomeSlabs: PriceSlabLike[] = [
    {
      id: 'slab-dome-overnight-1',
      stayType: 'OVERNIGHT',
      minHeadcount: 1,
      maxHeadcount: 2,
      basePrice: 3000,
      requiredDeposit: 1500,
    },
    {
      id: 'slab-dome-overnight-2',
      stayType: 'OVERNIGHT',
      minHeadcount: 3,
      maxHeadcount: 3,
      basePrice: 3500,
      requiredDeposit: 2000,
    },
    {
      id: 'slab-dome-dayslot-1',
      stayType: 'DAY_SLOT',
      minHeadcount: 1,
      maxHeadcount: 3,
      basePrice: 2500,
      requiredDeposit: 1500,
    },
  ];

  const mockHallSlabs: PriceSlabLike[] = [
    {
      id: 'hall-m-1',
      stayType: 'MORNING_SLOT',
      minHeadcount: 10,
      maxHeadcount: 25,
      basePrice: 10000,
      requiredDeposit: 5000,
    },
    {
      id: 'hall-m-2',
      stayType: 'MORNING_SLOT',
      minHeadcount: 26,
      maxHeadcount: 100,
      basePrice: 24000,
      requiredDeposit: 6000,
    },
    {
      id: 'hall-m-3',
      stayType: 'MORNING_SLOT',
      minHeadcount: 101,
      maxHeadcount: 400,
      basePrice: 46000,
      requiredDeposit: 8000,
    },
    {
      id: 'hall-m-4',
      stayType: 'MORNING_SLOT',
      minHeadcount: 401,
      maxHeadcount: 800,
      basePrice: 58000,
      requiredDeposit: 10000,
    },
    {
      id: 'hall-m-5',
      stayType: 'MORNING_SLOT',
      minHeadcount: 801,
      maxHeadcount: 1200,
      basePrice: 72000,
      requiredDeposit: 15000,
    },
    {
      id: 'hall-e-1',
      stayType: 'EVENING_SLOT',
      minHeadcount: 10,
      maxHeadcount: 25,
      basePrice: 15000,
      requiredDeposit: 5000,
    },
    {
      id: 'hall-e-2',
      stayType: 'EVENING_SLOT',
      minHeadcount: 401,
      maxHeadcount: 800,
      basePrice: 72000,
      requiredDeposit: 10000,
    },
  ];

  const mockModifiers: PriceModifierLike[] = [
    {
      id: 'mod-weekend',
      name: 'Weekend Surcharge',
      type: 'WEEKEND',
      percentage: 20, // +20%
      startDate: new Date('2026-10-01T00:00:00.000Z'),
      endDate: new Date('2026-10-31T23:59:59.000Z'),
      isActive: true,
    },
    {
      id: 'mod-seasonal-promo',
      name: 'Autumn Special Discount',
      type: 'SEASONAL',
      percentage: -10, // -10%
      startDate: new Date('2026-10-01T00:00:00.000Z'),
      endDate: new Date('2026-10-31T23:59:59.000Z'),
      isActive: true,
    },
  ];

  // =========================================================================
  // 1. Room Pricing Math & Night-by-Night Multi-Room Scaling
  // =========================================================================
  describe('1. Room Pricing Math & Night-by-Night Multi-Room Scaling', () => {
    it('calculates single-night weekday stay with seasonal discount correctly', () => {
      // 2026-10-14 (Wednesday) to 2026-10-15 (Thursday)
      const quote = calculateRoomInquiryQuote({
        unitCategory: 'DOME',
        stayType: 'OVERNIGHT',
        checkInDate: '2026-10-14',
        checkOutDate: '2026-10-15',
        rooms: [{ roomIndex: 1, adults: 2, infants: 0 }],
        priceList: {
          slabs: mockDomeSlabs,
          modifiers: mockModifiers,
        },
      });

      expect(quote.totalNights).toBe(1);
      expect(quote.totalRooms).toBe(1);
      expect(quote.nightsBreakdown).toHaveLength(1);

      const night = quote.nightsBreakdown[0];
      expect(night.isWeekend).toBe(false);
      expect(night.appliedModifier?.type).toBe('SEASONAL');
      expect(night.appliedModifier?.percentage).toBe(-10);

      // Base: 3000, -10% discount: 2700
      expect(night.baseRatePerUnit).toBe(3000);
      expect(night.effectiveRatePerUnit).toBe(2700);
      expect(quote.totalStayRent).toBe(2700);
      expect(quote.requiredAdvanceTotal).toBe(1500);
      expect(quote.remainingBalance).toBe(1200);
      expect(quote.balanceDue).toBe(1200);
    });

    it('enforces Weekend Rate override over seasonal discount on Friday/Saturday nights', () => {
      // 2026-10-16 (Friday) to 2026-10-17 (Saturday) - Overnight on Friday is Weekend in IST
      const quote = calculateRoomInquiryQuote({
        unitCategory: 'DOME',
        stayType: 'OVERNIGHT',
        checkInDate: '2026-10-16',
        checkOutDate: '2026-10-17',
        rooms: [{ roomIndex: 1, adults: 3, infants: 1 }],
        priceList: {
          slabs: mockDomeSlabs,
          modifiers: mockModifiers,
        },
      });

      expect(quote.totalNights).toBe(1);
      const night = quote.nightsBreakdown[0];
      expect(night.isWeekend).toBe(true);
      expect(night.appliedModifier?.type).toBe('WEEKEND');
      expect(night.appliedModifier?.percentage).toBe(20);

      // 3 adults matches 3-pax slab (base 3500) + 20% = 4200
      expect(night.baseRatePerUnit).toBe(3500);
      expect(night.effectiveRatePerUnit).toBe(4200);
      expect(quote.totalStayRent).toBe(4200);
      expect(quote.requiredAdvanceTotal).toBe(2000);
      expect(quote.remainingBalance).toBe(2200);
    });

    it('prices multi-night stay night-by-night across weekday and weekend boundary', () => {
      // 2026-10-15 (Thursday, weekday) to 2026-10-17 (Saturday, 2 nights: Thu + Fri)
      const quote = calculateRoomInquiryQuote({
        unitCategory: 'DOME',
        stayType: 'OVERNIGHT',
        checkInDate: '2026-10-15',
        checkOutDate: '2026-10-17',
        rooms: [{ roomIndex: 1, adults: 2, infants: 0 }],
        priceList: {
          slabs: mockDomeSlabs,
          modifiers: mockModifiers,
        },
      });

      expect(quote.totalNights).toBe(2);
      expect(quote.nightsBreakdown).toHaveLength(2);

      // Night 1 (Thursday): -10% seasonal discount -> 3000 * 0.9 = 2700
      expect(quote.nightsBreakdown[0].date).toBe('2026-10-15');
      expect(quote.nightsBreakdown[0].isWeekend).toBe(false);
      expect(quote.nightsBreakdown[0].effectiveRatePerUnit).toBe(2700);

      // Night 2 (Friday): +20% weekend surcharge -> 3000 * 1.2 = 3600
      expect(quote.nightsBreakdown[1].date).toBe('2026-10-16');
      expect(quote.nightsBreakdown[1].isWeekend).toBe(true);
      expect(quote.nightsBreakdown[1].effectiveRatePerUnit).toBe(3600);

      // Total rent = 2700 + 3600 = 6300
      expect(quote.totalStayRent).toBe(6300);
      expect(quote.requiredAdvanceTotal).toBe(1500);
      expect(quote.remainingBalance).toBe(4800);
    });

    it('scales multi-room booking matching respective adult capacities per room', () => {
      // 2 Rooms for 1 night (Thursday):
      // Room 1: 3 Adults (base 3500, deposit 2000)
      // Room 2: 2 Adults (base 3000, deposit 1500)
      const quote = calculateRoomInquiryQuote({
        unitCategory: 'DOME',
        stayType: 'OVERNIGHT',
        checkInDate: '2026-10-15',
        checkOutDate: '2026-10-16',
        rooms: [
          { roomIndex: 1, adults: 3, infants: 1 },
          { roomIndex: 2, adults: 2, infants: 0 },
        ],
        priceList: {
          slabs: mockDomeSlabs,
          modifiers: mockModifiers, // -10% seasonal applies
        },
      });

      expect(quote.totalRooms).toBe(2);
      expect(quote.totalAdults).toBe(5);
      expect(quote.totalInfants).toBe(1);

      // Room 1: 3500 * 0.9 = 3150
      // Room 2: 3000 * 0.9 = 2700
      // Total Rent: 3150 + 2700 = 5850
      expect(quote.totalStayRent).toBe(5850);

      // Advance: 2000 + 1500 = 3500
      expect(quote.requiredAdvanceTotal).toBe(3500);
      expect(quote.remainingBalance).toBe(2350);
      expect(quote.balanceDue).toBe(2350);
    });
  });

  // =========================================================================
  // 2. Event Hall Calculations & Minimum Slab Floor Rule
  // =========================================================================
  describe('2. Event Hall Calculations & Minimum Slab Floor Rule', () => {
    it('matches correct headcount slab for event halls', () => {
      // 550 Pax -> 401–800 slab (base 58000, deposit 10000)
      const quote = calculateHallInquiryQuote({
        unitCategory: 'NON_AC_HALL',
        slotType: 'MORNING_SLOT',
        eventDate: '2026-10-14', // Wednesday
        headcount: 550,
        attachedDomeRequested: true,
        priceList: {
          slabs: mockHallSlabs,
          modifiers: mockModifiers,
        },
      });

      expect(quote.matchedSlab.minHeadcount).toBe(401);
      expect(quote.matchedSlab.maxHeadcount).toBe(800);
      expect(quote.matchedSlab.basePrice).toBe(58000);
      expect(quote.matchedSlab.isFloorApplied).toBe(false);

      // Weekday: -10% promo -> 58000 * 0.9 = 52200
      expect(quote.totalVenueRent).toBe(52200);
      expect(quote.requiredAdvance).toBe(10000);
      expect(quote.remainingBalance).toBe(42200);

      // Headcount >= 400 qualifies for complimentary attached dome
      expect(quote.attachedDomeRequested).toBe(true);
      expect(quote.attachedDomeStatus).toBe('COMPLIMENTARY');
    });

    it('enforces Minimum Slab Floor rule for headcounts below lowest slab', () => {
      // 5 Guests: lowest configured slab is 10–25 Pax (base 10000, deposit 5000)
      const quote = calculateHallInquiryQuote({
        unitCategory: 'NON_AC_HALL',
        slotType: 'MORNING_SLOT',
        eventDate: '2026-10-14',
        headcount: 5,
        attachedDomeRequested: false,
        priceList: {
          slabs: mockHallSlabs,
          modifiers: [],
        },
      });

      expect(quote.matchedSlab.minHeadcount).toBe(10);
      expect(quote.matchedSlab.maxHeadcount).toBe(25);
      expect(quote.matchedSlab.basePrice).toBe(10000);
      expect(quote.matchedSlab.isFloorApplied).toBe(true);
      expect(quote.totalVenueRent).toBe(10000);
      expect(quote.requiredAdvance).toBe(5000);
      expect(quote.attachedDomeStatus).toBe('NOT_REQUESTED');
    });

    it('marks attached dome as ON_REQUEST for headcounts below 400 Pax', () => {
      const quote = calculateHallInquiryQuote({
        unitCategory: 'NON_AC_HALL',
        slotType: 'MORNING_SLOT',
        eventDate: '2026-10-14',
        headcount: 250,
        attachedDomeRequested: true,
        priceList: {
          slabs: mockHallSlabs,
          modifiers: [],
        },
      });

      expect(quote.headcount).toBe(250);
      expect(quote.attachedDomeRequested).toBe(true);
      expect(quote.attachedDomeStatus).toBe('ON_REQUEST');
    });

    it('applies Weekend surcharge on Saturday and Sunday event slots', () => {
      // 2026-10-17 (Saturday morning)
      const quote = calculateHallInquiryQuote({
        unitCategory: 'NON_AC_HALL',
        slotType: 'MORNING_SLOT',
        eventDate: '2026-10-17',
        headcount: 50,
        priceList: {
          slabs: mockHallSlabs,
          modifiers: mockModifiers, // Weekend +20% overrides seasonal -10%
        },
      });

      expect(quote.appliedModifier?.type).toBe('WEEKEND');
      expect(quote.appliedModifier?.percentage).toBe(20);

      // Slab 26-100 base is 24000. 24000 * 1.2 = 28800
      expect(quote.totalVenueRent).toBe(28800);
    });
  });

  // =========================================================================
  // 3. Occupancy Hard Caps & Validation Rejection (HTTP 400)
  // =========================================================================
  describe('3. Occupancy Hard Caps & Validation Rejection', () => {
    it('rejects Dome inquiry exceeding hard cap of 3 adults', () => {
      const invalidDome = {
        type: 'ROOM',
        unitCategory: 'DOME',
        stayType: 'OVERNIGHT',
        checkInDate: '2026-10-15',
        checkOutDate: '2026-10-16',
        rooms: [{ roomIndex: 1, adults: 4, infants: 0 }], // 4 adults violates Dome limit (max 3)
      };

      const result = roomInquirySchema.safeParse(invalidDome);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('maximum of 3 adults');
      }
    });

    it('rejects Dome inquiry exceeding hard cap of 2 infants', () => {
      const invalidDome = {
        type: 'ROOM',
        unitCategory: 'DOME',
        stayType: 'OVERNIGHT',
        checkInDate: '2026-10-15',
        checkOutDate: '2026-10-16',
        rooms: [{ roomIndex: 1, adults: 2, infants: 3 }], // 3 infants violates Dome limit (max 2)
      };

      const result = roomInquirySchema.safeParse(invalidDome);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('maximum of 2 infants');
      }
    });

    it('rejects A-Frame inquiry exceeding hard cap of 5 adults', () => {
      const invalidAFrame = {
        type: 'ROOM',
        unitCategory: 'A_FRAME',
        stayType: 'OVERNIGHT',
        checkInDate: '2026-10-15',
        checkOutDate: '2026-10-16',
        rooms: [{ roomIndex: 1, adults: 6, infants: 1 }], // 6 adults violates A-Frame limit (max 5)
      };

      const result = roomInquirySchema.safeParse(invalidAFrame);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('maximum of 5 adults');
      }
    });

    it('rejects A-Frame inquiry exceeding hard cap of 4 infants', () => {
      const invalidAFrame = {
        type: 'ROOM',
        unitCategory: 'A_FRAME',
        stayType: 'OVERNIGHT',
        checkInDate: '2026-10-15',
        checkOutDate: '2026-10-16',
        rooms: [{ roomIndex: 1, adults: 4, infants: 5 }], // 5 infants violates A-Frame limit (max 4)
      };

      const result = roomInquirySchema.safeParse(invalidAFrame);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('maximum of 4 infants');
      }
    });

    it('rejects Event Hall exceeding venue physical capacity (1,200 Non-AC / 2,000 AC)', () => {
      const invalidNonAc = {
        type: 'HALL',
        unitCategory: 'NON_AC_HALL',
        slotType: 'MORNING_SLOT',
        eventDate: '2026-10-20',
        headcount: 1201, // Max is 1200
      };

      const nonAcResult = hallInquirySchema.safeParse(invalidNonAc);
      expect(nonAcResult.success).toBe(false);
      if (!nonAcResult.success) {
        expect(nonAcResult.error.issues[0].message).toContain('maximum physical capacity limit of 1,200 Pax');
      }

      const invalidAc = {
        type: 'HALL',
        unitCategory: 'AC_HALL',
        slotType: 'EVENING_SLOT',
        eventDate: '2026-10-20',
        headcount: 2001, // Max is 2000
      };

      const acResult = hallInquirySchema.safeParse(invalidAc);
      expect(acResult.success).toBe(false);
      if (!acResult.success) {
        expect(acResult.error.issues[0].message).toContain('maximum physical capacity limit of 2,000 Pax');
      }
    });

    it('rejects room inquiries with 0 adults or invalid checkout dates', () => {
      const zeroAdults = {
        type: 'ROOM',
        unitCategory: 'DOME',
        stayType: 'OVERNIGHT',
        checkInDate: '2026-10-15',
        checkOutDate: '2026-10-16',
        rooms: [{ roomIndex: 1, adults: 0, infants: 1 }],
      };
      expect(roomInquirySchema.safeParse(zeroAdults).success).toBe(false);

      const invalidCheckOut = {
        type: 'ROOM',
        unitCategory: 'DOME',
        stayType: 'OVERNIGHT',
        checkInDate: '2026-10-15',
        checkOutDate: '2026-10-15', // Same day checkout for overnight
        rooms: [{ roomIndex: 1, adults: 2, infants: 0 }],
      };
      expect(roomInquirySchema.safeParse(invalidCheckOut).success).toBe(false);
    });
  });

  // =========================================================================
  // 4. Contiguous Physical Unit Availability Guarantee (GET /api/availability)
  // =========================================================================
  describe('4. Contiguous Physical Unit Availability Guarantee (GET /api/availability)', () => {
    it('enforces contiguous physical unit availability across multi-night stays', async () => {
      // Mock 3 Domes
      const mockUnits = [
        { id: 'dome-1', name: 'Dome 1', category: 'DOME' },
        { id: 'dome-2', name: 'Dome 2', category: 'DOME' },
        { id: 'dome-3', name: 'Dome 3', category: 'DOME' },
      ];

      vi.spyOn(prisma.unit, 'findMany').mockResolvedValueOnce(mockUnits as any);

      // Stay: 2 nights (2026-10-10 12:00 PM to 2026-10-12 11:00 AM)
      // Scenario:
      // Dome 1 is booked on Night 1 (Oct 10-11)
      // Dome 2 is booked on Night 2 (Oct 11-12)
      // Dome 3 is completely free across both nights
      const mockOverlaps = [
        { unitId: 'dome-1' }, // Overlaps in window
        { unitId: 'dome-2' }, // Overlaps in window
      ];

      // Second findMany is for window overlaps
      vi.spyOn(prisma.bookingUnit, 'findMany')
        .mockResolvedValueOnce(mockOverlaps as any) // Window check
        .mockResolvedValueOnce([] as any); // Month check

      const req = new Request(
        'https://parlakresort.com/api/availability?unitCategory=DOME&stayType=OVERNIGHT&checkInDate=2026-10-10&checkOutDate=2026-10-12&requestedUnits=1'
      );

      const res = await availabilityHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.totalCategoryUnits).toBe(3);
      // Dome 1 and Dome 2 have collisions during the contiguous range.
      // Only Dome 3 is free for the entire 2-night stay.
      expect(json.availableUnitsCount).toBe(1);
      expect(json.isAvailable).toBe(true);
    });

    it('returns isAvailable: false when no single unit is free across the full multi-night stay', async () => {
      const mockUnits = [
        { id: 'dome-1', name: 'Dome 1', category: 'DOME' },
        { id: 'dome-2', name: 'Dome 2', category: 'DOME' },
      ];

      vi.spyOn(prisma.unit, 'findMany').mockResolvedValueOnce(mockUnits as any);

      // Dome 1 booked Night 1, Dome 2 booked Night 2 -> Zero contiguous units free
      vi.spyOn(prisma.bookingUnit, 'findMany')
        .mockResolvedValueOnce([{ unitId: 'dome-1' }, { unitId: 'dome-2' }] as any)
        .mockResolvedValueOnce([] as any);

      const req = new Request(
        'https://parlakresort.com/api/availability?unitCategory=DOME&stayType=OVERNIGHT&checkInDate=2026-10-10&checkOutDate=2026-10-12&requestedUnits=1'
      );

      const res = await availabilityHandler(req);
      const json = await res.json();

      expect(json.availableUnitsCount).toBe(0);
      expect(json.isAvailable).toBe(false);
    });
  });

  // =========================================================================
  // 5. Price-Free WhatsApp Message & URL Encoding
  // =========================================================================
  describe('5. Price-Free WhatsApp Message & URL Encoding', () => {
    it('strictly omits all pricing and advance amounts from room WhatsApp message', () => {
      const message = compileRoomWhatsAppMessage({
        unitCategory: 'DOME',
        stayType: 'OVERNIGHT',
        checkInDate: '2026-10-15',
        checkOutDate: '2026-10-16',
        totalNights: 1,
        rooms: [
          { roomIndex: 1, adults: 3, infants: 1 },
          { roomIndex: 2, adults: 2, infants: 0 },
        ],
        guestName: 'Muhammed Rahil',
        guestPhone: '+91 98470 12345',
        specialRequests: 'Arriving around 1:00 PM. Please prepare campfire & BBQ skewers.',
      });

      // Strict price absence assertion: No Rupee symbols, currency codes, or financial tariff numbers
      expect(message).not.toMatch(/₹/);
      expect(message).not.toMatch(/\bINR\b/i);
      expect(message).not.toMatch(/\bRs\.?\s*\d+/i);
      expect(message).not.toMatch(/totalRent/i);
      expect(message).not.toMatch(/rentCharge/i);
      expect(message).not.toMatch(/balanceDue/i);

      // Verify structural components
      expect(message).toContain('*PARLAK RESORT - STAY RESERVATION REQUEST*');
      expect(message).toContain('\u2500'.repeat(28));
      expect(message).toContain('*Unit Type:* Luxury Geodesic Dome');
      expect(message).toContain('*Dates:* 15 Oct 2026 to 16 Oct 2026 (1 Night)');
      expect(message).toContain('• Room 1: 3 Adults, 1 Infant');
      expect(message).toContain('• Room 2: 2 Adults');
      expect(message).toContain('• Name: Muhammed Rahil');
      expect(message).toContain('• Contact: +91 98470 12345');
      expect(message).toContain('_Note: Max 3 adults & 2 infants per Dome. Strictly NO extra beds.');
    });

    it('strictly omits all pricing and advance amounts from hall WhatsApp message', () => {
      const message = compileHallWhatsAppMessage({
        unitCategory: 'NON_AC_HALL',
        eventDate: '2026-11-20',
        slotType: 'MORNING_SLOT',
        headcount: 550,
        matchedSlab: { minHeadcount: 401, maxHeadcount: 800 },
        attachedDomeRequested: true,
        guestName: 'Aiswarya Lakshmi',
        guestPhone: '+91 97455 67890',
        notes: 'Stage decoration team needs entry at 9:00 AM. Inquiring about attached dome.',
      });

      expect(message).not.toMatch(/₹/);
      expect(message).not.toMatch(/\bINR\b/i);
      expect(message).not.toMatch(/\bRs\.?\s*\d+/i);
      expect(message).not.toMatch(/\brent\b/i);
      expect(message).not.toMatch(/\bdeposit\b/i);

      expect(message).toContain('*PARLAK RESORT - EVENT VENUE INQUIRY*');
      expect(message).toContain('*Venue:* Non-AC Event Hall (Max 1,200 Pax)');
      expect(message).toContain('*Event Date:* 20 Nov 2026');
      expect(message).toContain('*Slot Type:* Morning Slot (10:00 AM \u2013 3:00 PM IST)');
      expect(message).toContain('*Expected Headcount:* 550 Guests (Slab: 401\u2013800 Pax)');
      expect(message).toContain('• Attached Dome Request: Yes (Subject to schedule & room inventory clearance)');
      expect(message).toContain('_Notice: Swimming pool access is strictly excluded for event attendees');
    });

    it('encodes a valid https://wa.me/918891931123 URL and preserves message content on decode', () => {
      const testMsg = '*PARLAK RESORT*\n────────────────────────────\nHello World';
      const url = compileWhatsAppUrl(testMsg);

      expect(url.startsWith(`https://wa.me/${RESORT_WHATSAPP_PHONE}?text=`)).toBe(true);

      const parsedUrl = new URL(url);
      const textParam = parsedUrl.searchParams.get('text');
      expect(textParam).toBe(testMsg);
    });

    it('formats display dates in clean English with correct month abbreviations', () => {
      expect(formatDisplayDate('2026-10-15')).toBe('15 Oct 2026');
      expect(formatDisplayDate('2026-11-20')).toBe('20 Nov 2026');
      expect(formatDisplayDate('2026-01-01')).toBe('1 Jan 2026');
    });
  });

  // =========================================================================
  // 6. End-to-End Route Handler Verification (POST /api/inquiry/generate)
  // =========================================================================
  describe('6. End-to-End Route Handler Verification (POST /api/inquiry/generate)', () => {
    it('handles valid Room inquiry, computes verified on-screen estimate, and returns wa.me URL', async () => {
      const mockPriceList = {
        id: 'pl-dome',
        name: 'Standard Dome Plan',
        unitType: 'DOME',
        slabs: mockDomeSlabs,
        modifiers: mockModifiers,
      };

      const mockUnit = {
        id: 'dome-unit-1',
        name: 'Dome 1',
        category: 'DOME',
        priceList: mockPriceList,
      };

      vi.spyOn(prisma.unit, 'findFirst').mockResolvedValueOnce(mockUnit as any);

      const reqBody = {
        type: 'ROOM',
        unitCategory: 'DOME',
        stayType: 'OVERNIGHT',
        checkInDate: '2026-10-15',
        checkOutDate: '2026-10-16',
        rooms: [
          { roomIndex: 1, adults: 3, infants: 1 },
          { roomIndex: 2, adults: 2, infants: 0 },
        ],
        guestName: 'Muhammed Rahil',
        guestPhone: '+91 98470 12345',
        specialRequests: 'Arriving around 1:00 PM.',
      };

      const req = new Request('https://parlakresort.com/api/inquiry/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      });

      const res = await inquiryGenerateHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.type).toBe('ROOM');
      expect(json.data.totalRooms).toBe(2);
      expect(json.data.totalStayRent).toBeGreaterThan(0);
      expect(json.data.requiredAdvance).toBe(3500); // 2000 (3 pax) + 1500 (2 pax)
      expect(json.data.balanceDue).toBe(json.data.totalStayRent - json.data.requiredAdvance);
      expect(json.data.whatsappUrl).toContain('https://wa.me/918891931123?text=');
    });

    it('returns HTTP 400 when inquiry violates room hard occupancy caps', async () => {
      const reqBody = {
        type: 'ROOM',
        unitCategory: 'DOME',
        stayType: 'OVERNIGHT',
        checkInDate: '2026-10-15',
        checkOutDate: '2026-10-16',
        rooms: [{ roomIndex: 1, adults: 4, infants: 0 }], // 4 adults in Dome!
      };

      const req = new Request('https://parlakresort.com/api/inquiry/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      });

      const res = await inquiryGenerateHandler(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('maximum of 3 adults');
    });

    it('returns HTTP 400 on malformed JSON payload', async () => {
      const req = new Request('https://parlakresort.com/api/inquiry/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json{',
      });

      const res = await inquiryGenerateHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Invalid JSON');
    });

    it('returns HTTP 400 when requesting an inactive unit (sold out guardrail)', async () => {
      const mockInactiveUnit = {
        id: 'inactive-dome',
        name: 'Dome 4',
        category: 'DOME',
        isActive: false, // Inactive!
      };

      vi.spyOn(prisma.unit, 'findUnique').mockResolvedValueOnce(mockInactiveUnit as any);

      const reqBody = {
        type: 'ROOM',
        unitCategory: 'DOME',
        unitId: 'inactive-dome',
        stayType: 'OVERNIGHT',
        checkInDate: '2026-10-15',
        checkOutDate: '2026-10-16',
        rooms: [{ roomIndex: 1, adults: 2, infants: 0 }],
      };

      const req = new Request('https://parlakresort.com/api/inquiry/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      });

      const res = await inquiryGenerateHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('sold out or inactive');
    });

    it('returns HTTP 400 when unitId category contradicts inquiry category', async () => {
      const mockAFrameUnit = {
        id: 'aframe-1',
        name: 'A-Frame 1',
        category: 'A_FRAME', // A-Frame, but request claims DOME!
        isActive: true,
      };

      vi.spyOn(prisma.unit, 'findUnique').mockResolvedValueOnce(mockAFrameUnit as any);

      const reqBody = {
        type: 'ROOM',
        unitCategory: 'DOME',
        unitId: 'aframe-1',
        stayType: 'OVERNIGHT',
        checkInDate: '2026-10-15',
        checkOutDate: '2026-10-16',
        rooms: [{ roomIndex: 1, adults: 2, infants: 0 }],
      };

      const req = new Request('https://parlakresort.com/api/inquiry/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      });

      const res = await inquiryGenerateHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('does not match selected category');
    });

    it('handles DAY_SLOT room inquiries cleanly with 0 overnight nights', () => {
      const quote = calculateRoomInquiryQuote({
        unitCategory: 'DOME',
        stayType: 'DAY_SLOT',
        checkInDate: '2026-10-15',
        rooms: [{ adults: 2, infants: 0 }],
        priceList: {
          slabs: mockDomeSlabs,
          modifiers: [],
        },
      });

      expect(quote.totalNights).toBe(0);
      expect(quote.nightsBreakdown).toHaveLength(1);
      expect(quote.totalStayRent).toBe(2500); // Day slot base price
      expect(quote.requiredAdvanceTotal).toBe(1500);
      expect(quote.whatsappMessage).toContain('*Stay Type:* Day Slot (10:00 AM – 3:00 PM IST)');
      expect(quote.whatsappMessage).toContain('*Dates:* 15 Oct 2026 (Day Slot)');
    });

    it('accepts nullish optional fields without validation errors', () => {
      const payloadWithNulls = {
        type: 'ROOM',
        unitCategory: 'DOME',
        unitId: null,
        stayType: 'OVERNIGHT',
        checkInDate: '2026-10-15',
        checkOutDate: '2026-10-16',
        rooms: [{ roomIndex: null, adults: 2, infants: null }],
        guestName: null,
        guestPhone: null,
        specialRequests: null,
      };

      const parsed = inquiryGenerateSchema.safeParse(payloadWithNulls);
      expect(parsed.success).toBe(true);
      if (parsed.success && parsed.data.type === 'ROOM') {
        expect(parsed.data.rooms[0].infants).toBe(0);
      }
    });
  });
});
