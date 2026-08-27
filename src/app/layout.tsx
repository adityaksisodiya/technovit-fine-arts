import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter, Outfit, JetBrains_Mono } from "next/font/google";
import { LivingCanvas } from "@/components/Background";

import "@/styles/globals.css";
import "@/styles/components.css";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700", "800"],
});

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono-code",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "TechnoVIT Photo Wall — Fine Arts Club × VIT Chennai",
    template: "%s | TechnoVIT Photo Wall",
  },
  description:
    "An interactive living wall of TechnoVIT festival moments, curated and captured by the Fine Arts Club of VIT Chennai. Browse the installation, explore the campus map, and drop your memories.",
  keywords: [
    "TechnoVIT",
    "VIT Chennai",
    "Fine Arts Club",
    "photo gallery",
    "photography",
    "student art",
    "college festival",
    "memory wall",
  ],
  authors: [{ name: "Fine Arts Club, VIT Chennai" }],
  openGraph: {
    title: "TechnoVIT Photo Wall — Fine Arts Club × VIT Chennai",
    description:
      "A living photographic installation of TechnoVIT festival memories, captured by students and curated by the Fine Arts Club.",
    siteName: "TechnoVIT Photo Wall",
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
  themeColor: "#FAF7F2",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${playfairDisplay.variable} ${outfit.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        {/* Dynamic GPU-Accelerated Living Background Canvas */}
        <LivingCanvas />

        {children}
      </body>
    </html>
  );
}
