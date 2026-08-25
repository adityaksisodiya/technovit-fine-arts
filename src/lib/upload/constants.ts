/**
 * Upload Pipeline Constants & Configuration Limits.
 *
 * Defines hard safety bounds for anonymous photo uploads:
 * - Client max input: 10 MB
 * - Server upload payload cap: 3.5 MB (well below Vercel's 4.5 MB Function limit)
 * - Sharp processing dimensions and compression targets
 * - Rate limiting windows and thresholds
 * - Storage budget hard-stop and monitoring alerts
 */

// --- File Size Limits ---
export const MAX_CLIENT_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB original user input
export const MAX_SERVER_PAYLOAD_BYTES = 3.5 * 1024 * 1024; // 3.5 MB max payload received by Vercel
export const MIN_UPLOAD_SIZE_BYTES = 100; // 100 bytes minimum

// --- Allowed Formats ---
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

// --- Dimension & Pixel Budget Safeguards ---
export const MIN_IMAGE_WIDTH = 100;
export const MIN_IMAGE_HEIGHT = 100;
export const MAX_IMAGE_WIDTH = 8192;
export const MAX_IMAGE_HEIGHT = 8192;
export const MAX_INPUT_PIXELS = 40_000_000; // 40 MP decompression bomb defense

// --- Sharp Output Specs ---
export const DISPLAY_MAX_WIDTH = 1600;
export const DISPLAY_MAX_HEIGHT = 1600;

export const THUMBNAIL_MAX_WIDTH = 400;
export const THUMBNAIL_MAX_HEIGHT = 400;
export const THUMBNAIL_WEBP_QUALITY = 75;

export const BLURHASH_COMPONENT_X = 4;
export const BLURHASH_COMPONENT_Y = 3;

// --- Rate Limiting ---
export const RATE_LIMIT_WINDOW_MINUTES = 15; // 15-minute sliding window
export const MAX_UPLOADS_PER_WINDOW = 10; // Max 10 uploads per 15 min per IP

// --- Storage Budget (Free Tier = 10 GB) ---
export const STORAGE_HARD_STOP_BYTES = 7.5 * 1024 * 1024 * 1024; // 7.5 GB (75% of 10 GB)
export const STORAGE_WARN_THRESHOLD_BYTES = 5.25 * 1024 * 1024 * 1024; // 5.25 GB (70% of 7.5 GB)
export const STORAGE_CRITICAL_THRESHOLD_BYTES = 6.75 * 1024 * 1024 * 1024; // 6.75 GB (90% of 7.5 GB)

// --- Final B2 Storage Paths ---
export const PHOTOS_PREFIX = "photos";

export function getDisplayKey(photoId: string): string {
  return `${PHOTOS_PREFIX}/${photoId}/display.webp`;
}

export function getThumbnailKey(photoId: string): string {
  return `${PHOTOS_PREFIX}/${photoId}/thumb.webp`;
}
