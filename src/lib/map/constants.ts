import type { LocationCategory } from "@/types";

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
