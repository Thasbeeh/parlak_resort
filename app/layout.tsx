import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import { SITE_CONFIG } from "@/lib/constants";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const nupuram = localFont({
  src: "../public/fonts/Nupuram-VF.woff2",
  variable: "--font-malayalam",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#141413" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.baseUrl),
  title: {
    default: `${SITE_CONFIG.name} | Luxury Domes, A-Frames & Event Venues in Keralam`,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description:
    "Experience luxury Geodesic Domes, scenic A-Frame chalets, and grand banquet event halls at Parlak Resort & Farmhouse in Vallivattom, S.N. Puram, Keralam. Direct WhatsApp reservation at +91 88919 31123.",
  keywords: [
    "Parlak Resort",
    "Parlak Farmhouse",
    "Geodesic Dome Stay Kerala",
    "A-Frame Chalet Kerala",
    "S.N. Puram Resort",
    "Vallivattom Resort",
    "Sreenarayanapuram Resort",
    "Event Hall S.N. Puram",
    "Wedding Venue Thrissur",
    "Banquet Hall Kerala",
    "Waterfront Stay Kerala",
    "Resort with Pool Kerala",
  ],
  authors: [{ name: SITE_CONFIG.name, url: SITE_CONFIG.baseUrl }],
  creator: SITE_CONFIG.name,
  publisher: SITE_CONFIG.name,
  formatDetection: {
    telephone: true,
    address: true,
    email: true,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_CONFIG.baseUrl,
    siteName: SITE_CONFIG.name,
    title: `${SITE_CONFIG.name} | Luxury Domes & Event Venues in Keralam`,
    description:
      "Book luxury Geodesic Domes, scenic A-Frames, and open-air event halls at Parlak Resort, Vallivattom, S.N. Puram. Transparent pricing & direct WhatsApp booking.",
    images: [
      {
        url: "https://res.cloudinary.com/parlak-resort/image/upload/v1/seo/parlak_og_main.webp",
        width: 1200,
        height: 630,
        alt: "Parlak Resort Geodesic Domes and Riverside Grounds",
        type: "image/webp",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_CONFIG.name} | Luxury Domes & Event Venues`,
    description:
      "Book luxury Geodesic Domes, scenic A-Frames, and open-air event halls at Parlak Resort, Vallivattom, S.N. Puram.",
    images: [
      "https://res.cloudinary.com/parlak-resort/image/upload/v1/seo/parlak_og_main.webp",
    ],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} ${nupuram.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
