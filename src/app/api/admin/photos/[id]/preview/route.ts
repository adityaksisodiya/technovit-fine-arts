import { NextRequest, NextResponse } from "next/server";
import { getAdminAuthResult, hasRequiredRole } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { downloadStorageObject } from "@/lib/upload";
import { AdminRole } from "@/types";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/admin/photos/[id]/preview?variant=thumb|display
 *
 * Authenticated proxy streaming private Backblaze B2 objects to authorized moderators.
 * Guarantees zero exposure of Backblaze B2 credentials and protects unapproved photos.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  // 1. Enforce admin authentication and minimum MODERATOR role
  const authResult = await getAdminAuthResult();
  if (!authResult.success) {
    return NextResponse.json(
      { error: "Unauthorized. Administrator session required." },
      { status: 401 }
    );
  }

  const { admin } = authResult;
  if (!admin.is_active || !hasRequiredRole(admin.role, AdminRole.MODERATOR)) {
    return NextResponse.json(
      { error: "Forbidden. Insufficient administrator privileges." },
      { status: 403 }
    );
  }

  const { id: photoId } = await params;
  if (!photoId) {
    return NextResponse.json(
      { error: "Photo ID is required." },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const variant = searchParams.get("variant") === "display" ? "display" : "thumb";

  // 2. Fetch photo metadata from Supabase
  const supabase = createAdminClient();
  const { data: photo, error: fetchError } = await supabase
    .from("photos")
    .select("id, status, storage_display_key, storage_thumb_key, content_type")
    .eq("id", photoId)
    .maybeSingle();

  if (fetchError || !photo) {
    return NextResponse.json(
      { error: "Photo not found." },
      { status: 404 }
    );
  }

  const storageKey =
    variant === "display"
      ? photo.storage_display_key
      : photo.storage_thumb_key || photo.storage_display_key;

  if (!storageKey) {
    return NextResponse.json(
      { error: "Photo storage key is not available." },
      { status: 404 }
    );
  }

  // 3. Download image buffer from Backblaze B2 (Server-to-Server)
  try {
    const imageBuffer = await downloadStorageObject(storageKey);

    return new NextResponse(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        "Content-Type": photo.content_type || "image/webp",
        "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (storageError) {
    console.error(`Failed to stream preview for photo ${photoId}:`, storageError);
    return NextResponse.json(
      { error: "Failed to retrieve photo from storage." },
      { status: 502 }
    );
  }
}


