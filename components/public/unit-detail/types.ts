/**
 * Parlak Resort - Unit Detail Data Contracts & Showcase Defaults
 *
 * Aligned with:
 * - docs/website/unit_detail.md
 * - docs/website/inquiry_api.md
 * - docs/website/stays.md
 * - AGENTS.md
 */

export interface UnitDetailPhoto {
  id: string;
  url: string;
  alt: string;
  caption?: string | null;
  isFeatured: boolean;
  orderIndex: number;
}

export interface UnitDetailTiming {
  checkIn: string;
  checkOut: string;
}

export interface UnitDetailPricing {
  displayRate: number;
  rateLabel: string;
  overnightBaseRate?: number;
  daySlotBaseRate?: number;
  hallMorningBaseRate?: number;
  hallEveningBaseRate?: number;
  requiredAdvance?: number;
  weekendVariancePercentage?: number;
  activePromotionName?: string;
  activePromotionPercentage?: number;
}

export interface UnitDetailSpecifications {
  bedding?: string;
  view?: string;
  bathroom?: string;
  climate?: string;
  poolAccess: string;
  totalInventoryUnits?: number;
}

export interface UnitDetailPolicies {
  timingsRule: string;
  capacityRule: string;
  poolPolicy: string;
  advancePolicy: string;
  cancellationPolicy: string;
}

export interface UnitDetailData {
  id: string;
  slug: string;
  name: string;
  category: "DOME" | "A_FRAME" | "NON_AC_HALL" | "AC_HALL" | string;
  categoryLabel: string;
  isActive: boolean;
  status: "AVAILABLE" | "INACTIVE" | "SOLD_OUT";
  badge?: string;
  maxCapacity: number;
  maxInfants: number;
  capacityBadge: string;
  description: string;
  highlights: string[];
  pricing: UnitDetailPricing;
  timings: {
    overnight?: UnitDetailTiming;
    daySlot?: UnitDetailTiming;
    hallMorning?: UnitDetailTiming;
    hallEvening?: UnitDetailTiming;
  };
  amenities: {
    standard: string[];
    variable: string[];
  };
  specifications: UnitDetailSpecifications;
  policies: UnitDetailPolicies;
  photos: UnitDetailPhoto[];
  seoMeta: {
    title: string;
    description: string;
    ogImage: string;
    canonicalUrl: string;
  };
}

/**
 * Curated fallback data for Geodesic Domes, A-Frames, and Event Halls
 * Guarantees zero downtime and complete specification adherence.
 */
export const DEFAULT_UNIT_DETAILS: Record<string, UnitDetailData> = {
  "geodesic-dome": {
    id: "unit-dome-01",
    slug: "geodesic-dome",
    name: "Luxury Geodesic Dome",
    category: "DOME",
    categoryLabel: "Geodesic Dome",
    isActive: true,
    status: "AVAILABLE",
    badge: "Popular Stay",
    maxCapacity: 3,
    maxInfants: 2,
    capacityBadge: "Max 3 Adults + 2 Infants",
    description:
      "Perched peacefully overlooking the open meadows in Vallivattom, our geodesic domes synthesize organic architectural geometry with modern boutique indulgence. Wake to panoramic views through expansive curved bay windows, recharge under climate-controlled interiors, and enjoy your personal barbecue terrace under Kerala's evening sky.",
    highlights: [
      "Panoramic meadow-view skylight bay window",
      "Private outdoor barbecue terrace with dedicated grill",
      "Swimming pool access for resident guests",
      "High-efficiency Daikin inverter air conditioning",
      "High-speed fiber Wi-Fi & Smart TV streaming",
    ],
    pricing: {
      displayRate: 3500,
      rateLabel: "/\u00A0night",
      overnightBaseRate: 3500,
      daySlotBaseRate: 2500,
      requiredAdvance: 2000,
      weekendVariancePercentage: 20,
    },
    timings: {
      overnight: {
        checkIn: "12:00\u00A0PM IST",
        checkOut: "11:00\u00A0AM IST Next Day",
      },
      daySlot: {
        checkIn: "10:00\u00A0AM IST",
        checkOut: "3:00\u00A0PM IST Same Day",
      },
    },
    amenities: {
      standard: [
        "Electric Kettle with Tea/Coffee/Milk Kit",
        "1L Bottled Mineral Water",
        "Essential Toiletries & Plush Bath Towels",
        "Dedicated Outdoor BBQ Grill Setup",
      ],
      variable: [
        "Climate-Controlled Air Conditioning",
        "High-Speed Wi-Fi (Fiber)",
        "En-suite Modern Attached Bathroom",
        "Smart TV with Streaming Apps",
        "Swimming Pool Access",
      ],
    },
    specifications: {
      bedding: "1 King Bed + Convertible Daybed",
      view: "Meadow Garden & Coconut Palms",
      bathroom: "En-suite Western bath with hot water",
      climate: "Climate-Controlled Split Inverter AC",
      poolAccess:
        "Complimentary for resident guests (Open until 10:00\u00A0PM)",
      totalInventoryUnits: 4,
    },
    policies: {
      timingsRule:
        "Overnight stays standard timings: 12:00\u00A0PM check-in to 11:00\u00A0AM check-out. Day slots run from 10:00\u00A0AM to 3:00\u00A0PM. Shortening hours within a standard block does not reduce base rent.",
      capacityRule:
        "Strict Hard Cap: Maximum 3 Adults (3+ years) and 2 Infants (under 3 years sharing existing bed). Strictly NO extra beds permitted.",
      poolPolicy:
        "Swimming pool is open for Dome residents until 10:00\u00A0PM on standard days. On event days, residents receive exclusive access from 10:00\u00A0PM to 11:00\u00A0PM.",
      advancePolicy:
        "Dynamic booking advance is non-refundable and credited directly towards total stay rent upon booking confirmation. No security deposits are collected.",
      cancellationPolicy:
        "Cancellations and scope reductions act as Partial Cancellations subject to management review. Rent remains locked without automatic refunds.",
    },
    photos: [
      {
        id: "dome-p1",
        url: "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/dome_main.webp",
        alt: "Panoramic luxury geodesic dome at sunset with warm ambient lighting",
        caption: "Panoramic Bay Window Facing Lush Meadow Gardens",
        isFeatured: true,
        orderIndex: 1,
      },
      {
        id: "dome-p2",
        url: "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/dome_01.webp",
        alt: "Dome interior king size bed setup with ambient lighting",
        caption: "Cozy King Bed Setup with Premium Linens & Garden Backdrop",
        isFeatured: false,
        orderIndex: 2,
      },
      {
        id: "dome-p3",
        url: "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/dome_02.webp",
        alt: "Private barbecue patio setup outside geodesic dome",
        caption: "Private Outdoor Patio with Dedicated BBQ Charcoal Grill",
        isFeatured: false,
        orderIndex: 3,
      },
      {
        id: "dome-p4",
        url: "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/dome_pool.webp",
        alt: "Designer resort swimming pool surrounded by coconut trees",
        caption:
          "Swimming Pool Accessible Exclusively to Resident Guests",
        isFeatured: false,
        orderIndex: 4,
      },
    ],
    seoMeta: {
      title: "Luxury Geodesic Dome | Parlak Resort & Farmhouse Keralam",
      description:
        "Stay in luxury Geodesic Domes with private BBQ grills and pool access at Parlak Resort, Vallivattom, S.N. Puram, Keralam. Max 3 adults. Verify directly via WhatsApp.",
      ogImage:
        "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/dome_main.webp",
      canonicalUrl: "https://parlakfarmhouse.com/stays/geodesic-dome",
    },
  },

  "scenic-a-frame": {
    id: "unit-aframe-01",
    slug: "scenic-a-frame",
    name: "Scenic A-Frame Chalet",
    category: "A_FRAME",
    categoryLabel: "A-Frame Chalet",
    isActive: true,
    status: "AVAILABLE",
    badge: "Family Suite",
    maxCapacity: 5,
    maxInfants: 4,
    capacityBadge: "Max 5 Adults + 4 Infants",
    description:
      "Engineered with classic Nordic timber geometry, our two-level A-Frame Chalets provide generous dual-floor living with steep gabled ceilings and full-height glass facades. Featuring both Double and Queen plush bedding setups, private outdoor timber decks, and en-suite facilities, it is ideal for family stays and small travel groups.",
    highlights: [
      "Two-level chalet layout with loft bedroom deck",
      "Accommodates both Queen and Double plush beds",
      "Full-height glass triangular facade overlooking coconut groves",
      "Swimming pool access for resident guests",
      "Dedicated outdoor BBQ grill & private garden patio",
    ],
    pricing: {
      displayRate: 5000,
      rateLabel: "/\u00A0night",
      overnightBaseRate: 5000,
      daySlotBaseRate: 3500,
      requiredAdvance: 2000,
      weekendVariancePercentage: 20,
    },
    timings: {
      overnight: {
        checkIn: "12:00\u00A0PM IST",
        checkOut: "11:00\u00A0AM IST Next Day",
      },
      daySlot: {
        checkIn: "10:00\u00A0AM IST",
        checkOut: "3:00\u00A0PM IST Same Day",
      },
    },
    amenities: {
      standard: [
        "Electric Kettle with Tea/Coffee/Milk Kit",
        "1L Bottled Mineral Water",
        "Essential Toiletries & Plush Bath Towels",
        "Dedicated Outdoor BBQ Grill Setup",
      ],
      variable: [
        "Dual Double & Queen Bed",
        "Climate-Controlled Dual Air Conditioning",
        "High-Speed Wi-Fi",
        "Attached Bathroom",
        "Swimming Pool",
      ],
    },
    specifications: {
      bedding: "1 Queen Bed + 1 Double Bed",
      view: "Pastoral Grove & Farmhouse Grounds",
      bathroom: "Attached Western bathroom with hot water",
      climate: "Dual Inverter Split AC Units",
      poolAccess:
        "Complimentary for resident guests (Open until 10:00\u00A0PM)",
      totalInventoryUnits: 3,
    },
    policies: {
      timingsRule:
        "Overnight stays standard timings: 12:00\u00A0PM check-in to 11:00\u00A0AM check-out. Day slots run from 10:00\u00A0AM to 3:00\u00A0PM. Shortening hours within a standard block does not reduce base rent.",
      capacityRule:
        "Strict Hard Cap: Maximum 5 Adults (3+ years) and 4 Infants (under 3 years sharing existing bed). Strictly NO extra beds permitted.",
      poolPolicy:
        "Swimming pool is open for A-Frame residents until 10:00\u00A0PM on standard days. On event days, residents receive exclusive access from 10:00\u00A0PM to 11:00\u00A0PM.",
      advancePolicy:
        "Dynamic booking advance is non-refundable and credited directly towards total stay rent upon booking confirmation. No security deposits are collected.",
      cancellationPolicy:
        "Cancellations and scope reductions act as Partial Cancellations subject to management review. Rent remains locked without automatic refunds.",
    },
    photos: [
      {
        id: "aframe-p1",
        url: "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/aframe_main.webp",
        alt: "Two-level A-Frame chalet facing lush meadow gardens",
        caption:
          "Soaring Two-Level Timber Architecture Overlooking the Meadows",
        isFeatured: true,
        orderIndex: 1,
      },
      {
        id: "aframe-p2",
        url: "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/aframe_bedroom.webp",
        alt: "Upper-tier loft bedroom with Queen bed inside A-Frame chalet",
        caption: "Upper-Tier Mezzanine Bedroom with Private Viewing Deck",
        isFeatured: false,
        orderIndex: 2,
      },
      {
        id: "aframe-p3",
        url: "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/aframe_living.webp",
        alt: "Lower floor living lounge with plush seating and garden views",
        caption: "Spacious Ground-Level Lounge & Dining Space",
        isFeatured: false,
        orderIndex: 3,
      },
      {
        id: "aframe-p4",
        url: "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/aframe_pool.webp",
        alt: "Resident swimming pool with loungers at sunset",
        caption: "Swimming Pool Accessible to A-Frame Guests",
        isFeatured: false,
        orderIndex: 4,
      },
    ],
    seoMeta: {
      title: "Scenic A-Frame Chalet | Parlak Resort & Farmhouse Keralam",
      description:
        "Experience two-level timber A-Frame Chalets with Double & Queen beds at Parlak Resort, Vallivattom, S.N. Puram, Keralam. Max 5 adults. Verify directly via WhatsApp.",
      ogImage:
        "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/aframe_main.webp",
      canonicalUrl: "https://parlakfarmhouse.com/stays/scenic-a-frame",
    },
  },

  "non-ac-hall": {
    id: "unit-hall-non-ac",
    slug: "non-ac-hall",
    name: "Non-AC Event Hall",
    category: "NON_AC_HALL",
    categoryLabel: "Event Hall",
    isActive: true,
    status: "AVAILABLE",
    badge: "Grand Celebrations",
    maxCapacity: 1200,
    maxInfants: 0,
    capacityBadge: "Up to 1,200 Guests",
    description:
      "A grand banquet convention auditorium designed for weddings, banquets, and large community ceremonies. Offering natural cross-ventilation, an elevated presentation stage, high-capacity diesel backup generator, and transparent headcount slab pricing.",
    highlights: [
      "Physical capacity up to 1,200 attendees with banquet seating",
      "Elevated presentation stage with professional audio-visual provision",
      "High-capacity diesel backup generator ensuring uninterrupted power",
      "Complimentary attached dome bundling for slabs of 400+ attendees",
      "Direct open meadow breeze & expansive banquet grounds",
    ],
    pricing: {
      displayRate: 10000,
      rateLabel: "/\u00A0slot",
      hallMorningBaseRate: 10000,
      hallEveningBaseRate: 15000,
      requiredAdvance: 5000,
      weekendVariancePercentage: 10,
    },
    timings: {
      hallMorning: {
        checkIn: "10:00\u00A0AM IST",
        checkOut: "3:00\u00A0PM IST Same Day",
      },
      hallEvening: {
        checkIn: "5:00\u00A0PM IST",
        checkOut: "10:00\u00A0PM IST Same Day",
      },
    },
    amenities: {
      standard: [
        "Banquet Dining Tables & Chairs",
        "Elevated Stage & Presentation Area",
        "Continuous Diesel Generator Backup",
        "Dedicated Restrooms & Catering Pantry Access",
      ],
      variable: [
        "Natural Cross-Ventilation Design",
        "Audio System Wiring Provision",
        "Waste Management Facility (On Request)",
        "Attached Dome Bundling (Complimentary for \u2265 400 Pax)",
      ],
    },
    specifications: {
      bedding: "N/A (Event Venue)",
      view: "Meadow Promenade & Event Lawns",
      bathroom: "Dedicated Men & Women Restroom Blocks",
      climate: "High-Ceiling Natural Cross-Ventilation",
      poolAccess:
        "Strictly excluded for event attendees under all circumstances",
      totalInventoryUnits: 1,
    },
    policies: {
      timingsRule:
        "Event hall operates strictly on daytime (10:00\u00A0AM – 3:00\u00A0PM) and evening (5:00\u00A0PM – 10:00\u00A0PM) slots. Overnight stays are not offered for Event Halls.",
      capacityRule:
        "Headcount slabs range from 10 to 1,200 attendees. Headcounts below the lowest slab receive the minimum slab floor rate. Physical capacity ceiling is 1,200 Pax.",
      poolPolicy:
        "Swimming pool access is strictly excluded for event attendees under all circumstances.",
      advancePolicy:
        "Booking advance is non-refundable and credited directly towards total venue rent upon booking confirmation.",
      cancellationPolicy:
        "Reductions in headcount slabs or dropped slots act as Partial Cancellations subject to management override.",
    },
    photos: [
      {
        id: "hall-p1",
        url: "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/hall_non_ac_main.webp",
        alt: "Open banquet hall setup with illuminated presentation stage",
        caption:
          "Grand Open-Air Banquet Space Configured for Up to 1,200 Guests",
        isFeatured: true,
        orderIndex: 1,
      },
      {
        id: "hall-p2",
        url: "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/hall_01.webp",
        alt: "Presentation stage setup inside event hall",
        caption:
          "Elevated Presentation Stage with Backup Generator Integration",
        isFeatured: false,
        orderIndex: 2,
      },
    ],
    seoMeta: {
      title:
        "Non-AC Event Hall (Up to 1,200 Pax) | Parlak Resort & Farmhouse Keralam",
      description:
        "Host weddings, receptions, and gatherings at Non-AC Event Hall, Parlak Resort, Vallivattom, S.N. Puram, Keralam. Transparent slab pricing via WhatsApp.",
      ogImage:
        "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/hall_non_ac_main.webp",
      canonicalUrl: "https://parlakfarmhouse.com/stays/non-ac-hall",
    },
  },

  "ac-hall": {
    id: "unit-hall-ac",
    slug: "ac-hall",
    name: "AC Grand Ballroom & Hall",
    category: "AC_HALL",
    categoryLabel: "Event Hall",
    isActive: true,
    status: "AVAILABLE",
    badge: "Grand Ballroom",
    maxCapacity: 2000,
    maxInfants: 0,
    capacityBadge: "Up to 2,000 Guests",
    description:
      "Our premier central air-conditioned convention ballroom is designed to host up to 2,000 guests in absolute acoustic comfort. Perfect for grand wedding receptions, conferences, and gala banquets with comprehensive staging and bridal suites.",
    highlights: [
      "Fully climate-controlled central air-conditioned auditorium",
      "Capacity for up to 2,000 guests with tiered seating and banquet zones",
      "Acoustic engineered architectural envelope for crystal-clear audio",
      "Dedicated green rooms and bridal suites",
    ],
    pricing: {
      displayRate: 75000,
      rateLabel: "/\u00A0slot",
      hallMorningBaseRate: 75000,
      hallEveningBaseRate: 100000,
      requiredAdvance: 15000,
    },
    timings: {
      hallMorning: {
        checkIn: "10:00\u00A0AM IST",
        checkOut: "3:00\u00A0PM IST Same Day",
      },
      hallEvening: {
        checkIn: "5:00\u00A0PM IST",
        checkOut: "10:00\u00A0PM IST Same Day",
      },
    },
    amenities: {
      standard: [
        "Central Air Conditioning",
        "Acoustic Presentation Stage",
        "Dual Generator Backup Systems",
        "Executive Restroom Facilities",
      ],
      variable: [
        "Dedicated Bridal Suites",
        "Catering Prep Infrastructure",
        "Audio Visual Control Booth",
      ],
    },
    specifications: {
      bedding: "N/A (Event Venue)",
      view: "Grand Convention Complex & Gardens",
      bathroom: "Executive Air-Conditioned Restrooms",
      climate: "Central HVAC Climate Control",
      poolAccess:
        "Strictly excluded for event attendees under all circumstances",
      totalInventoryUnits: 1,
    },
    policies: {
      timingsRule:
        "Event hall operates strictly on daytime (10:00\u00A0AM – 3:00\u00A0PM) and evening (5:00\u00A0PM – 10:00\u00A0PM) slots. Overnight stays are not offered for Event Halls.",
      capacityRule:
        "Configured for slabs up to 2,000 attendees with dedicated AC zones.",
      poolPolicy:
        "Swimming pool access is strictly excluded for event attendees under all circumstances.",
      advancePolicy:
        "Booking advance is non-refundable upon booking confirmation.",
      cancellationPolicy:
        "Reductions in headcount slabs act as Partial Cancellations subject to management override.",
    },
    photos: [
      {
        id: "hall-ac-p1",
        url: "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/hall_ac_render.webp",
        alt: "Modern air-conditioned event auditorium architectural view",
        caption: "Central AC Grand Ballroom & Banquet Auditorium",
        isFeatured: true,
        orderIndex: 1,
      },
    ],
    seoMeta: {
      title:
        "AC Grand Ballroom & Hall (Up to 2,000 Pax) | Parlak Resort & Farmhouse Keralam",
      description:
        "Premier central AC Grand Ballroom for up to 2,000 guests at Parlak Resort, Vallivattom, S.N. Puram, Keralam. Transparent slab pricing and instant WhatsApp reservation.",
      ogImage:
        "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/hall_ac_render.webp",
      canonicalUrl: "https://parlakfarmhouse.com/stays/ac-hall",
    },
  },
};
