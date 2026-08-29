import { NextRequest, NextResponse } from "next/server";
import { getPublicGalleryPhotos } from "@/lib/gallery";

export const dynamic = "force-dynamic";

/**
 * GET /api/photos?cursor=<timestamp>&limit=18
 *
 * Public cursor-paginated API for infinite scroll gallery loading.
 * Returns sanitized PublicPhoto DTOs for approved photos only.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limitParam = searchParams.get("limit");
    const locationId = searchParams.get("locationId") || searchParams.get("location_id");
    const limit = limitParam ? parseInt(limitParam, 10) : 18;

    const result = await getPublicGalleryPhotos({
      cursor: cursor || undefined,
      limit: isNaN(limit) ? 18 : limit,
      locationId: locationId || undefined,
    });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("Failed to load public photos API:", error);
    return NextResponse.json(
      { error: "Failed to load gallery photos." },
      { status: 500 }
    );
  }
}
