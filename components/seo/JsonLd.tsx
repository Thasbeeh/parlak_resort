import * as React from "react";
import { SITE_CONFIG } from "@/lib/constants";

export interface JsonLdProps {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
  id?: string;
}

/**
 * JsonLd component
 * Renders structured schema.org JSON-LD scripts safely for search crawlers and AI discovery engines.
 */
export function JsonLd({ data, id }: JsonLdProps) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * Canonical LodgingBusiness & Resort JSON-LD structured data for Parlak Resort.
 * Injected globally on the public shell in app/(public)/layout.tsx.
 */
export const RESORT_LODGING_BUSINESS_JSONLD = {
  "@context": "https://schema.org",
  "@type": ["Resort", "LodgingBusiness"],
  "@id": `${SITE_CONFIG.baseUrl}/#resort`,
  name: "Parlak Resort & Farmhouse",
  legalName: "Parlak Resort",
  url: SITE_CONFIG.baseUrl,
  logo: `${SITE_CONFIG.baseUrl}/icon.png`,
  image: "https://res.cloudinary.com/parlak-resort/image/upload/v1/seo/parlak_og_main.webp",
  description:
    "Luxury waterfront farmhouse and eco-resort in Vallivattom, S.N. Puram, Keralam featuring Geodesic Domes, A-Frame chalets, designer swimming pool, and banquet event halls.",
  telephone: SITE_CONFIG.phone.raw,
  email: SITE_CONFIG.email,
  priceRange: "₹₹",
  currenciesAccepted: "INR",
  paymentAccepted: "Cash, UPI, Bank Transfer",
  address: {
    "@type": "PostalAddress",
    streetAddress: SITE_CONFIG.address.line1,
    addressLocality: SITE_CONFIG.address.locality,
    addressRegion: SITE_CONFIG.address.state,
    postalCode: SITE_CONFIG.address.postalCode,
    addressCountry: "IN",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: SITE_CONFIG.location.coordinates.latitude,
    longitude: SITE_CONFIG.location.coordinates.longitude,
  },
  hasMap: SITE_CONFIG.location.googleMapLink,
  sameAs: [
    SITE_CONFIG.socials.instagram,
    SITE_CONFIG.socials.facebook,
    SITE_CONFIG.socials.youtube,
    SITE_CONFIG.location.googleMapLink,
  ],
  checkinTime: "12:00",
  checkoutTime: "11:00",
  amenityFeature: [
    {
      "@type": "LocationFeatureSpecification",
      name: "Designer Swimming Pool",
      value: true,
    },
    {
      "@type": "LocationFeatureSpecification",
      name: "Campfire & BBQ Grill Setup",
      value: true,
    },
    {
      "@type": "LocationFeatureSpecification",
      name: "Free High-Speed Wi-Fi",
      value: true,
    },
    {
      "@type": "LocationFeatureSpecification",
      name: "Attached Modern Bathrooms",
      value: true,
    },
    {
      "@type": "LocationFeatureSpecification",
      name: "Climate Controlled AC",
      value: true,
    },
  ],
};

export default JsonLd;
