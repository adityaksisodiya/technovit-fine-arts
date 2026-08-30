import type { LocationCategory } from "@/types";

/**
 * OpenFreeMap Vector Style URLs (100% Free, Open Source, No API Key Required)
 */
export const OPENFREEMAP_STYLES = {
  liberty: "https://tiles.openfreemap.org/styles/liberty",
  bright: "https://tiles.openfreemap.org/styles/bright",
  positron: "https://tiles.openfreemap.org/styles/positron",
} as const;

export const DEFAULT_MAP_STYLE = OPENFREEMAP_STYLES.liberty;

/**
 * VIT Chennai Geographic Coordinates (Vandalur-Kelambakkam Road, Chennai, Tamil Nadu)
 * MapLibre natively uses [longitude, latitude] arrays for coordinates.
 */
export const VIT_CHENNAI_COORDINATES = {
  latitude: 12.8406,
  longitude: 80.1534,
};

export const VIT_CHENNAI_CENTER: [number, number] = [
  VIT_CHENNAI_COORDINATES.longitude,
  VIT_CHENNAI_COORDINATES.latitude,
];

export const MAP_ZOOM_CONFIG = {
  initial: 16.8,
  min: 14.0,
  max: 19.5,
};

/**
 * Bounding box around the VIT Chennai campus region: [[sw_lng, sw_lat], [ne_lng, ne_lat]]
 */
export const VIT_CHENNAI_BOUNDS: [[number, number], [number, number]] = [
  [80.142, 12.831], // Southwest coordinate
  [80.165, 12.850], // Northeast coordinate
];

/**
 * Required OpenFreeMap and OpenStreetMap Attribution (ODbL License Compliant)
 */
export const MAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

/**
 * Helper to check WebGL browser support
 */
export function isWebGLSupported(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") ||
          canvas.getContext("webgl") ||
          canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}


/**
 * Explicit demo / placeholder coordinates for development and testing only.
 * These are never treated or presented as verified real locations.
 */
export const DEMO_CAMPUS_LANDMARKS: Record<
  string,
  { name: string; latitude: number; longitude: number; note: string }
> = {
  academic_block_1: {
    name: "Academic Block 1 (Demo Placement)",
    latitude: 12.8412,
    longitude: 80.1532,
    note: "Temporary demo placement — pending Super Admin calibration",
  },
  gazebo_plaza: {
    name: "Gazebo Plaza (Demo Placement)",
    latitude: 12.8404,
    longitude: 80.1539,
    note: "Temporary demo placement — pending Super Admin calibration",
  },
  mg_auditorium: {
    name: "MG Auditorium (Demo Placement)",
    latitude: 12.8418,
    longitude: 80.1542,
    note: "Temporary demo placement — pending Super Admin calibration",
  },
  food_mall: {
    name: "Food Mall Hub (Demo Placement)",
    latitude: 12.8396,
    longitude: 80.1528,
    note: "Temporary demo placement — pending Super Admin calibration",
  },
  main_gate: {
    name: "Main Campus Gate (Demo Placement)",
    latitude: 12.8425,
    longitude: 80.1518,
    note: "Temporary demo placement — pending Super Admin calibration",
  },
};

/**
 * Category metadata for UI badges, icons, and colors.
 */
export const LOCATION_CATEGORY_META: Record<
  LocationCategory,
  { label: string; icon: string; color: string; bgLight: string }
> = {
  photo_booth: {
    label: "Photo Booth",
    icon: "📸",
    color: "#2B59FF",
    bgLight: "rgba(43, 89, 255, 0.12)",
  },
  stage: {
    label: "Main Stage",
    icon: "⚡",
    color: "#E24E2B",
    bgLight: "rgba(226, 78, 43, 0.12)",
  },
  exhibition: {
    label: "Art Exhibition",
    icon: "🎨",
    color: "#84CC16",
    bgLight: "rgba(132, 204, 22, 0.12)",
  },
  event: {
    label: "Live Event",
    icon: "🎭",
    color: "#7C3AED",
    bgLight: "rgba(124, 58, 237, 0.12)",
  },
  entrance: {
    label: "Entrance / Hub",
    icon: "📍",
    color: "#F59E0B",
    bgLight: "rgba(245, 158, 11, 0.12)",
  },
  custom: {
    label: "Festival Spot",
    icon: "✨",
    color: "#C4553A",
    bgLight: "rgba(196, 85, 58, 0.12)",
  },
};

