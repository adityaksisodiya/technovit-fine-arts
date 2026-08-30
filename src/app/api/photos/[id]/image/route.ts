import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { downloadStorageObject } from "@/lib/upload";
import { PhotoStatus } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

const NO_CACHE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * GET /api/photos/[id]/image?variant=thumb|display&v=<version>
 *
 * Public image delivery endpoint for approved photos.
 *
 * Security & Caching Guarantees:
 * - Strictly verifies database record has status = 'approved'.
 * - Non-existent, pending, and rejected photos return 404 with Cache-Control: no-store.
 * - Direct ID guessing cannot leak unapproved content.
 * - Approved images are served with bounded 1-hour CDN cache headers (s-maxage=3600).
 * - Version parameter (?v=...) ties the cache key to the photo's moderation/update timestamp.
 * - Backblaze B2 credentials and storage keys remain strictly private on the server.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: photoId } = await params;

  if (!photoId) {
    return new NextResponse(
      JSON.stringify({ error: "Photo ID is required." }),
      { status: 400, headers: NO_CACHE_HEADERS }
    );
  }

  const { searchParams } = new URL(request.url);
  const variant =
    searchParams.get("variant") === "display" ? "display" : "thumb";

  // 1. Query database strictly for status = 'approved'
  const supabase = createAdminClient();
  const { data: photo, error: fetchError } = await supabase
    .from("photos")
    .select("id, status, storage_display_key, storage_thumb_key, content_type")
    .eq("id", photoId)
    .eq("status", PhotoStatus.APPROVED)
    .maybeSingle();

  // If not found, not approved, or DB error -> return 404 No-Store immediately
  if (fetchError || !photo || photo.status !== PhotoStatus.APPROVED) {
    return new NextResponse(
      JSON.stringify({ error: "Photo not found or not approved for public display." }),
      { status: 404, headers: NO_CACHE_HEADERS }
    );
  }

  const storageKey =
    variant === "display"
      ? photo.storage_display_key
      : photo.storage_thumb_key || photo.storage_display_key;

  if (!storageKey) {
    return new NextResponse(
      JSON.stringify({ error: "Photo image variant is unavailable." }),
      { status: 404, headers: NO_CACHE_HEADERS }
    );
  }

  // 2. Fetch real image buffer from Backblaze B2 (Server-to-Server)
  try {
    const imageBuffer = await downloadStorageObject(storageKey);

    return new NextResponse(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        "Content-Type": photo.content_type || "image/webp",
        "Cache-Control":
          "public, max-age=3600, s-maxage=3600, stale-while-revalidate=600",
        "CDN-Cache-Control": "max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (storageError) {
    console.error(`Failed to download storage object for photo ${photoId}:`, storageError);
    return new NextResponse(
      JSON.stringify({ error: "Failed to retrieve image from storage." }),
      { status: 502, headers: NO_CACHE_HEADERS }
    );
  }
}


