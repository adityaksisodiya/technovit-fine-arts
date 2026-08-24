import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";

import "@/styles/globals.css";
import "@/styles/components.css";

/**
 * Playfair Display — editorial display serif for headings.
 * Gives the gallery its distinctive Fine Arts identity.
 */
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

/**
 * Inter — clean, highly legible sans-serif for body text.
 * Excellent readability on mobile screens.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "TechnoVIT Photo Gallery — Fine Arts Club, VIT Chennai",
    template: "%s | TechnoVIT Photo Gallery",
  },
  description:
    "Explore and share photography from TechnoVIT, captured by the Fine Arts Club of VIT Chennai. Browse the gallery, upload your moments, and celebrate creativity.",
  keywords: [
    "TechnoVIT",
    "VIT Chennai",
    "Fine Arts Club",
    "photo gallery",
    "photography",
    "student art",
    "college festival",
  ],
  authors: [{ name: "Fine Arts Club, VIT Chennai" }],
  openGraph: {
    title: "TechnoVIT Photo Gallery — Fine Arts Club, VIT Chennai",
    description:
      "Photography from TechnoVIT, captured and curated by the Fine Arts Club of VIT Chennai.",
    siteName: "TechnoVIT Photo Gallery",
    type: "website",
    locale: "en_IN",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#FAF8F5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${playfairDisplay.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
