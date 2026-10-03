/**
 * Parlak Resort & Farmhouse - Central Platform Constants
 * 
 * Single source of truth for resort metadata, contact lines, domain configuration,
 * Google Maps integration, social links, and operational booking policies.
 */

export const RESORT_NAME = "Parlak Resort";
export const RESORT_TAGLINE = "Luxury Geodesic Domes, Scenic A-Frames & Event Venues";
export const RESORT_DOMAIN = "parlakfarmhouse.com";
export const RESORT_BASE_URL = `https://${RESORT_DOMAIN}`;

export const RESORT_PHONE_DISPLAY = "+91 88919 31123";
export const RESORT_PHONE_RAW = "+918891931123";
export const RESORT_PHONE_WHATSAPP = "918891931123"; // E.164 without '+' for wa.me links
export const RESORT_EMAIL = "info.parlakresort@gmail.com";

export const RESORT_ADDRESS = {
  line1: "Vallivattom",
  locality: "S.N. Puram (Sreenarayanapuram)",
  district: "Thrissur", // S.N. Puram / Vallivattom is in Thrissur district, Kerala
  state: "Keralam",
  postalCode: "680661",
  country: "India",
  formatted: "Vallivattom, S.N. Puram, Keralam 680661",
};

export const RESORT_LOCATION = {
  googleMapLink: "https://maps.app.goo.gl/GJyr7qpHWfVxWXtP9",
  googlePlusCode: "75GP+QP Sreenarayanapuram, Keralam",
  // S.N. Puram, Thrissur, Kerala approximate coordinates matching Plus Code 75GP+QP
  coordinates: {
    latitude: 10.2769,
    longitude: 76.1868,
  },
  googleMapsEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15705.5!2d76.1868!3d10.2769!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNzXigIFHUCtRUCDiiY4gU3JlZW5hcmF5YW5hcHVyYW0sIEtlcmFsYQ!5e0!3m2!1sen!2sin!4v1",
};

export const RESORT_SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/parlak___",
  facebook: "https://www.facebook.com/profile.php?id=61550970517881",
  youtube: "https://www.youtube.com/@PARLAK-v9s",
} as const;

/**
 * Operational Rules & Standard Timings (Domain Hardcoded Invariants)
 */
export const RESORT_POLICIES = {
  timings: {
    overnight: {
      checkIn: "12:00 PM IST",
      checkOut: "11:00 AM IST Next Day",
    },
    daySlot: {
      checkIn: "10:00 AM IST",
      checkOut: "3:00 PM IST Same Day",
    },
    eventHallSlots: {
      slotA: "10:00 AM – 3:00 PM IST",
      slotB: "5:00 PM – 10:00 PM IST",
      fullDay: "10:00 AM – 10:00 PM IST",
    },
    dining: {
      menuAvailableUntil: "10:30 PM IST",
    },
    pool: {
      standardDays: "Open for Dome & A-Frame residents until 10:00 PM IST.",
      eventDays: "Closed during event hours. Overnight residents receive exclusive access from 10:00 PM to 11:00 PM IST.",
      eventAttendeesRule: "Event Hall attendees are strictly forbidden from using the swimming pool under any circumstances.",
    },
  },
  deposits: {
    roomRefundableDeposit: 2000, // ₹2,000 refundable security deposit per room unit
    depositRule: "₹2,000 refundable security deposit per room unit collected at booking confirmation and refunded at check-out upon inspection.",
  },
  capacities: {
    dome: {
      maxAdults: 3,
      extraBedsAllowed: false,
      ruleText: "Hard cap: Maximum 3 Guests per Dome. Strictly NO extra beds provided.",
    },
    aFrame: {
      maxAdults: 5,
      extraBedsAllowed: false,
      bedTypes: ["Double Bed", "Queen Bed"],
      ruleText: "Hard cap: Maximum 5 Guests per A-Frame. Includes Double and Queen beds. Strictly NO extra beds provided.",
    },
    nonAcHall: {
      maxCapacity: 1200,
      active: true,
    },
    acHall: {
      maxCapacity: 2000,
      active: false,
      statusBadge: "Under Construction",
    },
  },
} as const;

/**
 * Helper utility to build WhatsApp Click-to-Chat URLs
 */
export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${RESORT_PHONE_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

/**
 * Pre-compiled default WhatsApp inquiry URL for floating widgets and direct CTA buttons
 */
export const DEFAULT_WHATSAPP_INQUIRY_URL = buildWhatsAppUrl(
  "Hi Parlak Resort, I have an inquiry regarding stay and event bookings."
);

/**
 * Consolidated Site Configuration Object
 */
export const SITE_CONFIG = {
  name: RESORT_NAME,
  tagline: RESORT_TAGLINE,
  domain: RESORT_DOMAIN,
  baseUrl: RESORT_BASE_URL,
  phone: {
    display: RESORT_PHONE_DISPLAY,
    raw: RESORT_PHONE_RAW,
    whatsapp: RESORT_PHONE_WHATSAPP,
    telUri: `tel:${RESORT_PHONE_RAW}`,
  },
  email: RESORT_EMAIL,
  address: RESORT_ADDRESS,
  location: RESORT_LOCATION,
  socials: RESORT_SOCIAL_LINKS,
  policies: RESORT_POLICIES,
  defaultWhatsAppUrl: DEFAULT_WHATSAPP_INQUIRY_URL,
} as const;

export default SITE_CONFIG;
