/**
 * Centralized Asset Configuration.
 *
 * Provides placeholders and configuration for branding logos, event artwork,
 * and campus map images. When final production assets (SVGs/PNGs) are ready,
 * replace the placeholder values or paths in this file.
 */

export interface AssetConfig {
  logos: {
    fineArtsClub: {
      src: string;
      alt: string;
      fallbackText: string;
      width: number;
      height: number;
    };
    vitChennai: {
      src: string;
      alt: string;
      fallbackText: string;
      width: number;
      height: number;
    };
  };
  map: {
    src: string | null;
    alt: string;
    width: number;
    height: number;
  };
}

export const ASSETS: AssetConfig = {
  logos: {
    fineArtsClub: {
      src: "/assets/logos/fine-arts-club-logo.png",
      alt: "Fine Arts Club, VIT Chennai",
      fallbackText: "FINE ARTS CLUB",
      width: 624,
      height: 652,
    },
    vitChennai: {
      src: "/assets/logos/vit-chennai-white.png",
      alt: "VIT Chennai",
      fallbackText: "VIT CHENNAI",
      width: 813,
      height: 265,
    },
  },
  map: {
    src: null, // Set to '/assets/map/campus-map.jpg' when real map is available
    alt: "TechnoVIT Campus & Photo Booth Map",
    width: 1400,
    height: 900,
  },
};

export interface CampusLocation {
  id: string;
  name: string;
  category: "booth" | "stage" | "art" | "hub";
  zoneName: string;
  description: string;
  xPercent: number; // 0 - 100 on map canvas
  yPercent: number; // 0 - 100 on map canvas
  tagColor: string;
}

export const CAMPUS_LOCATIONS: CampusLocation[] = [
  {
    id: "main-stage",
    name: "Main Amphitheatre Stage",
    category: "stage",
    zoneName: "Zone A • Central Plaza",
    description: "Heart of TechnoVIT concerts, DJ nights, and grand stage performances.",
    xPercent: 48,
    yPercent: 42,
    tagColor: "#E24E2B",
  },
  {
    id: "photo-booth-1",
    name: "Cyber Neon Photo Booth",
    category: "booth",
    zoneName: "Zone B • Technology Tower",
    description: "Fine Arts Club interactive neon photo booth with futuristic backdrops.",
    xPercent: 28,
    yPercent: 32,
    tagColor: "#2B59FF",
  },
  {
    id: "art-installation",
    name: "Living Canvas Art Exhibition",
    category: "art",
    zoneName: "Zone C • Academic Block 2",
    description: "Student canvas murals, live speed-painting, and collaborative sculpture.",
    xPercent: 68,
    yPercent: 55,
    tagColor: "#84CC16",
  },
  {
    id: "photo-booth-2",
    name: "Polaroid & Retro Booth",
    category: "booth",
    zoneName: "Zone D • Student Activity Centre",
    description: "Vintage aesthetics, instant prints, and fine arts student portraits.",
    xPercent: 74,
    yPercent: 28,
    tagColor: "#F59E0B",
  },
  {
    id: "graffiti-wall",
    name: "Graffiti & Street Art Corner",
    category: "art",
    zoneName: "Zone E • Food Street Court",
    description: "Open community spray wall and photo opportunity station.",
    xPercent: 35,
    yPercent: 68,
    tagColor: "#7C3AED",
  },
];
