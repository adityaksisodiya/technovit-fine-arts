import { createAdminClient } from "@/lib/supabase/server";
import { PhotoStatus, type Photo } from "@/types";

export interface PublicPhoto {
  id: string;
  blurhash: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
  thumbUrl: string;
  displayUrl: string;
}

export interface PublicGalleryResult {
  photos: PublicPhoto[];
  nextCursor: string | null;
  hasMore: boolean;
  totalApprovedCount: number;
}

/**
 * Transforms an internal database Photo record into a sanitized PublicPhoto DTO.
 *
 * Security Guarantees:
 * - Strips internal storage keys (storage_original_key, storage_display_key, storage_thumb_key)
 * - Strips client IP address (uploaded_from_ip)
 * - Strips internal moderation IDs and audit references
 * - Generates versioned image URLs tied to moderation/update timestamp for cache consistency
 */
export function toPublicPhoto(photo: Photo): PublicPhoto {
  const version = new Date(
    photo.moderated_at || photo.updated_at || photo.created_at
  ).getTime();

  return {
    id: photo.id,
    blurhash: photo.blurhash,
    width: photo.width,
    height: photo.height,
    created_at: photo.created_at,
    thumbUrl: `/api/photos/${photo.id}/image?variant=thumb&v=${version}`,
    displayUrl: `/api/photos/${photo.id}/image?variant=display&v=${version}`,
  };
}

export interface GetPublicGalleryOptions {
  cursor?: string | null; // ISO timestamp for pagination (created_at < cursor)
  limit?: number;
}

/**
 * Fetches approved photos for the public gallery using cursor-based pagination.
 *
 * Guarantees:
 * - Strictly filters WHERE status = 'approved'
 * - Ordered newest first (created_at DESC)
 * - Cursor pagination avoids N+1 and offset drift
 * - Strips all sensitive metadata from the returned DTOs
 */
export async function getPublicGalleryPhotos(
  options: GetPublicGalleryOptions = {}
): Promise<PublicGalleryResult> {
  const { cursor, limit = 18 } = options;
  const clampedLimit = Math.min(Math.max(1, limit), 50);

  const supabase = createAdminClient();

  // 1. Build query strictly for APPROVED photos
  let query = supabase
    .from("photos")
    .select(
      "id, blurhash, width, height, created_at, updated_at, moderated_at, status",
      { count: "exact" }
    )
    .eq("status", PhotoStatus.APPROVED)
    .order("created_at", { ascending: false })
    .limit(clampedLimit + 1); // Fetch 1 extra to detect hasMore

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("Failed to query public gallery photos:", error);
    throw new Error(`Failed to load gallery photos: ${error.message}`);
  }

  const rawRows = (data as unknown as Photo[]) || [];
  const hasMore = rawRows.length > clampedLimit;
  const pageRows = hasMore ? rawRows.slice(0, clampedLimit) : rawRows;

  const photos: PublicPhoto[] = pageRows.map(toPublicPhoto);
  const nextCursor =
    hasMore && pageRows.length > 0
      ? pageRows[pageRows.length - 1].created_at
      : null;

  return {
    photos,
    nextCursor,
    hasMore,
    totalApprovedCount: count ?? photos.length,
  };
}

/**
 * Retrieves a single approved photo by ID.
 * Returns null if the photo does not exist or is not approved.
 */
export async function getPublicPhotoById(
  id: string
): Promise<PublicPhoto | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("photos")
    .select(
      "id, blurhash, width, height, created_at, updated_at, moderated_at, status"
    )
    .eq("id", id)
    .eq("status", PhotoStatus.APPROVED)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return toPublicPhoto(data as unknown as Photo);
}
