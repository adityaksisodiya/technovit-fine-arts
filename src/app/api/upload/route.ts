import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  getClientIp,
  validatePayloadSize,
  validateImageBuffer,
  processUploadedPhoto,
  getDisplayKey,
  getThumbnailKey,
  uploadStorageObject,
  deleteStoragePrefix,
  admitAndCreatePendingPhoto,
  UploadAdmissionError,
} from "@/lib/upload";
import {
  PhotoStatus,
  type UploadResponse,
  type UploadErrorResponse,
} from "@/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/upload
 *
 * Anonymous Mobile-First Photo Upload Handler:
 * 1. Enforces Vercel-safe payload limit (<= 3.5 MB)
 * 2. Strictly validates image content (magic bytes, Sharp decode, bounds, 40 MP budget)
 * 3. Processes into optimized WebP variants (display 1600px + thumbnail 400px + blurhash)
 * 4. Atomically enforces IP rate limiting (max 10 / 15 min), 7.5 GB storage hard-stop reservation,
 *    and inserts photo row (status: 'pending') via PostgreSQL stored procedure
 * 5. Uploads display.webp and thumb.webp server-to-server to private Backblaze B2 bucket
 * 6. Updates photo record with confirmed storage keys (never storing original)
 * 7. Rollback: Deletes any B2 objects and incomplete database row on failure
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<UploadResponse | UploadErrorResponse>> {
  let createdPhotoId: string | undefined;

  try {
    const ip = getClientIp(request.headers);

    // 1. Parse Multipart FormData
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid multipart/form-data request body.",
          code: "INVALID_FORM_DATA",
        },
        { status: 400 }
      );
    }

    const file = formData.get("file");
    const boothId = (formData.get("booth_id") as string)?.trim() || null;

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        {
          error: "No image file provided in form data field 'file'.",
          code: "MISSING_FILE",
        },
        { status: 400 }
      );
    }

    // 2. Payload Size Validation (<= 3.5 MB)
    const sizeValidation = validatePayloadSize(file.size);
    if (!sizeValidation.valid) {
      return NextResponse.json(
        { error: sizeValidation.error!, code: "INVALID_FILE_SIZE" },
        { status: 400 }
      );
    }

    // 3. Read file into memory buffer
    const arrayBuffer = await file.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);

    // 4. Image Content Validation with Sharp (magic bytes, decode integrity, bounds, 40 MP limit)
    const validation = await validateImageBuffer(rawBuffer);
    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        {
          error: validation.error || "Invalid image content.",
          code: "INVALID_IMAGE_CONTENT",
        },
        { status: 400 }
      );
    }

    // 5. Sharp Processing (Display WebP + Thumbnail WebP + Blurhash)
    const processed = await processUploadedPhoto(rawBuffer);

    // 6. Atomic Admission & DB Row Creation
    // (Atomically enforces rate limit, 7.5 GB storage hard-stop reservation, and inserts pending row)
    const admission = await admitAndCreatePendingPhoto({
      ipAddress: ip,
      fileSizeBytes: processed.totalProcessedSizeBytes,
      width: processed.displayWidth,
      height: processed.displayHeight,
      blurhash: processed.blurhash,
      contentType: "image/webp",
      boothId,
    });

    const photoId = admission.photoId;
    createdPhotoId = photoId;

    // 7. Upload final WebP objects to Backblaze B2 (Server-to-Server)
    const displayKey = getDisplayKey(photoId);
    const thumbKey = getThumbnailKey(photoId);

    await uploadStorageObject(
      displayKey,
      processed.displayBuffer,
      "image/webp"
    );

    await uploadStorageObject(
      thumbKey,
      processed.thumbBuffer,
      "image/webp"
    );

    // 8. Update photo row with finalized storage keys
    const supabase = createAdminClient();
    const { error: dbUpdateError } = await supabase
      .from("photos")
      .update({
        r2_display_key: displayKey,
        r2_thumbnail_key: thumbKey,
      })
      .eq("id", photoId);

    if (dbUpdateError) {
      throw new Error(
        `Failed to finalize photo storage keys: ${dbUpdateError.message}`
      );
    }

    return NextResponse.json(
      {
        id: photoId,
        status: PhotoStatus.PENDING,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof UploadAdmissionError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          retryAfter: error.retryAfter,
        },
        {
          status: error.statusCode,
          headers: error.retryAfter
            ? { "Retry-After": String(error.retryAfter) }
            : undefined,
        }
      );
    }

    console.error("Error in /api/upload:", error);

    // Rollback: Clean up any partial state on failure
    if (createdPhotoId) {
      const prefix = `photos/${createdPhotoId}/`;
      await deleteStoragePrefix(prefix).catch(() => {});

      try {
        const supabase = createAdminClient();
        await supabase.from("photos").delete().eq("id", createdPhotoId);
      } catch {
        // Ignore deletion error during rollback
      }
    }

    return NextResponse.json(
      {
        error:
          "An error occurred while uploading your photo. Please try again.",
        code: "UPLOAD_ERROR",
      },
      { status: 500 }
    );
  }
}
